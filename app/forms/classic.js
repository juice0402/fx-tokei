// 形「アナログ・クラシック」（見本 forms の A）。12時間の針・外のふちの点（いまから12時間の大事な時間と指標）
// 6時の小窓＝次の時間までの残りと進み、3時の窓＝日付とゴトー日
// 計算は time.js（ctx・handAngles・dial12・bandWindow）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, hm, formatLeft, seasonLabel, handAngles, dial12, clockLeft, bandWindow } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.classic.geo;
const C = G.view / 2;
const f2 = (n) => n.toFixed(2);
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;
const pt = (cx, cy, r, a) => { const t = (a * Math.PI) / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
const rot = (a) => `translate(${C} ${C}) rotate(${f2(a)})`;
const arc = (cx, cy, r, a0, len) => {
  const l = Math.min(len, 359.9);
  const a = pt(cx, cy, r, a0), b = pt(cx, cy, r, a0 + l);
  return `M${f2(a[0])} ${f2(a[1])}A${r} ${r} 0 ${l > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};
const rect = ([x, y, w, h], cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${G['mark-rx']}" class="${cls}"/>`;
const LAMPS = ['tky', 'ldn', 'ny'];

function face(skin) {
  const id = `cl-${skin}`;
  let s = `<defs><radialGradient id="${id}f" cx="50%" cy="42%" r="62%"><stop offset="0" class="cl-f1"/><stop offset="1" class="cl-f2"/></radialGradient>`
    + `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="cl-r1"/><stop offset=".45" class="cl-r2"/><stop offset=".55" class="cl-r3"/><stop offset="1" class="cl-r4"/></linearGradient></defs>`
    + `<circle cx="${C}" cy="${C}" r="${G['rim-r']}" fill="url(#${id}r)"/><circle cx="${C}" cy="${C}" r="${G['ring-r']}" class="cl-ring"/><circle cx="${C}" cy="${C}" r="${G['face-r']}" fill="url(#${id}f)"/>`;
  const [t0, t1] = G.tick;
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = pt(C, C, t0, i * 6), b = pt(C, C, t1, i * 6);
    s += `<line x1="${f2(a[0])}" y1="${f2(a[1])}" x2="${f2(b[0])}" y2="${f2(b[1])}" class="cl-tick"/>`;
  }
  for (let h = 0; h < 12; h++) {
    s += `<g transform="${rot(h * 30)}">${h === 0 ? G.hmark12.map((r) => rect(r, 'cl-hmark')).join('') : rect(G.hmark, 'cl-hmark')}</g>`;
  }
  const [dx, dy, dw, dh] = G['date-box'], [sx, sy] = G['sub-c'];
  s += `<text x="${C}" y="${G['brand-y']}" class="cl-brand">FX時計</text><text x="${C}" y="${G['sub-y']}" class="cl-pair">USD / JPY</text>`
    + `<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${G['date-rx']}" class="cl-datebox"/><text x="${G['date-text'][0]}" y="${G['date-text'][1]}" class="cl-day" data-k="day"></text>`
    + `<text x="${G['goto-text'][0]}" y="${G['goto-text'][1]}" class="cl-goto" data-k="goto"></text>`
    + `<circle cx="${sx}" cy="${sy}" r="${G['sub-r']}" class="cl-sub"/><circle cx="${sx}" cy="${sy}" r="${G['sub-track-r']}" class="cl-track"/>`
    + `<path class="cl-prog" data-k="prog"/><text x="${sx}" y="${G['sn-y']}" class="cl-sn" data-k="sn"></text><text x="${sx}" y="${G['sl-y']}" class="cl-sl" data-k="sl"></text>`
    + '<g data-k="marks"></g>'
    + `<g data-k="h"><path d="${G['hand-h']}" class="cl-hand-h"/></g><g data-k="m"><path d="${G['hand-m']}" class="cl-hand-m"/></g>`
    + `<g data-k="s"><line x1="0" y1="${G['hand-s'][0]}" x2="0" y2="${G['hand-s'][1]}" class="cl-sec"/><circle r="${G['cap-r'][0]}" class="cl-secdot"/><circle r="${G['cap-r'][1]}" class="cl-cap"/></g>`;
  return `<svg class="cl-svg" viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="12時間の針の時計。外のふちの点は、いまから12時間の大事な時間">${s}</svg>`;
}

function build(root, skin) {
  root.className = 'page classic';
  root.style.setProperty('--cl-max', G.max);
  root.style.setProperty('--cl-max-wide', G['max-wide']);
  root.innerHTML = `<header class="an-top"><span class="an-date" data-k="date"></span><div class="top-r"><span class="tools-slot"></span></div></header>
<div class="cl-dial swipe">${face(skin)}</div>
<p class="cl-next" data-k="next"></p>
<p class="cl-lamps" data-k="lamps"></p>
<div class="dots-slot"></div>
<div class="events-slot"></div>
<div class="hol-slot"></div>
<div class="pick-slot"></div>`;
  root._k = {};
  for (const el of root.querySelectorAll('[data-k]')) root._k[el.dataset.k] = el;
}

function render(root, ctx) {
  const { now, p, sc, dst, closed, progress, gotobi, sessions, hol, ind } = ctx;
  const el = root._k;
  const a = handAngles(p);
  el.h.setAttribute('transform', rot(a.h));
  el.m.setAttribute('transform', rot(a.m));
  el.s.setAttribute('transform', rot(a.s));
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;
  el.day.textContent = `${p.d} ${WD[p.wd]}`;
  el.goto.textContent = gotobi ? 'ゴトー日' : '';

  // 外のふちの点：いまから12時間（休みで止まる回はうすく）
  const [d0, d1, d3] = G['mark-dot'];
  let mk = '';
  for (const x of bandWindow(now, 0, 12, hol, ind).items) {
    if (x.t <= now) continue;
    const q = pt(C, C, G['mark-r'], dial12(x.t));
    const r = x.ev.kind === 'minor' ? d1 : x.ev.imp >= 3 ? d3 : d0;
    mk += `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="${r}" class="cl-k ${x.ev.kind}${x.off ? ' off' : ''}"><title>${hm(x.t)} ${x.ev.name}${x.off ? `（${x.off}）` : ''}</title></circle>`;
  }
  el.marks.innerHTML = mk;

  if (sc.next) {
    const [sx, sy] = G['sub-c'], pr = progress * 360;
    el.prog.setAttribute('d', pr > 1 ? arc(sx, sy, G['sub-track-r'], 0, pr) : '');
    const n = sc.next.ev.name;
    el.sn.textContent = n.length > 6 ? `${n.slice(0, 6)}…` : n;
    el.sl.textContent = clockLeft(sc.next.t - now);
    el.next.innerHTML = `${closed ? '土日はお休み・次は' : '次は'} <b>${hm(sc.next.t)} ${n}</b><span>${formatLeft(sc.next.t - now)}</span>`;
  }
  el.lamps.innerHTML = LAMPS.map((id) => {
    const s = sessions.find((x) => x.id === id);
    return `<span class="${s.open ? 'on' : s.rest ? 'rest' : ''}"><i></i>${s.name}${s.rest ? '・休み' : ''}</span>`;
  }).join('');
}

// 形のえらぶ所の小さな絵（丸い文字盤と2本の針）。c は [文字盤の色, 縁の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="${c2}"/><circle cx="15" cy="15" r="11.5" fill="${c1}"/><path d="M15 15V7.5M15 15l5 3" stroke="${c2}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

export default { id: 'classic', name: 'アナログ・クラシック', group: 'analog', chip: 'round', icon, build, render };
