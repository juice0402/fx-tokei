// 画面のはじまり：えらんだ形と色を出し、1秒ごとに計算の結果を形へ渡す
import { FORMS } from './forms.js';
import { SKINS } from './skins.js';
import { tickContext } from './time.js';
import { makeTools } from './tools.js';

const KEY = 'fx-tokei-skin';
const IDS = Object.keys(SKINS);
const html = document.documentElement;
const stage = document.getElementById('stage');
const formOf = (id) => FORMS.find((f) => f.id === SKINS[id].form);
const skinsOf = (form) => IDS.filter((id) => SKINS[id].form === form.id);

const load = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const save = (id) => { try { localStorage.setItem(KEY, id); } catch (e) { /* 保存できない環境でも動く */ } };

const saved = load();
let skin = saved && Object.hasOwn(SKINS, saved) ? saved : IDS[0];
let form = null;
let render = null;
const lastOf = {}; // 形ごとに、さいごにえらんだ色（このページを開いているあいだ）

function pickHtml() {
  const forms = FORMS.map((f) => {
    const id = f === form ? skin : lastOf[f.id] || skinsOf(f)[0];
    return `<button class="fchip" type="button" data-form="${f.id}" aria-pressed="${f === form}" aria-label="${f.name}">${f.icon(SKINS[id].chip)}</button>`;
  }).join('');
  const colors = skinsOf(form).map((id) => `<button class="chip ${form.chip}" type="button" data-pick="${id}" aria-pressed="${id === skin}" aria-label="${SKINS[id].name}"></button>`).join('');
  return `<div class="pick-row" role="group" aria-label="形">${forms}</div>
<div class="pick-row"><div class="pick-colors" role="group" aria-label="色">${colors}</div><span class="pick-name">${form.name}・${SKINS[skin].name}</span></div>`;
}

const tools = makeTools();
const credit = document.createElement('p');
credit.className = 'credit';
credit.innerHTML = 'フォント：Shippori Mincho B1・Zen Kaku Gothic New・BIZ UDPGothic（<a href="./fonts/OFL.txt">SIL OFL 1.1</a>）';

const pick = document.createElement('nav');
pick.className = 'pick';
pick.setAttribute('aria-label', '形と色');
pick.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.form) {
    const f = FORMS.find((x) => x.id === b.dataset.form);
    if (f !== form) apply(lastOf[f.id] || skinsOf(f)[0], true);
  } else if (b.dataset.pick) {
    apply(b.dataset.pick, true);
  }
});

function apply(id, byUser) {
  skin = id;
  lastOf[SKINS[id].form] = id;
  html.dataset.skin = id;
  const f = formOf(id);
  if (f !== form) {
    form = f;
    html.dataset.form = f.id;
    const root = document.createElement('main');
    stage.replaceChildren(root);
    render = f.mount(root);
    root.querySelector('.pick-slot').append(pick);
    root.querySelector('.tools-slot').append(tools);
    root.append(credit);
    render(tickContext(Date.now()));
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = SKINS[id].color.bg;
  const focusKey = byUser && document.activeElement && pick.contains(document.activeElement)
    ? (document.activeElement.dataset.pick ? `[data-pick="${document.activeElement.dataset.pick}"]` : `[data-form="${f.id}"]`) : null;
  pick.innerHTML = pickHtml();
  if (focusKey) pick.querySelector(focusKey)?.focus();
  if (byUser) save(id);
}

apply(skin, false);
const tick = () => render(tickContext(Date.now()));
setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));

// 電波がなくても開けるように（http・https のときだけ。アプリの中で使えないときは何もしない）
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
