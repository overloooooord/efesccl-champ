/**
 * Flavor Tree — кабинет заведения.
 *
 * Всё считает сервер (/api/venue/dashboard/), страница только рисует.
 * Доступ — по токену сотрудника с ролью управляющего или бар-менеджера.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = FT.escape;
  const tenge = FT.fmt.tenge;

  // Тип точки нужен разным блокам страницы — держим его рядом
  const state = { venue: null };

  let toastTimer = null;
  function toast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' err' : '');
    el.textContent = message;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 3600);
  }

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  // ── Вход ───────────────────────────────────────────────

  function showLogin(message) {
    hide('loading');
    hide('app');
    show('login');
    if (message) {
      $('login-err').textContent = message;
      show('login-err');
    }
  }

  async function doLogin() {
    const username = $('username').value.trim();
    const password = $('password').value;
    if (!username || !password) {
      $('login-err').textContent = 'Введите логин и пароль.';
      show('login-err');
      return;
    }

    const button = $('login-go');
    button.disabled = true;
    button.textContent = 'Входим…';
    try {
      await FT.login(username, password);
      hide('login');
      hide('login-err');
      $('password').value = '';
      show('loading');
      await load();
    } catch (e) {
      $('login-err').textContent = e.status === 401
        ? 'Неверный логин или пароль.'
        : e.message;
      show('login-err');
    } finally {
      button.disabled = false;
      button.textContent = 'Войти';
    }
  }

  // ── Загрузка данных ────────────────────────────────────

  async function load() {
    const days = Number($('period').value) || 30;
    try {
      const [dash, staff, tables, card] = await Promise.all([
        FT.dashboard(days),
        FT.venueStaff(),
        FT.venueTables(),
        FT.beerCard(),
      ]);

      renderHeader(dash);
      renderKpis(dash);
      renderFunnel(dash);
      renderChart(dash.scans_by_day || []);
      renderPairs(dash.top_pairs || []);
      renderTopBeers(dash.top_beers || []);
      renderBeerCard(card.beers || []);
      renderStaff(staff.staff || []);
      renderTables(tables.tables || []);

      hide('loading');
      hide('login');
      show('app');
    } catch (e) {
      if (e.status === 401) {
        showLogin('Сессия истекла — войдите заново.');
      } else if (e.status === 403) {
        showLogin(e.message);
      } else {
        hide('loading');
        toast(e.message, true);
      }
    }
  }

  // ── Рендеринг ──────────────────────────────────────────

  function renderHeader(dash) {
    const venue = dash.venue;
    state.venue = venue;
    $('venue-chip').textContent = [venue.name, venue.city].filter(Boolean).join(' · ');
    $('plan-chip').textContent = `Тариф: ${venue.plan}`;
    $('funnel-period').textContent = `за ${dash.period_days} дн.`;
    document.title = `${venue.name} — кабинет Flavor Tree`;

    // Магазин и ресторан считают одно и то же, но называют по-разному
    const retail = venue.kind === 'retail';
    $('points-title').textContent = retail ? 'Полки и QR' : 'Столы и QR';
    $('points-hint').textContent = retail
      ? 'ссылки для печати шелфтокеров'
      : 'ссылки для печати тейбл-тентов';
  }

  function kpi(label, value, sub, gold = false) {
    return `
      <div class="card kpi">
        <div class="label">${esc(label)}</div>
        <div class="value${gold ? ' gold' : ''}">${esc(value)}</div>
        <div class="sub">${esc(sub)}</div>
      </div>`;
  }

  function renderKpis(dash) {
    const f = dash.funnel;
    const m = dash.money;
    const q = dash.quality;

    $('kpis').innerHTML = [
      kpi('Сканов QR', f.scans, `${f.sessions_with_recommendation} дошли до подбора`),
      kpi('Заказов по совету', f.orders,
          `${FT.fmt.percent(f.guest_to_order_percent)} гостей заказали после совета`, true),
      kpi('Выручка с пива', tenge(m.beer_revenue_tenge), `средний чек ${tenge(m.avg_order_tenge)}`, true),
      kpi('Премиум-доля', FT.fmt.percent(m.premium_share_percent), `${m.premium_orders} премиальных заказов`),
      kpi('Оценка гостей', q.avg_guest_rating ? `${q.avg_guest_rating} / 5` : '—',
          `${q.ratings_count} оценок`),
      kpi('Обучено персонала', `${dash.staff.trained} / ${dash.staff.total}`,
          `${FT.fmt.percent(dash.staff.trained_percent)} команды`),
    ].join('');
  }

  function renderFunnel(dash) {
    const f = dash.funnel;
    const stages = [
      { name: 'Отсканировали QR', value: f.scans, note: '' },
      { name: 'Запросили подбор', value: f.sessions_with_recommendation,
        note: `${FT.fmt.percent(f.scan_to_reco_percent)} от сканов` },
      { name: 'Показано рекомендаций', value: f.recommendations_shown, note: '' },
      { name: 'Гостей заказали пиво', value: f.guests_who_ordered,
        note: `${FT.fmt.percent(f.guest_to_order_percent)} от дошедших до подбора` },
      { name: 'Заказов всего', value: f.orders,
        note: `${FT.fmt.percent(f.reco_to_order_percent)} от показанных карточек` },
    ];
    const max = Math.max(...stages.map((s) => s.value), 1);

    $('funnel').innerHTML = stages.map((stage) => `
      <div class="stage">
        <div class="row"><span>${esc(stage.name)}</span><b>${stage.value}</b></div>
        <div class="bar"><i style="width:${Math.max((stage.value / max) * 100, 1)}%"></i></div>
        ${stage.note ? `<div class="conv">${esc(stage.note)}</div>` : ''}
      </div>
    `).join('');
  }

  function renderChart(days) {
    if (!days.length) {
      $('chart-card').innerHTML = '<div class="empty">Сканов за период пока нет.</div>';
      return;
    }
    const max = Math.max(...days.map((d) => d.scans), 1);
    const bars = days.map((d) => `
      <div class="col" style="height:${(d.scans / max) * 100}%"
           title="${esc(d.date)}: ${d.scans}"></div>
    `).join('');

    $('chart-card').innerHTML = `
      <div class="chart">${bars}</div>
      <div class="chart-x">
        <span>${esc(FT.fmt.date(days[0].date))}</span>
        <span>максимум ${max} / день</span>
        <span>${esc(FT.fmt.date(days[days.length - 1].date))}</span>
      </div>`;
  }

  function renderPairs(pairs) {
    if (!pairs.length) {
      $('pairs').innerHTML = '<div class="empty">Данных пока нет — нужны первые сканы.</div>';
      return;
    }
    $('pairs').innerHTML = `
      <table>
        <thead><tr>
          <th>Блюдо</th><th>Пиво</th>
          <th class="num">Показов</th><th class="num">Заказов</th><th class="num">Конв.</th>
        </tr></thead>
        <tbody>${pairs.map((p) => `
          <tr>
            <td>${esc(p.dish)}</td>
            <td>${esc(p.beer)}</td>
            <td class="num">${p.shown}</td>
            <td class="num">${p.ordered}</td>
            <td class="num">${FT.fmt.percent(p.conversion_percent)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderTopBeers(beers) {
    if (!beers.length) {
      $('beers').innerHTML = '<div class="empty">Заказов за период нет.</div>';
      return;
    }
    $('beers').innerHTML = `
      <table>
        <thead><tr><th>Пиво</th><th class="num">Заказов</th><th class="num">Выручка</th></tr></thead>
        <tbody>${beers.map((b) => `
          <tr>
            <td>${esc(b.beer)}</td>
            <td class="num">${b.ordered}</td>
            <td class="num">${esc(tenge(b.revenue_tenge))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderBeerCard(listings) {
    if (!listings.length) {
      $('beer-card').innerHTML = '<div class="empty">Пивная карта пуста. Добавьте позиции в админке.</div>';
      return;
    }
    $('beer-card').innerHTML = listings.map((listing) => {
      const beer = listing.beer;
      const meta = [beer.style_display || beer.style, `${beer.abv}%`,
                    listing.on_tap ? 'разливное' : 'бутылка',
                    `${listing.volume_ml} мл`].filter(Boolean).join(' · ');
      return `
        <div class="beer-row${listing.is_available ? '' : ' off'}" data-row="${listing.id}">
          <div class="info">
            <div class="bname">${esc(beer.name)}</div>
            <div class="bmeta">${esc(meta)} · ${esc(tenge(listing.price_tenge))}</div>
          </div>
          <button class="toggle ${listing.is_available ? 'on' : 'off'}"
                  data-id="${listing.id}" data-available="${listing.is_available}">
            ${listing.is_available ? 'В наличии' : 'В стоп-листе'}
          </button>
        </div>`;
    }).join('');

    $('beer-card').querySelectorAll('.toggle').forEach((button) => {
      button.addEventListener('click', () => toggleBeer(button));
    });
  }

  async function toggleBeer(button) {
    const id = Number(button.dataset.id);
    const next = button.dataset.available !== 'true';
    button.disabled = true;
    try {
      const data = await FT.toggleBeer(id, next);
      button.dataset.available = String(data.is_available);
      button.className = `toggle ${data.is_available ? 'on' : 'off'}`;
      button.textContent = data.is_available ? 'В наличии' : 'В стоп-листе';
      document.querySelector(`[data-row="${id}"]`)
        .classList.toggle('off', !data.is_available);
      toast(data.is_available
        ? `${data.beer} снова в рекомендациях.`
        : `${data.beer} убран из рекомендаций.`);
    } catch (e) {
      toast(e.message, true);
    } finally {
      button.disabled = false;
    }
  }

  function renderStaff(staff) {
    if (!staff.length) {
      $('staff').innerHTML = '<div class="empty">Сотрудники не добавлены.</div>';
      return;
    }
    $('staff').innerHTML = `
      <table>
        <thead><tr><th>Сотрудник</th><th>Роль</th><th>Уровень</th><th class="num">Уроков</th><th class="num">XP</th></tr></thead>
        <tbody>${staff.map((member) => `
          <tr>
            <td>${esc(member.name)}${member.is_active ? '' : ' <span class="muted">(неактивен)</span>'}</td>
            <td class="muted">${esc(member.role_display)}</td>
            <td class="muted">${member.level_name ? esc(member.level_name) : 'не начинал'}</td>
            <td class="num">${member.lessons_done}</td>
            <td class="num">${member.total_xp}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderTables(tables) {
    const retail = state.venue && state.venue.kind === 'retail';
    if (!tables.length) {
      $('tables').innerHTML = `<div class="empty">${retail ? 'Полки' : 'Столы'} не добавлены.</div>`;
      return;
    }
    $('tables').innerHTML = tables.map((table) => `
      <div class="table-card${table.is_active ? '' : ' off'}">
        <div class="n">${retail ? esc(table.number) : '№' + esc(table.number)}</div>
        <div class="z">${esc(table.zone || '—')}${retail ? '' : ` · ${table.seats} мест`}</div>
        <a href="${esc(table.qr_path)}" target="_blank" rel="noopener">открыть как гость</a>
      </div>`).join('');
  }

  // ── События ────────────────────────────────────────────

  $('login-go').addEventListener('click', doLogin);
  ['username', 'password'].forEach((id) => {
    $(id).addEventListener('keydown', (event) => {
      if (event.key === 'Enter') doLogin();
    });
  });

  $('period').addEventListener('change', () => load());
  $('refresh').addEventListener('click', () => load());
  $('logout').addEventListener('click', async () => {
    await FT.logout();
    showLogin('Вы вышли из кабинета.');
  });

  if (FT.isAuthed()) load();
  else showLogin();
})();
