// 形「パステルのドーナツ」（見本E）。輪＝前の大事な時間から次までの進み。計算は time.js（ctx）、色と大きさは skins.json、ここは描くだけ
import { WD, hm, formatLeft, seasonLabel } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.donut.geo;
const C = G.view / 2, R = G['ring-r'];
const f2 = (n) => n.toFixed(2);
const pt = (a) => { const t = (a * Math.PI) / 180; return [C + R * Math.sin(t), C - R * Math.cos(t)]; };
const arc = (len) => {
  const b = pt(Math.min(len, 359.9));
  return `M${C} ${C - R}A${R} ${R} 0 ${len > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};

function svg() {
  let s = `<defs><linearGradient id="dn-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="dn-ga"/><stop offset="1" class="dn-gb"/></linearGradient></defs><g>`;
  for (const [x, y, k, c] of G.stars) s += `<path class="dn-star dn-s${c}" transform="translate(${x} ${y}) scale(${k})" d="${G.star}"/>`;
  s += `</g><circle cx="${C}" cy="${C}" r="${R}" class="dn-track"/><path data-k="arc" class="dn-arc"/><circle data-k="knob" r="${G['knob-r']}" class="dn-knob"/>`;
  s += `<text x="${C}" y="${G['label-y']}" class="dn-lab">つぎは</text><text data-k="name" x="${C}" y="${G['name-y']}" class="dn-name"></text>`;
  s += `<text data-k="time" x="${C}" y="${G['time-y']}" class="dn-time"></text><text data-k="left" x="${C}" y="${G['left-y']}" class="dn-left"></text>`;
  return `<svg class="dn-svg" viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="次の大事な時間までの進みを輪で表した時計">${s}</svg>`;
}

function build(root) {
  root.className = 'page donut';
  root.innerHTML = `<header class="dn-head"><h1>FX時計</h1><div class="top-r"><span data-k="season"></span><span class="tools-slot"></span></div></header>
<div class="dn-main">
  <div class="dn-clock swipe">${svg()}</div>
  <div class="dots-slot"></div>
  <div class="dn-side">
    <div class="dn-tags" data-k="tags"></div>
    <div class="hol-slot"></div>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['season', 'arc', 'knob', 'name', 'time', 'left', 'tags'].map((k) => [k, q(k)]));
}

function render(root, { now, p, sc, day, dst, closed, sessions, progress, gotobi }) {
  const el = root._k;
  el.season.textContent = `${p.mo}/${p.d}（${WD[p.wd]}）${seasonLabel(dst)}`;
  const a = progress * 360, k = pt(a);
  el.arc.setAttribute('d', a > 1 ? arc(a) : '');
  el.knob.setAttribute('cx', f2(k[0]));
  el.knob.setAttribute('cy', f2(k[1]));
  if (sc.next) {
    el.name.textContent = sc.next.ev.name;
    el.time.textContent = closed ? `土日はお休み・${hm(sc.next.t)}` : hm(sc.next.t);
    el.left.textContent = formatLeft(sc.next.t - now);
  }
  let t = sessions.filter((s) => s.id !== 'syd').map((s) => `<span class="dn-tag${s.open ? ' on' : ''}">${s.open ? `${s.name} 取引中` : s.rest || `${s.name} お休み`}</span>`).join('');
  if (gotobi) t += `<span class="dn-tag g">${gotobi}</span>`;
  for (const x of day) {
    const cls = [x.t <= now && 'past', sc.next === x && 'next', x.off && 'off', x.ev.kind === 'ind' && 'ind'].filter(Boolean).join(' ');
    t += `<span class="dn-tag ${cls}">${x.ev.approx ? 'ごろ' : hm(x.t)} ${x.ev.name}${x.off ? `・${x.off}` : ''}</span>`;
  }
  el.tags.innerHTML = t;
}

// 形のえらぶ所の小さな絵（ドーナツ）。c は [地の色, 輪の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><circle cx="16" cy="16" r="9" fill="none" stroke="${c2}" stroke-opacity=".3" stroke-width="4"/><path d="M16 7A9 9 0 1 1 7 16" fill="none" stroke="${c2}" stroke-width="4" stroke-linecap="round"/></svg>`;
}

export default { id: 'donut', name: 'パステルのドーナツ', group: 'kawaii', chip: 'round', icon, build, render };
