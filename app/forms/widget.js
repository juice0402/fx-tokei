// 形「タイル」（見本G）。アプリのウィジェット（小2つ・中1つ）とロック画面のカウントダウンの見た目を Web の1画面に並べる
// 計算は time.js（ctx）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, seasonLabel, formatHms, formatHmShort } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.widget.geo;
const C = G['ring-view'] / 2, R = G['ring-r'];
const f2 = (n) => n.toFixed(2);
const arc = (len) => {
  const t = (Math.min(len, 359.9) * Math.PI) / 180;
  return `M${C} ${C - R}A${R} ${R} 0 ${len > 180 ? 1 : 0} 1 ${f2(C + R * Math.sin(t))} ${f2(C - R * Math.cos(t))}`;
};

function build(root) {
  root.className = 'page widget';
  root.innerHTML = `<header class="wg-top"><h1>FX時計</h1><div class="top-r"><span class="tools-slot"></span></div></header>
<div class="wg-main">
  <div class="wg-set swipe">
    <div class="wg-grid">
      <div><div class="wg sq"><div class="wg-ttl" data-k="name"></div><div class="wg-ring"><svg viewBox="0 0 ${G['ring-view']} ${G['ring-view']}" role="img" aria-label="次の大事な時間までの進み"><circle cx="${C}" cy="${C}" r="${R}" class="wg-track"/><path data-k="arc" class="wg-arc"/><text data-k="ring" x="${C}" y="${G['ring-text-y']}" class="wg-rt"></text></svg></div><small data-k="from"></small></div><p class="wg-lab">次の時間</p></div>
      <div><div class="wg sq"><div class="wg-ttl">市場</div><div class="wg-mk" data-k="mk"></div></div><p class="wg-lab">取引中の市場</p></div>
      <div class="wg-m"><div class="wg m"><div class="wg-ml"><div><small data-k="date"></small><div class="wg-time" data-k="time"></div></div><small data-k="sea"></small></div><div class="wg-list" data-k="list"></div></div><p class="wg-lab">いまとこの先</p></div>
    </div>
    <div class="wg-la"><div class="wg-la-row"><b data-k="laName"></b><span data-k="laLeft"></span></div><div class="wg-la-bar"><i data-k="laBar"></i></div></div>
    <p class="wg-lab">ロック画面のカウントダウン</p>
  </div>
  <div class="dots-slot"></div>
  <div class="wg-side">
    <div class="hol-slot"></div>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['name', 'arc', 'ring', 'from', 'mk', 'date', 'time', 'sea', 'list', 'laName', 'laLeft', 'laBar'].map((k) => [k, q(k)]));
}

function render(root, { now, p, sc, day, dst, closed, sessions, progress, gotobi }) {
  const el = root._k;
  const a = progress * 360;
  el.arc.setAttribute('d', a > 1 ? arc(a) : '');
  el.mk.innerHTML = sessions.map((s) => `<div class="${s.open ? 'on' : ''}"><span>${s.name}${!s.open && s.rest ? '<small>休み</small>' : ''}</span><i></i></div>`).join('');
  el.date.textContent = `${p.mo}月${p.d}日（${WD[p.wd]}）`;
  el.time.textContent = `${p.h}:${pad(p.mi)}`;
  el.sea.textContent = (closed ? '土日はお休み' : seasonLabel(dst)) + (gotobi ? `・${gotobi}` : '');
  el.list.innerHTML = day.filter((x) => x.t > now && !x.off).slice(0, 3)
    .map((x) => `<div class="${x === sc.next ? 'next' : ''}"><span>${x.ev.approx ? 'ごろ' : hm(x.t)}</span><span>${x.ev.name}</span><em>${formatHmShort(x.t - now)}</em></div>`).join('');
  el.laBar.style.width = `${(progress * 100).toFixed(1)}%`;
  if (!sc.next) return;
  el.name.textContent = sc.next.ev.name;
  el.ring.textContent = formatHmShort(sc.next.t - now);
  el.from.textContent = `${hm(sc.next.t)} から`;
  el.laName.textContent = `${sc.next.ev.name} ${hm(sc.next.t)}`;
  el.laLeft.textContent = formatHms(sc.next.t - now);
}

// 形のえらぶ所の小さな絵（タイル）。c は [タイルの色, 輪の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x="1" y="1" width="17" height="17" rx="4.5" fill="${c1}" stroke="${c2}" stroke-opacity=".4"/><rect x="22" y="1" width="17" height="17" rx="4.5" fill="${c1}" stroke="${c2}" stroke-opacity=".4"/><rect x="1" y="21" width="38" height="8" rx="4" fill="${c1}" stroke="${c2}" stroke-opacity=".4"/><path d="M9.5 5a4.5 4.5 0 1 1-4.5 4.5" fill="none" stroke="${c2}" stroke-width="1.8" stroke-linecap="round"/><path d="M5 25h17" stroke="${c2}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

export default { id: 'widget', name: 'タイル', group: 'gadget', chip: 'rect', icon, build, render };
