/**
 * Flavor Tree — Viral Social Story Generator & Digital Certificate
 * 1. Spotify Wrapped-style "Flavor DNA" Story Card
 * 2. Official Digital Efes Beer Sommelier Certificate
 * Efes Kazakhstan · OneIdea Championship 2026
 */
(function (global) {
  'use strict';

  // ═════════════════════════════════════════════════════════
  // 1. SPOTIFY WRAPPED: ВКУСОВАЯ ДНК КАРТОЧКА ДЛЯ СОЦСЕТЕЙ
  // ═════════════════════════════════════════════════════════

  function ensureWrappedModal() {
    if (document.getElementById('modal-flavor-wrapped')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-flavor-wrapped';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(18,14,10,0.85);
      backdrop-filter:blur(12px); z-index:1100; display:none;
      place-items:center; padding:16px; opacity:0; transition:opacity 0.25s ease;
    `;

    modal.innerHTML = `
      <div style="
        background:#1a1612; border:1px solid rgba(212,145,26,0.35); border-radius:24px;
        padding:26px; max-width:440px; width:100%; text-align:center; position:relative;
        box-shadow:0 30px 70px rgba(0,0,0,0.6); color:#fbf7ef; max-height:94vh; overflow-y:auto;
      ">
        <button onclick="closeWrappedModal()" style="
          position:absolute; top:14px; right:14px; background:none; border:none;
          font-size:24px; color:#a89d8f; cursor:pointer; line-height:1;
        ">&times;</button>

        <span style="
          font-size:10.5px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase;
          color:#d4911a; display:block; margin-bottom:4px;
        ">Spotify Wrapped Style · Viral Sharing</span>

        <h3 style="font-family:'Cormorant Garamond',serif; font-size:26px; margin:0 0 14px; color:#fff;">
          Ваша Вкусовая ДНК 2026
        </h3>

        <!-- Canvas Container -->
        <div style="border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.4); margin-bottom:16px;">
          <canvas id="dna-story-canvas" width="600" height="900" style="width:100%; height:auto; display:block;"></canvas>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="primary" style="
            flex:1; padding:12px; font-size:13.5px; font-weight:700;
            background:linear-gradient(135deg, #d4911a, #9b6b3d); border:none; color:#fff; border-radius:10px; cursor:pointer;
          " onclick="downloadWrappedImage()">Скачать карточку (PNG)</button>
          <button class="ghost" style="
            padding:12px 18px; font-size:13.5px; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:10px; cursor:pointer;
          " onclick="shareWrappedStory()">Поделиться</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  global.openFlavorDNAWrapped = function (customName) {
    ensureWrappedModal();
    const modal = document.getElementById('modal-flavor-wrapped');
    modal.style.display = 'grid';
    requestAnimationFrame(() => { modal.style.opacity = '1'; });
    drawWrappedCanvas(customName || 'Гость Efes');
  };

  global.closeWrappedModal = function () {
    const modal = document.getElementById('modal-flavor-wrapped');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 260);
  };

  function drawWrappedCanvas(userName) {
    const cvs = document.getElementById('dna-story-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const W = cvs.width;
    const H = cvs.height;

    // 1. Градиентный фон
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#1c1611');
    bgGrad.addColorStop(0.5, '#0e0b08');
    bgGrad.addColorStop(1, '#241a10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Фоновые свечения
    const radG1 = ctx.createRadialGradient(W * 0.85, H * 0.15, 10, W * 0.85, H * 0.15, 300);
    radG1.addColorStop(0, 'rgba(212, 145, 26, 0.22)');
    radG1.addColorStop(1, 'transparent');
    ctx.fillStyle = radG1;
    ctx.fillRect(0, 0, W, H);

    const radG2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 10, W * 0.15, H * 0.85, 300);
    radG2.addColorStop(0, 'rgba(184, 58, 42, 0.18)');
    radG2.addColorStop(1, 'transparent');
    ctx.fillStyle = radG2;
    ctx.fillRect(0, 0, W, H);

    // Тонкая рамка
    ctx.strokeStyle = 'rgba(212, 145, 26, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Заголовок
    ctx.fillStyle = '#d4911a';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('FLAVOR TREE × EFES KAZAKHSTAN', W / 2, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('ТВОЯ ВКУСОВАЯ ДНК', W / 2, 115);

    ctx.fillStyle = '#a89d8f';
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(`Профиль дегустатора: ${userName}`, W / 2, 145);

    // Архетип
    ctx.fillStyle = 'rgba(212, 145, 26, 0.15)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 160, 175, 320, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#d4911a';
    ctx.stroke();

    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText('✨ Цитрусовый Архитектор ✨', W / 2, 205);

    // Процентные полоски
    const notes = [
      { name: 'Цитрус & Свежесть', pct: 42, col: '#d4911a' },
      { name: 'Хлеб & Светлый солод', pct: 28, col: '#b87d3a' },
      { name: 'Благородная горечь', pct: 15, col: '#7a5aab' },
      { name: 'Луговые травы', pct: 9, col: '#5e8c3e' },
      { name: 'Цветочный хмель', pct: 6, col: '#c29530' }
    ];

    let startY = 270;
    notes.forEach((n) => {
      // Лейбл и процент
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px -apple-system, sans-serif';
      ctx.fillText(n.name, 60, startY);

      ctx.textAlign = 'right';
      ctx.fillStyle = n.col;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillText(`${n.pct}%`, W - 60, startY);

      // Фоновый трек полоски
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(60, startY + 8, W - 120, 10, 5);
      ctx.fill();

      // Заполненная полоска
      ctx.fillStyle = n.col;
      ctx.beginPath();
      ctx.roundRect(60, startY + 8, (W - 120) * (n.pct / 100), 10, 5);
      ctx.fill();

      startY += 52;
    });

    // Блок «Идеальная пара года»
    const boxY = 560;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(212,145,26,0.2)';
    ctx.beginPath();
    ctx.roundRect(50, boxY, W - 100, 150, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4911a';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillText('ТВОЙ ИДЕАЛЬНЫЙ ПЕЙРИНГ', W / 2, boxY + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('Шашлык × Efes Pilsener', W / 2, boxY + 68);

    ctx.fillStyle = '#3d8b5c';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText('Совпадение: 94% · Хмель режет жир', W / 2, boxY + 98);

    ctx.fillStyle = '#a89d8f';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText('Уровень: Пивной Знаток · +150 XP набрано', W / 2, boxY + 125);

    // Футер
    ctx.fillStyle = '#d4911a';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.fillText('flavortree.kz · Слушай вкус', W / 2, H - 45);
  }

  global.downloadWrappedImage = function () {
    const cvs = document.getElementById('dna-story-canvas');
    if (!cvs) return;
    const link = document.createElement('a');
    link.download = 'flavor_dna_wrapped_2026.png';
    link.href = cvs.toDataURL('image/png');
    link.click();
  };

  global.shareWrappedStory = function () {
    const cvs = document.getElementById('dna-story-canvas');
    if (!cvs) return;
    cvs.toBlob((blob) => {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'flavor_dna.png', { type: 'image/png' })] })) {
        navigator.share({
          title: 'Моя Вкусовая ДНК — Flavor Tree',
          text: 'Мой вкусовой профиль пива по стандарту FlavorActiV и Efes Kazakhstan!',
          files: [new File([blob], 'flavor_dna.png', { type: 'image/png' })]
        }).catch(() => {});
      } else {
        downloadWrappedImage();
        alert('Карточка сохранена! Теперь вы можете загрузить её в Instagram Stories или Telegram.');
      }
    });
  };

  // ═════════════════════════════════════════════════════════
  // 2. ЦИФРОВОЙ СЕРТИФИКАТ EFES BEER SOMMELIER
  // ═════════════════════════════════════════════════════════

  function ensureCertificateModal() {
    if (document.getElementById('modal-efes-cert')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-efes-cert';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(18,14,10,0.85);
      backdrop-filter:blur(12px); z-index:1200; display:none;
      place-items:center; padding:16px; opacity:0; transition:opacity 0.25s ease;
    `;

    modal.innerHTML = `
      <div style="
        background:#ffffff; border-radius:24px; padding:28px; max-width:680px; width:100%;
        text-align:center; position:relative; box-shadow:0 30px 80px rgba(0,0,0,0.5);
        max-height:94vh; overflow-y:auto; border:1px solid rgba(155,107,61,0.3);
      ">
        <button onclick="closeCertificateModal()" style="
          position:absolute; top:14px; right:14px; background:none; border:none;
          font-size:24px; color:#7a7062; cursor:pointer; line-height:1;
        ">&times;</button>

        <span style="
          font-size:10.5px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase;
          color:#9b6b3d; background:rgba(155,107,61,0.08); padding:4px 10px; border-radius:99px;
        ">Официальная квалификация Efes Kazakhstan</span>

        <h3 style="font-family:'Cormorant Garamond',serif; font-size:28px; margin:8px 0 4px; font-weight:700;">
          Цифровой Сертификат Сомелье
        </h3>
        <p style="font-size:13px; color:#7a7062; margin:0 0 16px;">
          Выдаётся за прохождение Школы Пивных Сомелье Flavor Tree. Имеет персональный верификационный ID.
        </p>

        <!-- Certificate Canvas Preview -->
        <div style="
          border:1px solid rgba(155,107,61,0.25); border-radius:12px; overflow:hidden;
          box-shadow:0 8px 24px rgba(44,36,23,0.12); margin-bottom:18px;
        ">
          <canvas id="cert-canvas" width="1000" height="700" style="width:100%; height:auto; display:block;"></canvas>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="primary" style="flex:1; padding:12px; font-size:13.5px; font-weight:700;" onclick="downloadCertImage()">
            Скачать сертификат в HD (PNG)
          </button>
          <button class="ghost" style="padding:12px 20px; font-size:13.5px;" onclick="printCertificate()">
            Распечатать
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  global.openEfesCertificate = function (studentName) {
    ensureCertificateModal();
    const modal = document.getElementById('modal-efes-cert');
    modal.style.display = 'grid';
    requestAnimationFrame(() => { modal.style.opacity = '1'; });
    drawCertificate(studentName || 'Данияр Ахметов');
  };

  global.closeCertificateModal = function () {
    const modal = document.getElementById('modal-efes-cert');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 260);
  };

  function drawCertificate(studentName) {
    const cvs = document.getElementById('cert-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const W = cvs.width;
    const H = cvs.height;

    // Фоновая бумага (кремовая текстура)
    ctx.fillStyle = '#faf7f0';
    ctx.fillRect(0, 0, W, H);

    // Двойная золотая рамка
    ctx.strokeStyle = '#b3814e';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.strokeStyle = '#9b6b3d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 38, W - 76, H - 76);

    // Угловые декоративные элементы
    ctx.fillStyle = '#b3814e';
    const corners = [[38,38], [W-38, 38], [38, H-38], [W-38, H-38]];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Шапка
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9b6b3d';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('EFES KAZAKHSTAN · ONEIDEA 2026', W / 2, 95);

    ctx.fillStyle = '#2c2417';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('СЕРТИФИКАТ СОМЕЛЬЕ', W / 2, 155);

    ctx.fillStyle = '#7a7062';
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillText('Настоящим удостоверяется, что', W / 2, 210);

    // Имя награждаемого
    ctx.fillStyle = '#9b6b3d';
    ctx.font = 'bold 46px Georgia, serif';
    ctx.fillText(studentName, W / 2, 275);

    // Линия под именем
    ctx.strokeStyle = '#d4911a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 295);
    ctx.lineTo(W / 2 + 220, 295);
    ctx.stroke();

    // Текст подтверждения квалификации
    ctx.fillStyle = '#2c2417';
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText('успешно освоил(а) программу профессионального сенсорного образования', W / 2, 345);
    ctx.fillText('по стандартам FlavorActiV, Cicerone и пивного регламента Anadolu Group.', W / 2, 375);

    ctx.fillStyle = '#3d8b5c';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('КВАЛИФИКАЦИЯ: ПИВНОЙ СОМЕЛЬЕ (BEER SOMMELIER)', W / 2, 430);

    // Подписи и печати
    const signY = 530;

    // Левая подпись
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2c2417';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText('А. Тулебаев', 120, signY);
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#7a7062';
    ctx.fillText('Дирекция по качеству Efes KZ', 120, signY + 20);

    // Правая подпись
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2c2417';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText('Flavor Tree Academy', W - 120, signY);
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#7a7062';
    ctx.fillText('Куратор программы OneIdea', W - 120, signY + 20);

    // Печать по центру
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#9b6b3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, signY + 5, 45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#9b6b3d';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.fillText('EFES QUALITY', W / 2, signY - 5);
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText('2026', W / 2, signY + 12);
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillText('APPROVED', W / 2, signY + 26);

    // Футер верификации
    ctx.fillStyle = '#a89d8f';
    ctx.font = '12px monospace';
    ctx.fillText('ID: EFES-KZ-2026-CERT-790B-4FE1 · Проверено в блокчейн-реестре сомелье Efes', W / 2, H - 48);
  }

  global.downloadCertImage = function () {
    const cvs = document.getElementById('cert-canvas');
    if (!cvs) return;
    const link = document.createElement('a');
    link.download = 'Efes_Sommelier_Certificate_2026.png';
    link.href = cvs.toDataURL('image/png');
    link.click();
  };

  global.printCertificate = function () {
    const cvs = document.getElementById('cert-canvas');
    if (!cvs) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Сертификат Сомелье Efes</title>
      <style>body{margin:0;display:grid;place-items:center;min-height:100vh;} img{max-width:100%;height:auto;}</style>
      </head><body><img src="${cvs.toDataURL('image/png')}" onload="window.print();"></body></html>
    `);
    win.document.close();
  };

})(window);
