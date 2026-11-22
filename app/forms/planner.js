// 形「手帳」（見本F）。いまの前2時間・後ろ10時間を縦に。値が決まる時間に蛍光ペン、いまは赤い線、ゴトー日はハンコ
// 計算は time.js（ctx）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, seasonLabel, hourWindow, eventsBetween, bandsIn, parts, TZ, SESSIONS } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.planner.geo;
const f2 = (n) => n.toFixed(2);
const ROWS = G.before + G.after;

function page(now, hol, ind) {
  const { from, to } = hourWindow(now, G.before, G.after);
  const RH = G['row-h'], T0 = G.top, L = G['line-x0'], R = G['line-x1'];
  const Y = (t) => T0 + ((t - from) / 36e5) * RH;
  let s = '';
  for (let i = 0; i <= ROWS; i++) {
    const y = T0 + i * RH;
    s += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" class="pl-line"/>`;
    if (i < ROWS) {
      s += `<line x1="${L}" y1="${y + RH / 2}" x2="${R}" y2="${y + RH / 2}" class="pl-half" stroke-dasharray="${G.dash}"/>`;
      s += `<text x="${G['hour-x']}" y="${y + G['hour-dy']}" class="pl-hr">${parts(from + i * 36e5, TZ.tky).h}時</text>`;
    }
  }
  bandsIn(from, to, hol).forEach((b, i) => {
    for (const g of b.segs) {
      s += `<rect x="${G['band-x'] + i * G['band-step']}" y="${f2(T0 + g.a * RH)}" width="${G['band-w']}" height="${f2((g.b - g.a) * RH)}" rx="${G['band-w'] / 2}" class="pl-b-${b.id}${g.rest ? ' rest' : ''}"/>`;
    }
  });
  let last = -Infinity;
  for (const x of eventsBetween(from, to, hol, ind)) {
    const y = Y(x.t), ty = Math.max(y, last + G.gap);
    last = ty;
    const k = x.ev.kind, lab = `${x.ev.approx ? 'ごろ' : hm(x.t)} ${x.ev.name}${x.off ? `・${x.off}` : ''}${x.gotobi ? `・${x.gotobi}` : ''}`;
    const cls = [x.t <= now && 'past', x.off && 'off', k === 'minor' && 'minor', k === 'ind' && 'ind'].filter(Boolean).join(' ');
    s += `<g class="pl-it ${cls}">`;
    if (k === 'fix' && !x.off) s += `<rect x="${G['text-x'] - 2}" y="${f2(ty - G['pen-dy'])}" width="${f2([...lab].length * G['pen-em'])}" height="${G['pen-h']}" class="pl-pen"/>`;
    s += `<circle cx="${G['dot-x']}" cy="${f2(y)}" r="${G['dot-r']}" class="pl-dot d-${k}"/><text x="${G['text-x']}" y="${f2(ty + G['text-dy'])}" class="pl-tx">${lab}</text></g>`;
  }
  const ny = f2(Y(now)), p = parts(now, TZ.tky);
  s += `<line x1="${L}" y1="${ny}" x2="${R}" y2="${ny}" class="pl-now"/><circle cx="${L}" cy="${ny}" r="${G['now-r']}" class="pl-nowdot"/>`;
  s += `<text x="${G['now-x']}" y="${f2(Y(now) - G['now-dy'])}" class="pl-nowtx">いま ${p.h}:${pad(p.mi)}</text>`;
  return s;
}

function build(root) {
  root.className = 'page planner';
  root.innerHTML = `<header class="pl-top"><h1>FX時計</h1><div class="top-r"><span class="tools-slot"></span></div></header>
<div class="pl-main">
  <div class="pl-sheet swipe">
    <div class="pl-head"><div class="pl-date" data-k="date"></div><div class="pl-stamp" data-k="stamp"></div></div>
    <svg class="pl-svg" data-k="svg" viewBox="0 0 ${G.w} ${G.top * 2 + ROWS * G['row-h']}" role="img" aria-label="いまの前${G.before}時間と後ろ${G.after}時間の手帳のページ。赤い線がいま"></svg>
    <div class="pl-leg">${SESSIONS.map((s) => `<span><i class="pl-k-${s.id}"></i>${s.name}</span>`).join('')}<span><u>蛍光ペン</u>は値が決まる時間</span></div>
  </div>
  <div class="dots-slot"></div>
  <div class="pl-side">
    <div class="hol-slot"></div>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['date', 'stamp', 'svg'].map((k) => [k, q(k)]));
}

function render(root, { now, p, dst, closed, gotobi, hol, ind }) {
  const el = root._k;
  el.date.innerHTML = `${p.mo}月${p.d}日（${WD[p.wd]}）<small>${seasonLabel(dst)}</small>`;
  const st = gotobi ? `ゴトー<br>日${gotobi.includes('前倒し') ? '<small>前倒し</small>' : ''}` : closed ? '市場<br>お休み' : 'ふつう<br>の日';
  if (el.stamp.innerHTML !== st) {
    el.stamp.innerHTML = st;
    el.stamp.classList.toggle('plain', !gotobi);
  }
  el.svg.innerHTML = page(now, hol, ind);
}

// 形のえらぶ所の小さな絵（手帳）。c は [紙の色, ペンの色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="3" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><path d="M9 8h25M9 15h25M9 22h25" stroke="${c2}" stroke-opacity=".3"/><path d="M5 12.5h30" stroke="${c2}" stroke-width="1.6"/><circle cx="5" cy="12.5" r="2" fill="${c2}"/></svg>`;
}

export default { id: 'planner', name: '手帳', group: 'kawaii', chip: 'rect', icon, build, render };
