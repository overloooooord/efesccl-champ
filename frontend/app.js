const API = 'http://localhost:8000/api';
const app = document.getElementById('app');
let beersCache = null, flavorsCache = null;

// Router
function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, param] = hash.split('/').filter(Boolean);
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === (path || 'catalog'));
  });
  if (!path || path === '') renderCatalog();
  else if (path === 'beer') renderBeerDetail(param);
  else if (path === 'explore') renderExplorer();
  else if (path === 'school') renderSchool();
  else if (path === 'ai') renderAI();
  else if (path === 'profile') renderProfile();
  else renderCatalog();
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

async function api(endpoint, opts) {
  const r = await fetch(API + endpoint, {headers:{'Content-Type':'application/json'}, ...opts});
  return r.json();
}

// ══════════════════════════════════════
// CATALOG
// ══════════════════════════════════════
async function renderCatalog() {
  app.innerHTML = '<div class="container fade-in"><div class="loading">Загрузка каталога...</div></div>';
  const data = await api('/beers/?page_size=50');
  beersCache = data.results || data;
  const styles = [...new Set(beersCache.map(b => b.style_display))];

  app.innerHTML = `<div class="container fade-in">
    <span class="section-tag">Каталог · ${beersCache.length} брендов Efes KZ</span>
    <h1 class="section-title">Все <span class="gold-text">15 брендов</span> Efes Kazakhstan</h1>
    <p class="section-desc">Каждое пиво раскладывается на вкусовую пирамиду. Выбери — и узнай, что ты почувствуешь.</p>
    <div class="filters" id="filters">
      <button class="filter-btn active" onclick="filterBeers('')">Все</button>
      ${styles.map(s => `<button class="filter-btn" onclick="filterBeers('${s}')">${s}</button>`).join('')}
    </div>
    <div class="beer-grid" id="beer-grid"></div>
  </div>`;
  renderBeerGrid(beersCache);
}

window.filterBeers = function(style) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = style ? beersCache.filter(b => b.style_display === style) : beersCache;
  renderBeerGrid(filtered);
};

function renderBeerGrid(beers) {
  document.getElementById('beer-grid').innerHTML = beers.map(b => `
    <div class="card beer-card" onclick="location.hash='#/beer/${b.id}'">
      ${b.is_premium ? '<div class="premium-badge">PREMIUM</div>' : ''}
      <div class="style-tag">${b.style_display}</div>
      <div class="beer-header">
        <div><h3>${b.name}</h3><div class="brand">${b.brand_name}</div></div>
        <div class="abv">${b.abv}%</div>
      </div>
      <div class="tagline">${b.tagline}</div>
      <div class="notes-row">${(b.top_notes||[]).map(n =>
        `<span class="note-pill">${n.category.emoji} ${n.category.name} ${n.intensity}%</span>`
      ).join('')}</div>
      <div class="rating-line">
        <span class="stars">${'★'.repeat(Math.round(b.rating))}${'☆'.repeat(5-Math.round(b.rating))}</span>
        <strong>${b.rating}</strong>
        <span class="count">${b.rating_count} оценок</span>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
// BEER DETAIL
// ══════════════════════════════════════
async function renderBeerDetail(id) {
  app.innerHTML = '<div class="container fade-in"><div class="loading">Загрузка...</div></div>';
  const b = await api(`/beers/${id}/`);
  const p = b.pyramid || {};
  const notes = b.flavor_notes || [];
  const pairings = b.food_pairings || [];
  const reviews = b.expert_reviews || [];

  app.innerHTML = `<div class="container fade-in">
    <div class="back-btn" onclick="location.hash='#/'">← Каталог</div>

    <div class="detail-hero">
      <div class="detail-info">
        <div class="tag-line"><span class="dot"></span> ${b.style_display} · ${b.brand.name}</div>
        <h1>${b.name.replace(/(Pilsener|Тёмное|Светлое|Пшеничное|Draft|Stout|Navigator|Mariner|Мягкое)/,
          '<span class="gold-text">$1</span>')}</h1>
        <p class="desc">«${b.tagline}»</p>
        <p style="color:var(--muted);font-size:14px;line-height:1.7">${b.description}</p>
        <div class="stats-row">
          <div class="stat-box"><div class="v">${b.abv}%</div><div class="l">Алкоголь</div></div>
          <div class="stat-box"><div class="v">${b.ibu}</div><div class="l">IBU</div></div>
          <div class="stat-box"><div class="v">${b.serving_temp}</div><div class="l">Подача</div></div>
          <div class="stat-box"><div class="v">${b.density||'-'}</div><div class="l">Плотность</div></div>
        </div>
        <div class="rating-box">
          <div class="rating-big">${b.rating}</div>
          <div><div style="color:var(--accent);font-size:16px;letter-spacing:2px">${'★'.repeat(Math.round(b.rating))}</div>
          <div style="font-size:11px;color:var(--muted)">${b.rating_count} оценок</div></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        ${p.top_description ? renderPyramidSection(p) : ''}
      </div>
    </div>

    ${notes.length ? `
    <div style="margin-bottom:40px">
      <span class="section-tag">Что ты почувствуешь</span>
      <h2 class="section-title">Ноты вкуса</h2>
      <div class="notes-grid">${notes.map(n => `
        <div class="note-card-lg">
          <span class="emoji">${n.category.emoji}</span>
          <h4>${n.category.name}</h4>
          <div class="sub">${n.sub_description}</div>
          <div class="note-bar"><div class="note-bar-fill" style="width:${n.intensity}%;background:${n.category.color}"></div></div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${pairings.length ? pairings.map(fp => `
    <div style="margin-bottom:40px">
      <span class="section-tag">Food Pairing</span>
      <h2 class="section-title">С чем пить</h2>
      <div class="card" style="border-radius:20px;padding:28px">
        <h3 style="font-family:'Playfair Display',serif;font-size:22px;margin-bottom:6px">${fp.dish.emoji} ${fp.dish.name}</h3>
        <div class="match-badge">${fp.match_percent}% совпадение</div>
        <p style="color:var(--muted);font-size:13px;line-height:1.7;margin:12px 0">${fp.why_it_works}</p>
        <div class="pairing-tags">${(fp.flavor_bridges||[]).map(t => `<span>${t}</span>`).join('')}</div>
      </div>
    </div>`).join('') : ''}

    ${reviews.length ? `
    <div style="margin-bottom:40px">
      <span class="section-tag">Мнения экспертов</span>
      <h2 class="section-title">Отзывы сомелье</h2>
      <div class="reviews-grid">${reviews.map(r => `
        <div class="card review">
          <div class="review-header">
            <div class="review-avatar">${r.avatar_emoji}</div>
            <div><h4>${r.name}</h4><div class="role">${r.role}</div></div>
          </div>
          <p>«${r.text}»</p>
          <div class="stars" style="margin-top:8px">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5-Math.round(r.rating))}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderPyramidSection(p) {
  return `
    <div class="pyramid" style="margin-bottom:20px">
      <div class="pyr-lvl">🔺 TOP<small>Эмоции</small></div>
      <div class="pyr-lvl">❤️ HEART<small>Ароматические ноты</small></div>
      <div class="pyr-lvl">⬇️ BASE<small>Базовые вкусы</small></div>
    </div>
    <div class="pyr-card"><h4><span class="badge badge-top">TOP</span> ${p.top_title||'Эмоции'}</h4><p>${p.top_description}</p></div>
    <div class="pyr-card"><h4><span class="badge badge-heart">HEART</span> ${p.heart_title||'Ароматы'}</h4><p>${p.heart_description}</p></div>
    <div class="pyr-card"><h4><span class="badge badge-base">BASE</span> ${p.base_title||'Базовые вкусы'}</h4><p>${p.base_description}</p></div>`;
}

// ══════════════════════════════════════
// FLAVOR EXPLORER (Ноты → Пиво)
// ══════════════════════════════════════
let selectedNotes = new Set();

async function renderExplorer() {
  app.innerHTML = '<div class="container fade-in"><div class="loading">Загрузка нот...</div></div>';
  if (!flavorsCache) flavorsCache = await api('/flavors/');
  selectedNotes = new Set();

  app.innerHTML = `<div class="container fade-in">
    <span class="section-tag">Двусторонняя навигация</span>
    <h1 class="section-title">Ноты → <span class="gold-text">Пиво</span></h1>
    <p class="section-desc">Выбери вкусы, которые тебе нравятся — мы найдём идеальное пиво.</p>
    <div class="explore-grid">${flavorsCache.map(f => `
      <div class="flavor-chip" data-id="${f.id}" onclick="toggleNote(${f.id}, this)">
        <span class="emoji">${f.emoji}</span>
        <span class="name">${f.name}</span>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <button class="btn" id="match-btn" disabled onclick="doMatch()">🔍 Найти пиво</button>
    </div>
    <div id="match-results"></div>
  </div>`;
}

window.toggleNote = function(id, el) {
  if (selectedNotes.has(id)) { selectedNotes.delete(id); el.classList.remove('selected'); }
  else { selectedNotes.add(id); el.classList.add('selected'); }
  document.getElementById('match-btn').disabled = selectedNotes.size === 0;
};

window.doMatch = async function() {
  const res = document.getElementById('match-results');
  res.innerHTML = '<div class="loading">Ищем совпадения...</div>';
  const data = await api('/match/', {method:'POST', body: JSON.stringify({note_ids: [...selectedNotes]})});
  if (!data.length) { res.innerHTML = '<p style="text-align:center;color:var(--muted)">Нет совпадений. Попробуй другие ноты.</p>'; return; }
  res.innerHTML = `<h3 style="margin-bottom:16px">🎯 Результаты (${data.length})</h3>
    <div class="match-results">${data.map(m => `
      <div class="match-item" style="cursor:pointer" onclick="location.hash='#/beer/${m.beer.id}'">
        <div class="match-pct">${m.match_percent}%</div>
        <div>
          <h4>${m.beer.name} <span style="font-size:11px;color:var(--muted);font-weight:400">${m.beer.brand_name} · ${m.beer.abv}%</span></h4>
          <div class="match-notes">${m.matching_notes.map(n=>`<span class="note-pill">${n}</span>`).join('')}</div>
        </div>
      </div>`).join('')}
    </div>`;
};

// ══════════════════════════════════════
// AI SOMMELIER
// ══════════════════════════════════════
let chatHistory = [];

function renderAI() {
  chatHistory = [{role:'bot', text:'Привет! Я AI Сомелье Flavor Tree 🍺\n\nСпроси меня о пиве, и я помогу подобрать идеальный вариант. Например:\n• «Что попить к бешбармаку?»\n• «Расскажи про Efes Pilsener»\n• «Хочу что-то с цитрусовыми нотами»'}];
  renderChatUI();
}

function renderChatUI() {
  app.innerHTML = `<div class="container fade-in">
    <span class="section-tag">AI Сомелье</span>
    <h1 class="section-title">Спроси <span class="gold-text">Сомелье</span></h1>
    <p class="section-desc">AI-наставник на основе вкусовых профилей всех 15 брендов Efes KZ.</p>
    <div class="chat-box">
      <div class="quick-btns">
        <button class="filter-btn" onclick="sendChat('Что попить к бешбармаку?')">🥘 К бешбармаку</button>
        <button class="filter-btn" onclick="sendChat('Что попить к шашлыку?')">🍖 К шашлыку</button>
        <button class="filter-btn" onclick="sendChat('Хочу что-то с цитрусом')">🍋 Цитрус</button>
        <button class="filter-btn" onclick="sendChat('Расскажи про Efes Pilsener')">🍺 Efes Pilsener</button>
      </div>
      <div class="chat-messages" id="chat-msgs">${chatHistory.map(m =>
        `<div class="chat-msg ${m.role}">${m.text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`
      ).join('')}</div>
      <div class="chat-input-row">
        <input class="chat-input" id="chat-input" placeholder="Спроси про пиво..." onkeydown="if(event.key==='Enter')sendChat()">
        <button class="btn" onclick="sendChat()">→</button>
      </div>
    </div>
  </div>`;
}

window.sendChat = async function(preset) {
  const input = document.getElementById('chat-input');
  const msg = preset || input.value.trim();
  if (!msg) return;
  chatHistory.push({role:'user', text: msg});
  if (input) input.value = '';
  renderChatUI();
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += '<div class="chat-msg bot" style="opacity:.5">Думаю...</div>';
  msgs.scrollTop = msgs.scrollHeight;
  const data = await api('/ai/sommelier/', {method:'POST', body: JSON.stringify({message: msg})});
  chatHistory.push({role:'bot', text: data.message || 'Не удалось получить ответ.'});
  renderChatUI();
  document.getElementById('chat-msgs').scrollTop = 99999;
};

// ══════════════════════════════════════
// SCHOOL
// ══════════════════════════════════════
async function renderSchool() {
  app.innerHTML = '<div class="container fade-in"><div class="loading">Загрузка школы...</div></div>';
  const levels = await api('/school/levels/');

  app.innerHTML = `<div class="container fade-in">
    <span class="section-tag">Школа Пивных Сомелье</span>
    <h1 class="section-title">Стань <span class="gold-text">Сомелье</span></h1>
    <p class="section-desc">4 уровня — от новичка до сертифицированного пивного сомелье Efes.</p>
    <div class="levels-grid">${levels.map((lv, i) => `
      <div class="level-card ${i===0?'completed':i===1?'current':'locked'}">
        <span class="level-emoji">${lv.emoji}</span>
        <div class="level-name">${lv.name}</div>
        <div class="level-desc">${lv.description}</div>
        <div class="level-status" style="background:${i===0?'rgba(34,197,94,0.1)':i===1?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.05)'};color:${i===0?'#22c55e':i===1?'var(--accent)':'var(--muted)'}">
          ${i===0?'✓ Пройден':i===1?'◉ В процессе':'🔒 Закрыт'}
        </div>
      </div>`).join('')}
    </div>
    <div class="xp-wrap" style="max-width:600px">
      <div class="xp-info"><span><span class="gold-text" style="font-weight:800">847</span> / 1200 XP до Знатока</span><span>🔥 5 дней стрик</span></div>
      <div class="xp-bar"><div class="xp-fill" style="width:70%"></div></div>
    </div>
    ${levels[0]?.lessons?.length ? renderLesson(levels[0].lessons[0]) : ''}
  </div>`;
}

function renderLesson(lesson) {
  return `<div style="margin-top:40px">
    <span class="section-tag">Урок 1</span>
    <h2 class="section-title">${lesson.title}</h2>
    <div class="card" style="margin-bottom:24px;padding:28px">
      <div style="color:var(--muted);font-size:14px;line-height:1.8">${lesson.content.replace(/#{1,3}\s(.*)/g,'<h3 style="color:var(--text);margin:16px 0 8px;font-size:16px">$1</h3>').replace(/\n/g,'<br>')}</div>
    </div>
    ${lesson.questions?.length ? `
      <h3 style="margin-bottom:16px">📝 Квиз — проверь себя</h3>
      ${lesson.questions.map((q,i) => `
        <div class="quiz-card" id="quiz-${q.id}">
          <p style="font-weight:700;margin-bottom:12px">${i+1}. ${q.text}</p>
          ${q.options.map((o,j) => `
            <button class="quiz-option" onclick="checkAnswer(${q.id},${j},this)">${o}</button>
          `).join('')}
          <div id="quiz-result-${q.id}" style="margin-top:8px;font-size:13px"></div>
        </div>`).join('')}
    ` : ''}
  </div>`;
}

window.checkAnswer = async function(qid, selected, el) {
  const card = document.getElementById(`quiz-${qid}`);
  if (card.dataset.answered) return;
  card.dataset.answered = '1';
  const data = await api('/school/quiz/', {method:'POST', body: JSON.stringify({question_id: qid, selected_index: selected})});
  const btns = card.querySelectorAll('.quiz-option');
  btns[data.correct_index].classList.add('correct');
  if (!data.correct) el.classList.add('wrong');
  const res = document.getElementById(`quiz-result-${qid}`);
  res.innerHTML = data.correct
    ? `<span style="color:#22c55e">✓ Правильно! +${data.xp_earned} XP</span>`
    : `<span style="color:#ef4444">✗ Неправильно.</span> <span style="color:var(--muted)">${data.explanation}</span>`;
};

// ══════════════════════════════════════
// PROFILE + FLAVOR DNA
// ══════════════════════════════════════
async function renderProfile() {
  app.innerHTML = '<div class="container fade-in"><div class="loading">Загрузка профиля...</div></div>';
  const d = await api('/profile/dna/');

  app.innerHTML = `<div class="container fade-in">
    <div class="profile-layout">
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card profile-card">
          <div class="avatar">🍺</div>
          <h2>${d.username}</h2>
          <div style="color:var(--accent);font-size:12px;font-weight:600;margin-bottom:10px">@${d.username} · ${d.level}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding-top:14px;border-top:1px solid var(--border)">
            <div style="text-align:center"><div class="gold-text" style="font-size:18px;font-weight:800">${d.total_tastings}</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Дегустаций</div></div>
            <div style="text-align:center"><div class="gold-text" style="font-size:18px;font-weight:800">${d.xp}</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">XP</div></div>
            <div style="text-align:center"><div class="gold-text" style="font-size:18px;font-weight:800">${d.streak}🔥</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Стрик</div></div>
          </div>
        </div>
        <div class="card" style="padding:22px">
          <h3 style="font-size:14px;margin-bottom:14px;display:flex;align-items:center;gap:8px">🧬 Flavor DNA <span class="section-tag" style="margin:0;font-size:8px">Обновлено</span></h3>
          <div class="dna-bars">${d.dna.map(n => `
            <div class="dna-row">
              <span class="label">${n.emoji} ${n.name}</span>
              <div class="bar-bg"><div class="bar-fill" style="width:${n.percent}%;background:${n.color}"></div></div>
              <span class="pct">${n.percent}%</span>
            </div>`).join('')}
          </div>
          <div style="text-align:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)">
            🧬 «${d.tagline}» — <strong style="color:var(--accent)">Поделиться DNA</strong>
          </div>
        </div>
        <div class="card" style="padding:22px">
          <h3 style="font-size:14px;margin-bottom:12px">🏆 Достижения <span class="section-tag" style="margin:0;font-size:8px">${d.achievements.filter(a=>a.unlocked).length}/${d.achievements.length}</span></h3>
          <div class="achievements">${d.achievements.map(a => `
            <div class="ach" style="${a.unlocked?'':'opacity:.35'}">${a.emoji} ${a.name}</div>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card" style="padding:24px">
          <h3 style="font-size:14px;margin-bottom:14px">🤖 Рекомендации AI Сомелье</h3>
          <p style="color:var(--muted);font-size:13px;margin-bottom:16px">На основе твоего Flavor DNA:</p>
          <div style="display:flex;flex-direction:column;gap:10px" id="recs-list"><div class="loading">Загрузка...</div></div>
        </div>
      </div>
    </div>
  </div>`;
  loadRecommendations();
}

async function loadRecommendations() {
  const data = await api('/beers/?page_size=50');
  const beers = (data.results || data).slice(0, 4);
  const percents = [92, 87, 81, 74];
  document.getElementById('recs-list').innerHTML = beers.map((b, i) => `
    <div class="match-item" style="cursor:pointer" onclick="location.hash='#/beer/${b.id}'">
      <div class="match-pct">${percents[i]}%</div>
      <div><h4>${b.name}</h4><p style="font-size:11px;color:var(--muted)">${b.tagline}</p></div>
    </div>`).join('');
}
