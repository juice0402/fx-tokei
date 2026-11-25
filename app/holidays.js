// 休みの予定（data/holidays.json）：きょうのお知らせと、7日先までの休みの一覧（日付・国・名前）
// 計算は time.js。読めなくても時計は止めない（土日と年末年始だけで判定し、「祝日の予定を読めませんでした」と小さく）
import { normalizeHolidays, holidayDays, holidayNotes, parts, TZ } from './time.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function makeHolidays(doc = document, url = './data/holidays.json') {
  const el = doc.createElement('section');
  el.className = 'ev hol';
  el.setAttribute('aria-label', '休みの予定');
  el.innerHTML = `<div class="ev-head"><h2>休み</h2></div>
<ul class="hol-notes" data-k="notes"></ul>
<ul class="ev-list" data-k="list"></ul>
<details class="ev-src"><summary>出典</summary><ul data-k="src"></ul></details>`;
  const q = (k) => el.querySelector(`[data-k="${k}"]`);
  let data = null;
  let failed = false;
  let key = '';
  let last = Date.now();

  fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => { data = normalizeHolidays(j); failed = !data; })
    .catch(() => { failed = true; })
    .then(() => {
      q('src').innerHTML = data ? data.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('') : '';
      el.querySelector('.ev-src').hidden = !data || !data.sources.length;
      key = '';
      update(last);
    });

  // 日付が変わったとき・読みこみが終わったときだけ作り直す
  function update(now) {
    last = now;
    const p = parts(now, TZ.tky);
    const k = `${p.y}-${p.mo}-${p.d}-${!!data}-${failed}`;
    if (k === key) return;
    key = k;
    q('notes').innerHTML = holidayNotes(now, data, failed).map((n) => `<li>${esc(n)}</li>`).join('');
    const days = holidayDays(now, data);
    q('list').innerHTML = days.length
      ? days.map((d) => `<li class="ev-row"><time>${esc(d.label)}</time><span>${esc(d.name)}</span><i>${esc(d.where)}</i></li>`).join('')
      : '<li class="ev-none">7日先までの休みはありません</li>';
  }

  return { el, update, current: () => data };
}
