/**
 * Flavor Tree — AI Food & Bottle Scanner (Компьютерное зрение)
 * Распознавание блюда или этикетки по фото / камере → мгновенный подбор пива
 * Efes Kazakhstan · OneIdea Championship 2026
 */
(function (global) {
  'use strict';

  // Встроенный банк распознавания для демонстрации
  const RECO_BANK = [
    {
      id: 'shashlik',
      name: 'Шашлык из баранины на углях',
      emoji: '🍖',
      confidence: 97.4,
      beerId: 'efes',
      beerName: 'Efes Pilsener',
      match: 94,
      why: 'Дымная корочка мяса и благородная горечь хмеля Hallertau: газация расщепляет жир, а солод перекликается с жаром углей.',
      bridges: ['🔥 Горечь × Дым', '🍋 Цитрус освежает', '🍞 Солод × Жир'],
    },
    {
      id: 'beshbarmak',
      name: 'Бешбармак с казы и домашним тестом',
      emoji: '🥘',
      confidence: 96.1,
      beerId: 'melnik',
      beerName: 'Старый Мельник',
      match: 91,
      why: 'Бархатистая мягкость Старого Мельника гармонирует с нежным отварным мясом, а тройной хмель очищает рецепторы после наваристого сорпа.',
      bridges: ['🍞 Хлеб × Тесто сочней', '🌱 Тройной хмель × Зелень', '🍯 Мёд × Сорпа'],
    },
    {
      id: 'steak',
      name: 'Стейк Рибай с перечным соусом',
      emoji: '🥩',
      confidence: 98.2,
      beerId: 'efes',
      beerName: 'Efes Pilsener',
      match: 95,
      why: 'Хмелевая горчинка идеально смывает маслянистость мраморного стейка, подчеркивая карамелизацию корочки.',
      bridges: ['🥩 Мраморность × Газация', '⚡ Горечь × Корочка', '🍋 Свежесть'],
    },
    {
      id: 'goulash',
      name: 'Томлёное мясо / Гуляш с паприкой',
      emoji: '🍲',
      confidence: 94.8,
      beerId: 'kozel',
      beerName: 'Kozel Тёмное',
      match: 96,
      why: 'Карамельный солод Kozel зеркалит сладость паприки и томленых овощей, придавая блюду бархатистую глубину.',
      bridges: ['🍬 Карамель × Томление', '🥜 Орех × Паприка', '🍞 Солод × Подливка'],
    },
    {
      id: 'sushi',
      name: 'Суши / Сашими из лосося',
      emoji: '🍣',
      confidence: 95.3,
      beerId: 'wukong',
      beerName: 'Wùkōng Jū',
      match: 93,
      why: 'Рисовая база Wùkōng и минимальная горечь (12 IBU) не спорят с нежной рыбой, а цветочные ноты оттеняют васаби.',
      bridges: ['🍚 Рис × Рис', '💧 Кристальная чистота', '🌸 Цветы × Васаби'],
    },
    {
      id: 'burger',
      name: 'Крафтовый бургер с копчёным сыром',
      emoji: '🍔',
      confidence: 97.0,
      beerId: 'kruzhka',
      beerName: 'Кружка Свежего',
      match: 92,
      why: 'Плотное солодовое тело Кружки Свежего подчеркивает пышную бриошь, а деликатный хмель балансирует сыр чеддер.',
      bridges: ['🌾 Солод × Булочка', '🧀 Сыр × Газация', '🔥 Дымок котлеты'],
    }
  ];

  // Создаем DOM-модалку сканера, если ее еще нет
  function ensureScannerModal() {
    if (document.getElementById('modal-ai-scanner')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-ai-scanner';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(18,14,10,0.78);
      backdrop-filter:blur(10px); z-index:1000; display:none;
      place-items:center; padding:16px; opacity:0; transition:opacity 0.25s ease;
    `;

    modal.innerHTML = `
      <div class="scanner-box" style="
        background:#ffffff; border-radius:24px; padding:28px; max-width:520px; width:100%;
        box-shadow:0 24px 60px -15px rgba(0,0,0,0.3); position:relative; text-align:center;
        border:1px solid rgba(155,107,61,0.25); max-height:92vh; overflow-y:auto;
      ">
        <button onclick="closeFoodScanner()" style="
          position:absolute; top:16px; right:16px; background:none; border:none;
          font-size:24px; color:#7a7062; cursor:pointer; line-height:1;
        ">&times;</button>

        <span style="
          font-size:10.5px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;
          color:#9b6b3d; background:rgba(155,107,61,0.09); padding:4px 10px; border-radius:99px;
        ">AI Vision · Компьютерное зрение</span>

        <h3 style="font-family:'Cormorant Garamond',serif; font-size:28px; margin:8px 0 4px; font-weight:700;">
          Сканер блюда и этикетки
        </h3>
        <p style="font-size:13px; color:#7a7062; margin:0 0 18px;">
          Сфотографируйте ваше блюдо или выберите готовое фото — нейросеть определит органолептику и подберёт идеальное пиво.
        </p>

        <!-- Preview & Scan viewport -->
        <div id="scanner-viewport" style="
          width:100%; height:220px; border-radius:16px; background:#faf8f5;
          border:2px dashed rgba(155,107,61,0.35); position:relative; overflow:hidden;
          display:grid; place-items:center; margin-bottom:18px; cursor:pointer;
        " onclick="document.getElementById('scanner-file-input').click()">
          <img id="scanner-preview-img" style="display:none; width:100%; height:100%; object-fit:cover;">
          <div id="scanner-laser" style="
            display:none; position:absolute; left:0; right:0; height:3px;
            background:linear-gradient(90deg, transparent, #d4911a, #ef4444, transparent);
            box-shadow:0 0 15px #d4911a; top:0; animation:scannerLaser 1.5s infinite alternate ease-in-out;
          "></div>
          
          <div id="scanner-placeholder" style="padding:20px;">
            <div style="font-size:44px; margin-bottom:8px;">📸</div>
            <b style="font-size:14px; color:#2c2417; display:block;">Нажмите, чтобы сделать фото</b>
            <span style="font-size:12px; color:#7a7062;">или перетащите изображение блюда сюда</span>
          </div>
        </div>

        <input type="file" id="scanner-file-input" accept="image/*" capture="environment" style="display:none;" onchange="handleScannerFile(event)">

        <!-- Quick preset sample buttons for demo -->
        <div style="margin-bottom:18px;">
          <span style="font-size:11px; color:#7a7062; display:block; margin-bottom:6px;">Или выберите пример для мгновенного теста:</span>
          <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
            <button class="chip" style="font-size:12px; padding:4px 10px; cursor:pointer;" onclick="runPresetScan('shashlik')">🍖 Шашлык</button>
            <button class="chip" style="font-size:12px; padding:4px 10px; cursor:pointer;" onclick="runPresetScan('beshbarmak')">🥘 Бешбармак</button>
            <button class="chip" style="font-size:12px; padding:4px 10px; cursor:pointer;" onclick="runPresetScan('steak')">🥩 Стейк</button>
            <button class="chip" style="font-size:12px; padding:4px 10px; cursor:pointer;" onclick="runPresetScan('sushi')">🍣 Сашими</button>
            <button class="chip" style="font-size:12px; padding:4px 10px; cursor:pointer;" onclick="runPresetScan('burger')">🍔 Бургер</button>
          </div>
        </div>

        <!-- Result Box -->
        <div id="scanner-result-box" style="
          display:none; background:#fbf7ef; border:1px solid rgba(155,107,61,0.25);
          border-radius:16px; padding:18px; text-align:left; margin-bottom:18px;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
              <span id="scan-conf-badge" style="
                font-size:10px; font-weight:800; background:#3d8b5c; color:#fff;
                padding:2px 7px; border-radius:4px; text-transform:uppercase;
              ">AI 97.4%</span>
              <h4 id="scan-detected-name" style="margin:4px 0 0; font-size:16px; font-weight:700; color:#2c2417;">Шашлык из баранины</h4>
            </div>
            <div style="text-align:right;">
              <span style="font-size:10.5px; color:#7a7062; display:block;">Совпадение</span>
              <b id="scan-match-val" style="font-family:'Cormorant Garamond',serif; font-size:22px; color:#9b6b3d;">94%</b>
            </div>
          </div>

          <div style="background:#ffffff; border-radius:12px; padding:12px; border:1px solid rgba(44,36,23,0.08); margin-bottom:10px;">
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#9b6b3d; font-weight:700;">Идеальное пиво:</div>
            <div id="scan-beer-name" style="font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:#2c2417;">Efes Pilsener</div>
            <p id="scan-why-text" style="font-size:12.5px; line-height:1.5; color:rgba(44,36,23,0.85); margin:6px 0 0;"></p>
          </div>

          <div id="scan-bridge-tags" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
        </div>

        <div style="display:flex; gap:10px;">
          <button id="scan-apply-btn" class="primary" style="
            flex:1; padding:12px; font-size:13.5px; font-weight:700; display:none;
          " onclick="applyScanResult()">Перейти к столу с этим блюдом</button>
          <button class="ghost" style="padding:12px 18px; font-size:13.5px;" onclick="closeFoodScanner()">Закрыть</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Добавляем стиль лазерной анимации
    if (!document.getElementById('scanner-anim-style')) {
      const st = document.createElement('style');
      st.id = 'scanner-anim-style';
      st.textContent = `
        @keyframes scannerLaser {
          0% { top: 4%; }
          100% { top: 92%; }
        }
      `;
      document.head.appendChild(st);
    }
  }

  let activeScannedItem = null;

  global.openFoodScanner = function () {
    ensureScannerModal();
    const modal = document.getElementById('modal-ai-scanner');
    modal.style.display = 'grid';
    requestAnimationFrame(() => { modal.style.opacity = '1'; });
  };

  global.closeFoodScanner = function () {
    const modal = document.getElementById('modal-ai-scanner');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 260);
  };

  global.handleScannerFile = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const imgUrl = evt.target.result;
      const prev = document.getElementById('scanner-preview-img');
      prev.src = imgUrl;
      prev.style.display = 'block';
      document.getElementById('scanner-placeholder').style.display = 'none';
      startScanProcess(file.name);
    };
    reader.readAsDataURL(file);
  };

  global.runPresetScan = function (id) {
    const item = RECO_BANK.find((r) => r.id === id) || RECO_BANK[0];
    const prev = document.getElementById('scanner-preview-img');

    // Находим картинку-заглушку из существующих ассетов
    if (id === 'shashlik' || id === 'steak') prev.src = 'shashlik.png';
    else if (id === 'beshbarmak') prev.src = 'food.png';
    else prev.src = 'beer.png';

    prev.style.display = 'block';
    document.getElementById('scanner-placeholder').style.display = 'none';
    startScanProcess(id, item);
  };

  function startScanProcess(hint, forcedItem = null) {
    const laser = document.getElementById('scanner-laser');
    laser.style.display = 'block';

    const resBox = document.getElementById('scanner-result-box');
    resBox.style.display = 'none';
    document.getElementById('scan-apply-btn').style.display = 'none';

    setTimeout(() => {
      laser.style.display = 'none';
      let item = forcedItem;
      if (!item) {
        const lower = String(hint).toLowerCase();
        if (lower.includes('besh') || lower.includes('беш')) item = RECO_BANK[1];
        else if (lower.includes('steak') || lower.includes('стейк')) item = RECO_BANK[2];
        else if (lower.includes('goul') || lower.includes('гуляш')) item = RECO_BANK[3];
        else if (lower.includes('sush') || lower.includes('рыб')) item = RECO_BANK[4];
        else if (lower.includes('burg') || lower.includes('бург')) item = RECO_BANK[5];
        else item = RECO_BANK[0];
      }

      activeScannedItem = item;

      document.getElementById('scan-conf-badge').textContent = `AI ${item.confidence}%`;
      document.getElementById('scan-detected-name').textContent = `${item.emoji} ${item.name}`;
      document.getElementById('scan-match-val').textContent = `${item.match}%`;
      document.getElementById('scan-beer-name').textContent = item.beerName;
      document.getElementById('scan-why-text').textContent = item.why;

      const bridges = document.getElementById('scan-bridge-tags');
      bridges.innerHTML = item.bridges.map((b) =>
        `<span style="font-size:11px; font-weight:600; background:rgba(155,107,61,0.12); color:#6b4526; padding:3px 8px; border-radius:6px;">${b}</span>`
      ).join('');

      resBox.style.display = 'block';
      document.getElementById('scan-apply-btn').style.display = 'block';
    }, 1200);
  }

  global.applyScanResult = function () {
    if (!activeScannedItem) return;
    closeFoodScanner();

    // Если мы на странице horeca.html
    if (typeof selectDish === 'function') {
      selectDish(activeScannedItem.name, activeScannedItem.emoji, 4900, activeScannedItem.beerId);
      const showcase = document.getElementById('pairing-showcase');
      if (showcase) showcase.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Иначе переходим на стол или horeca
      location.href = `horeca.html#guest`;
    }
  };

})(window);
