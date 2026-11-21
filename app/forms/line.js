// 形「横に流れる帯」（見本 forms の H）。いまの少し前から先へ、市場の帯と大事な時間の印が横に並ぶ
// 計算は time.js（ctx と bandWindow）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, SESSIONS, pad, hm, formatLeft, seasonLabel, bandWindow } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.line.geo;
const F = SIZE.line.font;
const f2 = (n) => n.toFixed(2);
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;

// 画面の幅から窓の長さを決める：1時間 px-min〜px-max、後ろは after-min〜after-max 時間
// せまいときは px-min のまま描いて、幅に合わせて小さく見せる
export function windowSize(width) {
  const minH = G.before + G['after-min'], maxH = G.before + G['after-max'];
  const hours = Math.min(maxH, Math.max(minH, Math.floor(width / G['px-min'])));
  const px = Math.min(G['px-max'], Math.max(G['px-min'], width / hours));
  return { after: hours - G.before, px, w: hours * px };
}

// 文字の幅のめやす（数字と英字はせまい）
const textW = (s, fs) => [...s].reduce((n, c) => n + (c.charCodeAt(0) < 0x80 ? G['digit-w'] : G['char-w']) * fs, 0);

// 印の名前を上下2段に分けて、となりと重ならない段に置く
// どちらの段も重なるときは、ずらす幅が小さい段で右へずらす（小さい印の名前は出さない）
export function placeLabels(marks, w) {
  const end = G['label-y'].map(() => -Infinity);
  const gap = G['label-pad'];
  return marks.map((m) => {
    const half = textW(m.text, F.label) / 2;
    const x = Math.min(Math.max(m.x, half), w - half);
    const shift = end.map((e) => Math.max(0, e + gap + half - x));
    let row = shift.indexOf(Math.min(...shift));
    if (shift[row] > 0 && m.minor) return { ...m, row: -1, lx: x };
    const lx = Math.min(x + shift[row], w - half);
    end[row] = lx + half;
    return { ...m, row, lx };
  });
}

function band(ctx, width) {
  const { after, px, w } = windowSize(width);
  const win = bandWindow(ctx.now, G.before, after, ctx.hol, ctx.ind);
  const X = (h) => h * px;
  const [a0, a1] = G['axis-y'];
  const nx = X(win.now);
  let s = `<rect x="0" y="${G['shade-y']}" width="${f2(nx)}" height="${a1 - G['shade-y']}" class="ln-past"/>`;
  for (const hr of win.hours) {
    const x = X(hr.at);
    s += `<line x1="${f2(x)}" y1="${a0}" x2="${f2(x)}" y2="${a1}" class="ln-tick"/>`;
    if (hr.h % G['hour-every'] === 0) s += `<text x="${f2(x)}" y="${G['hour-y']}" class="ln-hr">${hr.h}時</text>`;
  }
  win.bands.forEach((b, i) => {
    const y = G['lane-y0'] + i * G['lane-step'];
    s += `<rect x="0" y="${y}" width="${f2(w)}" height="${G['lane-h']}" class="ln-lane"/>`;
    for (const g of b.segs) {
      s += `<rect x="${f2(X(g.a))}" y="${y}" width="${f2(X(g.b) - X(g.a))}" height="${G['lane-h']}" rx="${G['lane-rx']}" class="ln-${b.id}${g.past ? ' past' : ''}${g.rest ? ' hol' : ''}"/>`;
    }
  });
  const marks = win.items.map((x) => ({
    x: X(x.at), it: x, minor: x.ev.kind === 'minor',
    text: `${x.ev.approx ? hm(x.t).split(':')[0] + '時ごろ' : hm(x.t)} ${x.ev.name}${x.off ? `（${x.off}）` : ''}`,
  }));
  for (const m of placeLabels(marks, w)) {
    const x = m.it;
    const cls = ['ln-mark', x.ev.kind, x.t <= ctx.now ? 'past' : '', x.off ? 'off' : '', x.ev.imp >= 3 ? 'imp3' : ''].filter(Boolean).join(' ');
    const ly = m.row >= 0 ? G['label-y'][m.row] : G['label-y'][G['label-y'].length - 1];
    s += `<g class="${cls}"><line x1="${f2(m.x)}" y1="${ly + G['dot-r'] * 2}" x2="${f2(m.x)}" y2="${a0 - 4}"/><circle cx="${f2(m.x)}" cy="${ly + G['dot-r'] * 2}" r="${G['dot-r']}"/>`;
    if (m.row >= 0) s += `<text x="${f2(m.lx)}" y="${ly}">${m.text}</text>`;
    s += '</g>';
  }
  s += `<line x1="${f2(nx)}" y1="${G['now-y0']}" x2="${f2(nx)}" y2="${a1}" class="ln-now"/><text x="${f2(nx)}" y="${G['now-label-y']}" class="ln-nowlab">いま</text>`;
  const label = `${G.before}時間前から${after}時間後までの市場の時間帯と大事な時間。赤い線がいま`;
  return `<svg viewBox="0 0 ${f2(w)} ${G.h}" width="${f2(w)}" height="${G.h}" role="img" aria-label="${label}">${s}</svg>`;
}

function build(root) {
  root.className = 'page line';
  const leg = SESSIONS.map((s) => `<span><i class="ln-${s.id}"></i>${s.name}</span>`).join('');
  root.innerHTML = `<header class="ln-top"><h1 class="ln-brand">FX時計<small>市場の流れ</small></h1><div class="top-r"><span class="ln-date" data-k="date"></span><span class="tools-slot"></span></div></header>
<div class="ln-head swipe"><div class="ln-time" data-k="time" role="timer" aria-label="いまの時刻"></div><div class="ln-next" data-k="next"></div></div>
<div class="ln-band swipe" data-k="band"></div>
<p class="ln-leg">${leg}<span class="ln-fixnote">赤い印は値が決まる時間</span></p>
<div class="dots-slot"></div>
<div class="events-slot"></div>
<div class="hol-slot"></div>
<div class="pick-slot"></div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['date', 'time', 'next', 'band'].map((k) => [k, q(k)]));
}

function render(root, ctx) {
  const { now, p, sc, dst, closed } = ctx;
  const el = root._k;
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;
  el.time.textContent = `${p.h}:${pad(p.mi)}:${pad(p.s)}`;
  if (sc.next) {
    el.next.innerHTML = `${closed ? '土日はお休み・次は' : '次は'}<b>${hm(sc.next.t)} ${sc.next.ev.name}</b><span>${formatLeft(sc.next.t - now)}</span>`;
  }
  el.band.innerHTML = band(ctx, el.band.clientWidth || G.before * G['px-min'] + G['after-min'] * G['px-min']);
}

// 形のえらぶ所の小さな絵（横の帯といまの線）。c は [地の色, 線の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="4" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><path d="M4 12h14M9 17h20M15 22h21" stroke="${c2}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/><path d="M12 5v21" stroke="${c2}" stroke-width="1.6"/></svg>`;
}

export default { id: 'line', name: '横に流れる帯', group: 'gadget', chip: 'rect', icon, build, render };
