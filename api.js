/**
 * Flavor Tree — тонкий клиент Django REST API.
 *
 * Одна точка входа для страниц пилота (table.html, dashboard.html).
 * Ключей и секретов здесь нет: AI живёт на сервере, гость авторизации не требует.
 */
(function (global) {
  'use strict';

  // База API. По умолчанию — тот же хост; для локальной разработки со статикой
  // на другом порту можно задать window.FT_API_BASE или ?api=http://127.0.0.1:8000
  function resolveBase() {
    const fromQuery = new URLSearchParams(location.search).get('api');
    if (fromQuery) return fromQuery.replace(/\/$/, '');
    if (global.FT_API_BASE) return String(global.FT_API_BASE).replace(/\/$/, '');
    try {
      const saved = localStorage.getItem('ft_api_base');
      if (saved) return saved.replace(/\/$/, '');
    } catch (e) { /* приватный режим — просто игнорируем */ }
    // file:// открывается при демо с флешки — тогда бьём в локальный сервер
    if (location.protocol === 'file:') return 'http://127.0.0.1:8000';
    return '';
  }

  const BASE = resolveBase();

  const TOKEN_KEY = 'ft_auth_token';

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* noop */ }
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  /** Достаёт человекочитаемое сообщение из ответа DRF любой формы. */
  function humanError(payload, status) {
    if (!payload) return `Ошибка ${status}`;
    if (typeof payload === 'string') return payload;
    if (payload.error) return payload.error;
    if (payload.detail) return payload.detail;
    const first = Object.values(payload)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
    return `Ошибка ${status}`;
  }

  async function request(path, { method = 'GET', body = null, auth = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== null) headers['Content-Type'] = 'application/json';

    const token = read(TOKEN_KEY);
    if (auth && token) headers.Authorization = `Token ${token}`;

    let response;
    try {
      response = await fetch(`${BASE}/api${path}`, {
        method,
        headers,
        body: body === null ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError('Нет связи с сервером. Проверьте интернет.', 0, null);
    }

    if (response.status === 204) return null;

    let payload = null;
    const text = await response.text();
    if (text) {
      try { payload = JSON.parse(text); } catch (e) { payload = text; }
    }

    if (!response.ok) {
      throw new ApiError(humanError(payload, response.status), response.status, payload);
    }
    return payload;
  }

  const api = {
    BASE,
    ApiError,
    request,

    // ── Гость за столом (без регистрации) ──
    resolveTable: (qrToken) => request(`/t/${encodeURIComponent(qrToken)}/`),

    pair: (sessionToken, { dishId = null, dishText = '', useAi = true } = {}) =>
      request('/venue/pair/', {
        method: 'POST',
        body: {
          session_token: sessionToken,
          dish_id: dishId,
          dish_text: dishText,
          use_ai: useAi,
        },
      }),

    order: (sessionToken, recommendationId) =>
      request('/venue/order/', {
        method: 'POST',
        body: { session_token: sessionToken, recommendation_id: recommendationId },
      }),

    rate: (sessionToken, recommendationId, rating, notesText = '') =>
      request('/venue/rate/', {
        method: 'POST',
        body: {
          session_token: sessionToken,
          recommendation_id: recommendationId,
          rating,
          notes_text: notesText,
        },
      }),

    claim: (sessionToken) =>
      request('/venue/claim/', {
        method: 'POST', body: { session_token: sessionToken }, auth: true,
      }),

    ask: (sessionToken, message) =>
      request('/venue/ask/', {
        method: 'POST',
        body: { session_token: sessionToken, message },
      }),

    // ── Каталог ──
    beers: () => request('/beers/'),
    beer: (id) => request(`/beers/${id}/`),
    flavors: () => request('/flavors/'),
    match: (dish) => request('/match/', { method: 'POST', body: { dish } }),

    // ── Аккаунт ──
    async register(username, password, email = '') {
      const data = await request('/auth/register/', {
        method: 'POST', body: { username, password, email },
      });
      if (data && data.token) store(TOKEN_KEY, data.token);
      return data;
    },

    async login(username, password) {
      const data = await request('/auth/login/', {
        method: 'POST', body: { username, password },
      });
      if (data && data.token) store(TOKEN_KEY, data.token);
      return data;
    },

    async logout() {
      try { await request('/auth/logout/', { method: 'POST', auth: true }); }
      finally { store(TOKEN_KEY, null); }
    },

    me: () => request('/auth/me/', { auth: true }),
    isAuthed: () => Boolean(read(TOKEN_KEY)),
    token: () => read(TOKEN_KEY),

    // ── Школа и профиль ──
    flavorDna: () => request('/profile/dna/', { auth: true }),
    tastings: () => request('/tastings/', { auth: true }),
    addTasting: (payload) => request('/tastings/', { method: 'POST', body: payload, auth: true }),
    // Один запрос отдаёт всю программу: уровни → уроки → вопросы (без правильных ответов)
    levels: () => request('/school/levels/'),
    lessons: () => request('/school/lessons/'),
    lesson: (slug) => request(`/school/lessons/${encodeURIComponent(slug)}/`),
    checkAnswer: (questionId, selectedIndex) =>
      request('/school/quiz/', {
        method: 'POST', body: { question_id: questionId, selected_index: selectedIndex },
      }),
    completeLesson: (lessonSlug, answers) =>
      request('/school/complete/', {
        method: 'POST', body: { lesson_slug: lessonSlug, answers }, auth: true,
      }),
    myProgress: () => request('/school/progress/', { auth: true }),

    // ── Кабинет заведения (B2B) ──
    dashboard: (days = 30) => request(`/venue/dashboard/?days=${days}`, { auth: true }),
    venueStaff: () => request('/venue/staff/', { auth: true }),
    venueTables: () => request('/venue/tables/', { auth: true }),
    beerCard: () => request('/venue/beer-card/', { auth: true }),
    toggleBeer: (venueBeerId, isAvailable) =>
      request('/venue/beer-availability/', {
        method: 'POST',
        body: { venue_beer_id: venueBeerId, is_available: isAvailable },
        auth: true,
      }),
  };

  // ── Утилиты представления ──
  api.fmt = {
    tenge: (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₸`,
    percent: (value) => `${Number(value || 0).toFixed(1).replace(/\.0$/, '')}%`,
    date: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    },
  };

  /**
   * Акцент заведения приходит из данных и часто светлый (жёлтое золото).
   * На кремовом фоне таким цветом нельзя писать цены и подписи, поэтому
   * притемняем его ровно до контраста 4.5:1 к фону страницы: бренд
   * остаётся узнаваемым, а текст — читаемым. Годится для любого венью,
   * включая те, что клиент добавит сам.
   */
  const INK = [44, 36, 23];
  const PAGE_BG = [250, 248, 245];

  const parseHex = (hex) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };

  const luminance = (rgb) => {
    const c = rgb.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };

  const contrast = (a, b) => {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  api.accentFor = (hex, minRatio = 4.5) => {
    const rgb = parseHex(hex);
    if (!rgb) return null;
    for (let mix = 0; mix <= 1.001; mix += 0.05) {
      const shade = rgb.map((v, i) => Math.round(v + (INK[i] - v) * mix));
      if (contrast(shade, PAGE_BG) >= minRatio) {
        return '#' + shade.map((v) => v.toString(16).padStart(2, '0')).join('');
      }
    }
    return '#' + INK.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  /** Экранирование: всё, что приходит с сервера, вставляем как текст. */
  api.escape = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  global.FT = api;
})(window);
