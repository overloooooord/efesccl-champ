/**
 * Школа сомелье — тренажёр для персонала заведения и для гостей.
 * Один и тот же курс: официант получает знание, гость — уровень и XP.
 * Прогресс живёт на сервере (LessonProgress), поэтому вход обязателен.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const show = (id) => $(id).classList.remove('hidden');
  const hide = (id) => $(id).classList.add('hidden');

  const state = {
    levels: [],          // уровни с вложенными уроками и вопросами
    done: {},            // lesson_id → прогресс
    profile: null,
    activeSlug: null,
    answers: {},         // question_id → выбранный индекс
    checked: false,      // квиз уже отправлен — блокируем повторную отправку
    mode: 'login',
  };

  function toast(text, isError = false) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' err' : '');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function busy(button, on, label) {
    if (!button) return;
    if (on) {
      button.dataset.text = button.textContent;
      button.textContent = label || 'Секунду…';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.text || button.textContent;
      button.disabled = false;
    }
  }

  // ── Минимальный Markdown: заголовки, списки, жирный ────
  function md(text) {
    const inline = (line) => FT.escape(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    const out = [];
    let list = null;

    for (const raw of String(text || '').split('\n')) {
      const line = raw.trim();
      if (!line) { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } continue; }

      if (line.startsWith('- ')) {
        (list = list || []).push(`<li>${inline(line.slice(2))}</li>`);
        continue;
      }
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }

      if (line.startsWith('## ')) out.push(`<h2>${inline(line.slice(3))}</h2>`);
      else if (line.startsWith('# ')) out.push(`<h1>${inline(line.slice(2))}</h1>`);
      else out.push(`<p>${inline(line)}</p>`);
    }
    if (list) out.push(`<ul>${list.join('')}</ul>`);
    return out.join('');
  }

  // ── Загрузка ───────────────────────────────────────────

  async function boot() {
    if (!FT.isAuthed()) {
      hide('loading');
      show('login');
      return;
    }
    try {
      const [levels, progress, profile] = await Promise.all([
        FT.levels(), FT.myProgress(), FT.me(),
      ]);
      state.levels = Array.isArray(levels) ? levels : (levels.results || []);
      state.done = {};
      (progress.items || []).forEach((item) => { state.done[item.lesson] = item; });
      state.profile = profile;

      renderHeader();
      renderCurriculum();
      hide('loading');
      show('app');
    } catch (e) {
      if (e.status === 401) {
        await FT.logout();
        hide('loading');
        show('login');
        return;
      }
      hide('loading');
      show('login');
      $('login-err').textContent = e.message;
      show('login-err');
    }
  }

  async function refreshProgress() {
    const [progress, profile] = await Promise.all([FT.myProgress(), FT.me()]);
    state.done = {};
    (progress.items || []).forEach((item) => { state.done[item.lesson] = item; });
    state.profile = profile;
    renderHeader();
    renderCurriculum();
  }

  // ── Шапка и полоса уровня ──────────────────────────────

  function renderHeader() {
    const p = state.profile;
    $('user-chip').textContent = p.venue ? `${p.username} · ${p.venue.name}` : p.username;
    $('level-chip').textContent = p.level_name || 'Новичок';
    $('level-name').textContent = p.level_name || 'Новичок';
    $('streak-chip').textContent = p.streak_days ? `Стрик ${p.streak_days} дн.` : '';
    $('lessons-done').textContent = Object.keys(state.done).length;

    // Следующий уровень — первый порог выше текущего XP
    const sorted = [...state.levels].sort((a, b) => a.xp_required - b.xp_required);
    const current = sorted.filter((l) => l.xp_required <= p.total_xp).pop() || sorted[0];
    const next = sorted.find((l) => l.xp_required > p.total_xp);

    $('xp-now').textContent = `${p.total_xp} XP`;
    if (next) {
      const from = current ? current.xp_required : 0;
      const span = Math.max(next.xp_required - from, 1);
      const pct = Math.min(Math.round(((p.total_xp - from) / span) * 100), 100);
      $('xp-next').textContent = `${next.emoji} ${next.name} · ${next.xp_required} XP`;
      $('xp-fill').style.width = `${pct}%`;
      $('xp-hint').textContent =
        `До «${next.name}» осталось ${next.xp_required - p.total_xp} XP `
        + '(урок — до 150 XP, дегустация — 25 XP).';
    } else {
      $('xp-next').textContent = 'Максимальный уровень';
      $('xp-fill').style.width = '100%';
      $('xp-hint').textContent = 'Курс пройден полностью — можно вести дегустации самому.';
    }
  }

  // ── Программа ──────────────────────────────────────────

  function renderCurriculum() {
    const html = state.levels.map((level) => {
      const lessons = (level.lessons || []).map((lesson) => {
        const progress = state.done[lesson.id];
        const active = lesson.slug === state.activeSlug ? ' active' : '';
        const badge = progress
          ? `${progress.score_percent}%`
          : `${lesson.xp_reward} XP`;
        return `
          <button class="lesson-btn${progress ? ' done' : ''}${active}" data-slug="${FT.escape(lesson.slug)}">
            <span class="tick">${progress ? '✓' : ''}</span>
            <span class="t">${FT.escape(lesson.title)}</span>
            <span class="xp">${badge}</span>
          </button>`;
      }).join('');

      if (!lessons) return '';
      return `
        <div class="level-block">
          <div class="level-head">
            <span class="name">${FT.escape(level.emoji)} ${FT.escape(level.name)}</span>
            <span class="req">${level.xp_required ? `от ${level.xp_required} XP` : 'старт'}</span>
          </div>
          ${lessons}
        </div>`;
    }).join('');

    $('curriculum').innerHTML = html || '<div class="placeholder">Программа не загружена.</div>';
    $('curriculum').querySelectorAll('.lesson-btn').forEach((button) => {
      button.addEventListener('click', () => openLesson(button.dataset.slug));
    });
  }

  function findLesson(slug) {
    for (const level of state.levels) {
      const lesson = (level.lessons || []).find((l) => l.slug === slug);
      if (lesson) return { lesson, level };
    }
    return null;
  }

  // ── Урок и квиз ────────────────────────────────────────

  function openLesson(slug) {
    const found = findLesson(slug);
    if (!found) return;

    state.activeSlug = slug;
    state.answers = {};
    state.checked = false;
    renderCurriculum();

    const { lesson, level } = found;
    const progress = state.done[lesson.id];
    const questions = [...(lesson.questions || [])].sort((a, b) => a.order - b.order);

    $('lesson').innerHTML = `
      <div class="lesson-meta">
        ${FT.escape(level.emoji)} ${FT.escape(level.name)} · ${lesson.xp_reward} XP
        ${progress ? ` · пройден на ${progress.score_percent}%` : ''}
      </div>
      <div class="lesson-body">${md(lesson.content)}</div>
      ${questions.length ? `
        <div class="quiz">
          <h3>Проверка</h3>
          <p class="muted">${questions.length} вопрос(ов). XP начисляется пропорционально верным ответам${progress ? ', при повторе — только разница' : ''}.</p>
          <div id="questions">${questions.map(renderQuestion).join('')}</div>
          <button class="primary" id="quiz-go" style="margin-top:8px">Ответить</button>
          <div id="quiz-result"></div>
        </div>` : ''}
    `;

    bindQuiz();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion(question, index) {
    const options = (question.options || []).map((option, optionIndex) => `
      <label class="opt" data-q="${question.id}" data-i="${optionIndex}">
        <input type="radio" name="q${question.id}" value="${optionIndex}">
        <span>${FT.escape(option)}</span>
      </label>`).join('');

    return `
      <div class="q" data-q="${question.id}">
        <div class="qt">${index + 1}. ${FT.escape(question.text)}</div>
        ${options}
        <div class="expl hidden"></div>
      </div>`;
  }

  function bindQuiz() {
    const go = $('quiz-go');
    if (!go) return;

    $('questions').querySelectorAll('.opt').forEach((label) => {
      label.addEventListener('click', () => {
        if (state.checked) return;
        const questionId = Number(label.dataset.q);
        state.answers[questionId] = Number(label.dataset.i);
        $('questions').querySelectorAll(`.opt[data-q="${questionId}"]`)
          .forEach((other) => other.classList.remove('picked'));
        label.classList.add('picked');
      });
    });

    go.addEventListener('click', () => submitQuiz(go));
  }

  async function submitQuiz(button) {
    if (state.checked) return;
    const found = findLesson(state.activeSlug);
    if (!found) return;

    const questions = found.lesson.questions || [];
    const answered = Object.keys(state.answers).length;
    if (answered < questions.length) {
      toast(`Ответьте на все вопросы: осталось ${questions.length - answered}.`);
      return;
    }

    const payload = Object.entries(state.answers)
      .map(([questionId, selected]) => ({
        question_id: Number(questionId), selected_index: selected,
      }));

    busy(button, true, 'Проверяю…');
    try {
      const data = await FT.completeLesson(state.activeSlug, payload);
      state.checked = true;
      paintAnswers(data.answers || []);
      renderResult(data);
      await refreshProgress();
    } catch (e) {
      toast(e.message, true);
    } finally {
      busy(button, false);
      button.disabled = state.checked;
    }
  }

  function paintAnswers(details) {
    details.forEach((detail) => {
      const block = $('questions').querySelector(`.q[data-q="${detail.question_id}"]`);
      if (!block) return;

      block.querySelectorAll('.opt').forEach((label) => {
        const index = Number(label.dataset.i);
        label.classList.remove('picked');
        if (index === detail.correct_index) label.classList.add('right');
        else if (index === state.answers[detail.question_id] && !detail.correct) {
          label.classList.add('wrong');
        }
        label.querySelector('input').disabled = true;
      });

      const expl = block.querySelector('.expl');
      if (detail.explanation) {
        expl.innerHTML = `<b>${detail.correct ? 'Верно.' : 'Не так.'}</b> ${FT.escape(detail.explanation)}`;
        expl.classList.remove('hidden');
      }
    });
  }

  function renderResult(data) {
    const good = data.score_percent >= 70;
    $('quiz-result').innerHTML = `
      <div class="result">
        <div class="score${good ? ' good' : ''}">${data.correct} из ${data.total} · ${data.score_percent}%</div>
        <p class="muted" style="margin-top:4px">
          Итог по уроку: ${data.xp_earned} XP. Всего: ${data.total_xp} XP, уровень «${FT.escape(data.level)}».
        </p>
        ${good ? '' : '<p class="muted" style="margin-top:6px">Перечитайте разобранные вопросы и пройдите ещё раз — зачтётся лучший результат.</p>'}
      </div>`;
  }

  // ── Вход и регистрация ─────────────────────────────────

  function setMode(mode) {
    state.mode = mode;
    const register = mode === 'register';
    $('login-go').textContent = register ? 'Создать профиль' : 'Войти';
    $('switch-text').textContent = register ? 'Уже есть профиль?' : 'Ещё нет профиля?';
    $('switch-mode').textContent = register ? 'Войти' : 'Создать';
    $('login-lead').textContent = register
      ? 'Новый профиль: прогресс, XP и «Вкусовая ДНК» сохранятся'
      : 'Flavor Tree · курс для персонала и гостей';
    hide('login-err');
  }

  async function doAuth(button) {
    const username = $('username').value.trim();
    const password = $('password').value;
    hide('login-err');

    if (username.length < 3 || password.length < 6) {
      $('login-err').textContent = 'Логин от 3 символов, пароль от 6.';
      show('login-err');
      return;
    }

    busy(button, true);
    try {
      if (state.mode === 'register') await FT.register(username, password);
      else await FT.login(username, password);
      hide('login');
      show('loading');
      await boot();
    } catch (e) {
      $('login-err').textContent = e.message;
      show('login-err');
    } finally {
      busy(button, false);
    }
  }

  $('login-go').addEventListener('click', (event) => doAuth(event.currentTarget));
  $('password').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('login-go').click();
  });
  $('switch-mode').addEventListener('click', () => {
    setMode(state.mode === 'register' ? 'login' : 'register');
  });
  $('logout').addEventListener('click', async () => {
    await FT.logout();
    location.reload();
  });

  boot();
})();
