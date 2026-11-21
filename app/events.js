// 指標の予定（data/events.json）：次の指標・7日先までの一覧・重要度のしぼり込み・出典
// 計算は time.js。読めなくても時計は止めない（「指標の予定を読めませんでした」と小さく出す）
import {
  IMP_CHOICES, IMP_DEFAULT, normalizeEvents, nextIndicator, indicatorDays, indicatorTime, indicatorLeft,
  staleInfo, stars, hm, parts, TZ, WD,
} from './time.js';

const KEY = 'fx-tokei-imp';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loadImp = () => { try { const v = +localStorage.getItem(KEY); return [1, 2, 3].includes(v) ? v : IMP_DEFAULT; } catch (e) { return IMP_DEFAULT; } };
const saveImp = (v) => { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* 保存できない環境でも動く */ } };

export function makeEvents(doc = document, url = './data/events.json') {
  const el = doc.createElement('section');
  el.className = 'ev';
  el.setAttribute('aria-label', '指標の予定');
  const opts = IMP_CHOICES.map((c) => `<option value="${c.v}">${c.label}</option>`).join('');
  el.innerHTML = `<div class="ev-head"><h2>指標の予定</h2><select class="ev-imp" aria-label="重要度">${opts}</select></div>
<p class="ev-next" data-k="next"></p>
<ul class="ev-list" data-k="list"></ul>
<p class="ev-note" data-k="note"></p>
<details class="ev-src"><summary>出典</summary><ul data-k="src"></ul></details>`;
  const q = (k) => el.querySelector(`[data-k="${k}"]`);
  const sel = el.querySelector('.ev-imp');
  let imp = loadImp();
  sel.value = String(imp);
  let data = null; // 読めたら { updated, sources, events }
  let failed = false;
  let listKey = '';
  let last = Date.now();

  sel.addEventListener('change', () => {
    imp = +sel.value;
    saveImp(imp);
    listKey = '';
    update(last);
  });

  fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => { data = normalizeEvents(j); failed = !data; })
    .catch(() => { failed = true; })
    .then(() => {
      q('src').innerHTML = data ? data.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('') : '';
      el.querySelector('.ev-src').hidden = !data || !data.sources.length;
      listKey = '';
      update(last);
    });

  function update(now) {
    last = now;
    if (!data) {
      q('next').textContent = '';
      q('list').innerHTML = '';
      q('note').textContent = failed ? '指標の予定を読めませんでした' : '';
      return;
    }
    const nx = nextIndicator(data.events, now, imp);
    q('next').innerHTML = nx
      ? `次は<b>${esc(dayOf(nx.t))} ${esc(indicatorTime(nx))} ${esc(nx.name)}${nx.tentative ? '（予定）' : ''}</b><span>${esc(indicatorLeft(nx, now))}</span>`
      : '';
    // 一覧は分が変わったとき・しぼり込みを変えたときだけ作り直す
    const p = parts(now, TZ.tky);
    const key = `${imp}-${p.y}-${p.mo}-${p.d}-${p.h}-${p.mi}`;
    if (key !== listKey) {
      listKey = key;
      let html = '';
      for (const d of indicatorDays(data.events, now, imp)) {
        html += `<li class="ev-day">${esc(d.label)}</li>`;
        for (const e of d.items) {
          const sub = e.sub ? `<small>${esc(e.sub.name)} ${esc(hm(e.sub.t))}</small>` : '';
          html += `<li class="ev-row imp${e.imp}${e.t <= now ? ' past' : ''}${e === nx ? ' next' : ''}"><time>${esc(indicatorTime(e))}</time><span>${esc(e.name)}${e.tentative ? '（予定）' : ''}${sub}</span><i aria-label="重要度${e.imp}">${stars(e.imp)}</i></li>`;
        }
      }
      q('list').innerHTML = html || '<li class="ev-none">7日先までの予定はありません</li>';
      const st = staleInfo(data.updated, now);
      q('note').textContent = st.stale ? `予定が古いかもしれません${st.label ? `（${st.label}時点）` : ''}。公式で確かめてください` : '';
    }
  }

  // 形に渡す分（しぼり込み済みの行）
  const current = () => (data ? data.events.filter((e) => e.imp >= imp) : []);
  return { el, update, current };
}

function dayOf(t) {
  const p = parts(t, TZ.tky);
  return `${p.mo}/${p.d}（${WD[p.wd]}）`;
}
