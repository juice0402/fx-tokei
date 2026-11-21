// 形「アナログ・ローズ」（見本 forms の B）。数字は 12・3・6・9 だけ、秒針の先に小さなハート、市場の輪はいまから12時間
// 下の札＝この先の大事な時間と指標（ctx の並び）
// 計算は time.js（ctx・handAngles・dial12・bandWindow）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, hm, formatLeft, seasonLabel, handAngles, dial12, bandWindow } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.rose.geo;
const C = G.view / 2;
const f2 = (n) => n.toFixed(2);
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;
const pt = (r, a) => { const t = (a * Math.PI) / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; };
const rot = (a) => `translate(${C} ${C}) rotate(${f2(a)})`;
const arc = (r, a0, len) => {
  const l = Math.min(len, 359.9);
  const a = pt(r, a0), b = pt(r, a0 + l);
  return `M${f2(a[0])} ${f2(a[1])}A${r} ${r} 0 ${l > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};
const CHIPS = 4;

function face(skin) {
  const id = `ro-${skin}`;
  let s = `<defs><radialGradient id="${id}f" cx="50%" cy="40%" r="65%"><stop offset="0" class="ro-f1"/><stop offset="1" class="ro-f2"/></radialGradient>`
    + `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="ro-r1"/><stop offset=".4" class="ro-r2"/><stop offset=".6" class="ro-r3"/><stop offset="1" class="ro-r4"/></linearGradient></defs>`
    + `<circle cx="${C}" cy="${C}" r="${G['rim-r']}" fill="url(#${id}r)"/><circle cx="${C}" cy="${C}" r="${G['face-r']}" fill="url(#${id}f)"/>`;
  for (let h = 0; h < 12; h++) {
    if (h % 3 === 0) {
      const q = pt(G['num-r'], h * 30);
      s += `<text x="${f2(q[0])}" y="${f2(q[1] + G['num-dy'])}" class="ro-num">${h === 0 ? 12 : h}</text>`;
    } else {
      const q = pt(G['dot-at'], h * 30);
      s += `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="${G['dot-r']}" class="ro-dot"/>`;
    }
  }
  s += `<g data-k="arcs"></g><text x="${C}" y="${G['brand-y']}" class="ro-brand">FX時計</text>`
    + `<text x="${C}" y="${G['n-y']}" class="ro-n" data-k="n"></text><text x="${C}" y="${G['l-y']}" class="ro-l" data-k="l"></text>`
    + `<g data-k="h"><path d="${G['hand-h']}" class="ro-hand"/></g><g data-k="m"><path d="${G['hand-m']}" class="ro-hand"/></g>`
    + `<g data-k="s"><line x1="0" y1="${G['hand-s'][0]}" x2="0" y2="${G['hand-s'][1]}" class="ro-sec"/><path transform="translate(0 ${G['heart-at']}) scale(${G['heart-k']})" d="${G.heart}" class="ro-heart"/><circle r="${G['cap-r'][0]}" class="ro-hand"/><circle r="${G['cap-r'][1]}" class="ro-cap"/></g>`;
  return `<svg class="ro-svg" viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="12時間の針の時計。内側の輪は、いまから12時間の市場の時間帯">${s}</svg>`;
}

function build(root, skin) {
  root.className = 'page rose';
  root.style.setProperty('--ro-max', G.max);
  root.style.setProperty('--ro-max-wide', G['max-wide']);
  root.innerHTML = `<header class="an-top"><span class="an-date" data-k="date"></span><div class="top-r"><span class="tools-slot"></span></div></header>
<div class="ro-dial swipe">${face(skin)}</div>
<p class="ro-chips" data-k="chips"></p>
<div class="dots-slot"></div>
<div class="events-slot"></div>
<div class="hol-slot"></div>
<div class="pick-slot"></div>`;
  root._k = {};
  for (const el of root.querySelectorAll('[data-k]')) root._k[el.dataset.k] = el;
}

function render(root, ctx) {
  const { now, p, sc, day, dst, closed, gotobi, sessions, hol, ind } = ctx;
  const el = root._k;
  const a = handAngles(p);
  el.h.setAttribute('transform', rot(a.h));
  el.m.setAttribute('transform', rot(a.m));
  el.s.setAttribute('transform', rot(a.s));
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;

  // 市場の輪：いまから12時間（開いている帯はこく、休みはうすく）
  const win = bandWindow(now, 0, G.hours, hol, ind);
  const a0 = dial12(now);
  let s = '';
  win.bands.forEach((b, i) => {
    const open = sessions.find((x) => x.id === b.id).open;
    for (const g of b.segs) {
      s += `<path d="${arc(G['arc-r0'] - i * G['arc-step'], a0 + g.a * 30, (g.b - g.a) * 30)}" class="ro-arc ro-${b.id}${open && g.a === 0 ? ' open' : ''}${g.rest ? ' hol' : ''}"/>`;
    }
  });
  el.arcs.innerHTML = s;

  if (sc.next) {
    el.n.textContent = `${closed ? '土日はお休み・' : ''}${sc.next.ev.name}まで`;
    el.l.textContent = formatLeft(sc.next.t - now);
  }
  let ch = gotobi ? `<span class="ro-chip g">きょうは${gotobi}</span>` : '';
  for (const x of day.filter((y) => y.t > now).slice(0, CHIPS)) {
    ch += `<span class="ro-chip${sc.next === x ? ' next' : ''}${x.off ? ' off' : ''}${x.ev.kind === 'ind' ? ' ind' : ''}">${hm(x.t)} ${x.ev.name}${x.off ? `・${x.off}` : ''}</span>`;
  }
  el.chips.innerHTML = ch;
}

// 形のえらぶ所の小さな絵（丸い文字盤と小さなハート）。c は [文字盤の色, 縁の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="${c2}"/><circle cx="15" cy="15" r="11.5" fill="${c1}"/><path d="M15 15V8" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/><path transform="translate(15 7) scale(.45)" d="${G.heart}" fill="${c2}"/></svg>`;
}

export default { id: 'rose', name: 'アナログ・ローズ', group: 'analog', chip: 'round', icon, build, render };
