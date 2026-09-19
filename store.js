/**
 * Flavor Tree — гостевой экран в магазине (полка / отдел).
 *
 * Сценарий другой, чем за столом: человек не заказывает, а решает,
 * что приготовить. Поэтому шаг 2 — это рецепт + список покупок,
 * и только потом пиво, которое к этому блюду продаётся здесь же.
 * Бэкенд тот же: /api/t/<token>/ и /api/venue/pair/.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = FT.escape;

  const state = {
    sessionToken: null,
    venue: null,
    menu: [],
    recommendations: [],
    activeReco: null,
    rating: 0,
    claimed: false,
  };

  // ── UI ─────────────────────────────────────────────────

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
    requestAnimationFrame(() => toastEl.classList.add('on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 4000);
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }
  function top() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function markStep(i) {
    $('steps').querySelectorAll('i').forEach((el, n) => el.classList.toggle('on', n <= i));
  }

  function fatal(title, text) {
    hide('loading'); hide('app');
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

  // ── Скан QR полки ──────────────────────────────────────

  function qrToken() {
    const fromPath = location.pathname.match(/\/(?:s|store|t|table)\/([A-Za-z0-9]{6,64})\/?$/);
    if (fromPath) return fromPath[1];
    const params = new URLSearchParams(location.search);
    return params.get('t') || params.get('shelf') || '';
  }

  async function boot() {
    const token = qrToken();
    if (!token) {
      fatal('Нет кода полки', 'Наведите камеру на QR рядом с ценником — ссылка откроется сама.');
      return;
    }

    try {
      const data = await FT.resolveTable(token);
      // QR ресторана на магазинной странице — уводим туда, где сценарий верный
      if (data.venue && data.venue.kind !== 'retail') {
        location.replace('table.html?t=' + encodeURIComponent(token));
        return;
      }
      state.sessionToken = data.session_token;
      state.venue = data.venue;
      state.menu = data.menu || [];
      renderVenue(data);
      renderIdeas();
      hide('loading');
      show('app');
    } catch (e) {
      if (e.status === 404) fatal('Полка не найдена', 'Этот стикер уже не активен. Спросите сотрудника зала.');
      else if (e.status === 0) fatal('Нет связи', 'Проверьте мобильный интернет и обновите страницу.');
      else fatal('Что-то сломалось', e.message);
    }
  }

  function renderVenue(data) {
    const venue = data.venue;
    document.title = `${venue.name} — что приготовить | Flavor Tree`;

    const mark = $('venue-mark');
    if (venue.logo_url) mark.innerHTML = `<img src="${esc(venue.logo_url)}" alt="">`;
    else mark.textContent = venue.name.slice(0, 1).toUpperCase();
    if (venue.accent_color) document.documentElement.style.setProperty('--gold', FT.accentFor(venue.accent_color) || venue.accent_color);

    $('venue-name').textContent = venue.name;
    $('venue-meta').textContent = [venue.city, venue.address].filter(Boolean).join(' · ');
    if (data.table_number) {
      $('point-badge').innerHTML = `${esc(venue.point_label || 'Отдел')}<b>${esc(data.table_number)}</b>`;
    }
  }

  /** Идеи ужина — блюда с рецептом. Без рецепта карточка бесполезна в магазине. */
  function renderIdeas() {
    const cookable = state.menu.filter((item) => item.is_cookable);
    const list = cookable.length ? cookable : state.menu;
    const reel = $('idea-grid');

    if (!list.length) {
      reel.innerHTML = '';
      $('idea-hint').textContent = 'Напишите, что уже в корзине — подберём пиво под это.';
      return;
    }
    if (!cookable.length) {
      $('idea-hint').textContent = 'Выберите блюдо — подскажем пиво, которое к нему подходит.';
    }

    reel.innerHTML = list.map((item) => {
      const d = item.dish;
      const meta = [
        d.cook_minutes ? `${d.cook_minutes} мин` : null,
        (d.ingredients || []).length ? `${d.ingredients.length} продукта` : null,
      ].filter(Boolean).join(' · ');
      return `
        <button class="idea" type="button" aria-pressed="false" data-dish-id="${d.id}" data-dish-name="${esc(d.name)}">
          <span class="emoji">${esc(d.emoji || '🍽️')}</span>
          <span class="name">${esc(d.name)}</span>
          ${meta ? `<span class="meta">${esc(meta)}</span>` : ''}
          ${item.price_tenge ? `<span class="price">от ${FT.fmt.tenge(item.price_tenge)}</span>` : ''}
        </button>`;
    }).join('');

    reel.querySelectorAll('.idea').forEach((button) => {
      button.addEventListener('click', () => {
        reel.querySelectorAll('.idea').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        $('idea-input').value = '';
        pair({ dishId: Number(button.dataset.dishId), label: button.dataset.dishName });
      });
    });
  }

  // ── Шаг 2: рецепт + пиво ───────────────────────────────

  async function pair({ dishId = null, dishText = '', label = '' }) {
    const button = $('idea-go');
    busy(button, true, 'Собираю…');
    try {
      const data = await FT.pair(state.sessionToken, { dishId, dishText, useAi: true });
      state.recommendations = data.recommendations || [];
      renderPlan(data, label || data.dish);
    } catch (e) {
      if (e.status === 409) toast('В этом магазине нет доступных позиций Efes — спросите сотрудника.', true);
      else if (e.status === 404) toast('Сессия истекла. Отсканируйте QR заново.', true);
      else toast(e.message, true);
    } finally {
      busy(button, false);
    }
  }

  function renderPlan(data, label) {
    const cook = data.cook;
    $('plan-title').textContent = cook ? cook.dish : label;
    $('plan-meta').textContent = cook
      ? [cook.cuisine, cook.cook_minutes ? `${cook.cook_minutes} минут` : null].filter(Boolean).join(' · ')
      : 'Пиво под то, что уже в корзине';

    if (cook && (cook.ingredients || []).length) {
      $('basket').innerHTML = cook.ingredients.map((line, i) => `
        <li><label>
          <input type="checkbox" data-buy="${i}">
          <span class="box">✓</span>
          <span class="txt">${esc(line)}</span>
        </label></li>`).join('');
      $('recipe').textContent = cook.cook_hint;
      updateBasket();
      $('basket').querySelectorAll('input').forEach((box) => box.addEventListener('change', updateBasket));
      show('cook-card');
    } else {
      hide('cook-card');
    }

    $('reco-list').innerHTML = state.recommendations.map((reco, index) => {
      const beer = reco.beer;
      const sub = [beer.brand_name, beer.style_display, `${beer.abv}%`,
                   beer.ibu ? `IBU ${beer.ibu}` : null].filter(Boolean).join(' · ');
      const tags = [];
      if (beer.is_premium) tags.push('<span class="chip gold">Премиум</span>');
      if (beer.serving_temp) tags.push(`<span class="chip">Подавать ${esc(beer.serving_temp)}</span>`);

      const bridges = (reco.bridges || []).length
        ? `<div class="bridges">${reco.bridges.map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div>`
        : '';
      const source = reco.source === 'ai'
        ? 'Объяснил Макс · ИИ-сомелье'
        : (reco.source === 'rules' ? 'Подобрано по вкусовым мостам' : 'Выбор магазина');

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
            <button class="primary" data-order="${reco.id}">Беру</button>
          </div>
        </article>`;
    }).join('');

    $('reco-list').querySelectorAll('[data-order]').forEach((button) => {
      button.addEventListener('click', () => take(Number(button.dataset.order), button));
    });

    hide('step-idea');
    show('step-plan');
    markStep(1);
    top();
  }

  function updateBasket() {
    const boxes = $('basket').querySelectorAll('input');
    const done = Array.from(boxes).filter((b) => b.checked).length;
    $('basket-count').textContent = `${done} из ${boxes.length}`;
  }

  // ── Шаг 3: взял + оценка ───────────────────────────────

  async function take(recommendationId, button) {
    busy(button, true, 'Готово…');
    try {
      const data = await FT.order(state.sessionToken, recommendationId);
      state.activeReco = recommendationId;
      state.rating = 0;

      $('done-beer').textContent = data.beer;
      $('done-message').textContent = data.message;
      $('rate-hint').textContent = 'Попробуете вечером — вернитесь и оцените.';
      hide('claim');
      show('claim-form-wrap');
      $('claim-hint').textContent = '';
      renderStars();

      hide('step-plan');
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
              data-rating="${value}" aria-label="${value} из 5">★</button>`).join('');
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
      if (data.can_claim && !state.claimed) {
        if (FT.isAuthed()) attachToProfile();
        else show('claim');
      }
    } catch (e) {
      toast(e.message, true);
    }
  }

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
        ? 'Эта сессия уже привязана к другому профилю.'
        : e.message;
    } finally {
      busy(button, false);
    }
  }

  function backToIdeas() {
    hide('step-plan'); hide('step-done'); show('step-idea');
    $('idea-grid').querySelectorAll('.idea').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    markStep(0);
    top();
  }

  // ── Макс ───────────────────────────────────────────────

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
    el.className = 'card tight small';
    el.style.marginLeft = who === 'me' ? '18%' : '0';
    el.style.marginRight = who === 'me' ? '0' : '18%';
    if (who === 'me') el.style.borderColor = 'rgba(155,107,61,.28)';
    el.textContent = text;
    $('ask-log').appendChild(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return el;
  }

  // ── События ────────────────────────────────────────────

  $('idea-go').addEventListener('click', () => {
    const text = $('idea-input').value.trim();
    if (!text) { toast('Выберите идею или напишите, что в корзине.'); return; }
    pair({ dishText: text, label: text });
  });
  $('idea-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('idea-go').click(); });
  $('ask-go').addEventListener('click', ask);
  $('ask-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });
  $('back-idea').addEventListener('click', backToIdeas);
  $('again').addEventListener('click', backToIdeas);
  $('claim-login').addEventListener('click', (e) => claimSession('login', e.currentTarget));
  $('claim-register').addEventListener('click', (e) => claimSession('register', e.currentTarget));
  $('claim-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('claim-login').click(); });

  boot();
})();
