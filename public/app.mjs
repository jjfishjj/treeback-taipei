import { DEFAULT_WEIGHTS, GOAL, DISTRICTS, redistribute, rank, band, csvFor } from './model.mjs';
import { fieldworkPage, sourcesPage } from './content.mjs';

let weights = { ...DEFAULT_WEIGHTS };
let selected = '大同區';
let metric = 'TES';
let pilotOnly = false;
const baseline = rank();
const baseByName = new Map(baseline.map(d => [d.name, d]));
const f = n => n.toFixed(1);
const signed = n => `${n > .00001 ? '+' : ''}${Math.abs(n) < .00001 ? '0.0' : f(n)}`;
const glyph = n => n > 0 ? '↑' : n < 0 ? '↓' : '—';
const labels = { H: ['熱暴露', 'HEAT EXPOSURE', '夏季熱風險的情境代理值'], P: ['人口暴露', 'POPULATION', '生活圈人口密度的情境代理值'], V: ['熱脆弱度', 'VULNERABILITY', '長者與兒少需求的情境代理值'] };

const dashboard = document.getElementById('dashboard-view');
dashboard.innerHTML = `
  <div class="section-top"><div><p class="eyebrow">01 / WEIGHT EXPLORER</p><h2>你的選擇，如何改變優先序？</h2></div><button class="outline-btn" id="export-csv"><span aria-hidden="true">↓</span> 匯出此情境 CSV</button></div>
  <div class="lab-layout">
    <aside class="control-panel"><div class="panel-title"><h3>調整需求權重</h3><span class="small-tag">總和 100%</span></div><p class="muted small">拖曳一項，其他兩項按原比例重新分配。三項權重皆為情境設定。</p>
      <div class="weight-controls">${Object.entries(labels).map(([k,l]) => `<div class="weight-control"><div class="weight-label"><label for="weight-${k}"><span class="factor-letter factor-${k}">${k}</span> ${l[0]}</label><span class="weight-number" id="number-${k}">${weights[k]}<small>%</small></span></div><input type="range" min="0" max="100" step="1" id="weight-${k}" value="${weights[k]}" aria-describedby="weight-rule" style="--weight:${weights[k]}%"><p>${l[2]}</p></div>`).join('')}</div>
      <p id="weight-rule" class="rule-note">整數取捨後仍維持 100%；當其他兩項皆為 0%，剩餘權重均分。</p>
      <div class="preset-label">快速情境</div><div class="presets"><button data-preset="default" class="preset-btn active">基準 40 / 35 / 25</button><button data-preset="heat" class="preset-btn">熱風險優先</button><button data-preset="people" class="preset-btn">人口優先</button><button data-preset="vulnerable" class="preset-btn">脆弱度優先</button></div>
      <div class="goal-note"><span>固定樹冠目標（假設）</span><strong>${GOAL}<small>%</small></strong></div>
      <button class="reset-btn" id="reset-weights">↺ 回到基準權重</button>
      <div class="formula-card"><span class="eyebrow">MODEL / TreeBack 地方化提案</span><code>G = clip(1 − C / 24%, 0, 1)<br>S = wH·H + wP·P + wV·V<br>PPI = 100·G·(0.5 + 0.5·S)<br>TES = 100 − PPI</code><p>權重 w 以比例代入。<br>TES 越低，補植需求越高。<br>高 TES 不代表現況達標或無熱風險。</p></div>
    </aside>
    <div class="results-panel">
      <div class="summary-strip" id="summary-strip" aria-live="polite" aria-atomic="true"></div>
      <div class="ranking-card"><div class="chart-heading"><div><h3>12 區情境比較</h3><p class="muted small" id="chart-explainer"></p></div><div class="segmented" aria-label="圖表分數切換"><button data-metric="TES" aria-pressed="true" class="active">TES</button><button data-metric="PPI" aria-pressed="false">PPI</button></div></div><div class="chart-legend"><span><i class="legend-square"></i>目前情境</span><span><i class="legend-baseline"></i>基準權重</span><span class="legend-direction">依 TES 由低至高排序</span></div><div class="chart-scale"><span></span><div><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><span>較基準</span></div><div id="district-bars" class="district-bars"></div><p class="chart-footnote">點選行政區查看計算拆解。色帶為展示用：PPI ≥40 高、20–&lt;40 中、&lt;20 低。</p></div>
      <section class="detail-card" id="district-detail" aria-label="行政區計算拆解" aria-live="polite" aria-atomic="true"></section>
    </div>
  </div>
  <section class="comparison-section"><div class="section-top"><div><p class="eyebrow">02 / SCENARIO DATA</p><h2>看見數字背後的假設</h2></div><label class="pilot-filter"><input type="checkbox" id="pilot-only">只看大同與萬華</label></div><div class="table-wrap"><table><caption class="sr-only">12 行政區假設輸入與目前情境分數，依需求優先名次排序</caption><thead><tr><th scope="col">需求名次</th><th scope="col">行政區</th><th scope="col">C 假設</th><th scope="col">H</th><th scope="col">P</th><th scope="col">V</th><th scope="col">G 缺口</th><th scope="col">S 需求</th><th scope="col">TES</th><th scope="col">PPI</th><th scope="col">TES 差值</th><th scope="col">需求名次變化</th></tr></thead><tbody id="comparison-rows"></tbody></table></div><p class="muted small">排名 1 表示本情境需求最高，不是實測最差行政區。數值以完整精度計算，再四捨五入顯示。</p></section>
  <aside class="pilot-cta"><div><span class="eyebrow">FROM SCORE TO ACTION</span><h3>大同 × 萬華：先盤點，再談種植。</h3><p>60 個街段單側抽樣單位，12 個候選點有限現勘；不把區級分數當作街道證據。</p></div><button class="dark-btn" data-view="fieldwork">查看 48h 行動方案 ↗</button></aside>`;

document.getElementById('fieldwork-view').innerHTML = fieldworkPage;
document.getElementById('sources-view').innerHTML = sourcesPage;

function render() {
  const results = rank(weights);
  const average = results.reduce((s,d) => s+d.TES,0) / results.length;
  const averageBase = baseline.reduce((s,d) => s+d.TES,0)/baseline.length;
  const highCount = results.filter(d => d.PPI >= 40).length;
  document.getElementById('summary-strip').innerHTML = `<div><span>12 區 TES 簡單平均</span><strong>${f(average)}<small>/ 100</small></strong><em>${signed(average-averageBase)} 較基準 <span>· 非人口加權</span></em></div><div><span>高優先區（展示門檻）</span><strong>${highCount}<small>/ 12</small></strong><em>依 PPI ≥ 40 分計數</em></div><div><span>目前情境權重 H / P / V</span><strong class="weight-summary">${weights.H}<b>/</b>${weights.P}<b>/</b>${weights.V}</strong><em>總和 100% · 目標固定 24%</em></div>`;
  document.getElementById('chart-explainer').textContent = metric === 'TES' ? 'TES 越低，需求越高；色帶代表需求程度。' : 'PPI 越高，需求越高；與 TES 互補至 100 分。';
  document.getElementById('district-bars').innerHTML = results.map(d => {
    const b = baseByName.get(d.name);
    const delta = d[metric]-b[metric];
    return `<button class="bar-row ${selected===d.name?'selected':''}" data-district="${d.name}" aria-pressed="${selected === d.name}" aria-label="${d.name} ${metric} ${f(d[metric])}，較基準${signed(delta)}"><span class="bar-name"><small>${String(d.rank).padStart(2,'0')}</small><b>${d.name}</b>${d.pilot?'<i title="48 小時先導盤點區">先導</i>':''}</span><span class="bar-track"><span class="bar-fill ${band(d.PPI)}" style="width:${d[metric]}%"></span><span class="baseline-marker" style="left:${b[metric]}%" title="基準 ${f(b[metric])}"></span><span class="bar-number" style="left:min(${d[metric]}% + 10px, calc(100% - 30px))">${f(d[metric])}</span></span><span class="delta-value ${Math.abs(delta)>.00001?'changed':''}">${signed(delta)}</span></button>`;
  }).join('');
  const d = results.find(d => d.name === selected);
  const b = baseByName.get(selected);
  const change = b.rank - d.rank;
  document.getElementById('district-detail').innerHTML = `<div class="detail-top"><div><span class="eyebrow">SELECTED DISTRICT / 計算拆解</span><h3>${d.name}${d.pilot?'<span class="small-tag">先導盤點區</span>':''}</h3></div><span class="detail-score">${f(d.TES)}<small>TES</small></span></div><div class="detail-factors"><div><span>假設樹冠率 C</span><strong>${d.C}%</strong><small>目標 24% · 缺口 G ${d.G.toFixed(3)}</small></div><div><span>加權需求 S</span><strong>${d.S.toFixed(3)}</strong><small>H ${((weights.H/100)*d.H).toFixed(3)} + P ${((weights.P/100)*d.P).toFixed(3)} + V ${((weights.V/100)*d.V).toFixed(3)}</small></div><div><span>較基準 TES / 需求名次</span><strong>${signed(d.TES-b.TES)}</strong><small>${glyph(change)} ${Math.abs(change)} 名 · 基準 ${b.rank} → 目前 ${d.rank}</small></div></div><p class="detail-equation">100 − 100 × ${d.G.toFixed(3)} × (0.5 + 0.5 × ${d.S.toFixed(3)}) ≈ <b>${f(d.TES)}</b></p>`;
  document.getElementById('comparison-rows').innerHTML = results.filter(d => !pilotOnly || d.pilot).map(d => {
    const b = baseByName.get(d.name);
    const change = b.rank-d.rank;
    return `<tr class="${d.pilot?'pilot-row':''}"><td>${String(d.rank).padStart(2,'0')}</td><td><button class="table-district" data-district="${d.name}" aria-pressed="${selected === d.name}">${d.name}</button>${d.pilot?'<span class="table-pilot">先導</span>':''}</td><td>${d.C}%</td><td>${d.H.toFixed(2)}</td><td>${d.P.toFixed(2)}</td><td>${d.V.toFixed(2)}</td><td>${d.G.toFixed(3)}</td><td>${d.S.toFixed(3)}</td><td><b>${f(d.TES)}</b></td><td>${f(d.PPI)}</td><td class="${Math.abs(d.TES-b.TES)>.00001?'changed':''}">${signed(d.TES-b.TES)}</td><td>${glyph(change)} ${Math.abs(change)}</td></tr>`;
  }).join('');
}
function syncControls() {
  for (const k of ['H','P','V']) {
    const el = document.getElementById(`weight-${k}`);
    el.value = String(weights[k]);
    el.style.setProperty('--weight',`${weights[k]}%`);
    el.setAttribute('aria-valuetext',`${weights[k]}%`);
    document.getElementById(`number-${k}`).innerHTML = `${weights[k]}<small>%</small>`;
  }
  const presets = { default: DEFAULT_WEIGHTS, heat:{H:60,P:25,V:15}, people:{H:25,P:60,V:15}, vulnerable:{H:25,P:25,V:50} };
  document.querySelectorAll('[data-preset]').forEach(btn => {
    const p = presets[btn.dataset.preset];
    const active = ['H','P','V'].every(k => p[k]===weights[k]);
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
}
for (const key of ['H','P','V']) {
  document.getElementById(`weight-${key}`).addEventListener('input',e => {
    weights = redistribute(weights,key,Number(e.target.value));
    syncControls(); render();
  });
}
function setView(view, updateHash = true) {
  const valid = ['dashboard','fieldwork','sources'].includes(view) ? view : 'dashboard';
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `${valid}-view`; });
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active',btn.dataset.view===valid);
    if (btn.dataset.view === valid) btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
  if (updateHash) history.replaceState(null,'',valid==='dashboard'?'#dashboard':`#${valid}`);
}
let toastTimer;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'),3000);
}
function downloadCsv() {
  const blob = new Blob([csvFor(weights)],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`TreeBack_情境_H${weights.H}_P${weights.P}_V${weights.V}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('已匯出目前情境。CSV 保留假設輸入與權重。');
}
document.addEventListener('click',e => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { setView(button.dataset.view); }
  if (button.dataset.district) {
    const fromTable = button.classList.contains('table-district');
    selected = button.dataset.district;
    render();
    const selector = fromTable ? '.table-district' : '.bar-row';
    const nextButton = Array.from(document.querySelectorAll(selector))
      .find(el => el.dataset.district === selected);
    nextButton?.focus({ preventScroll: true });
    if (fromTable) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('district-detail').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth', block: 'center',
      });
    }
  }
  if (button.dataset.metric) { metric=button.dataset.metric; document.querySelectorAll('[data-metric]').forEach(b => {b.classList.toggle('active',b.dataset.metric===metric);b.setAttribute('aria-pressed',String(b.dataset.metric===metric));}); render(); }
  if (button.dataset.preset) {
    const presets={default:DEFAULT_WEIGHTS,heat:{H:60,P:25,V:15},people:{H:25,P:60,V:15},vulnerable:{H:25,P:25,V:50}};
    weights={...presets[button.dataset.preset]};syncControls();render();
  }
  if (button.id==='reset-weights') { weights={...DEFAULT_WEIGHTS};syncControls();render();toast('已恢復基準 40 / 35 / 25。'); }
  if (button.id==='export-csv') downloadCsv();
  if (button.dataset.fieldDistrict) {
    document.querySelectorAll('[data-field-district]').forEach(b => {b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    document.querySelectorAll('[data-corridor-district]').forEach(el => {el.hidden=el.dataset.corridorDistrict!==button.dataset.fieldDistrict;});
  }
});
document.getElementById('pilot-only').addEventListener('change',e=> {pilotOnly=e.target.checked;render();});
window.addEventListener('hashchange',()=>setView(location.hash.slice(1),false));
syncControls(); render(); setView(location.hash.slice(1),false);
