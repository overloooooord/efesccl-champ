/**
 * Flavor Tree x HoReCa — Интерактивный портал заведений и гостей
 * Efes Kazakhstan · OneIdea Championship 2026
 */
(function (global) {
  'use strict';

  // ── 1. Состояние приложения ───────────────────────────
  const state = {
    mode: 'guest', // 'guest' | 'b2b'
    currentVenue: 'gastrobar-efes',
    currentDish: 'Шашлык из баранины',
    currentBeerId: 'efes',
    rating: 5,
  };

  // База данных заведений для демонстрации
  const VENUES = {
    'gastrobar-efes': {
      name: 'Gastrobar Efes',
      city: 'Алматы',
      address: 'пр. Достык 42',
      beersCount: 12,
      onTapCount: 6,
    },
    'paulaner': {
      name: 'Paulaner Bräuhaus',
      city: 'Алматы',
      address: 'ул. Сатпаева 9',
      beersCount: 8,
      onTapCount: 5,
    },
    'line-brew': {
      name: 'Line Brew Craft',
      city: 'Астана',
      address: 'ул. Кенесары 20',
      beersCount: 14,
      onTapCount: 8,
    },
    'chechil': {
      name: 'Chechil Grill Bar',
      city: 'Алматы',
      address: 'ул. Толе би 71',
      beersCount: 10,
      onTapCount: 6,
    }
  };

  // База соответствий блюдо → пиво для мгновенного отклика
  const PAIRINGS = {
    'efes': {
      id: 'efes',
      name: 'Efes Pilsener',
      style: 'Светлый лагер · 5.0% ABV · 22 IBU · 4–6°C',
      img: 'img/efes_official.png',
      price: '1 490 ₸',
      badges: ['Разливное', 'Хмель Hallertau', 'Премиум-сегмент'],
      dishName: 'Шашлык из баранины',
      match: 94,
      bridges: ['🔥 Горечь × Дым углей', '🍋 Цитрус освежает нёбо', '🍞 Солод × Жирность мяса'],
      why: 'Дымная корочка шашлыка и благородная хмелевая горечь Efes Pilsener — это союз, проверенный поколениями. Углекислота и хмель Hallertau промывают рецепторы после каждого сочного куска баранины, а хлебные ноты светлого солода идеально резонируют с ароматом мангала.',
      top: 'Эмоция: Закат на террасе, ветер, чувство безмятежности и свободы.',
      heart: 'Ноты: Цедра лимона, свежеиспечённая булочка, луговые травы после дождя.',
      base: 'База: Обволакивающая деликатная горечь, сухое чистое послевкусие.'
    },
    'kozel': {
      id: 'kozel',
      name: 'Kozel Тёмное',
      style: 'Тёмный лагер · 3.7% ABV · 20 IBU · 6–8°C',
      img: 'img/kozel_official.png',
      price: '1 690 ₸',
      badges: ['Разливное', 'Карамельный солод', 'Чешская рецептура'],
      dishName: 'Гуляш по-чешски',
      match: 96,
      bridges: ['🍬 Карамель × Томление мяса', '🥜 Орех × Паприка', '🍞 Солод × Подливка'],
      why: 'Карамельная сладость Kozel и томлёное мясо с паприкой — это классика чешских таверн. Ореховые оттенки жареного солода дополняют густой соус, а низкий алкоголь (3.7%) делает блюдо лёгким и комфортным.',
      top: 'Эмоция: Уютный вечер у камина, треск дров, тёплый плед и покой.',
      heart: 'Ноты: Карамельная ириска, поджаренная корочка ржаного хлеба, намёк на тёмный шоколад.',
      base: 'База: Бархатная солодовая сладость, минимум горечи, мягкий обволакивающий финиш.'
    },
    'melnik': {
      id: 'melnik',
      name: 'Старый Мельник',
      style: 'Светлый лагер · 4.3% ABV · 18 IBU · 4–7°C',
      img: 'img/melnik_official.png',
      price: '1 390 ₸',
      badges: ['Разливное', 'Трио хмелей', 'Бархатистый вкус'],
      dishName: 'Бешбармак с казы',
      match: 91,
      bridges: ['🍞 Хлеб × Нежное тесто', '🌱 Тройной хмель × Зелень', '🍯 Мёд × Наваристый бульон'],
      why: 'Бархатистая мягкость Старого Мельника не заглушает деликатный вкус отварной конины и сорпа. Хлебные тона перекликаются с домашней сочней (тестом), а тройной хмель аккуратно освежает нёбо от жира.',
      top: 'Эмоция: Родной дом, аромат свежей муки, тепло семейного дастархана.',
      heart: 'Ноты: Луговые цветы, полевые травы, лимонная цедра и белый каравай.',
      base: 'База: Мягкое солодовое тело, деликатный намёк на хмелевую горчинку.'
    },
    'kruzhka': {
      id: 'kruzhka',
      name: 'Кружка Свежего',
      style: 'Светлый лагер · 4.0% ABV · 16 IBU · 4–6°C',
      img: 'img/kruzhka_official.png',
      price: '1 290 ₸',
      badges: ['Разливное', 'Мягкий солод', 'Хит сезона'],
      dishName: 'Колбаски на гриле',
      match: 90,
      bridges: ['🌾 Солод × Дымок гриля', '🍞 Хлебная сладость', '💧 Газация очищает нёбо'],
      why: 'Идеальный аккомпанемент пивного сада. Медовые солодовые ноты оттеняют пикантные специи в колбасках, а хрустящая газация смывает маслянистость, приглашая к новому глотку.',
      top: 'Эмоция: Пятничный вечер, первый глоток с друзьями, сброс дневного стресса.',
      heart: 'Ноты: Светлый ячменный солод, цветочный мёд, свежескошенная трава.',
      base: 'База: Сбалансированная питьевая лёгкость без резкой горечи.'
    },
    'wukong': {
      id: 'wukong',
      name: 'Wùkōng Jū',
      style: 'Рисовый лагер · 4.0% ABV · 12 IBU · 3–5°C',
      img: 'img/wukong_official.png',
      price: '1 790 ₸',
      badges: ['Бутылочное', 'Жасминовый рис', 'Ультра-лёгкое'],
      dishName: 'Дим-самы на пару',
      match: 92,
      bridges: ['🍚 Рис × Рисовое тесто', '💧 Кристальная свежесть', '🌸 Жасмин × Имбирь'],
      why: 'Wùkōng сварен на отборном рисе с минимальной горечью (12 IBU). Он не спорит с тонкими специями паназиатских блюд, а деликатно обрамляет креветки, имбирь и соевые соусы.',
      top: 'Эмоция: Прохладный туманный рассвет в горах, кристальная медитация.',
      heart: 'Ноты: Жасминовый рис, цветы яблони, хрустящая груша, намёк на имбирь.',
      base: 'База: Сухой, звенящий финиш, исчезающий без малейшей тяжести.'
    }
  };

  // ── 2. Переключение режимов (Guest vs B2B) ─────────────
  global.switchMode = function (mode) {
    state.mode = mode;
    const btnGuest = document.getElementById('btn-mode-guest');
    const btnB2b = document.getElementById('btn-mode-b2b');
    const viewGuest = document.getElementById('view-guest');
    const viewB2b = document.getElementById('view-b2b');
    const navAction = document.getElementById('nav-action-btn');

    if (mode === 'b2b') {
      btnB2b.classList.add('active');
      btnB2b.setAttribute('aria-selected', 'true');
      btnGuest.classList.remove('active');
      btnGuest.setAttribute('aria-selected', 'false');

      viewB2b.classList.remove('hidden');
      viewGuest.classList.add('hidden');

      if (navAction) {
        navAction.textContent = 'Подключить заведение';
        navAction.href = '#onboarding';
      }
      history.replaceState(null, '', '#partner');
    } else {
      btnGuest.classList.add('active');
      btnGuest.setAttribute('aria-selected', 'true');
      btnB2b.classList.remove('active');
      btnB2b.setAttribute('aria-selected', 'false');

      viewGuest.classList.remove('hidden');
      viewB2b.classList.add('hidden');

      if (navAction) {
        navAction.textContent = 'Стол по QR';
        navAction.href = '#view-guest';
      }
      history.replaceState(null, '', '#guest');
    }
  };

  // ── 3. Выбор заведения ──────────────────────────────────
  global.selectVenue = function (venueId) {
    state.currentVenue = venueId;
    const strip = document.getElementById('venue-strip');
    if (strip) {
      strip.querySelectorAll('.venue-chip-card').forEach((c) => c.classList.remove('selected'));
    }
    const current = event ? event.currentTarget : null;
    if (current) current.classList.add('selected');

    const v = VENUES[venueId];
    if (v) {
      showToast(`Выбрано заведение: ${v.name} (${v.city})`);
    }
  };

  // ── 4. Выбор блюда и показ пейринга ────────────────────
  global.selectDish = function (dishName, emoji, price, beerId) {
    state.currentDish = dishName;
    state.currentBeerId = beerId;

    // Подсветка карточки блюда
    const grid = document.getElementById('dishes-grid');
    if (grid) {
      grid.querySelectorAll('.dish-btn-card').forEach((c) => c.classList.remove('active'));
    }
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }

    renderPairing(beerId, dishName, price);
  };

  function renderPairing(beerId, dishName, dishPrice) {
    const data = PAIRINGS[beerId] || PAIRINGS['efes'];

    document.getElementById('match-score-label').textContent = `Совпадение ${data.match}% · Идеальная пара`;
    document.getElementById('reco-beer-name').textContent = data.name;
    document.getElementById('reco-beer-style').textContent = data.style;
    document.getElementById('reco-beer-img').src = data.img;
    document.getElementById('reco-beer-img').alt = data.name;

    const badgesContainer = document.getElementById('reco-badges');
    badgesContainer.innerHTML = data.badges.map((b, i) =>
      `<span class="chip ${i === 0 ? 'gold' : ''}">${escapeHtml(b)}</span>`
    ).join('');

    document.getElementById('reco-dish-name').textContent = `К блюду: ${dishName || data.dishName}`;
    document.getElementById('reco-price').innerHTML = `${data.price} <small style="font-family:var(--ui); font-size:11px; color:var(--muted);">500 мл</small>`;

    const bridgesContainer = document.getElementById('reco-bridges');
    bridgesContainer.innerHTML = data.bridges.map((br) =>
      `<span class="tent-bridge-tag">${escapeHtml(br)}</span>`
    ).join('');

    document.getElementById('reco-why').textContent = data.why;
    document.getElementById('pyr-top').textContent = data.top;
    document.getElementById('pyr-heart').textContent = data.heart;
    document.getElementById('pyr-base').textContent = data.base;
  }

  // ── 5. Подбор под произвольное блюдо гостя ─────────────
  global.pairCustomDish = function () {
    const input = document.getElementById('guest-dish-input');
    const val = (input.value || '').trim().toLowerCase();
    if (!val) {
      showToast('Впишите название блюда (напр. стейк, пицца, плов)', true);
      return;
    }

    // Детерминированный матчер по ключевым словам
    let matchedBeer = 'efes';
    let matchScore = 88;

    if (val.includes('беш') || val.includes('манты') || val.includes('плов') || val.includes('казах') || val.includes('тесто')) {
      matchedBeer = 'melnik';
      matchScore = 93;
    } else if (val.includes('гуляш') || val.includes('шоколад') || val.includes('десерт') || val.includes('томлен') || val.includes('утка')) {
      matchedBeer = 'kozel';
      matchScore = 95;
    } else if (val.includes('колбас') || val.includes('картоф') || val.includes('бургер') || val.includes('сыр') || val.includes('снэк')) {
      matchedBeer = 'kruzhka';
      matchScore = 90;
    } else if (val.includes('суши') || val.includes('ролл') || val.includes('рыб') || val.includes('ази') || val.includes('дим-сам') || val.includes('рис')) {
      matchedBeer = 'wukong';
      matchScore = 94;
    } else {
      matchedBeer = 'efes';
      matchScore = 89;
    }

    // Снимаем подсветку с фиксированных блюд
    const grid = document.getElementById('dishes-grid');
    if (grid) {
      grid.querySelectorAll('.dish-btn-card').forEach((c) => c.classList.remove('active'));
    }

    renderPairing(matchedBeer, input.value, 4500);
    showToast(`Макс подобрал ${PAIRINGS[matchedBeer].name} под «${input.value}»!`);

    // Плавный скролл к результату
    document.getElementById('pairing-showcase').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ── 6. Симуляция заказа и оценка вкуса ──────────────────
  global.simulateOrder = function () {
    const currentBeer = PAIRINGS[state.currentBeerId] || PAIRINGS['efes'];
    showToast(`Заказ «${currentBeer.name}» (1 490 ₸) отправлен официанту стола №4! Скоро принесут.`);
  };

  global.openRatingModal = function () {
    openModal('modal-rating');
  };

  global.setRating = function (stars) {
    state.rating = stars;
    const row = document.getElementById('star-rating-row');
    if (!row) return;
    const btns = row.querySelectorAll('.star');
    btns.forEach((b, i) => {
      b.classList.toggle('on', i < stars);
      b.style.opacity = i < stars ? '1' : '0.35';
    });
  };

  global.submitRating = function () {
    const comment = document.getElementById('rating-comment').value;
    closeModal('modal-rating');
    showToast(`⭐️ Оценка ${state.rating}/5 сохранена! Вам начислено +25 XP во Вкусовую ДНК!`);
  };

  // ── 7. Диалог с сомелье Максом ─────────────────────────
  global.quickAsk = function (question) {
    const input = document.getElementById('guest-chat-input');
    if (input) {
      input.value = question;
      sendGuestMessage();
    }
  };

  global.sendGuestMessage = function () {
    const input = document.getElementById('guest-chat-input');
    const msg = (input.value || '').trim();
    if (!msg) return;

    const log = document.getElementById('guest-chat-log');
    // Сообщение пользователя
    const userMsg = document.createElement('div');
    userMsg.className = 'msg me';
    userMsg.style.cssText = 'align-self:flex-end; background:rgba(155,107,61,0.12); padding:8px 12px; border-radius:12px; font-size:13.5px; max-width:85%;';
    userMsg.textContent = msg;
    log.appendChild(userMsg);
    input.value = '';

    // Ответ сомелье Макса
    setTimeout(() => {
      let reply = 'Отличный вопрос! К вашему заказу я рекомендую обратить внимание на баланс хмелевой горечи и солодовой сладости.';
      const m = msg.toLowerCase();
      if (m.includes('беш')) {
        reply = 'К бешбармаку великолепно подходит Старый Мельник: тройной хмель освежает после сочного бульона, а солодовая база перекликается с тестом сочней.';
      } else if (m.includes('не люблю гор') || m.includes('мягк')) {
        reply = 'Если не любите горечь — ваш идеальный выбор Wùkōng Jū (всего 12 IBU, на жасминовом рисе) или бархатный Kozel Тёмное (где доминирует карамель).';
      } else if (m.includes('десерт') || m.includes('шоколад')) {
        reply = 'С шоколадными десертами, брауни или тирамису изумительно играет Kozel Тёмное: его ноты жжёного сахара и какао дают синергетический эффект!';
      } else if (m.includes('лёгк')) {
        reply = 'Самое лёгкое и воздушное пиво — это рисовый лагер Wùkōng (4.0% ABV, очень сухой и кристальный финиш).';
      }

      const maxMsg = document.createElement('div');
      maxMsg.className = 'msg max';
      maxMsg.style.cssText = 'align-self:flex-start; background:var(--surface-2); border:1px solid var(--hair); padding:10px 14px; border-radius:12px; font-size:13.5px; max-width:85%; line-height:1.5;';
      maxMsg.innerHTML = `<b>Макс · Сомелье:</b> ${reply}`;
      log.appendChild(maxMsg);
      log.scrollTop = log.scrollHeight;
    }, 450);
  };

  // ── 8. Калькулятор окупаемости B2B ─────────────────────
  global.recalcROI = function () {
    const tables = parseInt(document.getElementById('slider-tables').value, 10);
    const guests = parseInt(document.getElementById('slider-guests').value, 10);
    const price = parseInt(document.getElementById('slider-price').value, 10);
    const upsell = parseInt(document.getElementById('slider-upsell').value, 10);

    document.getElementById('val-tables').textContent = tables;
    document.getElementById('val-guests').textContent = guests;
    document.getElementById('val-price').textContent = `${price.toLocaleString('ru-RU')} ₸`;
    document.getElementById('val-upsell').textContent = `${upsell}%`;

    // Расчёт дополнительной выручки:
    // Количество столов * гостей в день * 30 дней = всего чеков
    const totalOrdersMonth = tables * guests * 30;
    // Гости, воспользовавшиеся подсказкой сомелье
    const guidedGuests = totalOrdersMonth * (upsell / 100);
    // Дополнительная разница в чеке при выборе премиума (+20% к чеку пива)
    const extraPerDrink = price * 0.20;
    const extraMonthlyRevenue = Math.round(guidedGuests * extraPerDrink);

    // Подписка $49 (~24,900 ₸)
    const subscriptionKzt = 24900;
    const netGain = Math.max(0, extraMonthlyRevenue - subscriptionKzt);
    const paybackDays = Math.max(1, Math.round(subscriptionKzt / (extraMonthlyRevenue / 30)));
    const roiPercent = Math.round((netGain / subscriptionKzt) * 100);

    document.getElementById('calc-net-profit').textContent = `+${extraMonthlyRevenue.toLocaleString('ru-RU')} ₸`;
    document.getElementById('calc-payback').textContent = `${paybackDays} ${declOfNum(paybackDays, ['день', 'дня', 'дней'])}`;
    document.getElementById('calc-roi').textContent = `${roiPercent.toLocaleString('ru-RU')}%`;
  };

  // ── 9. Интерактивный мини-квиз для официантов ─────────
  global.checkQuiz = function (choiceIndex, buttonEl) {
    const exp = document.getElementById('quiz-exp');
    const container = document.getElementById('quiz-options');
    container.querySelectorAll('.quiz-opt').forEach((b) => {
      b.classList.remove('correct', 'wrong');
      b.querySelector('.quiz-status').textContent = '';
    });

    if (choiceIndex === 1) {
      buttonEl.classList.add('correct');
      buttonEl.querySelector('.quiz-status').textContent = '✓ Верно (+25 XP)';
      exp.style.display = 'block';
      exp.style.background = 'rgba(61, 139, 92, 0.12)';
      exp.style.borderLeft = '3px solid var(--ok)';
      exp.innerHTML = '<b>Блестяще!</b> Именно так официант продаёт органолептику: Старый Мельник сочетает бархатистую мягкость с хлебными нотами солода к тесту бешбармака, а деликатный тройной хмель освежает нёбо от наваристого бульона.';
    } else {
      buttonEl.classList.add('wrong');
      buttonEl.querySelector('.quiz-status').textContent = '✗ Не совсем';
      exp.style.display = 'block';
      exp.style.background = 'rgba(194, 79, 56, 0.10)';
      exp.style.borderLeft = '3px solid var(--danger)';
      exp.innerHTML = '<b>Подсказка:</b> К традиционному бешбармаку нужен мягкий баланс солода и хмеля. Стаут перебьёт нежное мясо, а вода не раскрывает гастрономический потенциал. Правильный ответ — <b>вариант Б (Старый Мельник)</b>.';
    }
  };

  // ── 10. Форма лидогенерации B2B ────────────────────────
  global.submitOnboarding = function (e) {
    e.preventDefault();
    const venueName = document.getElementById('f-venue-name').value;
    const city = document.getElementById('f-city').value;
    const contactName = document.getElementById('f-contact-name').value;
    const phone = document.getElementById('f-phone').value;
    const tables = document.getElementById('f-tables-cnt').value || '25';
    const pos = document.getElementById('f-pos').value;

    const lead = {
      venueName, city, contactName, phone, tables, pos,
      date: new Date().toISOString()
    };

    // Сохраняем в localStorage для демонстрации жюри
    try {
      const existing = JSON.parse(localStorage.getItem('ft_b2b_leads') || '[]');
      existing.push(lead);
      localStorage.setItem('ft_b2b_leads', JSON.stringify(existing));
    } catch (err) { /* noop */ }

    document.getElementById('success-modal-msg').innerHTML =
      `Спасибо, <b>${escapeHtml(contactName)}</b>! Заявка для заведения <b>«${escapeHtml(venueName)}»</b> (${escapeHtml(city)}) успешно зарегистрирована. В течение 2 часов координатор пилота свяжется с вами по номеру <b>${escapeHtml(phone)}</b>.`;

    openModal('modal-success');
    e.target.reset();
  };

  // ── 11. Модальные окна и хелперы ───────────────────────
  global.openQrModal = function () { openModal('modal-qr'); };
  global.jumpToQrTable = function () {
    const code = document.getElementById('qr-direct-code').value.trim() || 'DEMO-TABLE-04';
    location.href = `table.html?t=${encodeURIComponent(code)}`;
  };

  global.openModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  };

  global.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  };

  // Закрытие по клику вне модального окна
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
  });

  // Вспомогательный тост
  let toastEl = null;
  let toastTimer = null;
  function showToast(msg, isError = false) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:var(--foam); color:#fff; padding:12px 22px; border-radius:999px;
        font-family:var(--ui); font-size:14px; font-weight:600; z-index:200;
        box-shadow:0 12px 30px rgba(0,0,0,0.25); pointer-events:none; transition:opacity 0.25s;
        opacity:0; max-width:90%; text-align:center;
      `;
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.background = isError ? '#c24f38' : '#2c2417';
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, 3500);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function declOfNum(n, titles) {
    return titles[
      n % 10 === 1 && n % 100 !== 11
        ? 0
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
        ? 1
        : 2
    ];
  }

  // ── 12. Инициализация при загрузке страницы ─────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Проверка хэша в URL: #partner -> B2B режим
    if (location.hash === '#partner' || location.hash === '#b2b' || location.hash === '#calculator' || location.hash === '#onboarding') {
      switchMode('b2b');
    } else {
      switchMode('guest');
    }

    // Инициализация дефолтного блюда
    renderPairing('efes', 'Шашлык из баранины', 4900);

    // Первичный расчет окупаемости
    recalcROI();
  });

})(window);
