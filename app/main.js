// 画面のはじまり：えらんだ形と色を出し、1秒ごとに計算の結果（ctx）を形へ渡す
// 形の切りかえ：時計の部分の左右スワイプ・←→ キー・下の点・下の一覧（分け方ごと）。えらんだ形と、形ごとの色は残す
import { FORMS, GROUPS } from './forms/index.js';
import { SKINS } from './skins.js';
import { tickContext } from './time.js';
import { makeTools } from './tools.js';
import { makeEvents } from './events.js';
import { makeHolidays } from './holidays.js';

const KEY = 'fx-tokei-skin'; // いまの色（形は色から決まる）
const KEY_COLORS = 'fx-tokei-colors'; // 形ごとに、さいごにえらんだ色 { 形: 色 }
const html = document.documentElement;
const stage = document.getElementById('stage');
const formOf = (id) => FORMS.find((f) => f.id === SKINS[id].form);
const has = (id) => typeof id === 'string' && Object.hasOwn(SKINS, id);

const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 保存できない環境でも動く */ } };

const lastOf = {};
try {
  const o = JSON.parse(load(KEY_COLORS) || '{}');
  for (const f of FORMS) if (has(o[f.id]) && SKINS[o[f.id]].form === f.id) lastOf[f.id] = o[f.id];
} catch (e) { /* 読めないときは、はじめの色 */ }
const saved = load(KEY);
let skin = has(saved) ? saved : FORMS[0].colors[0].id;
let form = null;
let root = null;
const colorOf = (f) => lastOf[f.id] || f.colors[0].id;

function pickHtml() {
  const groups = GROUPS.map((g) => {
    const fs = FORMS.filter((f) => f.group === g.id);
    if (!fs.length) return '';
    const chips = fs.map((f) => `<button class="fchip" type="button" data-form="${f.id}" aria-pressed="${f === form}" aria-label="${f.name}">${f.icon(SKINS[f === form ? skin : colorOf(f)].chip)}</button>`).join('');
    return `<div class="pick-group" role="group" aria-label="${g.name}"><span class="pick-gname">${g.name}</span>${chips}</div>`;
  }).join('');
  const colors = form.colors.map((c) => `<button class="chip ${form.chip}" type="button" data-pick="${c.id}" aria-pressed="${c.id === skin}" aria-label="${c.name}"></button>`).join('');
  return `<div class="pick-row" aria-label="形">${groups}</div>
<div class="pick-colors" role="group" aria-label="色">${colors}</div><span class="pick-name">${form.name}・${SKINS[skin].name}</span>`;
}

const tools = makeTools();
const events = makeEvents();
const holidays = makeHolidays();
const ctxAt = (now) => tickContext(now, holidays.current(), events.current());
const credit = document.createElement('p');
credit.className = 'credit';
credit.innerHTML = 'フォント：Shippori Mincho B1・Zen Kaku Gothic New・BIZ UDPGothic・Barlow Condensed・DotGothic16・Cormorant Garamond・M PLUS Rounded 1c（<a href="./fonts/OFL.txt">SIL OFL 1.1</a>）';

const pick = document.createElement('nav');
pick.className = 'pick';
pick.setAttribute('aria-label', '形と色');
pick.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.form) {
    const f = FORMS.find((x) => x.id === b.dataset.form);
    if (f !== form) apply(colorOf(f), true);
  } else if (b.dataset.pick) {
    apply(b.dataset.pick, true);
  }
});

// 下の点：形の数といまの位置（押すとその形へ）
const dots = document.createElement('div');
dots.className = 'dots';
dots.setAttribute('role', 'group');
dots.setAttribute('aria-label', '形の切りかえ（左右にスワイプ）');
dots.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) apply(colorOf(FORMS[+b.dataset.i]), true);
});
const dotsHtml = () => FORMS.map((f, i) => `<button type="button" data-i="${i}" aria-label="${f.name}" aria-current="${f === form}"></button>`).join('');

function apply(id, byUser, dir = 0) {
  if (!has(id)) return;
  const sameSkin = id === skin && root;
  skin = id;
  const f = formOf(id);
  lastOf[f.id] = id;
  html.dataset.skin = id;
  if (!sameSkin) {
    // 色ごとに飾りがちがうので、色を変えたときも作り直す
    form = f;
    html.dataset.form = f.id;
    root = document.createElement('main');
    f.build(root, id);
    if (dir) root.classList.add(dir > 0 ? 'enter-next' : 'enter-prev');
    stage.replaceChildren(root);
    root.querySelector('.pick-slot').append(pick);
    root.querySelector('.tools-slot').append(tools);
    root.querySelector('.events-slot').append(events.el);
    root.querySelector('.hol-slot').append(holidays.el);
    root.querySelector('.dots-slot').append(dots);
    root.append(credit);
    f.render(root, ctxAt(Date.now()));
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = SKINS[id].color.bg;
  const focusKey = byUser && document.activeElement && pick.contains(document.activeElement)
    ? (document.activeElement.dataset.pick ? `[data-pick="${document.activeElement.dataset.pick}"]` : `[data-form="${f.id}"]`) : null;
  pick.innerHTML = pickHtml();
  dots.innerHTML = dotsHtml();
  if (focusKey) pick.querySelector(focusKey)?.focus();
  if (byUser) {
    save(KEY, id);
    save(KEY_COLORS, JSON.stringify(lastOf));
  }
}

// 前後の形へ（はしまで行ったら反対のはしへ）
function step(n) {
  const i = FORMS.indexOf(form);
  const f = FORMS[(i + n + FORMS.length) % FORMS.length];
  if (f !== form) apply(colorOf(f), true, n);
}

// 時計の部分（.swipe）で横に大きく動いたときだけ切りかえる（たてはふつうにスクロール）
let sx = null, sy = 0, sid = null;
stage.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary || !e.target.closest('.swipe')) return;
  sx = e.clientX; sy = e.clientY; sid = e.pointerId;
});
stage.addEventListener('pointerup', (e) => {
  if (sx === null || e.pointerId !== sid) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) step(dx < 0 ? 1 : -1);
});
stage.addEventListener('pointercancel', () => { sx = null; });
// トラックパッドの横の動き
let wheel = 0, wheelT = 0;
stage.addEventListener('wheel', (e) => {
  if (!e.target.closest('.swipe') || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  const t = Date.now();
  if (t - wheelT > 400) wheel = 0;
  wheelT = t;
  wheel += e.deltaX;
  if (Math.abs(wheel) > 120) { step(wheel > 0 ? 1 : -1); wheel = 0; wheelT = t + 600; }
}, { passive: true });
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

apply(skin, false);
events.update(Date.now());
holidays.update(Date.now());
const tick = () => { const now = Date.now(); form.render(root, ctxAt(now)); events.update(now); holidays.update(now); };
setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));

// 電波がなくても開けるように（http・https のときだけ。アプリの中で使えないときは何もしない）
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
