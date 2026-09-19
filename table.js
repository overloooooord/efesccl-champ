/**
 * Flavor Tree — гостевой экран за столом.
 *
 * Три шага на одном URL: блюдо → рекомендации → заказ и оценка.
 * Состояние живёт в session_token из скана QR — гость ничего не регистрирует.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = FT.escape;

  const state = {
    sessionToken: null,
    venue: null,
    menu: [],
    beers: [],
    selectedDishId: null,
    recommendations: [],
    activeReco: null,
    rating: 0,
    claimed: false,
  };

  // ── Инфраструктура UI ──────────────────────────────────

  let toastEl = null;
  let toastTimer = null;
  function toast(message, isError = false) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.toggle('bad', isError);
    // Перерисовка перед добавлением класса — иначе анимация не стартует
    requestAnimationFrame(() => toastEl.classList.add('on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 4000);
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }
  function top() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /** Подсветка шага: гость всегда видит, где он в сценарии. */
  function markStep(index) {
    $('steps').querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i <= index));
  }

  function fatal(title, text) {
    hide('loading');
    hide('app');
    $('fatal-title').textContent = title;
    $('fatal-text').textContent = text;
    show('fatal');
  }

  function busy(button, isBusy, labelWhenBusy = '…') {
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.textContent = labelWhenBusy;
      button.disabled = true;
    } else {
      if (button.dataset.label) button.textContent = button.dataset.label;
      button.disabled = false;
    }
  }

  /** Кольцо совпадения: SVG-дуга вместо «просто цифры» — читается за миг. */
  function ringHtml(percent, small = false) {
    const r = small ? 23 : 31;
    const size = small ? 54 : 72;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.max(0, Math.min(100, percent)) / 100);
    return `<div class="ring${small ? ' sm' : ''}" role="img" aria-label="совпадение ${percent}%">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="3"/>
        <circle class="value" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="3"
                stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
      </svg><b>${percent}<small style="font-size:.55em">%</small></b></div>`;
  }

  // ── Шаг 0: скан QR ─────────────────────────────────────

  /** Токен приходит из короткой ссылки /t/<token> или из ?t=<token>. */
  function qrToken() {
    const fromPath = location.pathname.match(/\/(?:t|table|s|store)\/([A-Za-z0-9]{6,64})\/?$/);
    if (fromPath) return fromPath[1];
    const params = new URLSearchParams(location.search);
    return params.get('t') || params.get('table') || '';
  }

  async function boot() {
    const token = qrToken();
    if (!token) {
      fatal('Нет кода стола', 'Наведите камеру на QR-код на тейбл-тенте — ссылка откроется сама.');
      return;
    }

    try {
      const data = await FT.resolveTable(token);
      // QR магазина, открытый на странице стола — уводим на верный экран,
      // чтобы напечатанный не туда код всё равно работал
      if (data.venue && data.venue.kind === 'retail') {
        location.replace('store.html?t=' + encodeURIComponent(token));
        return;
      }
      state.sessionToken = data.session_token;
      state.venue = data.venue;
      state.menu = data.menu || [];
      state.beers = data.beers || [];
      renderVenue(data);
      renderMenu();
      hide('loading');
      show('app');
    } catch (e) {
      if (e.status === 404) {
        fatal('Стол не найден', 'Похоже, этот тейбл-тент уже не активен. Позовите официанта — он поможет.');
      } else if (e.status === 0) {
        fatal('Нет связи', 'Проверьте Wi-Fi заведения или мобильный интернет и обновите страницу.');
      } else {
        fatal('Что-то сломалось', e.message);
      }
    }
  }

  function renderVenue(data) {
    const venue = data.venue;
    document.title = `${venue.name} — подбор пива | Flavor Tree`;

    const mark = $('venue-mark');
    if (venue.logo_url) mark.innerHTML = `<img src="${esc(venue.logo_url)}" alt="">`;
    else mark.textContent = venue.name.slice(0, 1).toUpperCase();

    if (venue.accent_color) {
      // светлое золото заведения не читается на кремовом фоне — притемняем
      const accent = FT.accentFor(venue.accent_color) || venue.accent_color;
      document.documentElement.style.setProperty('--gold', accent);
    }

    $('venue-name').textContent = venue.name;
    $('venue-meta').textContent = [venue.city, venue.address].filter(Boolean).join(' · ');

    if (data.table_number) {
      const label = venue.point_label || 'Стол';
      $('point-badge').innerHTML = `${esc(label)}<b>№${esc(data.table_number)}</b>`;
    }
  }

  function renderMenu() {
    const reel = $('dish-grid');
    if (!state.menu.length) {
      reel.innerHTML = '';
      $('dish-hint').textContent = 'Впишите блюдо — Макс подберёт пиво из карты заведения.';
      return;
    }

    reel.innerHTML = state.menu.map((item) => `
      <button class="dish-card" type="button" aria-pressed="false"
              data-dish-id="${item.dish.id}" data-dish-name="${esc(item.dish.name)}">
        <span class="emoji">${esc(item.dish.emoji || '🍽️')}</span>
        <span class="name">${esc(item.dish.name)}</span>
        <span class="price">${FT.fmt.tenge(item.price_tenge)}</span>
        ${item.is_signature ? '<span class="sig">Хит заведения</span>' : ''}
      </button>
    `).join('');

    reel.querySelectorAll('.dish-card').forEach((button) => {
      button.addEventListener('click', () => {
        reel.querySelectorAll('.dish-card').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.selectedDishId = Number(button.dataset.dishId);
        $('dish-input').value = '';
        pair({ dishId: state.selectedDishId, label: button.dataset.dishName });
      });
    });
  }

  // ── Шаг 1 → 2: подбор ──────────────────────────────────

  async function pair({ dishId = null, dishText = '', label = '' }) {
    const button = $('dish-go');
    busy(button, true, 'Подбираю…');

    try {
      const data = await FT.pair(state.sessionToken, { dishId, dishText, useAi: true });
      state.recommendations = data.recommendations || [];
      renderRecommendations(data, label || data.dish);
    } catch (e) {
      if (e.status === 409) toast('В баре сейчас нет доступных позиций — позовите официанта.', true);
      else if (e.status === 404) toast('Сессия истекла. Отсканируйте QR заново.', true);
      else toast(e.message, true);
    } finally {
      busy(button, false);
    }
  }

  function renderRecommendations(data, label) {
    $('reco-label').textContent = data.dish_recognized
      ? `К «${data.dish}» подойдёт`
      : `Под «${data.dish}» — наш выбор`;

    $('reco-list').innerHTML = state.recommendations.map((reco, index) => {
      const beer = reco.beer;
      const sub = [beer.brand_name, beer.style_display, `${beer.abv}%`,
                   beer.ibu ? `IBU ${beer.ibu}` : null].filter(Boolean).join(' · ');

      const tags = [];
      if (reco.on_tap) tags.push('<span class="chip gold">Разливное</span>');
      if (beer.is_premium) tags.push('<span class="chip gold">Премиум</span>');
      if (beer.serving_temp) tags.push(`<span class="chip">${esc(beer.serving_temp)}</span>`);

      const bridges = (reco.bridges || []).length
        ? `<div class="bridges">${reco.bridges.map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div>`
        : '';

      const source = reco.source === 'ai'
        ? 'Объяснил Макс · ИИ-сомелье'
        : (reco.source === 'rules' ? 'Подобрано по вкусовым мостам' : 'Выбор заведения');

      return `
        <article class="card reco rise d${Math.min(index + 1, 4)}${index === 0 ? ' gilded' : ''}">
          <div class="reco-head">
            <div class="t">
              <div class="beer-name">${esc(beer.name)}</div>
              <div class="beer-sub">${esc(sub)}</div>
              ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
            </div>
            ${reco.match_percent ? ringHtml(reco.match_percent, index > 0) : ''}
          </div>
          ${bridges}
          <p class="why">${esc(reco.explanation)}</p>
          <div class="src">${source}</div>
          <div class="reco-foot">
            <div class="price">${FT.fmt.tenge(reco.price_tenge)}
              ${reco.volume_ml ? `<small>${reco.volume_ml} мл</small>` : ''}</div>
            <button class="primary" data-order="${reco.id}">Заказать</button>
          </div>
        </article>`;
    }).join('');

    $('reco-list').querySelectorAll('[data-order]').forEach((button) => {
      button.addEventListener('click', () => order(Number(button.dataset.order), button));
    });

    hide('step-dish');
    show('step-reco');
    markStep(1);
    top();
  }

  // ── Шаг 3: заказ и оценка ──────────────────────────────

  async function order(recommendationId, button) {
    busy(button, true, 'Готово…');
    try {
      const data = await FT.order(state.sessionToken, recommendationId);
      state.activeReco = recommendationId;
      state.rating = 0;

      $('done-beer').textContent = data.beer;
      $('done-message').textContent = data.message;
      $('rate-hint').textContent = 'Понравилось? Оцените — это учит Макса.';
      hide('claim');
      show('claim-form-wrap');
      $('claim-hint').textContent = '';
      renderStars();

      hide('step-reco');
      show('step-done');
      markStep(2);
      top();
    } catch (e) {
      toast(e.message, true);
    } finally {
      busy(button, false);
    }
  }

  function renderStars() {
    $('stars').innerHTML = [1, 2, 3, 4, 5].map((value) => `
      <button class="star${value <= state.rating ? ' on' : ''}" type="button"
              data-rating="${value}" aria-label="${value} из 5">★</button>
    `).join('');
    $('stars').querySelectorAll('.star').forEach((button) => {
      button.addEventListener('click', () => rate(Number(button.dataset.rating)));
    });
  }

  async function rate(value) {
    state.rating = value;
    renderStars();
    try {
      const data = await FT.rate(state.sessionToken, state.activeReco, value);
      $('rate-hint').textContent = data.xp_earned
        ? `Спасибо! Заметка сохранена в профиль, +${data.xp_earned} XP.`
        : 'Спасибо! Ваша оценка учтена.';
      // Оценка есть, профиля нет — единственный момент, когда предложение уместно.
      // Если гость уже вошёл на этом телефоне, привязываем молча, без формы.
      if (data.can_claim && !state.claimed) {
        if (FT.isAuthed()) attachToProfile();
        else show('claim');
      }
    } catch (e) {
      toast(e.message, true);
    }
  }

  // ── Сохранение дегустации в профиль ────────────────────

  async function attachToProfile() {
    try {
      const data = await FT.claim(state.sessionToken);
      state.claimed = true;
      showClaimed(data);
    } catch (e) {
      if (e.status === 401) { await FT.logout(); show('claim'); }
    }
  }

  function showClaimed(data) {
    const level = data.level_name ? `, уровень «${data.level_name}»` : '';
    const gain = data.xp_earned ? `: +${data.xp_earned} XP` : '';
    $('rate-hint').innerHTML = '<span class="ok">Сохранено в профиль '
      + esc(data.username) + gain + esc(level) + '.</span>';
    // Единственное место, где уместно позвать дальше: гость только что получил XP
    $('claim-hint').innerHTML =
      '<a href="train.html" target="_blank" rel="noopener">Школа сомелье →</a> пара уроков — и уровень выше.';
    hide('claim-form-wrap');
    show('claim');
  }

  async function claimSession(mode, button) {
    const username = $('claim-user').value.trim();
    const password = $('claim-pass').value;
    if (username.length < 3 || password.length < 6) {
      $('claim-hint').textContent = 'Логин от 3 символов, пароль от 6.';
      return;
    }

    busy(button, true, 'Секунду…');
    try {
      if (mode === 'register') await FT.register(username, password);
      else await FT.login(username, password);

      const data = await FT.claim(state.sessionToken);
      state.claimed = true;
      showClaimed(data);
      toast('Дегустация в профиле. Дальше — школа сомелье.');
    } catch (e) {
      $('claim-hint').textContent = e.status === 409
        ? 'Этот стол уже привязан к другому профилю.'
        : e.message;
    } finally {
      busy(button, false);
    }
  }

  function backToDish() {
    hide('step-reco');
    hide('step-done');
    show('step-dish');
    $('dish-grid').querySelectorAll('.dish-card').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    state.selectedDishId = null;
    markStep(0);
    top();
  }

  // ── Макс: свободный вопрос ─────────────────────────────

  async function ask() {
    const input = $('ask-input');
    const message = input.value.trim();
    if (!message) return;

    appendMessage('me', message);
    input.value = '';

    const thinking = appendMessage('max', 'Думаю…');
    try {
      const data = await FT.ask(state.sessionToken, message);
      thinking.textContent = data.message;
    } catch (e) {
      thinking.textContent = e.status === 404
        ? 'Сессия истекла — отсканируйте QR заново.'
        : 'Не дотянулся до сервера. Попробуйте ещё раз.';
    }
  }

  function appendMessage(who, text) {
    const el = document.createElement('div');
    el.className = `msg ${who}`;
    el.textContent = text;
    $('ask-log').appendChild(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return el;
  }

  // ── Привязка событий ───────────────────────────────────

  $('dish-go').addEventListener('click', () => {
    const text = $('dish-input').value.trim();
    if (!text) {
      toast('Выберите блюдо из меню или впишите название.');
      return;
    }
    state.selectedDishId = null;
    pair({ dishText: text, label: text });
  });

  $('dish-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('dish-go').click(); });
  $('ask-go').addEventListener('click', ask);
  $('ask-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
  $('back-dish').addEventListener('click', backToDish);
  $('again').addEventListener('click', backToDish);
  $('claim-login').addEventListener('click', (e) => claimSession('login', e.currentTarget));
  $('claim-register').addEventListener('click', (e) => claimSession('register', e.currentTarget));
  $('claim-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('claim-login').click(); });

  boot();
})();
