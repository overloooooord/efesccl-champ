const app = document.getElementById('app');
let currentPage = 'home', flowMode = null, flowStep = 0, flowSelections = {}, chatHistory = [];
const OPENROUTER_KEY = localStorage.getItem('ft_api_key') || '';

// ═══ AI через собственный сервер ═══
// Ключ OpenRouter живёт на бэкенде (OPENROUTER_API_KEY), поэтому AI работает
// у любого гостя, а не только у того, кто вручную вписал ключ в localStorage.
// Возвращает текст ответа или null — тогда падаем в локальный fallback.
// onlyAi=true — берём ответ только от настоящей модели: серверный fallback
// написан в формате чата и в слоте «почему сочетается» смотрелся бы не к месту.
async function serverAI(message, onlyAi = false) {
  if (typeof FT === 'undefined') return null;
  try {
    const data = await FT.request('/ai/sommelier/', { method: 'POST', body: { message } });
    if (!data || !data.message) return null;
    if (onlyAi && data.source !== 'ai') return null;
    return data.message;
  } catch (e) {
    return null;
  }
}
let globalMeal = localStorage.getItem('ft_global_meal') || '';
window.setGlobalMeal = function (v) {
  globalMeal = v;
  localStorage.setItem('ft_global_meal', v);
  if (currentPage === 'catalog') renderCatalog();
  else if (currentPage === 'home') renderHome();
};
// ═══ TRACKING ═══
const T = { start: Date.now(), views: {}, clicks: [], pairings: [], chats: 0, sessions: JSON.parse(localStorage.getItem('ft_sessions') || '[]') };
T.sessions.push({ ts: Date.now(), ua: navigator.userAgent });
if (T.sessions.length > 100) T.sessions = T.sessions.slice(-100);
localStorage.setItem('ft_sessions', JSON.stringify(T.sessions));
function track(type, data) { T.clicks.push({ ts: Date.now(), type, data }); T.views[currentPage] = (T.views[currentPage] || 0) + 1; }

function fadeIn() { app.style.opacity = '0'; app.style.transition = 'opacity .25s ease'; requestAnimationFrame(() => { requestAnimationFrame(() => { app.style.opacity = '1' }) }) }
// Появление по скроллу: длинная главная без него читается как один
// бесконечный столбец. Через animation, а не transition — анимация
// переживает перерисовку и не залипает в промежуточном кадре.
const REVEAL_SEL = '.hero > *, .path-card, .sec-head, .shelf-card, .fact, .brand-card, .level-card, .quiz-row, .pick-row';
let revObserver = null;
let revSafety = null;
function reveal() {
  const nodes = Array.prototype.slice.call(app.querySelectorAll(REVEAL_SEL));
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) { nodes.forEach(n => n.classList.add('rv', 'in')); return }
  if (!revObserver) {
    revObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObserver.unobserve(e.target) } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  }
  nodes.forEach((n, i) => {
    n.classList.add('rv');
    // Внутри одной группы задержка растёт, между группами сбрасывается —
    // иначе десятый факт ждёт полсекунды и выглядит сломанным.
    n.style.setProperty('--d', String(i % 4));
    revObserver.observe(n);
  });
  // Страховка: если наблюдатель почему-то не сработал (фоновая вкладка,
  // нулевая высота контейнера в момент рендера), контент не должен
  // остаться невидимым — через секунду показываем всё как есть.
  clearTimeout(revSafety);
  revSafety = setTimeout(() => nodes.forEach(n => n.classList.add('in')), 1100);
}
window.reveal = reveal;
function isLoggedIn() { return !!localStorage.getItem('ft_profile') && JSON.parse(localStorage.getItem('ft_profile')).registered }
function navigate(p) {
  currentPage = p; track('navigate', p); document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.page === p));
  fadeIn();
  if (p === 'home') renderHome(); else if (p === 'catalog') renderCatalog(); else if (p === 'ai') renderAI(); else if (p === 'lexicon') renderLexicon(); else if (p === 'tools') renderTools(); else if (p === 'admin') renderAdmin(); else if (p === 'learn') renderLearn(); else if (p === 'profile') renderProfile(); else if (p === 'register') renderRegister(); else if (p === 'tinder') renderTinder(); else if (p === 'dashboard') renderDashboard(); else if (p === 'staff') renderStaff(); else if (p === 'qr') renderQR(); else if (p === 'staffTraining') renderStaffTraining();
}
function goHome() { navigate('home') }

// ═══ Тост ═══
// Единственный способ сказать гостю «готово» так, чтобы не ломать поток
// экрана: alert() блокирует страницу и выглядит чужим на тёмной теме.
let toastTimer = null;
function toast(message, isError = false) {
  const old = document.querySelector('.ft-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'ft-toast' + (isError ? ' bad' : '');
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 420) }, 3200);
}
window.toast = toast;

// Русские числительные: «1 бренд», «2 бренда», «5 брендов».
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100; const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
window.plural = plural;

// ═══ Иконки ═══
// Эмодзи выдают шаблон: они разной ширины, разного стиля и на тёмном фоне
// светятся мультиком. Линейный сет 24×24 со stroke:currentColor держит
// один вес линии со вкладками навигации и наследует цвет от контекста.
const ICONS = {
  hop:     '<path d="M12 3.6c2.6 0 4.6 1.9 4.6 4.4 0 3.9-2.2 8.4-4.6 12-2.4-3.6-4.6-8.1-4.6-12C7.4 5.5 9.4 3.6 12 3.6Z"/><path d="M12 6.4c1 1 1.6 2.2 1.6 3.4s-.6 2.5-1.6 3.5c-1-1-1.6-2.2-1.6-3.5s.6-2.4 1.6-3.4Z"/>',
  barley:  '<path d="M12 20.4V9.2"/><path d="M12 9.2c0-2.6 1.2-4.6 3.2-5.6.4 2.8-.6 5-3.2 5.6Z"/><path d="M12 9.2C12 6.6 10.8 4.6 8.8 3.6 8.4 6.4 9.4 8.6 12 9.2Z"/><path d="M12 14.4c0-2.2 1.1-3.8 3-4.6.3 2.3-.6 4.1-3 4.6Z"/><path d="M12 14.4c0-2.2-1.1-3.8-3-4.6-.3 2.3.6 4.1 3 4.6Z"/>',
  pyramid: '<path d="M12 3.8 20.6 19.6H3.4z"/><path d="M7.6 13.4h8.8"/><path d="M9.6 8.8h4.8"/>',
  sparkle: '<path d="M12 3.4l1.8 5.2 5.2 1.8-5.2 1.8L12 17.4l-1.8-5.2L5 10.4l5.2-1.8z"/>',
  heart:   '<path d="M12 20.2s-7.2-4.5-7.2-9.4A4.2 4.2 0 0 1 12 8.3a4.2 4.2 0 0 1 7.2 2.5c0 4.9-7.2 9.4-7.2 9.4Z"/>',
  leaf:    '<path d="M4.8 19.4c0-7.2 5.2-12.4 14.4-13.4 1 9.2-4.2 14.4-11.4 14.4"/><path d="M8.4 15.8C11 13.2 14 11.6 17.6 11.2"/>',
  somm:    '<path d="M8 4.4h8l-.9 4.8a3.2 3.2 0 0 1-6.2 0z"/><path d="M12 10.8V18"/><path d="M9 18.2h6"/><path d="M19 3.2l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z"/>',
  plate:   '<path d="M8.6 3.8v6.2a2 2 0 0 0 4 0V3.8"/><path d="M10.6 10.4V20.2"/><path d="M16.6 3.8v16.4"/><path d="M16.6 3.8c1.7.8 2.5 2.2 2.5 4.2s-.8 3.4-2.5 4.2"/>',
  glass:   '<path d="M8 4.6h8l-1 14a2 2 0 0 1-2 1.9h-2a2 2 0 0 1-2-1.9z"/><path d="M8.3 9.3h7.4"/><path d="M16 7.6h1.8a1.8 1.8 0 0 1 1.8 1.8v2.4a1.8 1.8 0 0 1-1.8 1.8h-1.4"/>',
  thermo:  '<path d="M10 13.8V6.3a2 2 0 0 1 4 0v7.5a4 4 0 1 1-4 0Z"/><path d="M12 16.8v-5.2"/>',
  dna:     '<path d="M7 3.6c0 6.2 10 9 10 16.8"/><path d="M17 3.6c0 6.2-10 9-10 16.8"/><path d="M8.8 8.2h6.4"/><path d="M8.8 15.6h6.4"/>',
  cat:     '<path d="M5.8 9.4 6.2 4.6l3.8 2.7"/><path d="M18.2 9.4 17.8 4.6 14 7.3"/><path d="M12 6.8c3.6 0 6.5 2.9 6.5 6.3S15.6 19.8 12 19.8 5.5 16.5 5.5 13.1 8.4 6.8 12 6.8Z"/><path d="M9.9 12.6h.02"/><path d="M14.1 12.6h.02"/><path d="M10.6 16.2c.9.6 1.9.6 2.8 0"/>',
  cheese:  '<path d="M3.8 15.8V11l12.2-5.6 4.2 3.8v6.6z"/><path d="M3.8 11h16.4"/><path d="M8.8 13.4h.02"/><path d="M14.6 13.2h.02"/>',
  droplet: '<path d="M12 3.8c3 3.9 5 6.5 5 8.9a5 5 0 0 1-10 0c0-2.4 2-5 5-8.9Z"/><path d="M9.7 13.4a2.4 2.4 0 0 0 2.3 2.3"/>',
  box:     '<path d="M4 8.5 12 4.4l8 4.1v7.1l-8 4.1-8-4.1z"/><path d="M4 8.5l8 4.1 8-4.1"/><path d="M12 12.6v7.5"/>',
  flute:   '<path d="M8.6 4h6.8l-.7 4.7a3 3 0 0 1-5.4 0z"/><path d="M12 10.5V19"/><path d="M9.2 19.2h5.6"/>',
  flame:   '<path d="M12 3.6c1.5 2.5 3.7 3.7 3.7 6.7 0 1.6-.8 2.7-1.9 3.3.5-1.9-.4-3.1-1.8-4.3.2 2.5-1.2 3.5-2.2 4.7-.8 1-1.5 2-1.5 3.3A5.7 5.7 0 0 0 12 20.4a5.7 5.7 0 0 0 5.7-5.5c0-4.5-3.4-6.5-5.7-11.3Z"/>',
  school:  '<path d="M3.2 8.5 12 4.7l8.8 3.8L12 12.3z"/><path d="M6.8 10.3v4.1c0 1.5 2.4 2.6 5.2 2.6s5.2-1.1 5.2-2.6v-4.1"/><path d="M20.8 8.5v4.3"/>',
  search:  '<path d="M11 4.8a6.2 6.2 0 1 1 0 12.4 6.2 6.2 0 0 1 0-12.4Z"/><path d="M15.6 15.6 20 20"/>',
  arrow:   '<path d="M4.6 12h14"/><path d="M13 6.6 18.4 12 13 17.4"/>',
  book:    '<path d="M4 5.2A2 2 0 0 1 6 3.2h13v14.4H6a2 2 0 0 0-2 2z"/><path d="M4 5.2v14.4a2 2 0 0 0 2 2h13"/><path d="M8.4 7.6h6.8"/><path d="M8.4 11h5"/>',
  chart:   '<path d="M4 20h16"/><path d="M6.6 20V12.4"/><path d="M11.4 20V6.6"/><path d="M16.2 20v-5.4"/>',
  chef:    '<path d="M7.6 20.2h8.8"/><path d="M6.8 16.6h10.4v3.6H6.8z"/><path d="M8.2 16.6c-2 0-3.6-1.6-3.6-3.6a3.6 3.6 0 0 1 3-3.5 4.4 4.4 0 0 1 8.8 0 3.6 3.6 0 0 1-.4 7.1"/>',
  key:     '<path d="M15.4 3.6a5 5 0 0 1 0 10 5 5 0 0 1-2.6-.7L11 14.8H8.8v2.2H6.6v2.2H3.4v-3.2l7.3-7.3a5 5 0 0 1 4.7-5.1Z"/><path d="M16.8 8.2h.02"/>',
  trend:   '<path d="M4 16.6 9.4 11l3.4 3.4 6.8-7"/><path d="M15.6 7.4h4v4"/>',
  qr:      '<path d="M4.4 4.4h5v5h-5z"/><path d="M14.6 4.4h5v5h-5z"/><path d="M4.4 14.6h5v5h-5z"/><path d="M14.6 14.6h2.2v2.2h-2.2z"/><path d="M18.4 18.4h1.2v1.2h-1.2z"/>',
  meat:    '<path d="M3.6 20.4 6.9 17.1"/><path d="M17.1 6.9 20.4 3.6"/><rect x="6.2" y="13.1" width="4.8" height="4.6" rx="1.4" transform="rotate(-45 8.6 15.4)"/><rect x="9.6" y="9.7" width="4.8" height="4.6" rx="1.4" transform="rotate(-45 12 12)"/><rect x="13" y="6.3" width="4.8" height="4.6" rx="1.4" transform="rotate(-45 15.4 8.6)"/>',
  salad:   '<path d="M3.6 11.6h16.8a8.4 8.4 0 0 1-8.4 8.2 8.4 8.4 0 0 1-8.4-8.2Z"/><path d="M9.2 8.8c-1.5-1.7-.7-3.8 1.4-4.4 1.2 1.5 1.1 3.2-.2 4.4"/><path d="M13.2 8.8c1-1.5 3.1-1.7 4.1.2"/>',
  soup:    '<path d="M4.6 10.4h14.8v3.4a5.4 5.4 0 0 1-5.4 5.4h-4a5.4 5.4 0 0 1-5.4-5.4z"/><path d="M19.4 12h1.8"/><path d="M4.6 12H2.8"/><path d="M9.4 7.6c0-1.1 1-1.5 1-2.6"/><path d="M13.4 7.6c0-1.1 1-1.5 1-2.6"/>',
  asian:   '<path d="M4.6 19.6 18.4 5.2"/><path d="M8.4 19.8 20.2 8.4"/><path d="M15.6 15.6 20 19.8"/>',
  fish:    '<path d="M6 12c2.5-5.2 10-6.6 14.5 0-4.5 6.6-12 5.2-14.5 0Z"/><path d="M6 12 2.6 8.4v7.2z"/><circle cx="16.8" cy="10.9" r=".85" fill="currentColor" stroke="none"/>',
  fries:   '<path d="M6.8 9.6h10.4l-1.2 9a1.8 1.8 0 0 1-1.8 1.6H9.8A1.8 1.8 0 0 1 8 18.6z"/><path d="M9.6 9.6 8.8 4.8"/><path d="M12 9.6V4.4"/><path d="M14.4 9.6l.8-4.8"/>',
  cake:    '<path d="M4.8 14.6h14.4v3.2a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M4.8 14.6c0-2.6 3.2-4.6 7.2-4.6s7.2 2 7.2 4.6"/><path d="M12 10V6.6"/><path d="M12 4.8a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/>',
  pan:     '<path d="M3.4 11.8h11.8v1.8a5.9 5.9 0 0 1-11.8 0z"/><path d="M15.2 12.8h5.4"/>',
  oven:    '<path d="M4.4 4.6h15.2v14.8H4.4z"/><path d="M4.4 9.6h15.2"/><path d="M7.8 7.1h1.8"/><path d="M8.6 13.4h6.8"/>',
  stew:    '<path d="M5.6 10.6h12.8v3.2a5.4 5.4 0 0 1-5.4 5.4h-2a5.4 5.4 0 0 1-5.4-5.4z"/><path d="M3.6 8.8h16.8"/><path d="M12 8.8V5.6"/>',
  boil:    '<path d="M4.6 12.6h14.8v2a5.2 5.2 0 0 1-5.2 5.2H9.8a5.2 5.2 0 0 1-5.2-5.2z"/><path d="M9.2 9.6a1.5 1.5 0 1 1 0-3"/><path d="M13.6 8.8a1.9 1.9 0 1 1 0-3.8"/>',
  steam:   '<path d="M6.6 19.6h10.8"/><path d="M8.4 15.8c0-2 2.4-2.5 2.4-4.5s-1.6-2.7-1.6-4.6"/><path d="M14 15.8c0-2 2.4-2.5 2.4-4.5s-1.6-2.7-1.6-4.6"/>',
  wok:     '<path d="M2.6 11h13.8v1.4a6.9 6.9 0 0 1-13.8 0z"/><path d="M16.4 11.8 21.4 9"/><path d="M7 8.2a1.7 1.7 0 1 1 0-3.4"/><path d="M11.6 7.4a2 2 0 1 1 0-4"/>',
  feather: '<path d="M19.4 4.6c-6 0-10.4 3.2-10.4 8.4v3.4l3.6-.6c4.6-.8 6.8-4.8 6.8-11.2Z"/><path d="M9 16.4 4.6 20.4"/>',
  scales:  '<path d="M12 4.6v14.8"/><path d="M6.6 19.4h10.8"/><path d="M4.4 8.8h15.2"/><path d="M4.4 8.8 2.4 13.2a2.6 2.6 0 0 0 4 0z"/><path d="M19.6 8.8l-2 4.4a2.6 2.6 0 0 0 4 0z"/>',
  weight:  '<path d="M6.6 8.8h10.8l1.6 10.6H5z"/><path d="M9 8.8V6.6a3 3 0 0 1 6 0v2.2"/>',
  close:   '<path d="M6.4 6.4 17.6 17.6"/><path d="M17.6 6.4 6.4 17.6"/>',
  check:   '<path d="M5 12.8 9.6 17.4 19 6.6"/>',
  spark:   '<path d="M12 3.6v3"/><path d="M12 17.4v3"/><path d="M4.6 12h3"/><path d="M16.4 12h3"/><path d="M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z"/>',
  spark2:  '<path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h4"/><path d="M16 12h4"/><path d="M6.6 6.6l2.8 2.8"/><path d="M14.6 14.6l2.8 2.8"/><path d="M17.4 6.6l-2.8 2.8"/><path d="M9.4 14.6l-2.8 2.8"/>'
};
// cls нужен точечно (размер, цвет) — иконка не должна тянуть за собой обёртку.
function ico(name, cls) {
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
window.ico = ico;
window.navigate = navigate; window.goHome = goHome;

const FUN_FACTS = [
  { i: 'glass', e: '🍺', t: 'Пиво — древнейший напиток', d: 'Шумеры варили пиво ещё 6000 лет назад. Они даже посвятили ему богиню — Нинкаси.' },
  { i: 'thermo', e: '🌡️', t: 'Температура решает', d: 'Лагер подают при 4–7°C. Каждый лишний градус убивает свежесть и раскрывает горечь.' },
  { i: 'dna', e: '🧬', t: 'IBU — это язык горечи', d: 'IBU 12 — почти вода. IBU 22 — лёгкий намёк. IBU 60+ — IPA для смельчаков.' },
  { i: 'cat', e: '🐱', t: 'Кошачий тон (Catty)', d: 'Аромат кошачьей мочи или листьев чёрной смородины (вызван p-menthane-8-thiol-3-one) указывает на окисление пива, хотя в некоторых элях это норма.' },
  { i: 'cheese', e: '🧀', t: 'Сырные носки (Isovaleric)', d: 'Изовалериановая кислота пахнет потными носками или старым сыром. Это верный маркер использования старого или испорченного хмеля.' },
  { i: 'droplet', e: '🤢', t: 'Прогорклое масло (Butyric)', d: 'Резкий запах рвоты или прогорклого масла вызывается масляной кислотой (Butyric acid) из-за бактериального заражения сусла.' },
  { i: 'box', e: '📦', t: 'Мокрый картон (Papery)', d: 'Запах старой бумаги или картона (trans-2-nonenal) — главный индикатор старения пива из-за окисления и неправильного температурного режима.' },
  { i: 'flute', e: '🥂', t: 'Бокал меняет вкус', d: 'Тюльпан концентрирует аромат хмеля, а пилснер-бокал усиливает газацию и свежесть.' },
  { i: 'flame', e: '🍖', t: 'Пиво × Мясо = наука', d: 'Горечь хмеля расщепляет жир на языке. Именно поэтому шашлык без пива — неполный опыт.' },
  { i: 'barley', e: '🌾', t: 'Три солода Козела', d: 'Карамельный, жжёный и базовый солод — три слоя, которые создают рубиновый цвет и бархатный вкус.' },
];
function renderHome() {
  flowMode = null; flowStep = 0; flowSelections = {};
  const prof = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  const greeting = prof.name ? `С возвращением, <span class="gold">${prof.name}</span>` : '';
  const dishes = new Set();
  BEERS.forEach(b => (b.foods || []).forEach(f => dishes.add(f.dish)));
  app.innerHTML = `<div class="container home">

<section class="hero">
  <span class="hero-aura" aria-hidden="true"></span>
  ${greeting ? `<p class="hero-back">${greeting}</p>` : ''}
  <p class="hero-kicker">Beer &amp; Food Pairing · Efes Kazakhstan</p>
  <h1 class="hero-title">Найди идеальную <em>пару</em></h1>
  <p class="hero-lede">Раскладываем вкус бренда на три слоя — как аромат в парфюмерии — и находим блюдо, которое совпадает с ним нота в ноту.</p>

  <form class="hero-search" onsubmit="event.preventDefault();quickPairing(this.q.value.trim())">
    <span class="hero-search-ico">${ico('search')}</span>
    <input type="text" name="q" id="global-meal-input-home" class="hero-search-in"
      placeholder="Что у вас на столе?"
      value="${globalMeal}"
      autocomplete="off"
      aria-label="Блюдо для подбора пива"
      oninput="setGlobalMeal(this.value)">
    <button type="submit" class="hero-search-go" aria-label="Подобрать пиво">${ico('arrow')}</button>
  </form>

  <div class="hero-seeds">
    <button type="button" class="seed" style="border-color:#b3814e; color:#9b6b3d; font-weight:700;" onclick="openFoodScanner()">📸 Сфоткать блюдо (AI)</button>
    <span class="hero-seeds-label">Например</span>
    ${['Шашлык', 'Сашими', 'Пад Тай', 'Фондан'].map(d => `<button class="seed" onclick="quickPairing('${d}')">${d}</button>`).join('')}
  </div>

  <div class="hero-lineup" aria-hidden="true">
    ${BEERS.map((b, i) => `<span class="hero-bottle" style="--i:${i};--aura:${b.color}"><img src="${b.img}" alt=""></span>`).join('')}
  </div>

  <dl class="hero-stats">
    <div><dt class="num">${BEERS.length}</dt><dd>${plural(BEERS.length, 'бренд', 'бренда', 'брендов')} Efes KZ</dd></div>
    <div><dt class="num">${dishes.size}</dt><dd>${plural(dishes.size, 'блюдо', 'блюда', 'блюд')} в карте вкусов</dd></div>
    <div><dt class="num">3</dt><dd>слоя вкусовой пирамиды</dd></div>
  </dl>
</section>

<section class="paths">
  <div class="path-card" onclick="startFlow('food')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')startFlow('food')">
    <span class="path-ico">${ico('plate')}</span>
    <span class="path-num num">01</span>
    <h3>У меня есть <em>блюдо</em></h3>
    <p>Четыре вопроса — категория, способ приготовления, доминирующий вкус, плотность. В ответ бренд с процентом совпадения и объяснением, что именно связывает пару.</p>
    <span class="path-go">Подобрать пиво ${ico('arrow')}</span>
  </div>
  <div class="path-card" onclick="startFlow('beer')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')startFlow('beer')">
    <span class="path-ico">${ico('glass')}</span>
    <span class="path-num num">02</span>
    <h3>У меня есть <em>пиво</em></h3>
    <p>Полный сенсорный профиль: пирамида вкуса, ноты в процентах, температура подачи и блюда с вкусовыми мостами к каждому из них.</p>
    <span class="path-go">Открыть профиль ${ico('arrow')}</span>
  </div>
</section>

<section class="shelf">
  <header class="sec-head">
    <p class="sec-kicker">На кранах и в холодильнике</p>
    <h2 class="sec-title">Полка <em>Efes Kazakhstan</em></h2>
    <p class="sec-desc">${BEERS.length} ${plural(BEERS.length, 'бренд', 'бренда', 'брендов')} с полным сенсорным разбором. Нажмите — откроется профиль вкуса.</p>
  </header>
  <div class="shelf-rail">
    ${BEERS.map(b => `<button class="shelf-card" style="--aura:${b.color}" onclick="openBeer('${b.id}')">
      <span class="shelf-glow" aria-hidden="true"></span>
      <img class="shelf-shot" src="${b.img}" alt="${b.name}" loading="lazy">
      <span class="shelf-style">${b.style}</span>
      <span class="shelf-name">${b.name}</span>
      <span class="shelf-spec"><span><b class="num">${b.abv}%</b> ABV</span><i></i><span><b class="num">${b.ibu}</b> IBU</span></span>
    </button>`).join('')}
  </div>
</section>

<section class="facts">
  <header class="sec-head">
    <p class="sec-kicker">Сенсорика на пальцах</p>
    <h2 class="sec-title">Знал ли <em>ты?</em></h2>
    <p class="sec-desc">Десять фактов из лексикона FlavorActiV и практики дегустаций — то, что персонал рассказывает гостю за столом.</p>
  </header>
  <ol class="fact-list">
    ${FUN_FACTS.map((f, i) => `<li class="fact">
      <span class="fact-n num">${String(i + 1).padStart(2, '0')}</span>
      <span class="fact-ico">${ico(f.i)}</span>
      <div class="fact-body"><h4>${f.t}</h4><p>${f.d}</p></div>
    </li>`).join('')}
  </ol>
</section>

</div>`;
  reveal();
}

// Профиль бренда открывается из нескольких мест — держим один вход.
window.openBeer = function (id) {
  flowSelections.beer = id; flowMode = 'beer'; flowStep = 2;
  track('open_beer', id); fadeIn(); renderStep();
};

window.startFlow = function (m) { flowMode = m; flowStep = 1; flowSelections = {}; fadeIn(); renderStep() };
window.renderHome = renderHome;

// Гость печатает свободным текстом: «плов», «суши», «что-нибудь сладкое».
// В карте вкусов всего 15 блюд, прямого совпадения чаще нет — поэтому идём
// тремя ступенями: синонимы блюда → категория кухни → вкусовые тона.
const QUICK_ALIASES = {
  'Шашлык из баранины':     'шашлык баранин кебаб люля мангал мясо на угл',
  'Цезарь с курицей':       'цезарь салат курин куриц',
  'Брускетта с томатами':   'брускетт томат помидор закуск гренк пицц оливк',
  'Гуляш по-чешски':        'гуляш суп лагман борщ шурпа солянк рагу харчо бульон',
  'Шоколадный фондан':      'фондан шоколад десерт торт сладк брауни чизкейк мороженое пирог',
  'Утиная грудка с вишней': 'утка утин грудк дичь вишн гус',
  'Дим-самы на пару':       'дим-сам димсам баоцзы на пару азиат',
  'Пад Тай':                'пад тай пад-тай лапша удон вок том ям том-ям остр спайси рамен',
  'Сашими из лосося':       'сашими суши ролл лосос сёмг семг тунец форел морепродукт креветк',
  'Колбаски на гриле':      'колбаск сосиск барбекю гриль',
  'Картошка по-деревенски': 'картош картофел фри гарнир пюре',
  'Домашние пельмени':      'пельмен вареник',
  'Бешбармак':              'бешбармак беш казы конин',
  'Рыба на углях':          'рыба рыбн судак',
  'Манты с бараниной':      'манты самса чебурек'
};

const QUICK_CATS = {
  meat:    'мясо мясн шашлык стейк баранин свинин говядин курин куриц бешбармак беш казы манты пельмен колбас кебаб люля шаурма бургер котлет плов самса чебурек утка утин гуляш рёбр ребр барбекю бекон грудк отбивн',
  fish:    'рыба рыбн лосос сёмг семг форел тунец сашими креветк кальмар морепродукт селёдк селедк икра устриц',
  asian:   'суши ролл вок паназиат том ям том-ям пад тай пад-тай дим-сам азиат кимчи рамен удон лапша соев васаби спайси остр',
  salad:   'салат цезарь овощ зелен греческ помидор томат огурц руккол винегрет',
  snack:   'закуск снек чипс орех сухарик брускетт тапас начос крылышк гренк сыр оливк пицц',
  soup:    'суп шурпа борщ лагман солянк харчо бульон окрошк',
  dessert: 'десерт торт шоколад мороженое фондан чизкейк пирог штрудел сладк выпечк брауни',
  side:    'картош картофел фри рис паста макарон пюре гарнир баурсак хлеб лепешк лепёшк'
};

// Какие тона вытягивают категорию, если конкретного блюда в карте нет.
const QUICK_TONES = {
  meat:    ['malt', 'bread', 'caramel', 'bitter'],
  soup:    ['malt', 'caramel', 'bread'],
  dessert: ['chocolate', 'caramel', 'sweet'],
  asian:   ['fresh', 'floral', 'neutral', 'citrus'],
  fish:    ['fresh', 'citrus', 'neutral'],
  salad:   ['citrus', 'fresh', 'herb'],
  snack:   ['bitter', 'citrus', 'bread'],
  side:    ['bread', 'malt', 'honey']
};

window.quickPairing = function (v) {
  if (!v) { startFlow('food'); return; }
  setGlobalMeal(v);
  flowMode = 'quick';
  const text = String(v).toLowerCase();
  // Гость пишет «шашлык», в меню — «Шашлык из баранины»: сверяем по словам.
  const words = text.split(/[^\wа-яё]+/i).filter(w => w.length >= 4);
  const cats = Object.keys(QUICK_CATS).filter(c => QUICK_CATS[c].split(' ').some(k => text.includes(k)));
  const tones = cats.reduce((acc, c) => acc.concat(QUICK_TONES[c] || []), []);

  // Счёт по блюду берём максимальный, а не сумму: три блюда одной категории
  // не делают пиво более подходящим, это просто длинная карта.
  const scoreFood = f => {
    const dish = (f.dish || '').toLowerCase();
    if (dish && (text.includes(dish) || words.some(w => dish.includes(w)))) return 45;
    const alias = QUICK_ALIASES[f.dish];
    if (alias && alias.split(' ').some(k => k.length > 2 && text.includes(k))) return 40;
    if (f.cat && cats.indexOf(f.cat) !== -1) return 14;
    if (f.cat && text.includes(f.cat.toLowerCase())) return 8;
    return 0;
  };

  let bestBeer = BEERS[0]; let bestFood = null; let bestKind = 0; let maxScore = -1;
  BEERS.forEach(b => {
    let top = null; let topScore = 0;
    (b.foods || []).forEach(f => {
      const sc = scoreFood(f);
      if (sc > 0 && (sc > topScore || (sc === topScore && (f.match || 0) > (top.match || 0)))) { topScore = sc; top = f }
    });
    let score = topScore + (top ? (top.match || 0) / 100 : 0);
    const toneHits = (b.tones || []).filter(t => tones.indexOf(t) !== -1).length;
    score += Math.min(6, toneHits * 3);
    if (score > maxScore) { maxScore = score; bestBeer = b; bestFood = top; bestKind = topScore; }
  });

  // Ноль совпадений — честно говорим, что рекомендация общая, и не подсовываем
  // «почему» от чужого блюда.
  const why = bestFood
    ? bestFood.why
    : `${bestBeer.name} — безопасная пара к «${v}»: ${(bestBeer.notes || []).slice(0, 3).map(n => String(n.n).toLowerCase()).join(', ')} поддерживают блюдо, не перебивая его. Уточните состав — подберу точнее.`;
  const bridges = bestFood ? (bestFood.bridges || []) : (bestBeer.notes || []).map(n => n.n);
  const pct = !bestFood ? 72
    : bestKind >= 40 ? (bestFood.match || 88)
    : Math.max(74, Math.round((bestFood.match || 85) * 0.9));
  const exact = bestFood && (bestFood.dish.toLowerCase() === text || words.some(w => bestFood.dish.toLowerCase().includes(w)));

  app.innerHTML = `<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()">← Новый подбор</button>
<div class="section-tag" style="margin-top:22px">Результат для вашего блюда</div>
<h2 class="section-title">На столе — <span class="gold">«${v}»</span></h2>
<div class="ai-explain-card">
  <div class="ai-avatar">${ico('somm')}</div>
  <div><div class="section-tag">Мнение сомелье Макса</div><div id="ai-explain-content" class="muted">…разбираю блюдо и подбираю пару</div></div>
</div>
${resultCard(bestBeer, { why: why, bridges: bridges }, true, pct)}
${bestFood && !exact ? `<p class="section-desc" style="margin-top:14px">Ближайшая пара из карты вкусов — <b class="gold">${bestFood.dish}</b>. Логика сочетания та же.</p>` : ''}
</div></div>`;

  const aiPrompt = `Я ем блюдо: "${v}". Почему пиво ${bestBeer.name} (стиль ${bestBeer.style}, вкусовые ноты: ${bestBeer.notes.map(n => n.n).join(', ')}) идеально подходит к этой еде? Объясни конкретно сочетание их вкусовых нот и мосты вкуса в 1-2 предложениях. Отвечай как профессиональный пивной сомелье Макс. Без общих фраз и лишних приветствий.`;
  aiExplain('ai-explain-content', aiPrompt, getLocalExplanation(bestBeer.id, bestBeer.name, v, '', '', ''));
};

function renderStep() { fadeIn(); flowMode === 'food' ? renderFoodStep() : renderBeerStep() }
function SH(title, sub, total) { return `<div class="step-header"><button class="step-back" onclick="stepBack()">← Назад</button><div class="step-progress">${Array.from({ length: total }, (_, i) => `<div class="step-dot ${i < flowStep - 1 ? 'done' : ''} ${i === flowStep - 1 ? 'active' : ''}"></div>`).join('')}</div><h2 class="step-title">${title}</h2><p class="step-subtitle">${sub}</p></div>` }
window.stepBack = function () { if (flowStep <= 1) { renderHome(); return } flowStep--; fadeIn(); renderStep() };

// Шаги подбора раньше держали эмодзи-еду: цветные 3D-глифы на тёмном золоте
// выглядели как наклейки. Тот же линейный сет держит экран в одном ключе.
const OPT_ICONS = {
  meat: 'meat', salad: 'salad', soup: 'soup', asian: 'asian', fish: 'fish',
  side: 'fries', dessert: 'cake', snack: 'cheese',
  grill: 'flame', pan: 'pan', bake: 'oven', stew: 'stew',
  boil: 'boil', steam: 'steam', wok: 'wok', raw: 'leaf',
  light: 'feather', medium: 'scales', heavy: 'weight', rich: 'droplet',
};
function circlesHTML(items, sel, fn) {
  return `<div class="options-grid">${items.map(c => {
    const inner = c.img
      ? `<img src="${c.img}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : OPT_ICONS[c.id] ? ico(OPT_ICONS[c.id], 'xl') : `<span style="font-size:44px">${c.emoji}</span>`;
    return `<div class="option-circle ${sel === c.id ? 'selected' : ''}" onclick="${fn}('${c.id}')">
      <div class="circle-icon" style="${c.img ? 'padding:0;overflow:hidden' : ''}">${inner}</div>
      <div class="option-label">${c.name}${c.desc ? `<br><span style="font-size:10px;opacity:.6">${c.desc}</span>` : ''}</div>
    </div>`;
  }).join('')}</div>`;
}
function customInput(placeholder, fn) { return `<div class="custom-input-wrap"><div class="custom-divider">или напиши своё</div><div class="custom-input-row"><input class="custom-input" id="custom-in" placeholder="${placeholder}"><button class="custom-submit" onclick="${fn}()">→</button></div></div>` }

// ═══ FOOD FLOW (4 steps) ═══
function renderFoodStep() {
  if (flowStep === 1) {
    app.innerHTML = `<div class="container"><div class="step-view">${SH('Что ты ешь?', 'Выбери категорию блюда', 4)}${circlesHTML(FOOD_CATS, flowSelections.cat, 'selectCat')}${customInput('Например: стейк рибай, том ям, тирамису...', 'submitCustomCat')}</div></div>`;
  } else if (flowStep === 2) {
    app.innerHTML = `<div class="container"><div class="step-view">${SH('Как приготовлено?', 'Способ приготовления влияет на подбор', 4)}${circlesHTML(COOK_METHODS, flowSelections.method, 'selectMethod')}${customInput('Например: копчёное, фритюр, sous-vide...', 'submitCustomMethod')}</div></div>`;
  } else if (flowStep === 3) {
    app.innerHTML = `<div class="container"><div class="step-view">${SH('Какой вкус доминирует?', 'Основной вкус блюда', 4)}${circlesHTML(TASTE_GROUPS, flowSelections.taste, 'selectTaste')}${customInput('Например: кисло-сладкое, пряное с дымком...', 'submitCustomTaste')}</div></div>`;
  } else if (flowStep === 4) {
    app.innerHTML = `<div class="container"><div class="step-view">${SH('Насколько тяжёлое блюдо?', 'Интенсивность влияет на крепость пива', 4)}${circlesHTML(INTENSITIES, flowSelections.intensity, 'selectIntensity')}${customInput('Например: очень жирное, лёгкое как пёрышко...', 'submitCustomIntensity')}</div></div>`;
  } else { showFoodResults() }
}
window.selectCat = function (id) { flowSelections.cat = id; track('select_cat', id); flowStep = 2; renderStep() };
window.selectMethod = function (id) { flowSelections.method = id; flowStep = 3; renderStep() };
window.selectTaste = function (id) { flowSelections.taste = id; flowStep = 4; renderStep() };
window.selectIntensity = function (id) { flowSelections.intensity = id; track('pairing', JSON.stringify(flowSelections)); T.pairings.push(flowSelections); flowStep = 5; renderStep() };
window.submitCustomCat = function () { const v = document.getElementById('custom-in').value.trim(); if (v) { flowSelections.cat = 'custom'; flowSelections.catText = v; flowStep = 2; renderStep() } };
window.submitCustomMethod = function () { const v = document.getElementById('custom-in').value.trim(); if (v) { flowSelections.method = 'custom'; flowSelections.methodText = v; flowStep = 3; renderStep() } };
window.submitCustomTaste = function () { const v = document.getElementById('custom-in').value.trim(); if (v) { flowSelections.taste = 'custom'; flowSelections.tasteText = v; flowStep = 4; renderStep() } };
window.submitCustomIntensity = function () { const v = document.getElementById('custom-in').value.trim(); if (v) { flowSelections.intensity = 'custom'; flowStep = 5; renderStep() } };

// ═══ AI EXPLAIN on results ═══
async function aiExplain(containerId, prompt, fallbackText) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const fromServer = await serverAI(prompt, true);
  if (fromServer) { el.innerHTML = `<p class="ai-answer">${fromServer}</p>`; return }

  const key = OPENROUTER_KEY || localStorage.getItem('ft_api_key') || '';
  if (!key) { el.innerHTML = `<p class="ai-answer">${fallbackText || localExplain(prompt)}</p>`; return }
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:8080', 'X-Title': 'FlavorTree' },
      body: JSON.stringify({ model: 'google/gemini-2.0-flash', messages: [{ role: 'system', content: 'Ты пивной сомелье FlavorTree. Твоя задача — объяснить гастрономическую совместимость выбранного пива и блюда. Отвечай ровно 1-2 предложения на русском, максимально конкретно про вкусы, сочетания и мосты вкуса. Без общих фраз и без приветствий.' }, { role: 'user', content: prompt }], max_tokens: 200 })
    });
    const d = await r.json();
    const txt = d.choices?.[0]?.message?.content;
    if (txt && el) el.innerHTML = `<p class="ai-answer">${txt}</p>`;
    else if (el) el.innerHTML = `<p class="ai-answer">${fallbackText || localExplain(prompt)}</p>`;
  } catch (e) {
    if (el) el.innerHTML = `<p class="ai-answer">${fallbackText || localExplain(prompt)}</p>`;
  }
}
function localExplain(prompt) {
  if (prompt.includes('Efes') || prompt.includes('цитрус')) return 'Цитрус и хмель освежают нёбо и балансируют жирное. Лучший выбор для твоего блюда.';
  if (prompt.includes('Kozel') || prompt.includes('карамел')) return 'Карамельная сладость усиливает вкус блюда и создаёт гармонию вкусов.';
  if (prompt.includes('Wùkōng')) return 'Минимальная горечь не перебивает деликатные вкусы блюда.';
  return 'Вкусовые ноты пива и блюда создают идеальное сочетание.';
}
// Названия категорий в data.js стоят в именительном («Мясо»), а в тексте
// сомелье нужны косвенные падежи — иначе выходит «в Мясо (гриль)».
// Восемь категорий проще просклонять таблицей, чем тащить морфологию.
const DISH_FORMS = {
  meat:    { gen: 'мяса',                 pre: 'мясе',                 ins: 'мясом' },
  salad:   { gen: 'салатов',              pre: 'салатах',              ins: 'салатами' },
  soup:    { gen: 'супов и рагу',         pre: 'супах и рагу',         ins: 'супами и рагу' },
  asian:   { gen: 'азиатской кухни',      pre: 'азиатской кухне',      ins: 'азиатской кухней' },
  fish:    { gen: 'рыбы и морепродуктов', pre: 'рыбе и морепродуктах', ins: 'рыбой и морепродуктами' },
  side:    { gen: 'гарниров и закусок',   pre: 'гарнирах и закусках',  ins: 'гарнирами и закусками' },
  dessert: { gen: 'десертов',             pre: 'десертах',             ins: 'десертами' },
  snack:   { gen: 'снеков и тапас',       pre: 'снеках и тапас',       ins: 'снеками и тапас' },
};
// Свободный ввод не просклонять — ведём его через «блюдо» в кавычках
function dishForms(catId, freeText) {
  if (DISH_FORMS[catId]) return DISH_FORMS[catId];
  const t = String(freeText || 'ваше блюдо').trim();
  return { gen: `блюда «${t}»`, pre: `блюде «${t}»`, ins: `блюдом «${t}»` };
}
window.dishForms = dishForms;

function getLocalExplanation(beerId, beerName, catName, methodName, tasteName, intensityName, formsArg) {
  const forms = formsArg || dishForms(null, catName);
  const tail = methodName ? ' (' + methodName.toLowerCase() + ')' : '';
  const D = c => forms[c] + tail;

  if (beerId === 'efes') {
    if (tasteName.toLowerCase().includes('остр') || tasteName.toLowerCase().includes('солен') || tasteName.toLowerCase().includes('умами') || tasteName.toLowerCase().includes('прян')) {
      return `Яркая цитрусовая свежесть Efes Pilsener отлично гасит остроту и компенсирует соль в ${D('pre')}, а благородная хмелевая горечь (IBU 22) и газация смывают жирность, подготавливая рецепторы к новому кусочку.`;
    }
    if (tasteName.toLowerCase().includes('кисл') || methodName.toLowerCase().includes('сыр') || methodName.toLowerCase().includes('свеж') || methodName.toLowerCase().includes('сырое')) {
      return `Травянистый хмель Hallertau и цитрусовые ноты Efes Pilsener идеально подчеркивают естественную кислотность и свежесть ${D('gen')}, не перегружая рецепторы.`;
    }
    return `Классический сухой пильзнер Efes Pilsener с его чистым хлебным телом и свежей хмелевой горчинкой выступает универсальным гастрономическим контрастом для ${D('gen')}, отлично освежая нёбо.`;
  }

  if (beerId === 'kozel') {
    if (methodName.toLowerCase().includes('туш') || methodName.toLowerCase().includes('запеч') || tasteName.toLowerCase().includes('умами') || methodName.toLowerCase().includes('томлен')) {
      return `Карамельные и ореховые тона Kozel Тёмное идеально резонируют с томлёным или запечённым характером ${D('gen')}, подчёркивая глубокие карамелизированные нотки корочки.`;
    }
    if (catName.toLowerCase().includes('десерт') || tasteName.toLowerCase().includes('сладк')) {
      return `Мягкие шоколадно-кофейные оттенки и деликатная солодовая сладость Kozel Тёмное сливаются с десертными нотами ${D('gen')}, создавая бархатистый тандем без лишней горечи.`;
    }
    return `Бархатное, лёгкое тело Kozel Тёмное с тонами карамельной ириски и поджаренного ржаного хлеба создаёт мягкое, обволакивающее сочетание с ${D('ins')}.`;
  }

  if (beerId === 'wukong') {
    if (catName.toLowerCase().includes('азиат') || methodName.toLowerCase().includes('пар') || methodName.toLowerCase().includes('вок') || methodName.toLowerCase().includes('wok')) {
      return `Деликатный рисовый профиль Wùkōng Jū и его минимальная горечь (IBU 12) гармонируют с лапшой, тестом и соевым соусом в ${D('pre')}, подчеркивая восточные специи и не перебивая их.`;
    }
    if (catName.toLowerCase().includes('рыб') || catName.toLowerCase().includes('море') || methodName.toLowerCase().includes('сыр') || methodName.toLowerCase().includes('свеж') || methodName.toLowerCase().includes('сырое')) {
      return `Нейтральное тело и цветочные тона Wùkōng Jū бережно уважают нежную текстуру ${D('gen')}, мягко очищая нёбо и оставляя лёгкое жасминовое послевкусие.`;
    }
    return `Этот ультра-лёгкий рисовый лагер Wùkōng Jū с мягкими фруктовыми и цветочными нотками служит идеальным нейтральным фоном для ${D('gen')}, сохраняя его собственный деликатный вкус.`;
  }

  if (beerId === 'kruzhka') {
    if (methodName.toLowerCase().includes('гриль') || methodName.toLowerCase().includes('мангал') || methodName.toLowerCase().includes('сковорода') || tasteName.toLowerCase().includes('солен') || tasteName.toLowerCase().includes('умами')) {
      return `Солодовая база и лёгкие медовые оттенки Кружки Свежего отлично смягчают солёность и жареную корочку в ${D('pre')}, а хорошая газация смывает жирность.`;
    }
    if (catName.toLowerCase().includes('гарнир') || catName.toLowerCase().includes('закус')) {
      return `Мягкая солодово-хлебная основа Кружки Свежего отлично работает с ${D('ins')}, создавая понятное, классическое сочетание.`;
    }
    return `Мягкий светлый лагер Кружка Свежего с чистым солодовым вкусом и лёгким травянистым оттенком не отвлекает от трапезы, служа освежающим сопровождением для ${D('gen')}.`;
  }

  if (beerId === 'melnik') {
    if (catName.toLowerCase().includes('бешбармак') || catName.toLowerCase().includes('манты') || catName.toLowerCase().includes('плов') || methodName.toLowerCase().includes('отвар') || methodName.toLowerCase().includes('пар')) {
      return `Бархатистая мягкость Старого Мельника не спорит с нежным вкусом ${D('gen')}, а аромат трех сортов хмеля мягко освежает после насыщенного бульона.`;
    }
    if (catName.toLowerCase().includes('мясо') || methodName.toLowerCase().includes('гриль') || methodName.toLowerCase().includes('мангал')) {
      return `Хлебные и медовые ноты Старого Мельника дополняют плотную структуру ${D('gen')}, а деликатная горчинка хмелевого трио мягко балансирует жирность.`;
    }
    return `Старый Мельник предлагает мягкое бархатистое тело с травянисто-хлебным ароматом, создавая плотное и сбалансированное гастрономическое сочетание с ${D('ins')}.`;
  }

  return `Вкусовые ноты пива ${beerName} и ${D('gen')} гармонично дополняют друг друга.`;
}
function showFoodResults() {
  const { cat, method, taste, intensity } = flowSelections;
  let scored = BEERS.map(b => {
    let score = 0;
    b.foods.forEach(f => { if (f.cat === cat) score += 25; if (f.method === method) score += 20 });
    b.notes.forEach(n => {
      if (taste === 'sweet' && ['Мёд', 'Карамель', 'Сладость'].includes(n.n)) score += n.i * .3;
      if (taste === 'bitter' && n.n === 'Горечь') score += n.i * .5;
      if (taste === 'sour' && n.n === 'Цитрус') score += n.i * .4;
      if (taste === 'salty' && ['Солод', 'Хлеб'].includes(n.n)) score += n.i * .3;
      if (taste === 'umami' && ['Хлеб', 'Солод', 'Хмель (трио)'].includes(n.n)) score += n.i * .3;
      if (taste === 'spicy' && ['Свежесть', 'Рис', 'Сладость'].includes(n.n)) score += n.i * .3;
      if (taste === 'neutral') score += 15;
    });
    if (intensity === 'light' && b.abv <= 4) score += 15;
    if (intensity === 'heavy' && b.ibu >= 18) score += 15;
    if (intensity === 'rich' && b.notes.some(n => n.n === 'Горечь' && n.i >= 50)) score += 15;
    if (intensity === 'medium') score += 10;
    const food = b.foods.find(f => f.cat === cat) || b.foods.find(f => f.method === method) || b.foods[0];
    return { beer: b, food, score }
  }).sort((a, b) => b.score - a.score);
  const catLabel = FOOD_CATS.find(c => c.id === cat);
  const tasteLabel = TASTE_GROUPS.find(t => t.id === taste);
  const methodLabel = COOK_METHODS.find(m => m.id === method);
  const intensityLabel = INTENSITIES.find(i => i.id === intensity);

  const catName = catLabel ? catLabel.name : (flowSelections.catText || 'твоему блюду');
  const tasteName = tasteLabel ? tasteLabel.name : (flowSelections.tasteText || 'выбранному вкусу');
  const methodName = methodLabel ? methodLabel.name : (flowSelections.methodText || '');
  const intensityName = intensityLabel ? intensityLabel.name : '';

  const top = scored[0];
  const fallbackText = getLocalExplanation(top.beer.id, top.beer.name, catName, methodName, tasteName, intensityName, dishForms(cat, flowSelections.catText));
  const aiPrompt = `Почему пиво ${top.beer.name} (стиль ${top.beer.style}, ноты: ${top.beer.notes.slice(0, 3).map(n => n.n).join(', ')}) идеально подходит к блюду: ${catName} ${methodName ? '(приготовлено: ' + methodName + ')' : ''}, с доминирующим вкусом: ${tasteName} и интенсивностью: ${intensityName}? Объясни конкретно сочетание их вкусовых нот и мосты вкуса в 1-2 предложениях.`;

  app.innerHTML = `<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()">← Новый подбор</button>
<div class="section-tag" style="margin-top:22px">Результат</div>
<h2 class="section-title">Лучшее пиво — <span class="gold">${top.beer.name}</span></h2>
${crumbRail([
  { i: catLabel ? (OPT_ICONS[catLabel.id] || 'plate') : 'plate', t: catLabel ? catLabel.name : (flowSelections.catText || 'Ваше блюдо') },
  methodLabel ? { i: OPT_ICONS[methodLabel.id] || 'flame', t: methodLabel.name } : (flowSelections.methodText ? { i: 'flame', t: flowSelections.methodText } : null),
  tasteLabel ? { img: tasteLabel.img, t: tasteLabel.name } : (flowSelections.tasteText ? { i: 'droplet', t: flowSelections.tasteText } : null),
  intensityLabel ? { i: OPT_ICONS[intensityLabel.id] || 'scales', t: intensityLabel.name } : null,
])}
<div class="ai-explain-card">
  <div class="ai-avatar">${ico('somm')}</div>
  <div><div class="section-tag">Почему это лучший вариант</div><div id="ai-explain-content" class="muted">…загружаю объяснение сомелье</div></div>
</div>
${scored.map((s, i) => resultCard(s.beer, s.food, i === 0, matchPct(s.score, scored[0].score))).join('')}
</div></div>`;
  aiExplain('ai-explain-content', aiPrompt, fallbackText);
}

// ═══ BEER FLOW ═══
function renderBeerStep() {
  if (flowStep === 1) {
    app.innerHTML = `<div class="container"><div class="step-view">${SH('Какое пиво?', 'Выбери бренд', 2)}
<ul class="pick-list">
  ${BEERS.map(b => `<li><button class="pick-row${flowSelections.beer === b.id ? ' on' : ''}" style="--aura:${b.color}" onclick="selectBeer('${b.id}')">
    <span class="pick-shot"><img src="${b.img}" alt="" loading="lazy"></span>
    <span class="pick-body">
      <span class="pick-style">${b.style}</span>
      <span class="pick-name">${b.name}</span>
      <span class="pick-meta"><span><b class="num">${b.abv}%</b> ABV</span><i></i><span><b class="num">${b.ibu}</b> IBU</span><i></i><span>${b.temp}</span></span>
    </span>
    <span class="pick-go">${ico('arrow')}</span>
  </button></li>`).join('')}
</ul>
${customInput('Или введи название любого пива...', 'submitCustomBeer')}</div></div>`;
    reveal();
  } else { showBeerResults() }
}
window.selectBeer = function (id) { flowSelections.beer = id; track('select_beer', id); flowStep = 2; renderStep() };
window.submitCustomBeer = function () { const v = document.getElementById('custom-in').value.trim(); if (v) { flowSelections.beer = 'efes'; flowStep = 2; renderStep() } };

function showBeerResults() {
  const beer = BEERS.find(b => b.id === flowSelections.beer);
  app.innerHTML = `<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()">← Новый подбор</button>
<div class="beer-hero" style="--aura:${beer.color}">
  <span class="beer-hero-glow" aria-hidden="true"></span>
  <img class="beer-hero-shot" src="${beer.img}" alt="${beer.name}">
  <p class="beer-hero-kicker">${beer.style} · ${beer.brand}</p>
  <h2 class="beer-hero-name">${beer.name}</h2>
  <p class="beer-hero-tag">«${beer.tagline}»</p>
  <div class="beer-tones">${(beer.tones || []).map(t => { const tf = TONE_FILTERS.find(f => f.id === t); return tf ? `<span class="tone-chip" style="--tone:${tf.color}"><i class="tone-dot"></i><em>${tf.name}</em></span>` : '' }).join('')}</div>
  <dl class="beer-specs">
    <div><dt class="num">${beer.abv}%</dt><dd>алкоголь</dd></div>
    <div><dt class="num">${beer.ibu}</dt><dd>IBU</dd></div>
    <div><dt class="num">${beer.temp}</dt><dd>подача</dd></div>
    <div><dt class="num">${beer.density}</dt><dd>плотность</dd></div>
  </dl>
</div>
<div class="beer-desc-block">
  <div>
    <p class="desc-text lead-cap">${beer.desc}</p>
    <p class="desc-text quote">${beer.longDesc}</p>
  </div>
</div>

<div class="pyramid-card">
  <div class="section-tag">Сенсорный разбор</div>
  <h3 class="section-title" style="font-size:26px;margin-bottom:18px">Вкусовая пирамида</h3>
  <div class="pyramid-grid">
    <div class="pyr-layer top"><span class="pyr-icon">${ico('sparkle')}</span><span class="pyr-tag">Top · Эмоции</span><p>${beer.pyramid.top}</p></div>
    <div class="pyr-layer heart"><span class="pyr-icon">${ico('heart')}</span><span class="pyr-tag">Heart · Ароматы</span><p>${beer.pyramid.heart}</p></div>
    <div class="pyr-layer base"><span class="pyr-icon">${ico('leaf')}</span><span class="pyr-tag">Base · Вкусы</span><p>${beer.pyramid.base}</p></div>
  </div>
</div>

<div class="simple-card" style="margin-top:18px">
  <div class="section-tag">Профиль в цифрах</div>
  <h3 class="section-title" style="font-size:26px;margin-bottom:18px">Ноты вкуса</h3>
  <div class="notes-list">${beer.notes.map(n => `<div class="note-row"><i class="note-dot" style="--tone:${n.c}"></i><span class="note-name-label">${n.n}</span><div class="note-bar-bg"><div class="note-bar-fill" style="width:${n.i}%;background:${n.c}"></div></div><span class="note-pct">${n.i}%</span></div>`).join('')}</div>
</div>

<div class="ai-explain-card">
  <div class="ai-avatar">${ico('somm')}</div>
  <div><div class="section-tag">Почему ${beer.name} выбирают</div><div id="beer-ai-explain" class="muted">…</div></div>
</div>
<div class="section-tag" style="margin-top:28px">Food Pairing</div>
<h3 class="section-title" style="font-size:24px">Идеальные блюда</h3>
<p class="section-desc">Подобрано по совпадению вкусовых нот</p>
${beer.foods.map(f => resultCardFood(beer, f)).join('')}

<div class="section-tag" style="margin-top:44px">Оценки гостей</div>
<h3 class="section-title" style="font-size:26px">Что говорят о бренде «<span class="gold">${beer.name}</span>»</h3>
<div id="reviews-section">${renderReviews(beer.id)}</div>
<div class="review-form simple-card">
  <h4>Оставить отзыв</h4>
  <span class="field-label">Ваша оценка</span>
  <div class="star-rating" id="star-input">${[1,2,3,4,5].map(i => `<span class="star" data-v="${i}" onclick="setStarRating(${i})" role="button" tabindex="0" aria-label="${i} из 5">★</span>`).join('')}</div>
  <div style="margin-top:16px"><span class="field-label">Комментарий</span>
  <textarea id="review-text" rows="3" placeholder="Что понравилось? Какие ноты почувствовали?"></textarea></div>
  <button class="btn-primary" style="margin-top:14px;width:100%" onclick="submitReview('${beer.id}')">Отправить отзыв</button>
</div>
</div></div>`;
  setTimeout(() => { document.querySelectorAll('.note-bar-fill').forEach(el => { const w = el.style.width; el.style.width = '0'; requestAnimationFrame(() => el.style.width = w) }) }, 50);
  let beerFallback = `${beer.name} — отличный выбор с богатым характером.`;
  if (beer.id === 'efes') beerFallback = 'Efes Pilsener — это классический средиземноморский пильзнер с выразительной хмелевой горчинкой Hallertau и цитрусовой свежестью. Он служит великолепным гастрономическим контрастом к насыщенным мясным блюдам на гриле и свежим салатам.';
  else if (beer.id === 'kozel') beerFallback = 'Kozel Тёмное предлагает бархатистый карамельно-ореховый профиль с тонами ржаного хлеба и лёгким кофейным финишем. Это пиво идеально дополняет томленое мясо, гуляш и шоколадные десерты.';
  else if (beer.id === 'wukong') beerFallback = 'Wùkōng Jū — ультра-лёгкий рисовый лагер с мягкими жасминовыми и цветочными тонами и минимальной горечью. Он деликатно обрамляет блюда паназиатской кухни, суши и морепродукты, не заглушая их вкус.';
  else if (beer.id === 'kruzhka') beerFallback = 'Кружка Свежего — лёгкий и питкий светлый лагер с мягкой солодовой базой и медовым оттенком. Он станет отличным, понятным сопровождением к домашней кухне, пельменям и мясным закускам на гриле.';
  else if (beer.id === 'melnik') beerFallback = 'Старый Мельник сочетает три сорта ароматного хмеля по бочковой технологии, раскрываясь бархатистой мягкостью и травяными нотами. Оно превосходно гармонирует со сложными блюдами национальной кухни вроде бешбармака.';

  aiExplain('beer-ai-explain', `Почему ${beer.name} (${beer.style}, ${beer.abv}%, ноты: ${beer.notes.slice(0, 3).map(n => n.n).join(', ')}) — хороший выбор? Объясни 1-2 предложения про его характер и с чем он лучший.`, beerFallback);
}

// Вкусовой мост — это связь двух нот, а не подпись под эмодзи.
// Данные приходят строкой «🔥 Горечь × Дым», поэтому пиктограмму снимаем
// на рендере: править 60 строк data.js ради вида чипа было бы лишним.
function bridgeChips(list) {
  if (!list || !list.length) return '';
  return `<ul class="bridges">${list.map(raw => {
    const txt = String(raw).replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s+/g, ' ').trim();
    const pair = txt.split('\u00d7').map(x => x.trim()).filter(Boolean);
    return pair.length > 1
      ? `<li class="bridge"><b>${pair[0]}</b><i aria-hidden="true"></i><b>${pair[1]}</b></li>`
      : `<li class="bridge solo"><b>${txt}</b></li>`;
  }).join('')}</ul>`;
}

// Хлебные крошки выбора: миниатюра вкуса — настоящая, остальное линией
function crumbRail(items) {
  return `<ul class="res-crumbs">${items.filter(Boolean).map(c => `<li class="crumb">${
    c.img ? `<span class="crumb-shot"><img src="${c.img}" alt="" loading="lazy"></span>` : ico(c.i, 'sm')
  }<span>${c.t}</span></li>`).join('')}</ul>`;
}

// Раньше формула упиралась в потолок и первые два места показывали
// одинаковые 99% — «лучшее пиво» перестало читаться. Теперь лидер
// всегда 99, остальные падают пропорционально своему счёту.
function matchPct(score, best) {
  if (!best || best <= 0) return 60;
  const rel = Math.max(0, Math.min(1, score / best));
  return Math.max(41, Math.min(99, Math.round(41 + rel * 58)));
}

function resultCard(beer, food, best, pct) {
  return `<div class="result-card">
<div class="result-header">
  <div class="result-left">
    <div class="result-emoji"><img src="${beer.img}" alt="${beer.name}"></div>
    <div>
      <div class="result-name">${beer.name}</div>
      <div class="result-meta">${beer.style} · ${beer.abv}% · IBU ${beer.ibu}</div>
    </div>
  </div>
  <div class="match-badge ${best ? 'match-high' : 'match-mid'}">${pct}%</div>
</div>
<div class="result-why">${food.why || ''}</div>
${bridgeChips(food.bridges)}
${best ? `<button class="btn-ghost" style="margin-top:16px" onclick="flowSelections.beer='${beer.id}';flowStep=2;flowMode='beer';renderStep()">Подробный профиль →</button>` : ''}
</div>`;
}
function resultCardFood(beer, food) {
  return `<div class="result-card">
<div class="result-header">
  <div class="result-left">
    <div class="dish-mark">${ico(OPT_ICONS[food.cat] || 'plate', 'lg')}</div>
    <div>
      <div class="result-name">${food.dish}</div>
      <div class="result-meta">${[(FOOD_CATS.find(c => c.id === food.cat) || {}).name, (COOK_METHODS.find(m => m.id === food.method) || {}).name].filter(Boolean).join(' · ')}</div>
    </div>
  </div>
  <div class="match-badge match-high">${food.match}%</div>
</div>
<div class="result-why">${food.why || ''}</div>
${bridgeChips(food.bridges)}
</div>`;
}

// ═══ CATALOG ═══
let activeToneFilter = null;
function renderCatalog() {
  let filtered = activeToneFilter ? BEERS.filter(b => b.tones && b.tones.includes(activeToneFilter)) : BEERS;

  if (globalMeal) {
    const query = globalMeal.toLowerCase();
    filtered.forEach(b => {
      let maxMatch = 0;
      b.foods.forEach(f => {
        if (f.dish.toLowerCase().includes(query) || f.cat.toLowerCase().includes(query)) {
          maxMatch = Math.max(maxMatch, f.match || 0);
        }
      });
      b._mealMatch = maxMatch;
    });
    filtered.sort((a, b) => (b._mealMatch || 0) - (a._mealMatch || 0));
  }

  app.innerHTML = `<div class="container catalog">
<header class="sec-head first">
  <p class="sec-kicker">Каталог</p>
  <h2 class="sec-title">Все <em>${BEERS.length} ${plural(BEERS.length, 'бренд', 'бренда', 'брендов')}</em> Efes Kazakhstan</h2>
  <p class="sec-desc">Нажмите на бренд — откроется полный сенсорный профиль: пирамида вкуса, ноты в процентах и блюда с вкусовыми мостами.</p>
</header>

<div class="tone-filter-bar" id="tone-bar">
  <span class="tone-filter-label">Тон вкуса</span>
  ${TONE_FILTERS.map(t => `<button class="tone-btn${activeToneFilter === t.id ? ' active' : ''}" onclick="setToneFilter('${t.id}')" style="--tone:${t.color}"><i class="tone-dot"></i>${t.name}</button>`).join('')}
  ${activeToneFilter ? `<button class="tone-btn tone-clear" onclick="setToneFilter(null)">Сбросить</button>` : ''}
</div>

${globalMeal ? `<div class="meal-banner"><span class="meal-ico">${ico('plate')}</span><div><strong>На столе: ${globalMeal}</strong><span>Бренды отсортированы по совместимости с этим блюдом</span></div><button class="btn-ghost sm" onclick="setGlobalMeal('');renderCatalog()">Сбросить</button></div>` : ''}

${filtered.length === 0 ? `<div class="empty-state"><span class="empty-ico">${ico('search', 'lg')}</span><h4>Нет брендов с таким тоном</h4><p>Попробуйте другой фильтр или сбросьте выбор.</p><button class="btn-ghost" onclick="setToneFilter(null)">Показать все</button></div>` : `
<div class="brand-grid">${filtered.map((b, i) => `<button class="brand-card${i === 0 ? ' feat' : ''}" style="--aura:${b.color}" onclick="openBeer('${b.id}')">
  <span class="brand-glow" aria-hidden="true"></span>
  ${globalMeal && b._mealMatch ? `<span class="brand-match num">${b._mealMatch}<i>%</i></span>` : ''}
  <span class="brand-shot-wrap"><img class="brand-shot" src="${b.img}" alt="${b.name}" loading="lazy"></span>
  <span class="brand-body">
    <span class="brand-style">${b.style}</span>
    <span class="brand-name">${b.name}</span>
    <span class="brand-tag">${b.tagline}</span>
    <span class="brand-tones">${(b.tones || []).map(t => { const tf = TONE_FILTERS.find(f => f.id === t); return tf ? `<span class="tone-chip" style="--tone:${tf.color}" title="${tf.name}"><i class="tone-dot"></i><em>${tf.name}</em></span>` : '' }).join('')}</span>
    <span class="brand-specs"><span><b class="num">${b.abv}%</b> ABV</span><i></i><span><b class="num">${b.ibu}</b> IBU</span>${i === 0 ? `<i></i><span>${b.temp}</span>` : ''}</span>
  </span>
</button>`).join('')}</div>`}
</div>`;
  reveal();
}
window.setToneFilter = function (id) { activeToneFilter = id; renderCatalog(); };

// ═══ AI SOMMELIER ═══
// Persistent guest memory across sessions
let guestProfile = JSON.parse(localStorage.getItem('ft_guest_profile') || '{"name":"","company":"","friends":[],"likes":[],"dislikes":[],"meals":[],"occasions":[]}');
function saveGuestProfile() { localStorage.setItem('ft_guest_profile', JSON.stringify(guestProfile)); }
function buildGuestContext() {
  let ctx = '';
  if (guestProfile.name) ctx += `Имя гостя: ${guestProfile.name}. `;
  if (guestProfile.company) ctx += `Компания/заведение: ${guestProfile.company}. `;
  if (guestProfile.friends.length) ctx += `Друзья/компания: ${guestProfile.friends.join(', ')}. `;
  if (guestProfile.likes.length) ctx += `Любит: ${guestProfile.likes.join(', ')}. `;
  if (guestProfile.dislikes.length) ctx += `Не любит: ${guestProfile.dislikes.join(', ')}. `;
  if (guestProfile.meals.length) ctx += `Ели раньше: ${guestProfile.meals.join(', ')}. `;
  if (guestProfile.occasions.length) ctx += `Поводы: ${guestProfile.occasions.join(', ')}. `;
  return ctx;
}

const BARTENDER_PROMPT = `Ты — Макс, харизматичный AI-Сомелье и амбассадор FlavorTree × Efes Kazakhstan. Ты ПРОДАЁШЬ пиво — страстно, убедительно, с экспертизой. Твоя миссия: влюбить гостя в пиво Efes и помочь ему выбрать идеальный вариант.

ПРАВИЛА ПОВЕДЕНИЯ:
1. ВСЕГДА собирай информацию о госте: спрашивай как зовут, с кем пришли, что едят, какой повод, что любят/не любят. Задавай ОДИН конкретный вопрос за раз.
2. ЗАПОМИНАЙ всё сказанное и используй это в следующих ответах. Если гость сказал что едет с друзьями — уточни сколько их, что предпочитают.
3. ПРОДАВАЙ активно: описывай пиво ярко и вкусно, создавай желание. Используй эмоциональные образы: «первый глоток как летний вечер», «карамель обволакивает нёбо».
4. Когда рекомендуешь пиво — в конце ответа добавь тег BEER:[id] (только один из: efes, kozel, wukong, kruzhka, melnik).
5. Ответ 3-5 предложений. Живо, с огнём, с эмодзи.
6. Если гость колеблется — дожимай: «Поверь, это именно то, что тебе сейчас нужно» или предложи взять набор для компании.
7. Если спрашивают про компанию друзей — уточни вкусы каждого и рекомендуй разные пива для всей группы.

ЗНАЕШЬ 5 ПИВ (продавай их как сокровища!):
🍺 efes: Efes Pilsener — «Золото Средиземноморья». Пильзнер 5%, IBU 22. Ноты: яркий цитрус 85%, свежий хлеб 72%, луговые травы 60%. К шашлыку, цезарю, стейку, морепродуктам. ПРОДАЖНАЯ ТОЧКА: 50 лет истории, немецкий хмель Hallertau, идеален для жаркого вечера.
🐐 kozel: Kozel Тёмное — «Бархатная ночь». Тёмный лагер 3.7%, IBU 15. Ноты: карамель 88%, горький шоколад 50%, лесной орех 42%. К гуляшу, утке, фондану, сырной тарелке. ПРОДАЖНАЯ ТОЧКА: чешская рецептура, мягче чем думаешь, для тех кто хочет чего-то особенного.
🐒 wukong: Wùkōng Jū — «Дух Азии». Рисовый лагер 4%, IBU 12. Ноты: чистый рис 90%, жасмин 55%, свежесть 70%. К суши, пад тай, дим-самам, рыбе. ПРОДАЖНАЯ ТОЧКА: самое лёгкое в линейке, уникальный рисовый профиль, откроет гостям новый мир вкуса.
🍻 kruzhka: Кружка Свежего — «Домашний уют». Лагер 4%, IBU 14. Ноты: мягкий солод 75%, медовая сладость 48%, трава 35%. К пельменям, колбаскам, пицце, закускам. ПРОДАЖНАЯ ТОЧКА: легко пьётся, всем нравится, отличный выбор для большой компании.
🏺 melnik: Старый Мельник — «Три хмеля». Лагер 4.3%, IBU 18. Ноты: хмелевое трио 80%, ржаной хлеб 70%, мёд 45%. К бешбармаку, мантам, плову, лагману. ПРОДАЖНАЯ ТОЧКА: бочковая технология, три сорта хмеля, душа казахской кухни.`;

const CHAT_SUGGESTIONS = [
  [{ text: 'К шашлыку', msg: 'Подберите пиво к шашлыку из баранины' }, { text: 'К бешбармаку', msg: 'Что порекомендуете к бешбармаку?' }, { text: 'К суши', msg: 'Какое пиво подходит к суши и сашими?' }, { text: 'Тёмное пиво', msg: 'Расскажите про тёмные сорта пива' }, { text: 'Лёгкое и свежее', msg: 'Хочу что-то лёгкое и цитрусовое' }, { text: 'Лучший выбор', msg: 'Какое пиво из Efes Kazakhstan вы рекомендуете для ресторана?' }],
  [{ text: 'Вкусовая пирамида', msg: 'Расскажи про вкусовую пирамиду этого пива' }, { text: 'Мосты вкуса', msg: 'Объясни мосты вкуса между пивом и блюдом' }, { text: 'Другие блюда', msg: 'К каким ещё блюдам подходит?' }, { text: 'Температура подачи', msg: 'При какой температуре лучше подавать?' }]
];
let suggIdx = 0;

function parseBeerFromReply(text) {
  const m = text.match(/BEER:(\w+)/);
  if (!m) return { text, beer: null };
  const beer = BEERS.find(b => b.id === m[1]);
  return { text: text.replace(/BEER:\w+/, '').trim(), beer };
}

function beerCardHTML(beer) {
  if (!beer) return '';
  return `<div class="chat-beer-card" onclick="flowSelections.beer='${beer.id}';flowStep=2;flowMode='beer';renderStep()" title="Открыть профиль">
  <img src="${beer.img}" alt="${beer.name}">
  <div class="chat-beer-info">
    <div class="chat-beer-name">${beer.name}</div>
    <div class="chat-beer-meta">${beer.style} · ${beer.abv}% · IBU ${beer.ibu}</div>
    <div class="chat-beer-notes">${beer.notes.slice(0, 3).map(n => `<span><i style="background:${n.c}"></i>${n.n}</span>`).join('')}</div>
    <div class="chat-beer-cta">Открыть профиль →</div>
  </div>
</div>`;
}

function renderAI() {
  if (!chatHistory.length) {
    const name = guestProfile.name;
    const greeting = name
      ? `${name}, рад снова видеть. Что сегодня на столе — и с кем вы за ним?`
      : `Я Макс, сомелье FlavorTree. Назовите блюдо или настроение — подберу сорт и объясню, **почему** он сработает.\n\nКак к вам обращаться?`;
    chatHistory = [{ role: 'bot', text: greeting }];
  }
  renderChat();
}

function renderChat() {
  const sugg = CHAT_SUGGESTIONS[suggIdx] || CHAT_SUGGESTIONS[0];
  app.innerHTML = `<div class="container"><div class="ai-section">
<div class="chat-head">
  <div class="section-tag plain">AI-сомелье FlavorTree</div>
  <h2 class="section-title">Спросите <span class="gold">Макса</span></h2>
  <p class="section-desc">Вкусовые профили, гастрономические сочетания и сенсорный анализ — в одном диалоге.</p>
</div>
<div class="chat-container">
<div class="chat-bar">
  <span class="chat-face">${ico('somm')}<i class="chat-live" aria-hidden="true"></i></span>
  <span class="chat-who"><b>Макс</b><em>сомелье · помнит ваши визиты</em></span>
  <span class="chat-badge">AI</span>
</div>
<div class="chat-messages" id="chat-msgs">${chatHistory.map(m => {
    const parsed = m.role === 'bot' ? parseBeerFromReply(m.text) : { text: m.text, beer: null };
    const body = `<div class="chat-msg ${m.role}">${parsed.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}${parsed.beer ? beerCardHTML(parsed.beer) : ''}</div>`;
    return m.role === 'bot' ? `<div class="chat-line"><span class="chat-ava" aria-hidden="true">${ico('somm')}</span>${body}</div>` : body;
  }).join('')}</div>
<div class="chat-input-row"><input class="chat-input" id="chat-in" placeholder="Блюдо или желаемый вкус…" onkeydown="if(event.key==='Enter')sendMsg()"><button class="chat-send" onclick="sendMsg()" aria-label="Отправить">${ico('arrow')}</button></div>
</div>
<div class="chat-sugg-wrap"><div class="chat-suggestions" id="chat-sugg">${sugg.map(s => `<button class="sugg-btn" onclick="sendMsg('${s.msg}')">${s.text}</button>`).join('')}</div></div>
</div></div>`;
  const msgs = document.getElementById('chat-msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

window.sendMsg = async function (preset) {
  const input = document.getElementById('chat-in');
  const msg = preset || (input && input.value.trim());
  if (!msg) return;
  chatHistory.push({ role: 'user', text: msg });
  T.chats++; track('ai_chat', msg);
  if (input) input.value = '';
  suggIdx = chatHistory.length > 3 ? 1 : 0;
  renderChat();
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += `<div class="chat-line"><span class="chat-ava" aria-hidden="true">${ico('somm')}</span><div class="chat-msg bot typing">Макс думает<i></i><i></i><i></i></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  // Extract info from user messages into guestProfile
  const ml = msg.toLowerCase();
  if (ml.match(/меня зовут|я ([а-яёa-z]+)|мое имя/i)) { const m = msg.match(/(?:меня зовут|мое имя|я)\s+([А-ЯЁа-яёA-Za-z]+)/i); if (m && m[1].length > 2) { guestProfile.name = m[1]; saveGuestProfile(); } }
  if (ml.includes('друз') || ml.includes('компани')) { const m = msg.match(/(\d+)\s+(?:друз|человек|чел)/); if (m) guestProfile.friends = ['компания ' + m[1] + ' человек']; else if (!guestProfile.friends.length) guestProfile.friends = ['друзья']; saveGuestProfile(); }
  if (ml.match(/люблю|нравится|обожаю/)) { guestProfile.likes.push(msg.slice(0, 60)); saveGuestProfile(); }
  if (ml.match(/не люблю|не нравится|терпеть не|горечь не|горькое не/)) { guestProfile.dislikes.push(msg.slice(0, 60)); saveGuestProfile(); }
  if (globalMeal && !guestProfile.meals.includes(globalMeal)) { guestProfile.meals.push(globalMeal); saveGuestProfile(); }

  const guestCtx = buildGuestContext();
  const mealCtx = globalMeal ? `Гость сейчас ест: ${globalMeal}. ` : '';
  const fullSystem = BARTENDER_PROMPT + '\n\n=== ПРОФИЛЬ ГОСТЯ (используй в ответах!) ===\n' + (guestCtx || 'Пока не знаем — узнай имя и повод!') + mealCtx;

  try {
    const fromServer = await serverAI(msg);
    if (fromServer) { chatHistory.push({ role: 'bot', text: fromServer }); renderChat(); return }

    const key = OPENROUTER_KEY || localStorage.getItem('ft_api_key') || '';
    if (!key) { chatHistory.push({ role: 'bot', text: localMatch(msg) }); renderChat(); return }
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3001', 'X-Title': 'FlavorTree' },
      body: JSON.stringify({ model: 'google/gemini-2.0-flash-001', messages: [{ role: 'system', content: fullSystem }, ...chatHistory.slice(-20).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))], max_tokens: 450 })
    });
    const d = await r.json();
    const txt = d.choices?.[0]?.message?.content;
    if (txt) { chatHistory.push({ role: 'bot', text: txt }) }
    else { chatHistory.push({ role: 'bot', text: localMatch(msg) }); }
  } catch (e) {
    chatHistory.push({ role: 'bot', text: localMatch(msg) });
  }
  renderChat();
};

function localMatch(msg) {
  const l = msg.toLowerCase();
  for (const b of BEERS) for (const f of b.foods) if (l.includes(f.dish.toLowerCase().split(' ')[0])) return `🍺 К **${f.dish}** → **${b.name}** (${f.match}%)\n\n${f.why}\n\nМосты вкуса: ${f.bridges.join(', ')}`;
  for (const b of BEERS) if (l.includes(b.name.toLowerCase().split(' ')[0])) return `${b.emoji} **${b.name}** — ${b.desc}\n\nНоты: ${b.notes.map(n => n.e + ' ' + n.n + ' ' + n.i + '%').join(', ')}\n\nБлюда: ${b.foods.map(f => f.em + ' ' + f.dish).join(', ')}`;
  if (l.match(/цитрус|лёгк|легк|свеж/)) return '🍺 **Efes Pilsener** — цитрус 85%, трава 60%. К салатам, рыбе, шашлыку.';
  if (l.match(/тёмн|темн|сладк|шоколад|карамел/)) return '🐐 **Kozel Тёмное** — карамель 88%, шоколад 50%. К гуляшу, фондану, утке.';
  if (l.match(/азиат|остр|рис|суши|вок/)) return '🐒 **Wùkōng Jū** — рисовый лагер. Минимальная горечь. К дим-самам, Пад Тай, сашими.';
  if (l.match(/бешбармак|манты|плов|казах/)) return '🏚️ **Старый Мельник** — три хмеля. Мягкость для казахской кухни. К бешбармаку, мантам.';
  if (l.match(/друз|компани|вечер|попить|что взять|что заказ/)) return `🍻 **С друзьями — берите на выбор:**\n\n🍺 **Efes Pilsener** — универсальный хит, к шашлыку\n🐐 **Kozel Тёмное** — для тех кто хочет чего-то особенного\n🍻 **Кружка Свежего** — лёгкое и мягкое, всем зайдёт\n\nВозьмите микс — каждый найдёт своё!`;
  return `🍺 Я знаю 5 пив:\n${BEERS.map(b => b.emoji + ' **' + b.name + '** — ' + b.tagline).join('\n')}\n\nОпиши что едите или какой вкус хочется!`
}

// ═══ TOOLS ═══
function renderTools() {
  app.innerHTML = `<div class="container"><div class="tools-section">
<div class="section-tag">Инструменты</div>
<h2 class="section-title">Рабочий <span class="gold">стол</span></h2>
<p class="section-desc">Всё, что нужно за столом и в зале: справочник вкусов, сомелье, свайп-дегустация и аналитика.</p>
<div class="tools-grid">
<div class="tool-card" onclick="navigate('lexicon')"><div class="tool-icon">${ico('book')}</div><h3>Лексикон FlavorActiV</h3><p>122 дескриптора вкуса пива по стандартам ASBC и EBC — язык, на котором говорят дегустаторы.</p><div class="card-specs">Справочник</div></div>
<div class="tool-card" onclick="navigate('ai')"><div class="tool-icon">${ico('somm')}</div><h3>AI-сомелье Макс</h3><p>Подбор пива по свободному описанию блюда, повода или настроения гостя.</p><div class="card-specs">Диалог</div></div>
<div class="tool-card" onclick="navigate('catalog')"><div class="tool-icon">${ico('pyramid')}</div><h3>Вкусовые профили</h3><p>Пирамида, ноты в процентах и блюда для каждого из ${BEERS.length} брендов.</p><div class="card-specs">Каталог</div></div>
<div class="tool-card" onclick="navigate('tinder')"><div class="tool-icon">${ico('flame')}</div><h3>Свайп-дегустация</h3><p>Быстрый тест вкуса: два варианта, один свайп — и профиль гостя готов.</p><div class="card-specs">Игра</div></div>
<div class="tool-card" onclick="openFoodScanner()"><div class="tool-icon">${ico('search')}</div><h3>📸 AI Сканер блюда</h3><p>Наведите камеру на блюдо или бутылку — нейросеть мгновенно подберёт идеальное пиво.</p><div class="card-specs">AI Vision</div></div>
<div class="tool-card" onclick="openFlavorDNAWrapped()"><div class="tool-icon">${ico('flame')}</div><h3>🧬 Вкусовая ДНК (Wrapped)</h3><p>Виральная карточка вашего вкусового профиля для соцсетей в стиле Spotify Wrapped.</p><div class="card-specs">Виральность</div></div>
<div class="tool-card" onclick="openEfesCertificate()"><div class="tool-icon">${ico('school')}</div><h3>🎓 Сертификат Efes</h3><p>Официальный цифровой диплом пивного сомелье с уникальным верификационным ID.</p><div class="card-specs">Сертификат</div></div>
<div class="tool-card" onclick="location.href='horeca.html'"><div class="tool-icon">${ico('chef')}</div><h3>Flavor Tree HoReCa</h3><p>Портал для гостей и заведений: меню, пейринг казахской кухни и B2B калькулятор.</p><div class="card-specs">Новинка</div></div>
<div class="tool-card" onclick="navigate('staff')"><div class="tool-icon">${ico('trend')}</div><h3>Кабинет персонала</h3><p>QR для столов, тренажёр официанта, аналитика заведения и режим торговой точки.</p><div class="card-specs">HoReCa</div></div>
<div class="tool-card" onclick="showApi()"><div class="tool-icon">${ico('key')}</div><h3>API-ключ</h3><p>Ключ OpenRouter — резервный канал сомелье, если бэкенд недоступен.</p><div class="card-specs">Настройки</div></div>
<div class="tool-card" onclick="navigate('admin')"><div class="tool-icon">${ico('trend')}</div><h3>Аналитика сессии</h3><p>Просмотры экранов, подборы, запросы к сомелье и история визитов.</p><div class="card-specs">Админка</div></div>
</div></div></div>`}

window.showApi = function () {
  const k = localStorage.getItem('ft_api_key') || '';
  app.innerHTML = `<div class="container">
<button class="step-back" onclick="navigate('tools')">← Инструменты</button>
<div class="section-tag" style="margin-top:22px">Настройки</div>
<h2 class="section-title">API-ключ <span class="gold">OpenRouter</span></h2>
<p class="section-desc">Резервный канал сомелье. Ключ хранится только в этом браузере и никуда не отправляется, кроме openrouter.ai.</p>
<div class="simple-card" style="max-width:520px">
  <label class="field-label" for="api-key-input">Ключ</label>
  <input id="api-key-input" class="name-input" type="password" value="${k}" placeholder="sk-or-…" autocomplete="off">
  <button class="btn-primary" style="margin-top:14px;width:100%" onclick="localStorage.setItem('ft_api_key',document.getElementById('api-key-input').value);toast('Ключ сохранён')">Сохранить</button>
</div></div>`;
};

function renderLexicon() {
  const F = [{ n: 'Alcoholic', r: 'Алкогольный', c: '0110', g: 'Эстеры' }, { n: 'Spicy', r: 'Пряный', c: '0111', g: 'Фенолы' }, { n: 'Isoamyl Acetate', r: 'Банан/Груша', c: '0131', g: 'Эстеры' }, { n: 'Geraniol', r: 'Цветочный хмель', c: '0162', g: 'Хмель' }, { n: 'Kettle Hop', r: 'Котловый хмель', c: '0171', g: 'Хмель' }, { n: 'Hop Oil', r: 'Хмелевое масло', c: '0173', g: 'Хмель' }, { n: 'Freshly Cut Grass', r: 'Свежая трава', c: '0231', g: 'Растительные' }, { n: 'Grainy', r: 'Зерновой', c: '0310', g: 'Зерновые' }, { n: 'Malty', r: 'Солодовый', c: '0320', g: 'Зерновые' }, { n: 'Caramel', r: 'Карамель', c: '0410', g: 'Обжарка' }, { n: 'Burnt', r: 'Жжёный', c: '0420', g: 'Обжарка' }, { n: 'Smoky', r: 'Дымный', c: '0423', g: 'Обжарка' }, { n: 'Diacetyl', r: 'Диацетил', c: '0620', g: 'Жирные кислоты' }, { n: 'H2S', r: 'Сероводород', c: '0721', g: 'Серные' }, { n: 'DMS', r: 'Варёная кукуруза', c: '0732', g: 'Серные' }, { n: 'Bitter', r: 'Горький', c: '1200', g: 'Базовые' }, { n: 'Sweet', r: 'Сладкий', c: '1000', g: 'Базовые' }, { n: 'Sour', r: 'Кислый', c: '0920', g: 'Базовые' }, { n: 'Carbonation', r: 'Газация', c: '1360', g: 'Текстура' }];
  app.innerHTML = `<div class="container">
<button class="step-back" onclick="navigate('tools')">← Инструменты</button>
<div class="section-tag" style="margin-top:22px">FlavorActiV</div>
<h2 class="section-title">Beer Flavour <span class="gold">Lexicon</span></h2>
<p class="section-desc">Единый язык дегустаторов по стандартам ASBC и EBC: код дескриптора, название и группа происхождения.</p>
<div class="lex-groups">${(() => {
  const order = [];
  const by = {};
  F.forEach(f => { if (!by[f.g]) { by[f.g] = []; order.push(f.g) } by[f.g].push(f) });
  return order.map(g => `<section class="lex-group">
    <header class="lex-head">
      <span class="lex-name">${g}</span>
      <span class="lex-count num">${by[g].length}</span>
    </header>
    <ul class="lex-rows">${by[g].map(f => `<li class="lex-row">
      <span class="lex-code num">${f.c}</span>
      <span class="lex-terms"><b>${f.n}</b><em>${f.r}</em></span>
    </li>`).join('')}</ul>
  </section>`).join('');
})()}</div>
</div>`
}

// ═══ ADMIN PANEL ═══
function renderAdmin() {
  const elapsed = Math.round((Date.now() - T.start) / 1000);
  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
  const sessCount = T.sessions.length;
  const today = T.sessions.filter(s => Date.now() - s.ts < 86400000).length;
  const viewsArr = Object.entries(T.views).sort((a, b) => b[1] - a[1]);
  const pairCount = T.pairings.length;
  app.innerHTML = `<div class="container">
<button class="step-back" onclick="navigate('tools')">← Инструменты</button>
<div class="section-tag" style="margin-top:22px">Админка</div>
<h2 class="section-title">Аналитика <span class="gold">сессии</span></h2>
<p class="section-desc">Данные этого браузера: текущая сессия и локальная история визитов.</p>

<div class="stat-grid">
  <div class="stat-tile"><div class="stat-val">${mins}:${String(secs).padStart(2, '0')}</div><div class="stat-lbl">Время на сайте</div></div>
  <div class="stat-tile"><div class="stat-val">${T.clicks.length}</div><div class="stat-lbl">Действий</div></div>
  <div class="stat-tile"><div class="stat-val">${pairCount}</div><div class="stat-lbl">Подборов</div></div>
  <div class="stat-tile"><div class="stat-val">${T.chats}</div><div class="stat-lbl">Запросов к Максу</div></div>
</div>

<div class="simple-card">
  <h3 class="card-h">Просмотры экранов</h3>
  <div class="notes-list">${viewsArr.map(([k, v]) => `<div class="note-row"><span class="note-name-label">${k}</span><div class="note-bar-bg"><div class="note-bar-fill" style="width:${Math.min(100, v * 10)}%"></div></div><span class="note-pct">${v}</span></div>`).join('') || '<p class="dim small">Пока нет данных</p>'}</div>
</div>

<div class="simple-card" style="margin-top:14px">
  <h3 class="card-h">История сессий</h3>
  <p class="small muted"><strong class="gold">${sessCount}</strong> всего · <strong class="gold">${today}</strong> за сутки</p>
  <div class="log-list" style="margin-top:10px">${T.sessions.slice(-10).reverse().map(x => `<div class="log-line"><strong>визит</strong><span>${new Date(x.ts).toLocaleString('ru')}</span></div>`).join('') || '<p class="dim small">Пока нет данных</p>'}</div>
</div>

<div class="simple-card" style="margin-top:14px">
  <h3 class="card-h">Последние действия</h3>
  <div class="log-list">${T.clicks.slice(-15).reverse().map(c => `<div class="log-line"><strong>${c.type}${c.data ? ' · ' + String(c.data).slice(0, 42) : ''}</strong><span>${new Date(c.ts).toLocaleTimeString('ru')}</span></div>`).join('') || '<p class="dim small">Пока нет данных</p>'}</div>
</div>
</div>`;
  setTimeout(() => { if (currentPage === 'admin') renderAdmin() }, 1000);
}
window.renderAdmin = renderAdmin;

// ═══ LEARN ═══
const QUIZZES = [
  { id: 'q1', beerId: 'efes', q: 'В каком стиле сварен Efes Pilsener?', opts: ['Dark Lager', 'Rice Lager', 'Pilsener', 'Stout'], ans: 2, xp: 15 },
  { id: 'q2', beerId: 'efes', q: 'Какая горечь по шкале IBU у Efes Pilsener?', opts: ['12', '18', '22', '30'], ans: 2, xp: 10 },
  { id: 'q3', beerId: 'kozel', q: 'Что доминирует во вкусе Kozel Тёмного?', opts: ['Цитрус', 'Карамель', 'Рис', 'Хмель'], ans: 1, xp: 15 },
  { id: 'q4', beerId: 'kozel', q: 'Какая крепость у Kozel Тёмного?', opts: ['3.7%', '4.5%', '5.0%', '6.0%'], ans: 0, xp: 10 },
  { id: 'q5', beerId: 'wukong', q: 'Из чего варят Wùkōng Jū?', opts: ['Пшеница', 'Рис', 'Кукуруза', 'Овёс'], ans: 1, xp: 15 },
  { id: 'q6', beerId: 'wukong', q: 'Какая горечь по шкале IBU у Wùkōng Jū?', opts: ['6', '12', '22', '28'], ans: 1, xp: 10 },
  { id: 'q7', beerId: 'kruzhka', q: 'Какой слоган у «Кружки Свежего»?', opts: ['Лёгкость Азии', 'Три хмеля', 'Мягкость каждого дня', 'Тот самый вкус'], ans: 2, xp: 10 },
  { id: 'q8', beerId: 'melnik', q: 'Сколько сортов хмеля в «Старом Мельнике»?', opts: ['1', '2', '3', '4'], ans: 2, xp: 15 },
  { id: 'q9', beerId: 'efes', q: 'К какому блюду Efes Pilsener подходит лучше всего?', opts: ['Фондан', 'Шашлык из баранины', 'Дим-самы', 'Гуляш'], ans: 1, xp: 20 },
  { id: 'q10', beerId: 'kozel', q: 'С каким блюдом Kozel Тёмное раскрывается лучше всего?', opts: ['Сашими', 'Пад Тай', 'Гуляш по-чешски', 'Брускетта'], ans: 2, xp: 20 },
];

// Уровни живут одним списком: их читают и «Школа», и «Профиль» — иначе
// пороги разъезжаются при первой же правке.
const LEVELS = [
  { min: 0,   name: 'Новичок',  i: 'leaf',    note: 'Первые шаги — учимся называть то, что чувствуем' },
  { min: 50,  name: 'Любитель', i: 'glass',   note: 'Стили уже не путаются между собой' },
  { min: 150, name: 'Ценитель', i: 'flute',   note: 'Слышите ноты, а не просто «вкусно»' },
  { min: 300, name: 'Сомелье',  i: 'somm',    note: 'Собираете пары сами, без подсказок' },
  { min: 500, name: 'Мастер',   i: 'sparkle', note: 'Можете вести дегустацию для зала' },
];
function levelOf(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) cur = l;
  const next = LEVELS[LEVELS.indexOf(cur) + 1] || null;
  const span = next ? next.min - cur.min : 1;
  return { ...cur, next, pct: next ? Math.min(100, Math.round(((xp - cur.min) / span) * 100)) : 100 };
}
window.levelOf = levelOf;

window.renderLearn = function () {
  const p = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  const done = JSON.parse(localStorage.getItem('ft_quiz_done') || '[]');
  const xp = p.xp || 0;
  const lv = levelOf(xp);
  app.innerHTML = `<div class="container learn">
<header class="sec-head first">
  <p class="sec-kicker">Школа вкуса</p>
  <h2 class="sec-title">Учитесь <em>различать</em></h2>
  <p class="sec-desc">Десять вопросов о линейке Efes Kazakhstan. За каждый верный ответ — опыт и новый уровень дегустатора.</p>
</header>

<div class="level-card">
  <span class="level-badge" aria-hidden="true">${ico(lv.i)}</span>
  <div class="level-body">
    <div class="level-row">
      <span class="level-name">${lv.name}</span>
      <span class="level-xp num">${xp}<i>XP</i></span>
    </div>
    <div class="xp-bar"><i style="width:${lv.pct}%"></i></div>
    <div class="xp-meta">${lv.next
      ? `${lv.next.min - xp} XP до уровня «${lv.next.name}»`
      : 'Высший уровень — линейка пройдена'} · ${done.length} из ${QUIZZES.length} ${plural(QUIZZES.length, 'вопрос', 'вопроса', 'вопросов')}</div>
  </div>
</div>

${BEERS.map(b => {
    const mine = QUIZZES.map((q, i) => ({ q, i })).filter(x => x.q.beerId === b.id);
    if (!mine.length) return '';
    const okCount = mine.filter(x => done.includes(x.q.id)).length;
    const pool = mine.reduce((a, x) => a + x.q.xp, 0);
    const allDone = okCount === mine.length;
    return `<section class="module${allDone ? ' done' : ''}" style="--aura:${b.color}">
  <header class="module-head">
    <span class="module-shot"><img src="${b.img}" alt="" loading="lazy"></span>
    <span class="module-title">
      <b>${b.name}</b>
      <em>${mine.length} ${plural(mine.length, 'вопрос', 'вопроса', 'вопросов')} · <span class="num">${pool}</span> XP</em>
    </span>
    <span class="module-tally${allDone ? ' done' : ''}">${allDone ? ico('check', 'sm') : `<b class="num">${okCount}</b>/<span class="num">${mine.length}</span>`}</span>
  </header>
  <ol class="quiz-list">${mine.map((x, k) => {
      const ok = done.includes(x.q.id);
      return `<li><button class="quiz-row${ok ? ' done' : ''}" style="--aura:${b.color}" onclick="startQuiz(${x.i})">
    <span class="quiz-n num">${String(k + 1).padStart(2, '0')}</span>
    <span class="quiz-q">${x.q.q}</span>
    <span class="quiz-xp${ok ? ' done' : ''}">${ok ? ico('check', 'sm') : `+${x.q.xp}<i>XP</i>`}</span>
  </button></li>`;
    }).join('')}</ol>
</section>`;
  }).join('')}
</div>`;
  reveal();
};

const OPT_KEYS = ['А', 'Б', 'В', 'Г', 'Д'];

window.startQuiz = function (idx) {
  const q = QUIZZES[idx];
  const beer = BEERS.find(b => b.id === q.beerId) || {};
  const nextIdx = idx + 1 < QUIZZES.length ? idx + 1 : null;
  function renderQ(selected = null) {
    const answered = selected !== null;
    const ok = answered && selected === q.ans;
    app.innerHTML = `<div class="container quiz-play">
<button class="step-back" onclick="navigate('learn')">← Школа вкуса</button>

<header class="quiz-top" style="--aura:${beer.color || '#9b6b3d'}">
  <span class="quiz-brand">
    <span class="quiz-brand-shot">${beer.img ? `<img src="${beer.img}" alt="">` : ''}</span>
    <span class="quiz-brand-text"><b>${beer.name || 'FlavorTree'}</b><em>${beer.style || 'Школа вкуса'}${beer.abv ? ' · ' + beer.abv + '%' : ''}</em></span>
  </span>
  <span class="quiz-stake"><b class="num">+${q.xp}</b><i>XP</i></span>
</header>

<div class="quiz-track">
  <div class="step-progress">${QUIZZES.map((_, i) => `<div class="step-dot ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}"></div>`).join('')}</div>
  <span class="quiz-count">Вопрос <b class="num">${idx + 1}</b> из <b class="num">${QUIZZES.length}</b></span>
</div>

<h2 class="quiz-ask">${q.q}</h2>

<div class="quiz-options">
${q.opts.map((o, i) => {
      let cls = '';
      if (answered) { if (i === q.ans) cls = ' right'; else if (i === selected) cls = ' wrong'; else cls = ' idle'; }
      return `<button class="quiz-opt${cls}" onclick="answerQuiz(${idx},${i})" ${answered ? 'disabled' : ''}>
  <span class="opt-key">${OPT_KEYS[i] || i + 1}</span>
  <span class="opt-text">${o}</span>
  <span class="opt-state">${cls === ' right' ? ico('check', 'sm') : cls === ' wrong' ? ico('close', 'sm') : ''}</span>
</button>`;
    }).join('')}
</div>

${answered ? `<div class="verdict ${ok ? 'right' : 'wrong'}">
  <span class="verdict-ico">${ico(ok ? 'check' : 'close')}</span>
  <span class="verdict-body">
    <b>${ok ? 'Верно' : 'Мимо'}</b>
    <em>${ok ? `+${q.xp} XP зачислено в профиль` : `Правильный ответ — «${q.opts[q.ans]}»`}</em>
  </span>
</div>
<div class="quiz-next">
  ${nextIdx !== null ? `<button class="btn-primary" onclick="startQuiz(${nextIdx})">Следующий вопрос →</button>` : `<button class="btn-primary" onclick="navigate('profile')">Забрать опыт в профиль →</button>`}
  <button class="btn-ghost" onclick="navigate('learn')">Все вопросы</button>
</div>` : '<p class="quiz-tip">Один вопрос — один ответ. Ошибка тоже засчитывается: важно услышать вкус, а не угадать.</p>'}
</div>`;
  }
  renderQ();
  window.answerQuiz = function (qIdx, sel) {
    const quiz = QUIZZES[qIdx];
    const done = JSON.parse(localStorage.getItem('ft_quiz_done') || '[]');
    if (!done.includes(quiz.id)) {
      done.push(quiz.id);
      localStorage.setItem('ft_quiz_done', JSON.stringify(done));
      if (sel === quiz.ans) { const p = JSON.parse(localStorage.getItem('ft_profile') || '{}'); p.xp = (p.xp || 0) + quiz.xp; localStorage.setItem('ft_profile', JSON.stringify(p)); }
    }
    renderQ(sel);
  };
};

// ═══ PROFILE ═══
// Отпечаток вкуса собирается из того, что гость подтвердил сам: ноты,
// услышанные в дегустации, плюс сорта, которым он поставил высокую
// оценку. Придуманных данных здесь нет — иначе профиль врёт.
function tasteFingerprint(prof) {
  const tally = {};
  const noteRef = n => {
    for (const b of BEERS) {
      const hit = (b.notes || []).find(x => x.n === n);
      if (hit) return hit;
    }
    return null;
  };
  const noteColor = n => (noteRef(n) || {}).c || null;
  const bump = (name, color, w) => {
    if (!name) return;
    if (!tally[name]) {
      const ref = noteRef(name) || {};
      tally[name] = { name, color: color || ref.c || 'var(--gold)', i: ref.i || 55, w: 0 };
    }
    tally[name].w += w;
  };
  const tastings = prof.tastings || {};
  Object.keys(tastings).forEach(id => {
    (tastings[id].hit || []).forEach(n => bump(n, noteColor(n), 4));
    (tastings[id].missed || []).forEach(n => bump(n, noteColor(n), 1));
  });
  const revs = JSON.parse(localStorage.getItem('ft_reviews') || '{}');
  Object.keys(revs).forEach(id => {
    const beer = BEERS.find(b => b.id === id);
    if (!beer) return;
    revs[id].forEach(r => {
      if (r.stars >= 4) (beer.notes || []).slice(0, 3).forEach(n => bump(n.n, n.c, r.stars - 3));
    });
  });
  (prof.favBeers || []).forEach(id => {
    const beer = BEERS.find(b => b.id === id);
    if (beer) (beer.notes || []).slice(0, 2).forEach(n => bump(n.n, n.c, 1));
  });
  const list = Object.values(tally).sort((a, b) => b.w - a.w || b.i - a.i).slice(0, 5);
  return list.map(x => ({ ...x, pct: Math.max(24, Math.min(100, x.i || 55)) }));
}

window.renderProfile = function () {
  const p = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  const done = JSON.parse(localStorage.getItem('ft_quiz_done') || '[]');
  const xp = p.xp || 0;
  const lv = levelOf(xp);
  const lvl = [ico(lv.i), lv.name];
  const name = p.name || 'Гость'; const avatar = p.avatar || '';
  const badges = [];
  if (done.length >= 1) badges.push({ i: 'school', t: 'Первый квиз' });
  if (done.length >= 5) badges.push({ i: 'book', t: 'Знаток' });
  if (done.length >= QUIZZES.length) badges.push({ i: 'sparkle', t: 'Эксперт' });
  if (xp >= 100) badges.push({ i: 'spark2', t: '100 XP' });
  if (xp >= 300) badges.push({ i: 'flame', t: '300 XP' });
  if (T.pairings.length >= 3) badges.push({ i: 'plate', t: 'Бармен' });
  if (T.chats >= 5) badges.push({ i: 'somm', t: 'Собеседник' });
  // Бейджи дегустации складывались в профиль, но никто их не читал
  (p.badges || []).forEach(t => badges.push({ i: 'flute', t }));

  const print = tasteFingerprint(p);
  const tastings = p.tastings || {};
  const tastedIds = Object.keys(tastings);
  const xpToNext = lv.next ? Math.max(0, lv.next.min - xp) : 0;

  app.innerHTML = `<div class="container" style="max-width:680px">
<div class="section-tag">Профиль</div>
<h2 class="section-title">Ваш <span class="gold">вкус</span></h2>

<div class="profile-head">
  <div class="avatar-slot">
    <div class="avatar-disc" id="ava" onclick="document.getElementById('ava-file').click()" role="button" tabindex="0" aria-label="Сменить аватар">${avatar.startsWith('data:') ? `<img src="${avatar}" alt="">` : `<span class="avatar-mono">${name.trim().charAt(0).toUpperCase() || 'F'}</span>`}</div>
    <input type="file" id="ava-file" accept="image/*" class="sr-only" onchange="uploadAva(event)">
    <div class="avatar-hint">Сменить фото</div>
  </div>
  <div class="level-body">
    <input id="pname" class="name-input" value="${name}" placeholder="Ваше имя" onchange="saveName(this.value)" aria-label="Имя">
    <div class="level-name">${lvl[0]} ${lvl[1]}</div>
    <p class="level-note">${lv.note}</p>
    <div class="xp-bar"><i style="width:${lv.pct}%"></i></div>
    <div class="xp-meta">
      <span><b class="num">${xp}</b> XP</span>
      ${lv.next ? `<span class="dim">до уровня «${lv.next.name}» — ещё <b class="num">${xpToNext}</b></span>` : '<span class="gold">высший уровень</span>'}
    </div>
  </div>
</div>

<div class="simple-card print-card">
  <h3 class="card-h">${ico('droplet', 'sm')} Вкусовой отпечаток</h3>
  ${print.length ? `
    <p class="dim small print-sub">Ноты, которые вы уже слышите. Полоса — насколько нота выражена в бокале.</p>
    <ul class="print-list">${print.map(t => `<li class="print-row">
      <span class="print-name">${t.name}</span>
      <span class="print-bar"><i style="width:${t.pct}%;background:${t.color}"></i></span>
    </li>`).join('')}</ul>
    ${tastedIds.length ? `<div class="print-foot">${tastedIds.map(id => {
      const b = BEERS.find(x => x.id === id);
      return b ? `<span class="print-chip"><img src="${b.img}" alt="" loading="lazy"><em>${b.name}</em><b class="num">${tastings[id].pct}%</b></span>` : '';
    }).join('')}</div>` : ''}
  ` : `
    <p class="dim small print-sub">Пока пусто. Отпечаток рисуется из нот, которые вы услышите в бокале — по одной дегустации на сорт.</p>
    <ul class="print-list ghost">${['Цитрус', 'Карамель', 'Хлеб', 'Горечь'].map((n, i) => `<li class="print-row">
      <span class="print-name">${n}</span>
      <span class="print-bar"><i style="width:${[62, 44, 78, 33][i]}%"></i></span>
    </li>`).join('')}</ul>
    <button class="btn-primary print-cta" onclick="navigate('tinder')">Начать дегустацию ${ico('arrow', 'sm')}</button>
  `}
</div>

<div class="simple-card" style="margin-bottom:16px">
  <h3 class="card-h">Достижения</h3>
  ${badges.length
    ? `<div class="badge-row">${badges.map(b => `<span class="badge-pill">${ico(b.i, 'sm')}${b.t}</span>`).join('')}</div>`
    : `<p class="dim small">Первый бейдж — за один пройденный вопрос в Школе вкуса.</p>
       <button class="btn-link" onclick="navigate('learn')">Открыть Школу вкуса →</button>`}
</div>

<div class="simple-card" style="margin-bottom:16px">
  <h3 class="card-h">Мои заметки и отзывы</h3>
  <div id="profile-reviews-list">${renderProfileReviews()}</div>
</div>

${badges.length || print.length ? `<div class="row" style="display:flex;gap:12px;flex-wrap:wrap">
  <button class="btn-primary" style="flex:1;min-width:200px" onclick="navigate('learn')">Пройти квизы</button>
  <button class="btn-ghost" style="flex:1;min-width:200px" onclick="navigate('tinder')">Свайп-дегустация</button>
</div>` : ''}
</div>`;
};
function renderProfileReviews() {
  const prof = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  const allRevs = JSON.parse(localStorage.getItem('ft_reviews') || '{}');
  let myRevs = [];
  for (const beerId in allRevs) {
    allRevs[beerId].forEach(r => {
      if (r.author === prof.name || (prof.name === undefined && r.author === 'Аноним')) {
        myRevs.push({ beerId, ...r });
      }
    });
  }
  if (myRevs.length === 0) return '<p class="dim small">Заметок пока нет — оценка ставится на странице бренда.</p><button class="btn-link" onclick="navigate(\'catalog\')">Выбрать бренд →</button>';
  myRevs.sort((a, b) => b.ts - a.ts);
  return myRevs.map(r => {
    const beer = BEERS.find(b => b.id === r.beerId);
    return `<div class="review-item" style="cursor:pointer" onclick="flowSelections.beer='${r.beerId}';flowStep=2;flowMode='beer';renderStep()">
      <div class="review-head">
        <span class="review-author">${beer ? beer.name : 'Пиво'}</span>
        <span class="rating-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
      </div>
      <p class="review-body">${r.text}</p>
      <div class="review-date">${new Date(r.ts).toLocaleDateString('ru')}</div>
    </div>`;
  }).join('');
}
window.saveName = function (v) { const p = JSON.parse(localStorage.getItem('ft_profile') || '{}'); p.name = v; localStorage.setItem('ft_profile', JSON.stringify(p)); };
window.uploadAva = function (e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const p = JSON.parse(localStorage.getItem('ft_profile') || '{}'); p.avatar = ev.target.result; localStorage.setItem('ft_profile', JSON.stringify(p)); renderProfile(); }; r.readAsDataURL(f); };

// ═══ REGISTRATION ═══
window.renderRegister = function () {
  const p = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  if (p.registered) { navigate('profile'); return; }
  app.innerHTML = `<div class="container" style="max-width:520px">
<div class="section-tag">Регистрация</div>
<h2 class="section-title">Создайте <span class="gold">профиль</span></h2>
<p class="section-desc">Отзывы, опыт и прогресс дегустатора сохранятся между визитами.</p>
<div class="simple-card" style="padding:28px">
  <div class="form-field"><label class="field-label" for="reg-name">Имя</label>
    <input id="reg-name" placeholder="Как к вам обращаться?" autocomplete="name"></div>
  <div class="form-field"><label class="field-label" for="reg-email">Email</label>
    <input id="reg-email" type="email" placeholder="email@example.com" autocomplete="email"></div>
  <div class="form-field"><label class="field-label" for="reg-age">Возраст</label>
    <select id="reg-age">
      <option value="">Подтвердите возраст</option><option value="18-25">18–25</option><option value="26-35">26–35</option><option value="36-45">36–45</option><option value="46+">46+</option>
    </select></div>
  <div class="form-field"><span class="field-label">Любимые бренды</span>
    <div class="badge-row">${BEERS.map(b => `<button type="button" class="reg-style-btn" data-id="${b.id}" aria-pressed="false" onclick="this.classList.toggle('reg-selected');this.setAttribute('aria-pressed',this.classList.contains('reg-selected'))"><i class="tone-dot" style="--tone:${b.color}"></i>${b.name}</button>`).join('')}</div></div>
  <div id="reg-error" class="form-error" role="alert"></div>
  <button class="btn-primary" style="width:100%" onclick="doRegister()">Создать профиль →</button>
</div>
<p class="center small muted" style="margin-top:16px">Уже есть профиль? <a href="#" onclick="navigate('profile');return false">Войти</a></p>
</div>`;
};
window.doRegister = function () {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const age = document.getElementById('reg-age').value;
  const err = document.getElementById('reg-error');
  if (!name) { err.textContent = 'Укажите имя'; err.classList.add('on'); return; }
  if (!email || !email.includes('@')) { err.textContent = 'Укажите корректный email'; err.classList.add('on'); return; }
  if (!age) { err.textContent = 'Подтвердите возраст'; err.classList.add('on'); return; }
  const favs = Array.from(document.querySelectorAll('.reg-selected')).map(e => e.dataset.id);
  const p = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  p.name = name; p.email = email; p.age = age; p.favBeers = favs; p.registered = true; p.registeredAt = Date.now();
  if (!p.xp) p.xp = 0;
  localStorage.setItem('ft_profile', JSON.stringify(p));
  navigate('profile');
};

// ═══ REVIEWS ═══
let pendingStarRating = 0;
window.setStarRating = function (v) {
  pendingStarRating = v;
  document.querySelectorAll('#star-input .star').forEach(s => {
    s.classList.toggle('on', parseInt(s.dataset.v, 10) <= v);
  });
};
function getReviews(beerId) {
  const all = JSON.parse(localStorage.getItem('ft_reviews') || '{}');
  return all[beerId] || [];
}
function renderReviews(beerId) {
  const revs = getReviews(beerId);
  if (!revs.length) return '<p class="dim small">Отзывов пока нет — станьте первым.</p>';
  const avg = (revs.reduce((sum, r) => sum + r.stars, 0) / revs.length).toFixed(1);
  const filled = Math.round(avg);
  return `<div class="rating-summary">
    <span class="rating-avg">${avg}</span>
    <span class="rating-stars">${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}</span>
    <span class="rating-count">${revs.length} ${plural(revs.length, 'отзыв', 'отзыва', 'отзывов')}</span>
  </div>` + revs.slice(-6).reverse().map(r => `<div class="review-item">
    <div class="review-head">
      <span class="review-author">${r.author || 'Гость'}</span>
      <span class="rating-stars" style="font-size:14px">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
    </div>
    <p class="review-body">${r.text}</p>
    <div class="review-date">${new Date(r.ts).toLocaleDateString('ru')}</div>
  </div>`).join('');
}
window.submitReview = function (beerId) {
  const text = document.getElementById('review-text').value.trim();
  if (!text || !pendingStarRating) { toast('Поставьте оценку и напишите пару слов', true); return; }
  const prof = JSON.parse(localStorage.getItem('ft_profile') || '{}');
  const all = JSON.parse(localStorage.getItem('ft_reviews') || '{}');
  if (!all[beerId]) all[beerId] = [];
  all[beerId].push({ author: prof.name || 'Аноним', stars: pendingStarRating, text, ts: Date.now() });
  localStorage.setItem('ft_reviews', JSON.stringify(all));
  pendingStarRating = 0;
  const el = document.getElementById('reviews-section');
  if (el) el.innerHTML = renderReviews(beerId);
  document.getElementById('review-text').value = '';
  document.querySelectorAll('#star-input .star').forEach(s => s.classList.remove('on'));
  toast('Спасибо за отзыв!');
};

// ═══ КАБИНЕТ ПЕРСОНАЛА ═══
// Гостевое приложение и рабочие экраны заведения — один продукт, но разные
// страницы (свой бандл, своя авторизация). Этот хаб их связывает, чтобы
// официант не искал ссылки в мессенджере.

const STAFF_TOOLS = [
  {
    ico: 'chef', title: 'Портал HoReCa (B2B & Гости)', href: 'horeca.html',
    desc: 'Единый портал для ресторанов и гостей: онлайн-подбор пары, калькулятор окупаемости и подключение заведения.',
    tag: 'Платформа HoReCa',
  },
  {
    ico: 'school', title: 'Тренажёр официанта', href: 'train.html',
    desc: 'Карточки брендов, вкусовые мосты и зачёт по линейке. Смена входит по коду сотрудника.',
    tag: 'Обучение',
  },
  {
    ico: 'trend', title: 'Кабинет заведения', href: 'dashboard.html',
    desc: 'Выручка по рекомендациям, конверсия подсказок в заказ и топ пар «блюдо × пиво».',
    tag: 'Аналитика',
  },
  {
    ico: 'plate', title: 'Экран за столом', href: 'table.html',
    desc: 'То, что видит гость после скана QR: блюдо → рекомендация → заказ и оценка.',
    tag: 'Гость · HoReCa',
  },
  {
    ico: 'box', title: 'Полка в магазине', href: 'store.html',
    desc: 'Розничный режим: подбор к корзине, рецепты и шелфтокеры торговой точки.',
    tag: 'Гость · Retail',
  },
];

window.renderStaff = function () {
  app.innerHTML = `<div class="container">
<div class="section-tag">Для персонала</div>
<h2 class="section-title">Рабочие <span class="gold">экраны</span></h2>
<p class="section-desc">Гостевое приложение — только половина платформы. Вторая половина живёт в зале: тренажёр смены, кабинет управляющего и QR-экраны для стола и полки.</p>

<div class="tools-grid" style="margin-top:26px">
${STAFF_TOOLS.map(t => `<a class="tool-card staff-card" href="${t.href}">
  <div class="tool-icon">${ico(t.ico)}</div>
  <h3>${t.title}</h3>
  <p>${t.desc}</p>
  <div class="card-specs">${t.tag}</div>
</a>`).join('')}
</div>

<div class="simple-card" style="margin-top:20px">
  <h3 class="card-h">QR для столов и полок</h3>
  <p class="small muted">Каждый стол и каждая полка получают короткую ссылку — её видно глазами и можно набрать руками, если камера подводит.</p>
  <button class="btn-ghost" style="margin-top:14px" onclick="navigate('qr')">Собрать ссылку →</button>
</div>
</div>`;
};

window.renderQR = function () {
  const saved = localStorage.getItem('ft_qr_token') || '';
  const kind = localStorage.getItem('ft_qr_kind') || 't';
  app.innerHTML = `<div class="container" style="max-width:640px">
<button class="step-back" onclick="navigate('staff')">← Кабинет персонала</button>
<div class="section-tag" style="margin-top:22px">QR-носители</div>
<h2 class="section-title">Ссылка для <span class="gold">стола</span></h2>
<p class="section-desc">Токен выдаётся заведению при подключении точки. Ссылка открывает гостевой экран без регистрации и живёт в session_token скана.</p>

<div class="simple-card">
  <div class="form-field"><span class="field-label">Тип носителя</span>
    <div class="badge-row">
      <button type="button" class="reg-style-btn${kind === 't' ? ' reg-selected' : ''}" onclick="setQRKind('t')">${ico('plate','sm')}Стол в ресторане</button>
      <button type="button" class="reg-style-btn${kind === 's' ? ' reg-selected' : ''}" onclick="setQRKind('s')">${ico('box','sm')}Полка в магазине</button>
    </div>
  </div>
  <div class="form-field"><label class="field-label" for="qr-token">Токен точки</label>
    <input id="qr-token" value="${saved}" placeholder="например t-dostyk-14" autocomplete="off" oninput="renderQRLink()"></div>
  <span class="field-label">Готовая ссылка</span>
  <div class="qr-link" id="qr-link">—</div>
  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
    <button class="btn-primary" style="flex:1;min-width:150px" onclick="copyQRLink()">Скопировать</button>
    <button class="btn-ghost" style="flex:1;min-width:150px" onclick="openQRLink()">Открыть</button>
  </div>
</div>

<div class="simple-card" style="margin-top:16px">
  <h3 class="card-h">Печатные тейбл-тенты</h3>
  <p class="small muted">Готовые к печати носители со сгибом собирает бэкенд — по одной команде на все точки заведения:</p>
  <pre class="cmd">python manage.py qr_tents --base-url https://flavortree.kz --all</pre>
  <p class="small dim">Ресторану — двусторонний тент, магазину — карточка на полку. Тип выбирается по Venue.kind.</p>
</div>
</div>`;
  renderQRLink();
};

window.setQRKind = function (k) {
  localStorage.setItem('ft_qr_kind', k);
  renderQR();
};

function qrLinkValue() {
  const token = (document.getElementById('qr-token') || {}).value || '';
  const kind = localStorage.getItem('ft_qr_kind') || 't';
  if (!token.trim()) return '';
  return `${location.origin}/${kind}/${token.trim()}`;
}

window.renderQRLink = function () {
  const el = document.getElementById('qr-link');
  if (!el) return;
  const token = (document.getElementById('qr-token') || {}).value || '';
  localStorage.setItem('ft_qr_token', token);
  const link = qrLinkValue();
  el.textContent = link || '— введите токен точки —';
  el.classList.toggle('empty', !link);
};

window.copyQRLink = function () {
  const link = qrLinkValue();
  if (!link) { toast('Сначала введите токен точки', true); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast('Ссылка скопирована'), () => toast('Не удалось скопировать', true));
  else toast('Скопируйте ссылку вручную', true);
};

window.openQRLink = function () {
  const link = qrLinkValue();
  if (!link) { toast('Сначала введите токен точки', true); return; }
  window.open(link, '_blank', 'noopener');
};

// Кабинет и тренажёр — отдельные страницы со своей авторизацией
window.renderDashboard = function () { location.href = 'dashboard.html' };
window.renderStaffTraining = function () { location.href = 'train.html' };

// ═══ TINDER TASTING ═══
const TINDER_DATA = {
  efes: {
    name: 'Efes Pilsener',
    q: [
      { e: '🍋', n: 'Цитрус', q: 'Чувствуешь лимонную цедру?', h: 'Легкая цитрусовая кислинка в самом первом глотке' },
      { e: '🍞', n: 'Хлеб', q: 'Слышишь аромат свежей хлебной корки?', h: 'Плотная, сытная база от трех видов ячменного солода' },
      { e: '🌿', n: 'Трава', q: 'Ощущаешь травянистые тона хмеля?', h: 'Тонкий благородный профиль немецкого хмеля Hallertau' },
      { e: '⚡', n: 'Горечь', q: 'Присутствует чистая, сухая горчинка в конце?', h: 'Фирменное послевкусие пильзнера с уровнем горечи IBU 22' }
    ]
  },
  kozel: {
    name: 'Kozel Тёмное',
    q: [
      { e: '🍞', n: 'Хлеб', q: 'Чувствуешь аромат корочки ржаного хлеба?', h: 'Характерный тон тёмного обжаренного солода' },
      { e: '🍯', n: 'Карамель', q: 'Ощущаешь мягкую карамельную сладость?', h: 'Бархатистые сладкие оттенки без приторности' },
      { e: '☕', n: 'Шоколад', q: 'Слышишь тонкие нотки кофе или какао?', h: 'Сложный глубокий аромат жжёного ячменя' },
      { e: '🍦', n: 'Сладость', q: 'Есть мягкое, обволакивающее послевкусие?', h: 'Питкое тело с деликатным сладковатым финишем' }
    ]
  },
  wukong: {
    name: 'Wùkōng Jū',
    q: [
      { e: '🌾', n: 'Рис', q: 'Чувствуешь лёгкие тона рисовой крупы?', h: 'Чистый нейтральный профиль рисового лагера' },
      { e: '🌸', n: 'Цветочный', q: 'Ощущаешь цветочный аромат жасмина?', h: 'Тонкие жасминовые оттенки китайского хмеля' },
      { e: '🍋', n: 'Фрукты', q: 'Слышишь едва уловимые нотки фруктов?', h: 'Свежие фруктовые эфиры на заднем плане' },
      { e: '🧊', n: 'Мягкость', q: 'Послевкусие чистое, без капли горечи?', h: 'Максимально питкий лагер с минимальной горечью IBU 12' }
    ]
  },
  kruzhka: {
    name: 'Кружка Свежего',
    q: [
      { e: '🌾', n: 'Солод', q: 'Слышишь мягкий, чистый солодовый вкус?', h: 'Классическая ячменная основа светлого лагера' },
      { e: '🍯', n: 'Мёд', q: 'Ощущаешь лёгкую медовую сладость?', h: 'Сладковатый мягкий солодовый тон' },
      { e: '🌿', n: 'Трава', q: 'Чувствуешь лёгкие травянистые нотки хмеля?', h: 'Едва заметный ароматный хмелевой шлейф' },
      { e: '🌊', n: 'Свежесть', q: 'Освежающее, супер-питкое послевкусие?', h: 'Легкая летняя фильтрация для максимальной питкости' }
    ]
  },
  melnik: {
    name: 'Старый Мельник',
    q: [
      { e: '🍞', n: 'Хлеб', q: 'Ощущаешь плотный хлебный вкус?', h: 'Богатый тон традиционной варки' },
      { e: '🌿', n: 'Хмель', q: 'Слышишь тройной хмелевой аромат?', h: 'Три сорта хмеля, заданные по бочковой технологии' },
      { e: '🍯', n: 'Мёд', q: 'Есть мягкий медовый полутон во рту?', h: 'Слегка сладковатый хмелевой оттенок' },
      { e: '🍺', n: 'Мягкость', q: 'Чувствуешь бархатистое, округлое тело?', h: 'Мягкость, достигнутая бочковым брожением' }
    ]
  }
};

let currentTinderBeer = null;
let tinderIdx = 0;
let tinderAnswers = [];

window.renderTinder = function () {
  if (!currentTinderBeer) {
    // Пройденные дегустации живут в профиле — показываем их там, где гость выбирает сорт
    const past = (JSON.parse(localStorage.getItem('ft_profile') || '{}')).tastings || {};
    const tasted = BEERS.filter(b => past[b.id]).length;

    app.innerHTML = `<div class="container">
      <div class="section-tag">Дегустация</div>
      <h2 class="section-title">Свайп-<span class="gold">дегустация</span></h2>
      <p class="section-desc">Четыре вопроса о том, что вы действительно чувствуете в бокале. Свайп вправо — нота есть, влево — нет. В конце получите свою вкусовую ДНК и опыт.</p>
      ${tasted ? `<div class="taste-tally">
        <div class="taste-tally-row">
          <span><b class="num">${tasted}</b> из <span class="num">${BEERS.length}</span> ${plural(BEERS.length, 'сорта', 'сортов', 'сортов')} за плечами</span>
          ${tasted === BEERS.length
            ? '<span class="gold small">вся линейка пройдена</span>'
            : `<button class="btn-link" onclick="navigate('profile')">Мой отпечаток →</button>`}
        </div>
        <div class="xp-bar"><i style="width:${Math.round((tasted / BEERS.length) * 100)}%"></i></div>
      </div>` : ''}
      <ul class="pick-list">
        ${BEERS.map(b => {
          const seen = past[b.id];
          const qn = TINDER_DATA[b.id] ? TINDER_DATA[b.id].q.length : 4;
          return `<li><button class="pick-row${seen ? ' tasted' : ''}" style="--aura:${b.color}" onclick="startTinder('${b.id}')">
          <span class="pick-shot"><img src="${b.img}" alt="" loading="lazy"></span>
          <span class="pick-body">
            <span class="pick-style">${b.style}</span>
            <span class="pick-name">${b.name}</span>
            <span class="pick-meta"><span><b class="num">${b.abv}%</b> ABV</span><i></i><span><b class="num">${b.ibu}</b> IBU</span><i></i><span>${seen ? `${seen.hit.length ? seen.hit.slice(0, 2).join(' · ') : 'нот не найдено'}` : `${qn} ${plural(qn, 'вопрос', 'вопроса', 'вопросов')}`}</span></span>
          </span>
          ${seen
            ? `<span class="pick-score"><b class="num">${seen.pct}%</b><em>снова</em></span>`
            : `<span class="pick-go">${ico('arrow')}</span>`}
        </button></li>`;
        }).join('')}
      </ul>
    </div>`;
    reveal();
  } else {
    const data = TINDER_DATA[currentTinderBeer];
    const qList = data.q;

    if (tinderIdx >= qList.length) {
      const correctCount = tinderAnswers.filter(a => a.value).length;
      const prof = JSON.parse(localStorage.getItem('ft_profile') || '{}');
      const xpEarned = 25;
      prof.xp = (prof.xp || 0) + xpEarned;
      if (!prof.badges) prof.badges = [];
      const badgeName = `Дегустатор ${data.name}`;
      if (!prof.badges.includes(badgeName)) {
        prof.badges.push(badgeName);
      }
      if (!prof.tastings) prof.tastings = {};
      prof.tastings[currentTinderBeer] = {
        hit: qList.filter((q, i) => tinderAnswers[i] && tinderAnswers[i].value).map(q => q.n),
        missed: qList.filter((q, i) => !(tinderAnswers[i] && tinderAnswers[i].value)).map(q => q.n),
        pct: Math.round((correctCount / qList.length) * 100),
        ts: Date.now(),
      };
      localStorage.setItem('ft_profile', JSON.stringify(prof));

      const beerRef0 = BEERS.find(b => b.id === currentTinderBeer) || {};
      const total = qList.length;
      const pct = Math.round((correctCount / total) * 100);
      // Длина окружности r=68: дуга рисуется dashoffset'ом, без JS-анимации
      const C = 427.26;
      // Лента ДНК: что гость поймал, что прошло мимо — и какая нота там на самом деле
      const strip = qList.map((q, i) => {
        const got = tinderAnswers[i] ? tinderAnswers[i].value : false;
        const real = (beerRef0.notes || []).find(n => n.n === q.n) || {};
        return `<li class="dna-row${got ? ' got' : ''}">
          <span class="dna-mark">${ico(got ? 'check' : 'close', 'sm')}</span>
          <span class="dna-note">
            <b>${q.n}</b>
            <em>${got ? 'вы её услышали' : 'прошла мимо'}</em>
          </span>
          <span class="dna-bar"><i style="width:${real.i || 55}%;background:${real.c || 'var(--gold)'}"></i></span>
        </li>`;
      }).join('');

      app.innerHTML = `<div class="container dna-final">
        <div class="section-tag plain center-tag">Дегустация завершена</div>
        <h2 class="section-title center">Вкусовая ДНК <span class="gold">раскрыта</span></h2>
        <p class="section-desc center">Сенсорный разбор <strong>${data.name}</strong> пройден</p>

        <div class="dna-medal" style="--aura:${beerRef0.color || '#9b6b3d'}">
          <span class="dna-halo" aria-hidden="true"></span>
          <svg class="dna-ring" viewBox="0 0 148 148" aria-hidden="true">
            <defs><linearGradient id="dnaGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#b3814e"/><stop offset=".55" stop-color="#9b6b3d"/><stop offset="1" stop-color="#6b4526"/>
            </linearGradient></defs>
            <circle class="dna-track" cx="74" cy="74" r="68"/>
            <circle class="dna-val" cx="74" cy="74" r="68" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}"/>
          </svg>
          ${beerRef0.img ? `<img class="dna-bottle" src="${beerRef0.img}" alt="${data.name}">` : ''}
        </div>

        <div class="dna-tally">
          <span><b class="num">${correctCount}</b><i>из ${total} нот</i></span>
          <span class="dna-sep" aria-hidden="true"></span>
          <span><b class="num">+${xpEarned}</b><i>опыта</i></span>
        </div>

        <div class="simple-card dna-card">
          <div class="section-tag plain">Ваша лента вкуса</div>
          <ul class="dna-strip">${strip}</ul>
          <div class="badge-row" style="margin-top:16px"><span class="badge-pill">${ico('sparkle', 'sm')}${badgeName}</span></div>
        </div>

        <div class="dna-cta">
          <button class="btn-primary" onclick="flowSelections.beer='${currentTinderBeer}';flowStep=2;flowMode='beer';renderStep()">Полный профиль ${data.name}</button>
          <button class="btn-ghost" onclick="resetTinder()">Ещё бренд</button>
          <button class="btn-link" onclick="navigate('profile')">В профиль →</button>
        </div>
      </div>`;

      setTimeout(() => {
        createCarbonationBubbles();
      }, 100);
      return;
    }

    const curQ = qList[tinderIdx];
    const nextQ = qList[tinderIdx + 1];
    const beerRef = BEERS.find(b => b.id === currentTinderBeer) || {};

    app.innerHTML = `<div class="container" style="max-width:480px;text-align:center">
      <button class="step-back" onclick="resetTinder()">← Выбор бренда</button>
      <div class="section-tag plain center-tag" style="margin-top:20px">${data.name} · нота ${tinderIdx + 1} из ${qList.length}</div>
      <div class="step-progress" style="max-width:220px;margin:0 auto 6px">${qList.map((_, i) => `<div class="step-dot ${i < tinderIdx ? 'done' : ''} ${i === tinderIdx ? 'active' : ''}"></div>`).join('')}</div>

      <div class="tinder-container">
        <div class="tinder-card-wrapper" id="tinder-card-wrapper">
          ${nextQ ? `
            <div class="tinder-card card-back">
              <span class="note-medal" style="--aura:${beerRef.color || '#9b6b3d'}"><b>${nextQ.n}</b></span>
              <h3 class="tinder-question">${nextQ.q}</h3>
              <p class="tinder-hint">${nextQ.h}</p>
            </div>
          ` : ''}

          <div class="tinder-card" id="active-tinder-card">
            <div class="tinder-flash-like" id="flash-like"></div>
            <div class="tinder-flash-dislike" id="flash-dislike"></div>
            <span class="note-medal" style="--aura:${beerRef.color || '#9b6b3d'}"><b>${curQ.n}</b></span>
            <div>
              <h3 class="tinder-question">${curQ.q}</h3>
              <p class="tinder-hint">${curQ.h}</p>
            </div>
            <div class="tinder-swipe-hint">Свайп или кнопка</div>
          </div>
        </div>

        <div class="tinder-buttons">
          <button class="tinder-btn dislike" onclick="tinderAction(false)" aria-label="Ноты нет">${ico('close')}</button>
          <button class="tinder-btn like" onclick="tinderAction(true)" aria-label="Нота есть">${ico('check')}</button>
        </div>
      </div>
    </div>`;

    setupTinderGestures();
  }
};

window.startTinder = function (beerId) {
  currentTinderBeer = beerId;
  tinderIdx = 0;
  tinderAnswers = [];
  track('start_tinder', beerId);
  renderTinder();
};

window.resetTinder = function () {
  currentTinderBeer = null;
  tinderIdx = 0;
  tinderAnswers = [];
  renderTinder();
};

window.tinderAction = function (val) {
  const card = document.getElementById('active-tinder-card');
  const flash = document.getElementById(val ? 'flash-like' : 'flash-dislike');
  if (flash) flash.style.opacity = '1';

  if (card) {
    card.style.transform = `translateX(${val ? 400 : -400}px) rotate(${val ? 30 : -30}deg)`;
    card.style.opacity = '0';
  }

  tinderAnswers.push({ note: TINDER_DATA[currentTinderBeer].q[tinderIdx].n, value: val });
  tinderIdx++;

  setTimeout(() => {
    renderTinder();
  }, 300);
};

function setupTinderGestures() {
  const card = document.getElementById('active-tinder-card');
  if (!card) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;

  const flashLike = document.getElementById('flash-like');
  const flashDislike = document.getElementById('flash-dislike');

  function dragStart(e) {
    isDragging = true;
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    card.style.transition = 'none';
  }

  function dragMove(e) {
    if (!isDragging) return;
    currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const diffX = currentX - startX;
    const diffY = currentY - startY;

    const rotate = diffX / 10;
    card.style.transform = `translate(${diffX}px, ${diffY}px) rotate(${rotate}deg)`;

    if (diffX > 0) {
      if (flashLike) flashLike.style.opacity = Math.min(0.8, diffX / 150);
      if (flashDislike) flashDislike.style.opacity = 0;
    } else {
      if (flashDislike) flashDislike.style.opacity = Math.min(0.8, -diffX / 150);
      if (flashLike) flashLike.style.opacity = 0;
    }
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    const diffX = currentX - startX;
    if (diffX > 120) {
      tinderAction(true);
    } else if (diffX < -120) {
      tinderAction(false);
    } else {
      card.style.transform = 'translate(0, 0) rotate(0deg)';
      if (flashLike) flashLike.style.opacity = 0;
      if (flashDislike) flashDislike.style.opacity = 0;
    }
  }

  card.addEventListener('mousedown', dragStart);
  card.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);

  card.addEventListener('touchstart', dragStart, { passive: true });
  card.addEventListener('touchmove', dragMove, { passive: true });
  card.addEventListener('touchend', dragEnd);
}

function createCarbonationBubbles() {
  const container = document.body;
  for (let i = 0; i < 30; i++) {
    const bubble = document.createElement('div');
    const size = Math.random() * 8 + 4;
    bubble.style.position = 'fixed';
    bubble.style.bottom = '-20px';
    bubble.style.left = Math.random() * 100 + 'vw';
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.background = 'rgba(155, 107, 61, 0.35)';
    bubble.style.borderRadius = '50%';
    bubble.style.pointerEvents = 'none';
    bubble.style.zIndex = '9999';
    bubble.style.animation = `bubbleUp ${Math.random() * 2 + 1.5}s ease-in forwards`;
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 3500);
  }
}

// Inject bubble animation stylesheet
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes bubbleUp {
  0% { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(-110vh) scale(1.5); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);

renderHome();
