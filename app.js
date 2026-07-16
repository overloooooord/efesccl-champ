const app=document.getElementById('app');
let currentPage='home',flowMode=null,flowStep=0,flowSelections={},chatHistory=[];
const OPENROUTER_KEY=localStorage.getItem('ft_api_key')||'';
let globalMeal=localStorage.getItem('ft_global_meal')||'';
window.setGlobalMeal=function(v){
  globalMeal=v;
  localStorage.setItem('ft_global_meal',v);
  if (currentPage==='catalog') renderCatalog();
  else if (currentPage==='home') renderHome();
};
// ═══ TRACKING ═══
const T={start:Date.now(),views:{},clicks:[],pairings:[],chats:0,sessions:JSON.parse(localStorage.getItem('ft_sessions')||'[]')};
T.sessions.push({ts:Date.now(),ua:navigator.userAgent});
if(T.sessions.length>100)T.sessions=T.sessions.slice(-100);
localStorage.setItem('ft_sessions',JSON.stringify(T.sessions));
function track(type,data){T.clicks.push({ts:Date.now(),type,data});T.views[currentPage]=(T.views[currentPage]||0)+1;}

function fadeIn(){app.style.opacity='0';app.style.transition='opacity .25s ease';requestAnimationFrame(()=>{requestAnimationFrame(()=>{app.style.opacity='1'})})}
function isLoggedIn(){return!!localStorage.getItem('ft_profile')&&JSON.parse(localStorage.getItem('ft_profile')).registered}
function navigate(p){currentPage=p;track('navigate',p);document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active',t.dataset.page===p));
fadeIn();
if(p==='home')renderHome();else if(p==='catalog')renderCatalog();else if(p==='ai')renderAI();else if(p==='lexicon')renderLexicon();else if(p==='tools')renderTools();else if(p==='admin')renderAdmin();else if(p==='learn')renderLearn();else if(p==='profile')renderProfile();else if(p==='register')renderRegister();else if(p==='tinder')renderTinder();}
function goHome(){navigate('home')}
window.navigate=navigate;window.goHome=goHome;

const FUN_FACTS=[
  {e:'🍺',t:'Пиво — древнейший напиток',d:'Шумеры варили пиво ещё 6000 лет назад. Они даже посвятили ему богиню — Нинкаси.'},
  {e:'🌡️',t:'Температура решает',d:'Лагер подают при 4–7°C. Каждый лишний градус убивает свежесть и раскрывает горечь.'},
  {e:'🧬',t:'IBU — это язык горечи',d:'IBU 12 — почти вода. IBU 22 — лёгкий намёк. IBU 60+ — IPA для смельчаков.'},
  {e:'🐱',t:'Кошачий тон (Catty)',d:'Аромат кошачьей мочи или листьев черной смородины (вызван p-menthane-8-thiol-3-one) указывает на окисление пива, хотя в некоторых элях это норма.'},
  {e:'🧀',t:'Сырные носки (Isovaleric)',d:'Изовалериановая кислота пахнет потными носками или старым сыром. Это верный маркер использования старого или испорченного хмеля.'},
  {e:'🤢',t:'Прогорклое масло (Butyric)',d:'Резкий запах рвоты или прогорклого масла вызывается масляной кислотой (Butyric acid) из-за бактериального заражения сусла.'},
  {e:'📦',t:'Мокрый картон (Papery)',d:'Запах старой бумаги или картона (trans-2-nonenal) — главный индикатор старения пива из-за окисления и неправильного температурного режима.'},
  {e:'🥂',t:'Бокал меняет вкус',d:'Тюльпан концентрирует аромат хмеля, а пилснер-бокал усиливает газацию и свежесть.'},
  {e:'🍖',t:'Пиво × Мясо = наука',d:'Горечь хмеля расщепляет жир на языке. Именно поэтому шашлык без пива — неполный опыт.'},
  {e:'🌾',t:'Три солода Козела',d:'Карамельный, жжёный и базовый солод — три слоя, которые создают рубиновый цвет и бархатный вкус.'},
];
function renderHome(){
flowMode=null;flowStep=0;flowSelections={};
const prof=JSON.parse(localStorage.getItem('ft_profile')||'{}');
const greeting=prof.name?`Добро пожаловать, <span class="gold">${prof.name}</span>! 👋`:'';
app.innerHTML=`<div class="container"><div class="welcome">
<div class="welcome-tag">Beer &amp; Food Pairing · Efes Kazakhstan</div>
<h1>Найди идеальную <span class="gold">пару</span></h1>
${greeting?`<p style="font-size:20px;margin-bottom:8px">${greeting}</p>`:''}
<div style="max-width:600px;margin-bottom:32px">
  <p style="font-size:18px;color:var(--muted);line-height:1.7;margin-bottom:16px">FlavorTree — платформа сенсорного образования для пива. Мы раскладываем вкус каждого бренда на три слоя — как аромат в парфюмерии — и подбираем идеальное гастрономическое сочетание.</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:20px">
    <span style="padding:6px 14px;background:var(--cream);border-radius:999px;font-size:13px;font-weight:700;color:var(--accent2)">🍺 5 брендов Efes KZ</span>
    <span style="padding:6px 14px;background:var(--cream);border-radius:999px;font-size:13px;font-weight:700;color:var(--accent2)">🌦️ Вкусовая пирамида</span>
    <span style="padding:6px 14px;background:var(--cream);border-radius:999px;font-size:13px;font-weight:700;color:var(--accent2)">🤖 AI-Сомелье</span>
    <span style="padding:6px 14px;background:var(--cream);border-radius:999px;font-size:13px;font-weight:700;color:var(--accent2)">📚 Школа вкуса</span>
  </div>
  <div style="display:flex;gap:8px;max-width:500px;width:100%">
    <input type="text" id="global-meal-input-home" placeholder="Введите блюдо (напр. Шашлык, Бешбармак...)" value="${globalMeal}"
      oninput="setGlobalMeal(this.value)"
      onkeydown="if(event.key==='Enter'&&this.value.trim()){quickPairing(this.value.trim());}"
      style="flex:1;padding:13px 18px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:var(--body);outline:none;">
    <button onclick="quickPairing(document.getElementById('global-meal-input-home').value.trim())" style="padding:13px 22px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;cursor:pointer;font-family:var(--body);white-space:nowrap">Подобрать →</button>
  </div>
</div>
<div class="choice-grid">
<div class="choice-card" onclick="startFlow('food')"><span class="choice-icon">🍽️</span><h3>У меня есть <span class="gold">блюдо</span></h3><p>Подберу пиво к еде по вкусовой пирамиде за 4 шага</p></div>
<div class="choice-card" onclick="startFlow('beer')"><span class="choice-icon">🍺</span><h3>У меня есть <span class="gold">пиво</span></h3><p>Покажу идеальные блюда и вкусовые мосты</p></div>
</div>
</div>
<div style="max-width:900px;margin:0 auto;padding:0 24px 60px">
<div class="section-tag" style="margin-top:20px">💡 Интересные факты</div>
<h2 class="section-title">Знал ли ты<span class="gold">?</span></h2>
<div class="facts-grid">${FUN_FACTS.map(f=>`<div class="fact-card"><span class="fact-emoji">${f.e}</span><h4>${f.t}</h4><p>${f.d}</p></div>`).join('')}</div>
</div>
</div>`;}

window.startFlow=function(m){flowMode=m;flowStep=1;flowSelections={};fadeIn();renderStep()};
window.renderHome=renderHome;

window.quickPairing = function(v) {
  if (!v) { startFlow('food'); return; }
  setGlobalMeal(v);
  flowMode = 'quick';
  let bestBeer = BEERS[0]; let maxScore = -1; let text = v.toLowerCase();
  BEERS.forEach(b => {
    let score = 0;
    b.foods.forEach(f => {
      if (text.includes(f.name.toLowerCase()) || (f.cat && text.includes(f.cat.toLowerCase()))) score += 10;
    });
    if (text.includes('мясо') || text.includes('шашлык') || text.includes('беш') || text.includes('стейк') || text.includes('казы')) {
      if (b.id === 'karaganda' || b.id === 'melnik' || b.id === 'kozel') score += 5;
    }
    if (text.includes('баурсак') || text.includes('хлеб') || text.includes('пицца')) {
      if (b.style && b.style.toLowerCase().includes('пшенич')) score += 5;
    }
    if (score > maxScore) { maxScore = score; bestBeer = b; }
  });
  app.innerHTML=`<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()" style="margin-bottom:16px">← Новый подбор</button>
<div class="section-tag">Результат для твоего блюда</div>
<h2 class="section-title">Ты ешь <span class="gold">"${v}"</span></h2>
<div class="ai-explain-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px;display:flex;gap:16px;align-items:flex-start">
  <div style="font-size:40px;flex-shrink:0">🧠</div>
  <div><div class="section-tag" style="margin-bottom:8px">Мнение AI-Сомелье Макса</div><div id="ai-explain-content">…анализирую твое блюдо и подбираю пару...</div></div>
</div>
${resultCard(bestBeer, {name: v, desc: 'Идеальное сочетание для твоего выбора'}, true, Math.min(99, 85 + maxScore*2))}
</div></div>`;
  const aiPrompt = `Я ем блюдо: "${v}". Почему пиво ${bestBeer.name} (стиль ${bestBeer.style}, вкусовые ноты: ${bestBeer.notes.map(n=>n.n).join(', ')}) идеально подходит к этой еде? Объясни конкретно сочетание их вкусовых нот и мосты вкуса в 1-2 предложениях. Отвечай как профессиональный пивной сомелье Макс. Без общих фраз и лишних приветствий.`;
  aiExplain('ai-explain-content', aiPrompt, getLocalExplanation(bestBeer.id, bestBeer.name, v, '', '', ''));
};

function renderStep(){fadeIn();flowMode==='food'?renderFoodStep():renderBeerStep()}
function SH(title,sub,total){return `<div class="step-header"><button class="step-back" onclick="stepBack()">← Назад</button><div class="step-progress">${Array.from({length:total},(_,i)=>`<div class="step-dot ${i<flowStep-1?'done':''} ${i===flowStep-1?'active':''}"></div>`).join('')}</div><h2 class="step-title">${title}</h2><p class="step-subtitle">${sub}</p></div>`}
window.stepBack=function(){if(flowStep<=1){renderHome();return}flowStep--;fadeIn();renderStep()};

function circlesHTML(items,sel,fn){
  return `<div class="options-grid">${items.map(c=>{
    const inner=c.img
      ?`<img src="${c.img}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      :`<span style="font-size:44px">${c.emoji}</span>`;
    return `<div class="option-circle ${sel===c.id?'selected':''}" onclick="${fn}('${c.id}')">
      <div class="circle-icon" style="${c.img?'padding:0;overflow:hidden':''}">${inner}</div>
      <div class="option-label">${c.name}${c.desc?`<br><span style="font-size:10px;opacity:.6">${c.desc}</span>`:''}</div>
    </div>`;
  }).join('')}</div>`;
}
function customInput(placeholder,fn){return `<div class="custom-input-wrap"><div class="custom-divider">или напиши своё</div><div class="custom-input-row"><input class="custom-input" id="custom-in" placeholder="${placeholder}"><button class="custom-submit" onclick="${fn}()">→</button></div></div>`}

// ═══ FOOD FLOW (4 steps) ═══
function renderFoodStep(){
if(flowStep===1){
app.innerHTML=`<div class="container"><div class="step-view">${SH('Что ты ешь?','Выбери категорию блюда',4)}${circlesHTML(FOOD_CATS,flowSelections.cat,'selectCat')}${customInput('Например: стейк рибай, том ям, тирамису...','submitCustomCat')}</div></div>`;
}else if(flowStep===2){
app.innerHTML=`<div class="container"><div class="step-view">${SH('Как приготовлено?','Способ приготовления влияет на подбор',4)}${circlesHTML(COOK_METHODS,flowSelections.method,'selectMethod')}${customInput('Например: копчёное, фритюр, sous-vide...','submitCustomMethod')}</div></div>`;
}else if(flowStep===3){
app.innerHTML=`<div class="container"><div class="step-view">${SH('Какой вкус доминирует?','Основной вкус блюда',4)}${circlesHTML(TASTE_GROUPS,flowSelections.taste,'selectTaste')}${customInput('Например: кисло-сладкое, пряное с дымком...','submitCustomTaste')}</div></div>`;
}else if(flowStep===4){
app.innerHTML=`<div class="container"><div class="step-view">${SH('Насколько тяжёлое блюдо?','Интенсивность влияет на крепость пива',4)}${circlesHTML(INTENSITIES,flowSelections.intensity,'selectIntensity')}${customInput('Например: очень жирное, лёгкое как пёрышко...','submitCustomIntensity')}</div></div>`;
}else{showFoodResults()}
}
window.selectCat=function(id){flowSelections.cat=id;track('select_cat',id);flowStep=2;renderStep()};
window.selectMethod=function(id){flowSelections.method=id;flowStep=3;renderStep()};
window.selectTaste=function(id){flowSelections.taste=id;flowStep=4;renderStep()};
window.selectIntensity=function(id){flowSelections.intensity=id;track('pairing',JSON.stringify(flowSelections));T.pairings.push(flowSelections);flowStep=5;renderStep()};
window.submitCustomCat=function(){const v=document.getElementById('custom-in').value.trim();if(v){flowSelections.cat='custom';flowSelections.catText=v;flowStep=2;renderStep()}};
window.submitCustomMethod=function(){const v=document.getElementById('custom-in').value.trim();if(v){flowSelections.method='custom';flowSelections.methodText=v;flowStep=3;renderStep()}};
window.submitCustomTaste=function(){const v=document.getElementById('custom-in').value.trim();if(v){flowSelections.taste='custom';flowSelections.tasteText=v;flowStep=4;renderStep()}};
window.submitCustomIntensity=function(){const v=document.getElementById('custom-in').value.trim();if(v){flowSelections.intensity='custom';flowStep=5;renderStep()}};

// ═══ AI EXPLAIN on results ═══
async function aiExplain(containerId, prompt, fallbackText){
  const el=document.getElementById(containerId);
  if(!el)return;
  const key=OPENROUTER_KEY||localStorage.getItem('ft_api_key')||'';
  if(!key){el.innerHTML=`<p style="font-size:15px;line-height:1.7;color:var(--text)">💡 ${fallbackText || localExplain(prompt)}</p>`;return}
  try{
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'http://localhost:8080','X-Title':'FlavorTree'},
      body:JSON.stringify({model:'google/gemini-2.0-flash',messages:[{role:'system',content:'Ты пивной сомелье FlavorTree. Твоя задача — объяснить гастрономическую совместимость выбранного пива и блюда. Отвечай ровно 1-2 предложения на русском, максимально конкретно про вкусы, сочетания и мосты вкуса. Без общих фраз и без приветствий.'},{role:'user',content:prompt}],max_tokens:200})
    });
    const d=await r.json();
    const txt=d.choices?.[0]?.message?.content;
    if(txt&&el)el.innerHTML=`<p style="font-size:15px;line-height:1.7;color:var(--text)">💡 ${txt}</p>`;
    else if(el)el.innerHTML=`<p style="font-size:15px;line-height:1.7;color:var(--text)">💡 ${fallbackText || localExplain(prompt)}</p>`;
  }catch(e){
    if(el)el.innerHTML=`<p style="font-size:15px;line-height:1.7;color:var(--text)">💡 ${fallbackText || localExplain(prompt)}</p>`;
  }
}
function localExplain(prompt){
  if(prompt.includes('Efes')||prompt.includes('цитрус'))return 'Цитрус и хмель освежают нёбо и балансируют жирное. Лучший выбор для твоего блюда.';
  if(prompt.includes('Kozel')||prompt.includes('карамел'))return 'Карамельная сладость усиливает вкус блюда и создаёт гармонию вкусов.';
  if(prompt.includes('Wùkōng'))return 'Минимальная горечь не перебивает деликатные вкусы блюда.';
  return 'Вкусовые ноты пива и блюда создают идеальное сочетание.';
}
function getLocalExplanation(beerId, beerName, catName, methodName, tasteName, intensityName) {
  const foodDesc = `${catName}${methodName ? ' (' + methodName.toLowerCase() + ')' : ''}`;
  
  if (beerId === 'efes') {
    if (tasteName.toLowerCase().includes('остр') || tasteName.toLowerCase().includes('солен') || tasteName.toLowerCase().includes('умами') || tasteName.toLowerCase().includes('прян')) {
      return `Яркая цитрусовая свежесть Efes Pilsener отлично гасит остроту и компенсирует соль в ${foodDesc}, а благородная хмелевая горечь (IBU 22) и газация смывают жирность, подготавливая рецепторы к новому кусочку.`;
    }
    if (tasteName.toLowerCase().includes('кисл') || methodName.toLowerCase().includes('сыр') || methodName.toLowerCase().includes('свеж') || methodName.toLowerCase().includes('сырое')) {
      return `Травянистый хмель Hallertau и цитрусовые ноты Efes Pilsener идеально подчеркивают естественную кислотность и свежесть ${foodDesc}, не перегружая рецепторы.`;
    }
    return `Классический сухой пильзнер Efes Pilsener с его чистым хлебным телом и свежей хмелевой горчинкой выступает универсальным гастрономическим контрастом для ${foodDesc}, отлично освежая нёбо.`;
  }
  
  if (beerId === 'kozel') {
    if (methodName.toLowerCase().includes('туш') || methodName.toLowerCase().includes('запеч') || tasteName.toLowerCase().includes('умами') || methodName.toLowerCase().includes('томлен')) {
      return `Карамельные и ореховые тона Kozel Тёмное идеально резонируют с томленым или запеченным характером ${foodDesc}, подчеркивая глубокие карамелизированные нотки корочки.`;
    }
    if (catName.toLowerCase().includes('десерт') || tasteName.toLowerCase().includes('сладк')) {
      return `Мягкие шоколадно-кофейные оттенки и деликатная солодовая сладость Kozel Тёмное сливаются с десертными нотами ${foodDesc}, создавая бархатистый тандем без лишней горечи.`;
    }
    return `Бархатное, легкое тело Kozel Тёмное с тонами карамельной ириски и поджаренного ржаного хлеба создает мягкое, обволакивающее сочетание с ${foodDesc}.`;
  }
  
  if (beerId === 'wukong') {
    if (catName.toLowerCase().includes('азиат') || methodName.toLowerCase().includes('пар') || methodName.toLowerCase().includes('вок') || methodName.toLowerCase().includes('wok')) {
      return `Деликатный рисовый профиль Wùkōng Jū и его минимальная горечь (IBU 12) гармонируют с лапшой, тестом и соевым соусом в ${foodDesc}, подчеркивая восточные специи и не перебивая их.`;
    }
    if (catName.toLowerCase().includes('рыб') || catName.toLowerCase().includes('море') || methodName.toLowerCase().includes('сыр') || methodName.toLowerCase().includes('свеж') || methodName.toLowerCase().includes('сырое')) {
      return `Нейтральное тело и цветочные тона Wùkōng Jū бережно уважают нежную текстуру морепродуктов в ${foodDesc}, мягко очищая нёбо и оставляя легкое жасминовое послевкусие.`;
    }
    return `Этот ультра-легкий рисовый лагер Wùkōng Jū с мягкими фруктовыми и цветочными нотками служит идеальным нейтральным фоном для ${foodDesc}, сохраняя его собственный деликатный вкус.`;
  }
  
  if (beerId === 'kruzhka') {
    if (methodName.toLowerCase().includes('гриль') || methodName.toLowerCase().includes('мангал') || methodName.toLowerCase().includes('сковорода') || tasteName.toLowerCase().includes('солен') || tasteName.toLowerCase().includes('умами')) {
      return `Солодовая база и легкие медовые оттенки Кружки Свежего отлично смягчают соленость и жареную корочку в ${foodDesc}, а хорошая газация смывает жирность.`;
    }
    if (catName.toLowerCase().includes('гарнир') || catName.toLowerCase().includes('закус')) {
      return `Мягкая солодово-хлебная основа Кружки Свежего отлично дополняет простые и сытные закуски в ${foodDesc}, создавая понятное, классическое сочетание.`;
    }
    return `Мягкий светлый лагер Кружка Свежего с чистым солодовым вкусом и легким травянистым оттенком не отвлекает от трапезы, служа освежающим сопровождением для ${foodDesc}.`;
  }
  
  if (beerId === 'melnik') {
    if (catName.toLowerCase().includes('бешбармак') || catName.toLowerCase().includes('манты') || catName.toLowerCase().includes('плов') || methodName.toLowerCase().includes('отвар') || methodName.toLowerCase().includes('пар')) {
      return `Бархатистая мягкость Старого Мельника не спорит с нежным вкусом отварного теста и мяса в ${foodDesc}, а аромат трех сортов хмеля мягко освежает после насыщенного бульона.`;
    }
    if (catName.toLowerCase().includes('мясо') || methodName.toLowerCase().includes('гриль') || methodName.toLowerCase().includes('мангал')) {
      return `Хлебные и медовые ноты Старого Мельника дополняют плотную структуру мяса в ${foodDesc}, а деликатная горчинка хмелевого трио мягко балансирует жирность.`;
    }
    return `Старый Мельник предлагает мягкое бархатистое тело с травянисто-хлебным ароматом, создавая плотное и сбалансированное гастрономическое сочетание с ${foodDesc}.`;
  }
  
  return `Вкусовые ноты пива ${beerName} и блюда ${foodDesc} гармонично дополняют друг друга.`;
}
function showFoodResults(){
const {cat,method,taste,intensity}=flowSelections;
let scored=BEERS.map(b=>{
let score=0;
b.foods.forEach(f=>{if(f.cat===cat)score+=25;if(f.method===method)score+=20});
b.notes.forEach(n=>{
if(taste==='sweet'&&['Мёд','Карамель','Сладость'].includes(n.n))score+=n.i*.3;
if(taste==='bitter'&&n.n==='Горечь')score+=n.i*.5;
if(taste==='sour'&&n.n==='Цитрус')score+=n.i*.4;
if(taste==='salty'&&['Солод','Хлеб'].includes(n.n))score+=n.i*.3;
if(taste==='umami'&&['Хлеб','Солод','Хмель (трио)'].includes(n.n))score+=n.i*.3;
if(taste==='spicy'&&['Свежесть','Рис','Сладость'].includes(n.n))score+=n.i*.3;
if(taste==='neutral')score+=15;
});
if(intensity==='light'&&b.abv<=4)score+=15;
if(intensity==='heavy'&&b.ibu>=18)score+=15;
if(intensity==='rich'&&b.notes.some(n=>n.n==='Горечь'&&n.i>=50))score+=15;
if(intensity==='medium')score+=10;
const food=b.foods.find(f=>f.cat===cat)||b.foods.find(f=>f.method===method)||b.foods[0];
return{beer:b,food,score}}).sort((a,b)=>b.score-a.score);
const catLabel=FOOD_CATS.find(c=>c.id===cat);
const tasteLabel=TASTE_GROUPS.find(t=>t.id===taste);
const methodLabel=COOK_METHODS.find(m=>m.id===method);
const intensityLabel=INTENSITIES.find(i=>i.id===intensity);

const catName=catLabel?catLabel.name:(flowSelections.catText||'твоему блюду');
const tasteName=tasteLabel?tasteLabel.name:(flowSelections.tasteText||'выбранному вкусу');
const methodName=methodLabel?methodLabel.name:(flowSelections.methodText||'');
const intensityName=intensityLabel?intensityLabel.name:'';

const top=scored[0];
const fallbackText = getLocalExplanation(top.beer.id, top.beer.name, catName, methodName, tasteName, intensityName);
const aiPrompt=`Почему пиво ${top.beer.name} (стиль ${top.beer.style}, ноты: ${top.beer.notes.slice(0,3).map(n=>n.n).join(', ')}) идеально подходит к блюду: ${catName} ${methodName?'(приготовлено: '+methodName+')':''}, с доминирующим вкусом: ${tasteName} и интенсивностью: ${intensityName}? Объясни конкретно сочетание их вкусовых нот и мосты вкуса в 1-2 предложениях.`;

app.innerHTML=`<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()" style="margin-bottom:16px">← Новый подбор</button>
<div class="section-tag">Результат</div>
<h2 class="section-title">Лучшее пиво — <span class="gold">${top.beer.name}</span></h2>
<p class="section-desc">${catLabel?catLabel.emoji+' '+catLabel.name:flowSelections.catText||''} · ${tasteLabel?tasteLabel.name:flowSelections.tasteText||''}</p>
<div class="ai-explain-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px;display:flex;gap:16px;align-items:flex-start">
  <div style="font-size:40px;flex-shrink:0">🧠</div>
  <div><div class="section-tag" style="margin-bottom:8px">Почему это лучший вариант?</div><div id="ai-explain-content">…загружаю AI-объяснение</div></div>
</div>
${scored.map((s,i)=>resultCard(s.beer,s.food,i===0,Math.min(99,Math.round(50+s.score*.5)))).join('')}
</div></div>`;
aiExplain('ai-explain-content', aiPrompt, fallbackText);}

// ═══ BEER FLOW ═══
function renderBeerStep(){
if(flowStep===1){
app.innerHTML=`<div class="container"><div class="step-view">${SH('Какое пиво?','Выбери бренд',2)}
<div class="beer-circles">${BEERS.map(b=>`<div class="beer-circle ${flowSelections.beer===b.id?'selected':''}" onclick="selectBeer('${b.id}')"><div class="beer-icon" style="background:${b.color}15;padding:0;overflow:hidden"><img src="${b.img}" alt="${b.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div><div class="beer-name">${b.name}</div><div class="beer-style-tag">${b.style} · ${b.abv}%</div></div>`).join('')}</div>
${customInput('Или введи название любого пива...','submitCustomBeer')}</div></div>`;
}else{showBeerResults()}}
window.selectBeer=function(id){flowSelections.beer=id;track('select_beer',id);flowStep=2;renderStep()};
window.submitCustomBeer=function(){const v=document.getElementById('custom-in').value.trim();if(v){flowSelections.beer='efes';flowStep=2;renderStep()}};

function showBeerResults(){
const beer=BEERS.find(b=>b.id===flowSelections.beer);
app.innerHTML=`<div class="container"><div class="results-section">
<button class="step-back" onclick="renderHome()" style="margin-bottom:16px">← Новый подбор</button>
<div class="beer-desc-block" style="display:flex;gap:24px;align-items:flex-start">
<img src="${beer.img}" alt="${beer.name}" style="width:140px;height:auto;border-radius:var(--radius);flex-shrink:0">
<div>
<div class="section-tag">${beer.style} · ${beer.brand}</div>
<h2>${beer.name}</h2>
<div class="tagline">«${beer.tagline}»</div>
<p class="desc-text">${beer.desc}</p>
<div class="specs-row">
<div class="spec"><div class="val">${beer.abv}%</div><div class="lbl">Алкоголь</div></div>
<div class="spec"><div class="val">${beer.ibu}</div><div class="lbl">IBU</div></div>
<div class="spec"><div class="val">${beer.temp}</div><div class="lbl">Подача</div></div>
<div class="spec"><div class="val">${beer.density}</div><div class="lbl">Плотность</div></div>
</div>
<p class="desc-text" style="font-style:italic;border-left:3px solid var(--accent-light);padding-left:14px">${beer.longDesc}</p>
</div>
</div>
<div class="pyramid-card">
<h3 style="font-family:var(--heading);font-size:22px;margin-bottom:16px">🌦️ Вкусовая пирамида</h3>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
<div style="background:linear-gradient(135deg,#fef9ef,#fdf0cc);border-radius:14px;padding:22px;text-align:center;border-left:4px solid var(--gold)">
  <div style="font-size:48px;margin-bottom:10px">✨</div>
  <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--gold);margin-bottom:8px">TOP • Эмоции</div>
  <p style="font-size:13px;color:var(--muted);line-height:1.6">${beer.pyramid.top}</p>
</div>
<div style="background:linear-gradient(135deg,#fef2f2,#fde8e8);border-radius:14px;padding:22px;text-align:center;border-left:4px solid #c0392b">
  <div style="font-size:48px;margin-bottom:10px">❤️</div>
  <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#c0392b;margin-bottom:8px">HEART • Ароматы</div>
  <p style="font-size:13px;color:var(--muted);line-height:1.6">${beer.pyramid.heart}</p>
</div>
<div style="background:linear-gradient(135deg,#f3f0ff,#ede8ff);border-radius:14px;padding:22px;text-align:center;border-left:4px solid #6c3483">
  <div style="font-size:48px;margin-bottom:10px">🌱</div>
  <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#6c3483;margin-bottom:8px">BASE • Вкусы</div>
  <p style="font-size:13px;color:var(--muted);line-height:1.6">${beer.pyramid.base}</p>
</div>
</div>
</div>
<div class="result-card">
<h3 style="font-family:var(--heading);font-size:22px;margin-bottom:16px">🎵 Ноты вкуса</h3>
<div class="notes-list">${beer.notes.map(n=>`<div class="note-row"><span class="note-emoji" style="font-size:26px;width:34px">${n.e}</span><span class="note-name-label" style="font-size:16px;width:120px">${n.n}</span><div class="note-bar-bg" style="height:28px"><div class="note-bar-fill" style="width:${n.i}%;background:${n.c}"></div></div><span class="note-pct" style="font-size:16px;width:48px">${n.i}%</span></div>`).join('')}</div>
</div>
<div class="ai-explain-card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-top:20px;display:flex;gap:16px;align-items:flex-start">
  <div style="font-size:40px;flex-shrink:0">🧠</div>
  <div style="flex:1"><div class="section-tag" style="margin-bottom:8px">Почему ${beer.name} выбирают?</div><div id="beer-ai-explain">…</div></div>
</div>
<div class="section-tag" style="margin-top:28px">Food Pairing</div>
<h3 class="section-title" style="font-size:24px">Идеальные блюда</h3>
<p class="section-desc">Подобрано по совпадению вкусовых нот</p>
${beer.foods.map(f=>resultCardFood(beer,f)).join('')}

<div class="section-tag" style="margin-top:28px">⭐ Отзывы</div>
<h3 class="section-title" style="font-size:22px">Что говорят о <span class="gold">${beer.name}</span></h3>
<div id="reviews-section">${renderReviews(beer.id)}</div>
<div class="review-form" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-top:16px">
<h4 style="font-family:var(--heading);font-size:18px;margin-bottom:12px">Оставить отзыв</h4>
<div style="margin-bottom:12px"><span style="font-size:12px;color:var(--muted)">Оценка:</span><div class="star-rating" id="star-input">${[1,2,3,4,5].map(i=>`<span class="star" data-v="${i}" onclick="setStarRating(${i})" style="font-size:28px;cursor:pointer;color:var(--border)">★</span>`).join('')}</div></div>
<textarea id="review-text" rows="3" placeholder="Что понравилось? Какие ноты почувствовал?" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--body);font-size:14px;resize:vertical;outline:none"></textarea>
<button class="btn-primary" style="margin-top:10px;width:100%" onclick="submitReview('${beer.id}')">Отправить отзыв</button>
</div>
</div></div>`;
setTimeout(()=>{document.querySelectorAll('.note-bar-fill').forEach(el=>{const w=el.style.width;el.style.width='0';requestAnimationFrame(()=>el.style.width=w)})},50);
  let beerFallback = `${beer.name} — отличный выбор с богатым характером.`;
  if(beer.id==='efes') beerFallback = 'Efes Pilsener — это классический средиземноморский пильзнер с выразительной хмелевой горчинкой Hallertau и цитрусовой свежестью. Он служит великолепным гастрономическим контрастом к насыщенным мясным блюдам на гриле и свежим салатам.';
  else if(beer.id==='kozel') beerFallback = 'Kozel Тёмное предлагает бархатистый карамельно-ореховый профиль с тонами ржаного хлеба и легким кофейным финишем. Это пиво идеально дополняет томленое мясо, гуляш и шоколадные десерты.';
  else if(beer.id==='wukong') beerFallback = 'Wùkōng Jū — ультра-легкий рисовый лагер с мягкими жасминовыми и цветочными тонами и минимальной горечью. Он деликатно обрамляет блюда паназиатской кухни, суши и морепродукты, не заглушая их вкус.';
  else if(beer.id==='kruzhka') beerFallback = 'Кружка Свежего — легкий и питкий светлый лагер с мягкой солодовой базой и медовым оттенком. Он станет отличным, понятным сопровождением к домашней кухне, пельменям и мясным закускам на гриле.';
  else if(beer.id==='melnik') beerFallback = 'Старый Мельник сочетает три сорта ароматного хмеля по бочковой технологии, раскрываясь бархатистой мягкостью и травяными нотами. Оно превосходно гармонирует со сложными блюдами национальной кухни вроде бешбармака.';

  aiExplain('beer-ai-explain',`Почему ${beer.name} (${beer.style}, ${beer.abv}%, ноты: ${beer.notes.slice(0,3).map(n=>n.n).join(', ')}) — хороший выбор? Объясни 1-2 предложения про его характер и с чем он лучший.`, beerFallback);
}

function resultCard(beer,food,best,pct){
return `<div class="result-card">
<div class="result-header">
  <div class="result-left">
    <div class="result-emoji" style="overflow:hidden;border-radius:12px;width:68px;height:68px;flex-shrink:0"><img src="${beer.img}" alt="${beer.name}" style="width:100%;height:100%;object-fit:contain"></div>
    <div>
      <div class="result-name">${beer.name}</div>
      <div class="result-meta">${beer.style} · ${beer.abv}% · IBU ${beer.ibu}</div>
    </div>
  </div>
  <div class="match-badge ${best?'match-high':'match-mid'}">${pct}%</div>
</div>
<div class="result-why">${food.why}</div>
<div class="result-bridges" style="flex-wrap:wrap">${food.bridges.map(b=>`<span class="bridge-tag">${b}</span>`).join('')}</div>
${best?`<div style="margin-top:14px"><button class="btn-ghost" onclick="flowSelections.beer='${beer.id}';flowStep=2;flowMode='beer';renderStep()">Подробный профиль →</button></div>`:''}
</div>`;}
function resultCardFood(beer,food){
return `<div class="result-card">
<div class="result-header">
  <div class="result-left">
    <div class="result-emoji" style="font-size:40px">${food.em}</div>
    <div>
      <div class="result-name">${food.dish}</div>
      <div class="result-meta">${food.cat}</div>
    </div>
  </div>
  <div class="match-badge match-high">${food.match}%</div>
</div>
<div class="result-why">${food.why}</div>
<div class="result-bridges" style="flex-wrap:wrap">${food.bridges.map(b=>`<span class="bridge-tag">${b}</span>`).join('')}</div>
</div>`;}

// ═══ CATALOG ═══
let activeToneFilter=null;
function renderCatalog(){
  let filtered=activeToneFilter?BEERS.filter(b=>b.tones&&b.tones.includes(activeToneFilter)):BEERS;
  
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
    filtered.sort((a,b) => (b._mealMatch||0) - (a._mealMatch||0));
  }

  app.innerHTML=`<div class="container" style="padding:28px 20px 60px">
<div class="section-tag">Каталог</div>
<h2 class="section-title">Все <span class="gold">5 брендов</span> Efes Kazakhstan</h2>
<p class="section-desc">Нажми на пиво — получишь полный профиль</p>

<div class="tone-filter-bar" id="tone-bar">
  <span class="tone-filter-label">Фильтр по тону:</span>
  ${TONE_FILTERS.map(t=>`<button class="tone-btn${activeToneFilter===t.id?' active':''}" onclick="setToneFilter('${t.id}')" style="${activeToneFilter===t.id?`background:${t.color};color:#fff;border-color:${t.color}`:''}">
    ${t.emoji} ${t.name}
  </button>`).join('')}
  ${activeToneFilter?`<button class="tone-btn tone-clear" onclick="setToneFilter(null)">✕ Сбросить</button>`:''}
</div>

${globalMeal ? `<div class="result-card" style="margin-bottom:20px;padding:16px;background:var(--cream);border-color:var(--gold)"><strong style="color:var(--accent)">🍽️ Текущее блюдо: ${globalMeal}</strong>. Пиво отсортировано по совместимости!</div>` : ''}

${filtered.length===0?`<div style="text-align:center;padding:48px;color:var(--muted)">Нет пива с таким тоном</div>`:`
<div class="tools-grid">${filtered.map(b=>`<div class="tool-card" onclick="flowSelections.beer='${b.id}';flowStep=2;flowMode='beer';renderStep()">
  ${globalMeal && b._mealMatch ? `<div class="match-badge match-high" style="position:absolute;top:12px;left:12px;font-size:11px;padding:4px 8px">🔥 ${b._mealMatch}% к еде</div>` : ''}
  <img src="${b.img}" alt="${b.name}" style="width:80px;height:auto;max-height:110px;object-fit:contain;border-radius:8px;margin-bottom:8px">
  <h3>${b.name}</h3>
  <p style="margin-bottom:8px;color:var(--muted);font-size:13px">${b.tagline}</p>
  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${(b.tones||[]).map(t=>{const tf=TONE_FILTERS.find(f=>f.id===t);return tf?`<span class="bridge-tag" style="background:${tf.color}18;border-color:${tf.color}33;color:${tf.color}">${tf.emoji} ${tf.name}</span>`:''}).join('')}</div>
  <div style="font-size:11px;color:var(--accent);font-weight:700">${b.style} · ${b.abv}% · IBU ${b.ibu}</div>
</div>`).join('')}</div>`}
</div>`;
}
window.setToneFilter=function(id){activeToneFilter=id;renderCatalog();};

// ═══ AI SOMMELIER ═══
// Persistent guest memory across sessions
let guestProfile = JSON.parse(localStorage.getItem('ft_guest_profile') || '{"name":"","company":"","friends":[],"likes":[],"dislikes":[],"meals":[],"occasions":[]}');
function saveGuestProfile() { localStorage.setItem('ft_guest_profile', JSON.stringify(guestProfile)); }
function buildGuestContext() {
  let ctx = '';
  if(guestProfile.name) ctx += `Имя гостя: ${guestProfile.name}. `;
  if(guestProfile.company) ctx += `Компания/заведение: ${guestProfile.company}. `;
  if(guestProfile.friends.length) ctx += `Друзья/компания: ${guestProfile.friends.join(', ')}. `;
  if(guestProfile.likes.length) ctx += `Любит: ${guestProfile.likes.join(', ')}. `;
  if(guestProfile.dislikes.length) ctx += `Не любит: ${guestProfile.dislikes.join(', ')}. `;
  if(guestProfile.meals.length) ctx += `Ели раньше: ${guestProfile.meals.join(', ')}. `;
  if(guestProfile.occasions.length) ctx += `Поводы: ${guestProfile.occasions.join(', ')}. `;
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

const CHAT_SUGGESTIONS=[
  [{text:'🍖 К шашлыку',msg:'Подберите пиво к шашлыку из баранины'},{text:'🥘 К бешбармаку',msg:'Что порекомендуете к бешбармаку?'},{text:'🍣 К суши',msg:'Какое пиво подходит к суши и сашими?'},{text:'🍫 Тёмное пиво',msg:'Расскажите про тёмные сорта пива'},{text:'🍋 Лёгкое и свежее',msg:'Хочу что-то лёгкое и цитрусовое'},{text:'🏆 Лучший выбор',msg:'Какое пиво из Efes Kazakhstan вы рекомендуете для ресторана?'}],
  [{text:'Вкусовая пирамида',msg:'Расскажи про вкусовую пирамиду этого пива'},{text:'Мосты вкуса',msg:'Объясни мосты вкуса между пивом и блюдом'},{text:'Другие блюда',msg:'К каким ещё блюдам подходит?'},{text:'Температура подачи',msg:'При какой температуре лучше подавать?'}]
];
let suggIdx=0;

function parseBeerFromReply(text){
  const m=text.match(/BEER:(\w+)/);
  if(!m)return{text,beer:null};
  const beer=BEERS.find(b=>b.id===m[1]);
  return{text:text.replace(/BEER:\w+/,'').trim(),beer};
}

function beerCardHTML(beer){
  if(!beer)return '';
  return `<div class="chat-beer-card" onclick="flowSelections.beer='${beer.id}';flowStep=2;flowMode='beer';renderStep()" title="Открыть профиль">
  <img src="${beer.img}" alt="${beer.name}">
  <div class="chat-beer-info">
    <div class="chat-beer-name">${beer.name}</div>
    <div class="chat-beer-meta">${beer.style} · ${beer.abv}% · IBU ${beer.ibu}</div>
    <div class="chat-beer-notes">${beer.notes.slice(0,3).map(n=>`${n.e} ${n.n}`).join(' · ')}</div>
    <div class="chat-beer-cta">Открыть профиль →</div>
  </div>
</div>`;}

function renderAI(){
  if(!chatHistory.length){
    const name = guestProfile.name;
    const greeting = name
      ? `${name}, рад снова тебя видеть! 🍺 Что сегодня на столе? С кем пришёл — те же друзья или новая компания?`
      : `Привет! Я Макс, твой персональный сомелье FlavorTree 🍺\n\nМеня зовут Макс — помогаю подобрать идеальное пиво под любой повод и любое блюдо. Кстати, как тебя зовут? И с кем сегодня — с друзьями, коллегами, или сам по себе? 😊`;
    chatHistory=[{role:'bot',text:greeting}];
  }
  renderChat();
}

function renderChat(){
  const sugg=CHAT_SUGGESTIONS[suggIdx]||CHAT_SUGGESTIONS[0];
  app.innerHTML=`<div class="container"><div class="ai-section">
<div style="text-align:center;margin-bottom:24px">
  <div class="section-tag">🤖 AI-Сомелье FlavorTree</div>
  <h2 class="section-title">Персональный <span class="gold">сомелье</span></h2>
  <p style="color:var(--muted);font-size:15px;max-width:500px;margin:8px auto 0">Подбор пива по вкусовым профилям, гастрономическим сочетаниям и принципам сенсорного анализа</p>
</div>
<div class="chat-container">
<div class="chat-messages" id="chat-msgs">${chatHistory.map(m=>{
  const parsed=m.role==='bot'?parseBeerFromReply(m.text):{text:m.text,beer:null};
  return `<div class="chat-msg ${m.role}">${parsed.text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}${parsed.beer?beerCardHTML(parsed.beer):''}</div>`;
}).join('')}</div>
<div class="chat-input-row"><input class="chat-input" id="chat-in" placeholder="Опишите блюдо или вкусовые предпочтения..." onkeydown="if(event.key==='Enter')sendMsg()"><button class="chat-send" onclick="sendMsg()">→</button></div>
</div>
<div class="chat-suggestions" id="chat-sugg">${sugg.map(s=>`<button class="sugg-btn" onclick="sendMsg('${s.msg}')">${s.text}</button>`).join('')}</div>
</div></div>`;
  const msgs=document.getElementById('chat-msgs');
  if(msgs)msgs.scrollTop=msgs.scrollHeight;
}

window.sendMsg=async function(preset){
  const input=document.getElementById('chat-in');
  const msg=preset||(input&&input.value.trim());
  if(!msg)return;
  chatHistory.push({role:'user',text:msg});
  T.chats++;track('ai_chat',msg);
  if(input)input.value='';
  suggIdx=chatHistory.length>3?1:0;
  renderChat();
  const msgs=document.getElementById('chat-msgs');
  msgs.innerHTML+='<div class="chat-msg bot" style="opacity:.5">Макс думает... 🍺</div>';
  msgs.scrollTop=msgs.scrollHeight;

  // Extract info from user messages into guestProfile
  const ml=msg.toLowerCase();
  if(ml.match(/меня зовут|я ([а-яёa-z]+)|мое имя/i)){const m=msg.match(/(?:меня зовут|мое имя|я)\s+([А-ЯЁа-яёA-Za-z]+)/i);if(m&&m[1].length>2){guestProfile.name=m[1];saveGuestProfile();}}
  if(ml.includes('друз')||ml.includes('компани')){const m=msg.match(/(\d+)\s+(?:друз|человек|чел)/);if(m)guestProfile.friends=['компания '+m[1]+' человек'];else if(!guestProfile.friends.length)guestProfile.friends=['друзья'];saveGuestProfile();}
  if(ml.match(/люблю|нравится|обожаю/)){guestProfile.likes.push(msg.slice(0,60));saveGuestProfile();}
  if(ml.match(/не люблю|не нравится|терпеть не|горечь не|горькое не/)){guestProfile.dislikes.push(msg.slice(0,60));saveGuestProfile();}
  if(globalMeal&&!guestProfile.meals.includes(globalMeal)){guestProfile.meals.push(globalMeal);saveGuestProfile();}

  const guestCtx = buildGuestContext();
  const mealCtx = globalMeal ? `Гость сейчас ест: ${globalMeal}. ` : '';
  const fullSystem = BARTENDER_PROMPT + '\n\n=== ПРОФИЛЬ ГОСТЯ (используй в ответах!) ===\n' + (guestCtx||'Пока не знаем — узнай имя и повод!') + mealCtx;

  try{
    const key=OPENROUTER_KEY||localStorage.getItem('ft_api_key')||'';
    if(!key){chatHistory.push({role:'bot',text:localMatch(msg)});renderChat();return}
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'http://localhost:3001','X-Title':'FlavorTree'},
      body:JSON.stringify({model:'google/gemini-2.0-flash-001',messages:[{role:'system',content:fullSystem},...chatHistory.slice(-20).map(m=>({role:m.role==='bot'?'assistant':'user',content:m.text}))],max_tokens:450})
    });
    const d=await r.json();
    const txt=d.choices?.[0]?.message?.content;
    if(txt){chatHistory.push({role:'bot',text:txt})}
    else{chatHistory.push({role:'bot',text:localMatch(msg)});}
  }catch(e){
    chatHistory.push({role:'bot',text:localMatch(msg)});
  }
  renderChat();
};

function localMatch(msg){const l=msg.toLowerCase();
for(const b of BEERS)for(const f of b.foods)if(l.includes(f.dish.toLowerCase().split(' ')[0]))return `🍺 К **${f.dish}** → **${b.name}** (${f.match}%)\n\n${f.why}\n\nМосты вкуса: ${f.bridges.join(', ')}`;
for(const b of BEERS)if(l.includes(b.name.toLowerCase().split(' ')[0]))return `${b.emoji} **${b.name}** — ${b.desc}\n\nНоты: ${b.notes.map(n=>n.e+' '+n.n+' '+n.i+'%').join(', ')}\n\nБлюда: ${b.foods.map(f=>f.em+' '+f.dish).join(', ')}`;
if(l.match(/цитрус|лёгк|легк|свеж/))return '🍺 **Efes Pilsener** — цитрус 85%, трава 60%. К салатам, рыбе, шашлыку.';
if(l.match(/тёмн|темн|сладк|шоколад|карамел/))return '🐐 **Kozel Тёмное** — карамель 88%, шоколад 50%. К гуляшу, фондану, утке.';
if(l.match(/азиат|остр|рис|суши|вок/))return '🐒 **Wùkōng Jū** — рисовый лагер. Минимальная горечь. К дим-самам, Пад Тай, сашими.';
if(l.match(/бешбармак|манты|плов|казах/))return '🏚️ **Старый Мельник** — три хмеля. Мягкость для казахской кухни. К бешбармаку, мантам.';
if(l.match(/друз|компани|вечер|попить|что взять|что заказ/))return `🍻 **С друзьями — берите на выбор:**\n\n🍺 **Efes Pilsener** — универсальный хит, к шашлыку\n🐐 **Kozel Тёмное** — для тех кто хочет чего-то особенного\n🍻 **Кружка Свежего** — лёгкое и мягкое, всем зайдёт\n\nВозьмите микс — каждый найдёт своё!`;
return `🍺 Я знаю 5 пив:\n${BEERS.map(b=>b.emoji+' **'+b.name+'** — '+b.tagline).join('\n')}\n\nОпиши что едите или какой вкус хочется!`}

// ═══ TOOLS ═══
function renderTools(){app.innerHTML=`<div class="container"><div class="tools-section"><div class="section-tag">Инструменты</div><h2 class="section-title">Полезные <span class="gold">инструменты</span></h2><div class="tools-grid">
<div class="tool-card" onclick="navigate('lexicon')"><div class="tool-icon">📖</div><h3>FlavorActiV Лексикон</h3><p>122 дескриптора вкуса пива (ASBC/EBC)</p></div>
<div class="tool-card" onclick="navigate('ai')"><div class="tool-icon">🤖</div><h3>AI Сомелье</h3><p>Подбор пива по текстовому описанию</p></div>
<div class="tool-card" onclick="navigate('catalog')"><div class="tool-icon">📊</div><h3>Вкусовые профили</h3><p>Разбор нот каждого из 5 брендов</p></div>
<div class="tool-card" onclick="navigate('tinder')"><div class="tool-icon">🔥</div><h3>Tinder Tasting</h3><p>Свайп-тест для быстрого разбора вкусов</p></div>
<div class="tool-card" onclick="showApi()"><div class="tool-icon">🔑</div><h3>API Ключ</h3><p>OpenRouter для AI-сомелье</p></div>
<div class="tool-card" onclick="navigate('admin')"><div class="tool-icon">📊</div><h3>Админка</h3><p>Аналитика и трекинг пользователей</p></div>
</div></div></div>`}
window.showApi=function(){const k=localStorage.getItem('ft_api_key')||'';app.innerHTML=`<div class="container" style="padding-top:32px"><button class="step-back" onclick="navigate('tools')">← Назад</button><h2 class="section-title" style="margin-top:12px">🔑 API Ключ</h2><p class="section-desc">openrouter.ai ключ для AI</p><div class="result-card"><input id="api-key-input" type="password" value="${k}" placeholder="sk-or-..." style="width:100%;padding:12px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:13px;font-family:var(--body);margin-bottom:10px"><button class="btn-primary" onclick="localStorage.setItem('ft_api_key',document.getElementById('api-key-input').value);alert('Сохранено!')">Сохранить</button></div></div>`};

function renderLexicon(){const F=[{n:'Alcoholic',r:'Алкогольный',c:'0110',g:'Эстеры'},{n:'Spicy',r:'Пряный',c:'0111',g:'Фенолы'},{n:'Isoamyl Acetate',r:'Банан/Груша',c:'0131',g:'Эстеры'},{n:'Geraniol',r:'Цветочный хмель',c:'0162',g:'Хмель'},{n:'Kettle Hop',r:'Котловый хмель',c:'0171',g:'Хмель'},{n:'Hop Oil',r:'Хмелевое масло',c:'0173',g:'Хмель'},{n:'Freshly Cut Grass',r:'Свежая трава',c:'0231',g:'Растительные'},{n:'Grainy',r:'Зерновой',c:'0310',g:'Зерновые'},{n:'Malty',r:'Солодовый',c:'0320',g:'Зерновые'},{n:'Caramel',r:'Карамель',c:'0410',g:'Обжарка'},{n:'Burnt',r:'Жжёный',c:'0420',g:'Обжарка'},{n:'Smoky',r:'Дымный',c:'0423',g:'Обжарка'},{n:'Diacetyl',r:'Диацетил',c:'0620',g:'Жирные кислоты'},{n:'H2S',r:'Сероводород',c:'0721',g:'Серные'},{n:'DMS',r:'Варёная кукуруза',c:'0732',g:'Серные'},{n:'Bitter',r:'Горький',c:'1200',g:'Базовые'},{n:'Sweet',r:'Сладкий',c:'1000',g:'Базовые'},{n:'Sour',r:'Кислый',c:'0920',g:'Базовые'},{n:'Carbonation',r:'Газация',c:'1360',g:'Текстура'}];
app.innerHTML=`<div class="container" style="padding:28px 20px 60px"><button class="step-back" onclick="navigate('tools')">← Назад</button><div class="section-tag">FlavorActiV</div><h2 class="section-title">Beer Flavour <span class="gold">Lexicon</span></h2><p class="section-desc">Стандарты ASBC / EBC</p><div class="result-card" style="overflow-x:auto"><table class="lexicon-table"><tr><th>Код</th><th>English</th><th>Русский</th><th>Группа</th></tr>${F.map(f=>`<tr><td style="font-family:monospace;color:var(--accent)">${f.c}</td><td>${f.n}</td><td>${f.r}</td><td><span class="bridge-tag">${f.g}</span></td></tr>`).join('')}</table></div></div>`}

// ═══ ADMIN PANEL ═══
function renderAdmin(){
const elapsed=Math.round((Date.now()-T.start)/1000);
const mins=Math.floor(elapsed/60),secs=elapsed%60;
const sessCount=T.sessions.length;
const today=T.sessions.filter(s=>Date.now()-s.ts<86400000).length;
const viewsArr=Object.entries(T.views).sort((a,b)=>b[1]-a[1]);
const pairCount=T.pairings.length;
app.innerHTML=`<div class="container" style="padding:28px 20px 60px">
<button class="step-back" onclick="navigate('tools')">← Назад</button>
<div class="section-tag">Админка</div>
<h2 class="section-title">Аналитика <span class="gold">FlavorTree</span></h2>
<p class="section-desc">Данные текущей сессии и локальная история</p>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
<div class="result-card" style="text-align:center;padding:18px"><div style="font-family:var(--heading);font-size:28px;font-weight:700">${mins}:${String(secs).padStart(2,'0')}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Время на сайте</div></div>
<div class="result-card" style="text-align:center;padding:18px"><div style="font-family:var(--heading);font-size:28px;font-weight:700">${T.clicks.length}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Кликов</div></div>
<div class="result-card" style="text-align:center;padding:18px"><div style="font-family:var(--heading);font-size:28px;font-weight:700">${pairCount}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Подборов</div></div>
<div class="result-card" style="text-align:center;padding:18px"><div style="font-family:var(--heading);font-size:28px;font-weight:700">${T.chats}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">AI запросов</div></div>
</div>
<div class="result-card"><h3 style="font-family:var(--heading);font-size:16px;margin-bottom:10px">Просмотры страниц</h3>
<div class="notes-list">${viewsArr.map(([k,v])=>`<div class="note-row"><span class="note-name-label" style="width:120px">${k}</span><div class="note-bar-bg"><div class="note-bar-fill" style="width:${Math.min(100,v*10)}%;background:var(--accent)"></div></div><span class="note-pct">${v}</span></div>`).join('')||'<div style="color:var(--muted);font-size:12px">Пока нет данных</div>'}
</div></div>
<div class="result-card" style="margin-top:12px"><h3 style="font-family:var(--heading);font-size:16px;margin-bottom:10px">История сессий</h3>
<div style="font-size:12px;color:var(--muted)"><strong>${sessCount}</strong> всего · <strong>${today}</strong> за 24ч</div>
<div style="max-height:200px;overflow-y:auto;margin-top:8px">${T.sessions.slice(-10).reverse().map(s=>`<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--muted)">${new Date(s.ts).toLocaleString('ru')}</div>`).join('')}</div>
</div>
<div class="result-card" style="margin-top:12px"><h3 style="font-family:var(--heading);font-size:16px;margin-bottom:10px">Последние клики</h3>
<div style="max-height:200px;overflow-y:auto">${T.clicks.slice(-15).reverse().map(c=>`<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--muted)"><strong>${c.type}</strong> ${c.data||''} <span style="float:right">${new Date(c.ts).toLocaleTimeString('ru')}</span></div>`).join('')||'<div style="color:var(--muted);font-size:12px">Пока нет</div>'}
</div></div>
</div>`;
setTimeout(()=>{if(currentPage==='admin')renderAdmin()},1000);
}
window.renderAdmin=renderAdmin;

// ═══ LEARN ═══
const QUIZZES=[
  {id:'q1',beerId:'efes',q:'Какой стиль — Efes Pilsener?',opts:['Dark Lager','Rice Lager','Pilsener','Stout'],ans:2,xp:15},
  {id:'q2',beerId:'efes',q:'IBU у Efes Pilsener?',opts:['12','18','22','30'],ans:2,xp:10},
  {id:'q3',beerId:'kozel',q:'Что доминирует во вкусе Kozel Тёмного?',opts:['Цитрус','Карамель','Рис','Хмель'],ans:1,xp:15},
  {id:'q4',beerId:'kozel',q:'Крепость Kozel Тёмного?',opts:['3.7%','4.5%','5.0%','6.0%'],ans:0,xp:10},
  {id:'q5',beerId:'wukong',q:'Из чего варят Wùkōng Jū?',opts:['Пшеница','Рис','Кукуруза','Овёс'],ans:1,xp:15},
  {id:'q6',beerId:'wukong',q:'IBU у Wùkōng Jū?',opts:['6','12','22','28'],ans:1,xp:10},
  {id:'q7',beerId:'kruzhka',q:'Слоган «Кружки Свежего»?',opts:['Лёгкость Азии','Три хмеля','Мягкость каждого дня','Тот самый вкус'],ans:2,xp:10},
  {id:'q8',beerId:'melnik',q:'Сколько сортов хмеля в «Старом Мельнике»?',opts:['1','2','3','4'],ans:2,xp:15},
  {id:'q9',beerId:'efes',q:'К какому блюду Efes подходит лучше?',opts:['Фондан','Шашлык из баранины','Дим-самы','Гуляш'],ans:1,xp:20},
  {id:'q10',beerId:'kozel',q:'Kozel Тёмное лучше всего с?',opts:['Сашими','Пад Тай','Гуляш по-чешски','Брускетта'],ans:2,xp:20},
];

window.renderLearn=function(){
  const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');
  const done=JSON.parse(localStorage.getItem('ft_quiz_done')||'[]');
  const xp=p.xp||0;
  const level=xp<50?'🌱 Новичок':xp<150?'🍺 Любитель':xp<300?'🥂 Ценитель':xp<500?'🎓 Сомелье':'👑 Мастер';
  app.innerHTML=`<div class="container" style="padding:28px 20px 80px">
<div class="section-tag">📚 Обучение</div>
<h2 class="section-title">Узнай о <span class="gold">пиве больше</span></h2>
<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:28px;display:flex;align-items:center;gap:16px">
  <div style="font-size:36px">${level.split(' ')[0]}</div>
  <div style="flex:1">
    <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:4px">${level.split(' ').slice(1).join(' ')}</div>
    <div style="background:var(--cream);border-radius:4px;height:8px;overflow:hidden"><div style="width:${Math.min(100,(xp%150)/1.5)}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:4px;transition:width .6s"></div></div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">${xp} XP · ${done.length}/${QUIZZES.length} вопросов</div>
  </div>
</div>
<div class="tools-grid">${QUIZZES.map((q,i)=>`<div class="tool-card${done.includes(q.id)?' quiz-done':''}" onclick="startQuiz(${i})">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:22px">${BEERS.find(b=>b.id===q.beerId)?.emoji||'🍺'}</span>
    <span style="font-size:11px;font-weight:700;color:${done.includes(q.id)?'#16a34a':'var(--accent)'}">+${q.xp} XP${done.includes(q.id)?' ✓':''}</span>
  </div>
  <h3 style="font-size:14px;margin-bottom:4px;line-height:1.4">${q.q}</h3>
  <div style="font-size:11px;color:var(--muted)">${BEERS.find(b=>b.id===q.beerId)?.name||''}</div>
</div>`).join('')}</div></div>`;
};

window.startQuiz=function(idx){
  const q=QUIZZES[idx];
  function renderQ(selected=null){
    app.innerHTML=`<div class="container" style="padding:40px 20px 80px;max-width:640px">
<button class="step-back" onclick="navigate('learn')" style="margin-bottom:24px">← Обучение</button>
<div class="section-tag">${BEERS.find(b=>b.id===q.beerId)?.name||''}</div>
<h2 class="section-title" style="font-size:24px;margin-bottom:24px">${q.q}</h2>
<div style="display:grid;gap:12px">
${q.opts.map((o,i)=>{
  let border='var(--border)',bg='#fff';
  if(selected!==null){if(i===q.ans){border='#16a34a';bg='rgba(34,197,94,0.08)';}else if(i===selected){border='#e74c3c';bg='rgba(231,76,60,0.08)';}}
  return `<button onclick="answerQuiz(${idx},${i})" style="text-align:left;padding:16px 20px;background:${bg};border:2px solid ${border};border-radius:var(--radius-sm);font-size:15px;font-family:var(--body);cursor:pointer;transition:all .2s" ${selected!==null?'disabled':''}>${o}</button>`;
}).join('')}
</div>
${selected!==null?`<div style="margin-top:20px;padding:16px 20px;border-radius:var(--radius-sm);background:${selected===q.ans?'rgba(34,197,94,0.08)':'rgba(231,76,60,0.08)'};border:1px solid ${selected===q.ans?'#16a34a':'#e74c3c'}">
<div style="font-weight:700;color:${selected===q.ans?'#16a34a':'#e74c3c'}">${selected===q.ans?'✓ Правильно! +'+q.xp+' XP':'✗ Неверно. Правильный: '+q.opts[q.ans]}</div>
</div>
<button class="btn-primary" style="margin-top:16px;width:100%" onclick="navigate('learn')">← К вопросам</button>`:''}
</div>`;
  }
  renderQ();
  window.answerQuiz=function(qIdx,sel){
    const quiz=QUIZZES[qIdx];
    const done=JSON.parse(localStorage.getItem('ft_quiz_done')||'[]');
    if(!done.includes(quiz.id)){
      done.push(quiz.id);
      localStorage.setItem('ft_quiz_done',JSON.stringify(done));
      if(sel===quiz.ans){const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');p.xp=(p.xp||0)+quiz.xp;localStorage.setItem('ft_profile',JSON.stringify(p));}
    }
    renderQ(sel);
  };
};

// ═══ PROFILE ═══
window.renderProfile=function(){
  const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');
  const done=JSON.parse(localStorage.getItem('ft_quiz_done')||'[]');
  const xp=p.xp||0;
  const lvl=xp<50?['🌱','Новичок']:xp<150?['🍺','Любитель']:xp<300?['🥂','Ценитель']:xp<500?['🎓','Сомелье']:['👑','Мастер'];
  const name=p.name||'Гость';const avatar=p.avatar||'🍺';
  app.innerHTML=`<div class="container" style="padding:28px 20px 80px;max-width:680px">
<div class="section-tag">👤 Профиль</div>
<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:32px;margin-bottom:20px;display:flex;gap:24px;align-items:flex-start">
  <div style="flex-shrink:0;text-align:center">
    <div id="ava" style="width:80px;height:80px;border-radius:50%;background:var(--cream);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:40px;cursor:pointer;overflow:hidden" onclick="document.getElementById('ava-file').click()">${avatar.startsWith('data:')?`<img src="${avatar}" style="width:100%;height:100%;object-fit:cover">`:avatar}</div>
    <input type="file" id="ava-file" accept="image/*" style="display:none" onchange="uploadAva(event)">
    <div style="font-size:11px;color:var(--muted);margin-top:4px">Нажми для смены</div>
  </div>
  <div style="flex:1">
    <input id="pname" value="${name}" style="font-family:var(--heading);font-size:26px;font-weight:600;border:none;border-bottom:2px solid var(--border);background:none;width:100%;margin-bottom:12px;padding-bottom:4px;outline:none;color:var(--text)" placeholder="Твоё имя" onchange="saveName(this.value)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:26px">${lvl[0]}</span><div><div style="font-weight:700;color:var(--accent)">${lvl[1]}</div><div style="font-size:12px;color:var(--muted)">${xp} XP</div></div></div>
    <div style="background:var(--cream);border-radius:4px;height:8px;overflow:hidden"><div style="width:${Math.min(100,(xp%150)/1.5)}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:4px"></div></div>
  </div>
</div>
<div class="result-card" style="margin-bottom:16px">
  <h3 style="font-family:var(--heading);font-size:20px;margin-bottom:14px">🏅 Достижения</h3>
  <div style="display:flex;flex-wrap:wrap;gap:8px">
    ${done.length>=1?'<span class="bridge-tag">🎓 Первый квиз</span>':''}
    ${done.length>=5?'<span class="bridge-tag">📚 Знаток</span>':''}
    ${done.length>=QUIZZES.length?'<span class="bridge-tag">👑 Эксперт</span>':''}
    ${xp>=100?'<span class="bridge-tag">⚡ 100 XP</span>':''}
    ${xp>=300?'<span class="bridge-tag">🔥 300 XP</span>':''}
    ${T.pairings.length>=3?'<span class="bridge-tag">🍺 Бармен</span>':''}
    ${T.chats>=5?'<span class="bridge-tag">💬 Болтун</span>':''}
    ${done.length===0?'<span style="color:var(--muted);font-size:13px">Пройди квизы чтобы получить бейджи!</span>':''}
  </div>
</div>
<div class="result-card" style="margin-bottom:16px">
  <h3 style="font-family:var(--heading);font-size:20px;margin-bottom:14px">📝 Мои заметки и отзывы</h3>
  <div id="profile-reviews-list">${renderProfileReviews()}</div>
</div>
<button class="btn-primary" style="width:100%" onclick="navigate('learn')">📚 Пройти квизы</button>
</div>`;
};
function renderProfileReviews() {
  const prof = JSON.parse(localStorage.getItem('ft_profile')||'{}');
  const allRevs = JSON.parse(localStorage.getItem('ft_reviews')||'{}');
  let myRevs = [];
  for (const beerId in allRevs) {
    allRevs[beerId].forEach(r => {
      if (r.author === prof.name || (prof.name === undefined && r.author === 'Аноним')) {
        myRevs.push({beerId, ...r});
      }
    });
  }
  if (myRevs.length === 0) return '<p style="color:var(--muted);font-size:13px">Вы еще не оставляли заметок. Перейдите в каталог и оцените пиво!</p>';
  myRevs.sort((a,b)=>b.ts-a.ts);
  return myRevs.map(r=>{
    const beer = BEERS.find(b=>b.id===r.beerId);
    return `<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer" onclick="flowSelections.beer='${r.beerId}';flowStep=2;flowMode='beer';renderStep()">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <strong style="font-size:14px">${beer?beer.name:'Пиво'}</strong>
        <span style="color:var(--gold);font-size:12px">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:4px 0">${r.text}</p>
      <div style="font-size:11px;color:var(--border)">${new Date(r.ts).toLocaleDateString('ru')}</div>
    </div>`;
  }).join('');
}
window.saveName=function(v){const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');p.name=v;localStorage.setItem('ft_profile',JSON.stringify(p));};
window.uploadAva=function(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');p.avatar=ev.target.result;localStorage.setItem('ft_profile',JSON.stringify(p));renderProfile();};r.readAsDataURL(f);};

// ═══ REGISTRATION ═══
window.renderRegister=function(){
  const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');
  if(p.registered){navigate('profile');return;}
  app.innerHTML=`<div class="container" style="padding:40px 20px 80px;max-width:520px">
<div class="section-tag">🚀 Регистрация</div>
<h2 class="section-title">Создай <span class="gold">профиль</span></h2>
<p class="section-desc">Сохраняй отзывы, зарабатывай XP и отслеживай прогресс</p>
<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:28px">
<label style="font-size:13px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">Имя</label>
<input id="reg-name" placeholder="Как тебя зовут?" style="width:100%;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:var(--body);margin-bottom:16px;outline:none">
<label style="font-size:13px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">Email</label>
<input id="reg-email" type="email" placeholder="email@example.com" style="width:100%;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:var(--body);margin-bottom:16px;outline:none">
<label style="font-size:13px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">Возраст</label>
<select id="reg-age" style="width:100%;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:var(--body);margin-bottom:16px;outline:none;background:#fff">
<option value="">Подтверди возраст</option><option value="18-25">18–25</option><option value="26-35">26–35</option><option value="36-45">36–45</option><option value="46+">46+</option></select>
<label style="font-size:13px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">Любимый стиль пива</label>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">${BEERS.map(b=>`<button class="reg-style-btn bridge-tag" data-id="${b.id}" onclick="this.classList.toggle('reg-selected');this.style.background=this.classList.contains('reg-selected')?'var(--accent-light)':''">${b.emoji} ${b.name}</button>`).join('')}</div>
<div id="reg-error" style="color:#e74c3c;font-size:13px;margin-bottom:10px;display:none"></div>
<button class="btn-primary" style="width:100%" onclick="doRegister()">Создать профиль →</button>
</div>
<p style="text-align:center;margin-top:16px;font-size:13px;color:var(--muted)">Уже есть профиль? <a href="#" onclick="navigate('profile');return false" style="color:var(--accent)">Войти</a></p>
</div>`;
};
window.doRegister=function(){
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const age=document.getElementById('reg-age').value;
  const err=document.getElementById('reg-error');
  if(!name){err.textContent='Введи имя';err.style.display='block';return;}
  if(!email||!email.includes('@')){err.textContent='Введи корректный email';err.style.display='block';return;}
  if(!age){err.textContent='Подтверди возраст';err.style.display='block';return;}
  const favs=Array.from(document.querySelectorAll('.reg-selected')).map(e=>e.dataset.id);
  const p=JSON.parse(localStorage.getItem('ft_profile')||'{}');
  p.name=name;p.email=email;p.age=age;p.favBeers=favs;p.registered=true;p.registeredAt=Date.now();
  if(!p.xp)p.xp=0;
  localStorage.setItem('ft_profile',JSON.stringify(p));
  navigate('profile');
};

// ═══ REVIEWS ═══
let pendingStarRating=0;
window.setStarRating=function(v){
  pendingStarRating=v;
  document.querySelectorAll('#star-input .star').forEach(s=>{
    s.style.color=parseInt(s.dataset.v)<=v?'var(--gold)':'var(--border)';
  });
};
function getReviews(beerId){
  const all=JSON.parse(localStorage.getItem('ft_reviews')||'{}');
  return all[beerId]||[];
}
function renderReviews(beerId){
  const revs=getReviews(beerId);
  if(!revs.length)return '<p style="color:var(--muted);font-size:14px">Пока нет отзывов. Будь первым!</p>';
  const avg=(revs.reduce((s,r)=>s+r.stars,0)/revs.length).toFixed(1);
  return `<div style="margin-bottom:16px"><span style="font-family:var(--heading);font-size:32px;font-weight:700">${avg}</span> <span style="color:var(--gold);font-size:20px">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5-Math.round(avg))}</span> <span style="font-size:13px;color:var(--muted)">${revs.length} отзывов</span></div>`+
  revs.slice(-6).reverse().map(r=>`<div class="result-card" style="padding:18px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <strong style="font-size:15px">${r.author||'Аноним'}</strong>
      <span style="color:var(--gold);font-size:14px">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
    </div>
    <p style="font-size:14px;color:var(--muted);line-height:1.6">${r.text}</p>
    <div style="font-size:11px;color:var(--border);margin-top:6px">${new Date(r.ts).toLocaleDateString('ru')}</div>
  </div>`).join('');
}
window.submitReview=function(beerId){
  const text=document.getElementById('review-text').value.trim();
  if(!text||!pendingStarRating){alert('Напиши отзыв и поставь оценку');return;}
  const prof=JSON.parse(localStorage.getItem('ft_profile')||'{}');
  const all=JSON.parse(localStorage.getItem('ft_reviews')||'{}');
  if(!all[beerId])all[beerId]=[];
  all[beerId].push({author:prof.name||'Аноним',stars:pendingStarRating,text,ts:Date.now()});
  localStorage.setItem('ft_reviews',JSON.stringify(all));
  pendingStarRating=0;
  const el=document.getElementById('reviews-section');
  if(el)el.innerHTML=renderReviews(beerId);
  document.getElementById('review-text').value='';
  document.querySelectorAll('#star-input .star').forEach(s=>s.style.color='var(--border)');
};

// ═══ TINDER TASTING ═══
const TINDER_DATA = {
  efes: {
    name: 'Efes Pilsener',
    q: [
      {e:'🍋', n:'Цитрус', q:'Чувствуешь лимонную цедру?', h:'Легкая цитрусовая кислинка в самом первом глотке'},
      {e:'🍞', n:'Хлеб', q:'Слышишь аромат свежей хлебной корки?', h:'Плотная, сытная база от трех видов ячменного солода'},
      {e:'🌿', n:'Трава', q:'Ощущаешь травянистые тона хмеля?', h:'Тонкий благородный профиль немецкого хмеля Hallertau'},
      {e:'⚡', n:'Горечь', q:'Присутствует чистая, сухая горчинка в конце?', h:'Фирменное послевкусие пильзнера с уровнем горечи IBU 22'}
    ]
  },
  kozel: {
    name: 'Kozel Тёмное',
    q: [
      {e:'🍞', n:'Хлеб', q:'Чувствуешь аромат корочки ржаного хлеба?', h:'Характерный тон темного обжаренного солода'},
      {e:'🍯', n:'Карамель', q:'Ощущаешь мягкую карамельную сладость?', h:'Бархатистые сладкие оттенки без приторности'},
      {e:'☕', n:'Шоколад', q:'Слышишь тонкие нотки кофе или какао?', h:'Сложный глубокий аромат жженого ячменя'},
      {e:'🍦', n:'Сладость', q:'Есть мягкое, обволакивающее послевкусие?', h:'Питкое тело с деликатным сладковатым финишем'}
    ]
  },
  wukong: {
    name: 'Wùkōng Jū',
    q: [
      {e:'🌾', n:'Рис', q:'Чувствуешь легкие тона рисовой крупы?', h:'Чистый нейтральный профиль рисового лагера'},
      {e:'🌸', n:'Цветочный', q:'Ощущаешь цветочный аромат жасмина?', h:'Тонкие жасминовые оттенки китайского хмеля'},
      {e:'🍋', n:'Фрукты', q:'Слышишь едва уловимые нотки фруктов?', h:'Свежие фруктовые эфиры на заднем плане'},
      {e:'🧊', n:'Мягкость', q:'Послевкусие чистое, без капли горечи?', h:'Максимально питкий лагер с минимальной горечью IBU 12'}
    ]
  },
  kruzhka: {
    name: 'Кружка Свежего',
    q: [
      {e:'🌾', n:'Солод', q:'Слышишь мягкий, чистый солодовый вкус?', h:'Классическая ячменная основа светлого лагера'},
      {e:'🍯', n:'Мёд', q:'Ощущаешь легкую медовую сладость?', h:'Сладковатый мягкий солодовый тон'},
      {e:'🌿', n:'Трава', q:'Чувствуешь легкие травянистые нотки хмеля?', h:'Едва заметный ароматный хмелевой шлейф'},
      {e:'🌊', n:'Свежесть', q:'Освежающее, супер-питкое послевкусие?', h:'Легкая летняя фильтрация для максимальной питкости'}
    ]
  },
  melnik: {
    name: 'Старый Мельник',
    q: [
      {e:'🍞', n:'Хлеб', q:'Ощущаешь плотный хлебный вкус?', h:'Богатый тон традиционной варки'},
      {e:'🌿', n:'Хмель', q:'Слышишь тройной хмелевой аромат?', h:'Три сорта хмеля, заданные по бочковой технологии'},
      {e:'🍯', n:'Мёд', q:'Есть мягкий медовый полутон во рту?', h:'Слегка сладковатый хмелевой оттенок'},
      {e:'🍺', n:'Мягкость', q:'Чувствуешь бархатистое, округлое тело?', h:'Мягкость, достигнутая бочковым брожением'}
    ]
  }
};

let currentTinderBeer = null;
let tinderIdx = 0;
let tinderAnswers = [];

window.renderTinder = function() {
  if (!currentTinderBeer) {
    app.innerHTML = `<div class="container" style="padding:28px 20px 80px">
      <button class="step-back" onclick="navigate('tools')">← Назад</button>
      <div class="section-tag">Дегустация</div>
      <h2 class="section-title">Tinder <span class="gold">Tasting</span></h2>
      <p class="section-desc">Выбери пиво, чтобы раскрыть его вкусовую ДНК с помощью интерактивных свайпов</p>
      
      <div class="beer-circles" style="margin-top:32px">
        ${BEERS.map(b => `
          <div class="beer-circle" onclick="startTinder('${b.id}')">
            <div class="beer-icon" style="background:${b.color}15;padding:0;overflow:hidden">
              <img src="${b.img}" alt="${b.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">
            </div>
            <div class="beer-name">${b.name}</div>
            <div class="beer-style-tag">${b.style}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
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
      localStorage.setItem('ft_profile', JSON.stringify(prof));
      
      app.innerHTML = `<div class="container" style="padding:40px 20px 80px;text-align:center;max-width:480px">
        <div style="font-size:72px;margin-bottom:16px">🏆</div>
        <div class="section-tag">Дегустация завершена</div>
        <h2 class="section-title" style="font-size:28px">Вкусовая ДНК раскрыта!</h2>
        <p class="section-desc">Ты успешно прошел интерактивный разбор <strong>${data.name}</strong>.</p>
        
        <div class="result-card" style="margin:24px 0;padding:24px;text-align:left;background:rgba(22,163,74,0.05);border-color:#16a34a">
          <div style="font-size:18px;font-weight:700;color:#16a34a;margin-bottom:8px">🎉 Результаты дегустации:</div>
          <div style="font-size:14px;color:var(--text);line-height:1.6">
            Распознано нот: <strong>${correctCount} из ${qList.length}</strong><br>
            Получено очков: <strong>+${xpEarned} XP</strong><br>
            Новый статус: <strong>${badgeName} 🏅</strong>
          </div>
        </div>
        
        <div style="display:flex;gap:12px;margin-top:24px">
          <button class="btn-primary" style="flex:1" onclick="resetTinder()">Еще разок</button>
          <button class="btn-secondary" style="flex:1" onclick="navigate('profile')">В профиль</button>
        </div>
      </div>`;
      
      setTimeout(() => {
        createCarbonationBubbles();
      }, 100);
      return;
    }
    
    const curQ = qList[tinderIdx];
    const nextQ = qList[tinderIdx + 1];
    
    app.innerHTML = `<div class="container" style="padding:28px 20px 80px;max-width:480px;text-align:center">
      <button class="step-back" onclick="resetTinder()" style="margin-bottom:16px">← Выбор пива</button>
      <div class="section-tag">${data.name} · Нота ${tinderIdx + 1}/${qList.length}</div>
      
      <div class="tinder-container">
        <div class="tinder-card-wrapper" id="tinder-card-wrapper">
          ${nextQ ? `
            <div class="tinder-card card-back">
              <span class="tinder-emoji">${nextQ.e}</span>
              <h3 class="tinder-question">${nextQ.q}</h3>
              <p class="tinder-hint">${nextQ.h}</p>
            </div>
          ` : ''}
          
          <div class="tinder-card" id="active-tinder-card">
            <div class="tinder-flash-like" id="flash-like"></div>
            <div class="tinder-flash-dislike" id="flash-dislike"></div>
            <span class="tinder-emoji">${curQ.e}</span>
            <div>
              <h3 class="tinder-question">${curQ.q}</h3>
              <p class="tinder-hint">${curQ.h}</p>
            </div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Свайпни или нажми кнопку</div>
          </div>
        </div>
        
        <div class="tinder-buttons">
          <button class="tinder-btn dislike" onclick="tinderAction(false)">✗</button>
          <button class="tinder-btn like" onclick="tinderAction(true)">✓</button>
        </div>
      </div>
    </div>`;
    
    setupTinderGestures();
  }
};

window.startTinder = function(beerId) {
  currentTinderBeer = beerId;
  tinderIdx = 0;
  tinderAnswers = [];
  track('start_tinder', beerId);
  renderTinder();
};

window.resetTinder = function() {
  currentTinderBeer = null;
  tinderIdx = 0;
  tinderAnswers = [];
  renderTinder();
};

window.tinderAction = function(val) {
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
  
  card.addEventListener('touchstart', dragStart, {passive: true});
  card.addEventListener('touchmove', dragMove, {passive: true});
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
    bubble.style.background = 'rgba(255, 191, 0, 0.4)';
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
