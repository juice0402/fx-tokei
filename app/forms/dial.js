// 形「24時間の輪」。計算は time.js（ctx）、色と大きさと飾りは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, formatLeft, seasonLabel, dayFraction } from '../time.js';
import { SIZE, SKINS } from '../skins.js';

const G = SIZE.dial.geo;
const C = G.view / 2;
const RING = G['ring-r']; // シドニー・東京・ロンドン・NY の輪
const DEG_H = 360 / 24;
const f2 = (n) => n.toFixed(2);
const pt = (r, a) => { const t = (a * Math.PI) / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; };
const angle = (t) => dayFraction(t) * 360;
const arc = (r, a0, len) => {
  const a = pt(r, a0), b = pt(r, a0 + len);
  return `M${f2(a[0])} ${f2(a[1])}A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};
const shortDate = (p) => `${p.mo}/${p.d}（${WD[p.wd]}）`;
const dir = (c) => (c.summer ? '夏時間へ' : '冬時間へ');

// 飾りの模様（年輪・紙の繊維）は決まった種から作る（毎回同じ絵）
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const KAN = { 0: '〇', 3: '三', 6: '六', 9: '九', 12: '十二', 15: '十五', 18: '十八', 21: '二十一' };
function grad(id, stops, radial) {
  const st = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  return radial ? `<radialGradient id="${id}" cx="45%" cy="40%" r="65%">${st}</radialGradient>`
    : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${st}</linearGradient>`;
}

function faceSvg(skin) {
  const o = (SKINS[skin] && SKINS[skin].deco) || {};
  const id = `d-${skin}`;
  const R = rng(skin.length * 977 + 13);
  const glow = (k) => (o.glowOn && o.glowOn.includes(k) ? ` filter="url(#${id}g)"` : '');
  let s = `<defs><clipPath id="${id}c"><circle cx="${C}" cy="${C}" r="${G['clip-r']}"/></clipPath>`;
  if (o.bez) s += grad(`${id}b`, o.bez, false);
  if (o.face) s += grad(`${id}f`, o.face, true);
  if (o.glow) s += `<filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${o.glow}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  s += '</defs>';
  if (o.extra === 'screws') {
    const a0 = G['screw-at'], a1 = G.view - a0, w = G['screw-slot'];
    s += `<rect x="0" y="0" width="${G.view}" height="${G.view}" rx="${G['panel-rx']}" class="panel"/>`;
    for (const [x, y, deg] of [[a0, a0, 35], [a1, a0, -25], [a0, a1, 70], [a1, a1, 10]]) {
      const a = (deg * Math.PI) / 180, dx = w * Math.cos(a), dy = w * Math.sin(a);
      s += `<circle cx="${x}" cy="${y}" r="${G['screw-r']}" class="screw"/><line x1="${f2(x - dx)}" y1="${f2(y - dy)}" x2="${f2(x + dx)}" y2="${f2(y + dy)}" class="screw-slot"/>`;
    }
  }
  s += `<circle cx="${C}" cy="${C}" r="${G['bezel-r']}" class="bezel"${o.bez ? ` style="fill:url(#${id}b)"` : ''}/>`;
  s += `<circle cx="${C}" cy="${C}" r="${G['face-r']}" class="face"${o.face ? ` style="fill:url(#${id}f)"` : ''}/>`;
  const F = G['face-r'];
  if (o.extra === 'rings') {
    for (let r = 5; r < F - 4;) {
      s += `<ellipse cx="${f2(C - 2 + R() * 4)}" cy="${f2(C + 1 + R() * 3)}" rx="${f2(r)}" ry="${f2(r * (0.95 + R() * 0.04))}" class="grain" stroke-width="${f2(0.5 + R() * 0.9)}"/>`;
      r += 3 + R() * 6;
    }
  }
  if (o.extra === 'hairline') for (let r = 3; r < F; r += G['hair-step']) s += `<circle cx="${C}" cy="${C}" r="${f2(r)}" class="grain hair"/>`;
  if (o.extra === 'fibers') {
    s += `<g clip-path="url(#${id}c)">`;
    for (let i = 0; i < 110; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * (G['clip-r'] - 1), x = C + rr * Math.cos(a), y = C + rr * Math.sin(a);
      const L = 5 + R() * 16, b = R() * Math.PI, x2 = x + L * Math.cos(b), y2 = y + L * Math.sin(b);
      const cx = (x + x2) / 2 + (R() - 0.5) * 8, cy = (y + y2) / 2 + (R() - 0.5) * 8;
      s += `<path d="M${f2(x)} ${f2(y)}Q${f2(cx)} ${f2(cy)} ${f2(x2)} ${f2(y2)}" class="grain fiber" stroke-width="${f2(0.35 + R() * 0.6)}"/>`;
    }
    s += '</g>';
  }
  for (const r of RING) s += `<circle cx="${C}" cy="${C}" r="${r}" class="track"/>`;
  const per = G['ticks-per-hour'], n = 24 * per, [inBig, inHour, inQ] = G['tick-in'];
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n, big = i % (per * G['num-step']) === 0, hour = i % per === 0;
    const p1 = pt(big ? inBig : hour ? inHour : inQ, a), p2 = pt(G['tick-out'], a);
    s += `<line x1="${f2(p1[0])}" y1="${f2(p1[1])}" x2="${f2(p2[0])}" y2="${f2(p2[1])}" class="tk${big ? ' tk-big' : hour ? '' : ' tk-q'}"/>`;
  }
  s += `<g${glow('num')}>`;
  for (let h = 0; h < 24; h += G['num-step']) {
    const p = pt(G['num-r'], h * DEG_H), lab = o.nums === 'kan' ? KAN[h] : String(h);
    s += `<text x="${p[0].toFixed(1)}" y="${(p[1] + G['num-dy']).toFixed(1)}" class="num${lab.length > 2 ? ' long' : ''}">${lab}</text>`;
  }
  s += '</g>';
  s += `<g data-k="arcs"${glow('arc')}></g><g data-k="marks"${glow('mark')}></g><g data-k="ind"></g><g data-k="ptr"${glow('ptr')}></g><circle data-k="sec" r="${G['sec-dot']}" class="sec" cx="${C}" cy="${C - G['sec-r']}"/>`;
  s += `<text data-k="date" x="${C}" y="${G['date-y']}" class="date"></text><text data-k="time" x="${C}" y="${G['time-y']}" class="time"${glow('time')}></text>`;
  s += `<text data-k="nextName" x="${C}" y="${G['next-name-y']}" class="next-name"></text><text data-k="nextLeft" x="${C}" y="${G['next-left-y']}" class="next-left"></text>`;
  s += `<text data-k="state" x="${C}" y="${G['state-y']}" class="state"></text>`;
  return s;
}

function build(root, skin = 'kon') {
  root.className = 'page dial';
  root.innerHTML = `<header class="top"><h1>FX時計</h1><div class="top-r"><span data-k="season"></span><span class="tools-slot"></span></div></header>
<div class="body">
  <div class="swipe"><svg class="dial-svg" viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="日本時間の24時間の文字盤。色の輪が各市場の取引時間">${faceSvg(skin)}</svg><div class="dots-slot"></div></div>
  <div class="side">
    <div class="legend" data-k="legend"></div>
    <ul class="list" data-k="list"></ul>
    <div class="hol-slot"></div>
    <p class="dst" data-k="dst"></p>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['season', 'arcs', 'marks', 'ptr', 'sec', 'date', 'time', 'nextName', 'nextLeft', 'state', 'legend', 'list', 'dst', 'ind'].map((k) => [k, q(k)]));
}

function render(root, { now, p, sc, dst, closed, sessions, indDay }) {
  const el = root._k;
  el.season.textContent = seasonLabel(dst);
  el.date.textContent = `${p.mo}月${p.d}日（${WD[p.wd]}）`;
  el.time.textContent = `${p.h}:${pad(p.mi)}`;
  const sp = pt(G['sec-r'], (p.s * 360) / 60);
  el.sec.setAttribute('cx', f2(sp[0]));
  el.sec.setAttribute('cy', f2(sp[1]));
  const a = angle(now), p1 = pt(G['ptr-in'], a), p2 = pt(G['ptr-out'], a);
  el.ptr.innerHTML = `<line x1="${f2(p1[0])}" y1="${f2(p1[1])}" x2="${f2(p2[0])}" y2="${f2(p2[1])}" class="ptr"/><circle cx="${f2(p2[0])}" cy="${f2(p2[1])}" r="${G['ptr-dot']}" class="ptr-dot"/>`;
  if (sc.next) {
    el.nextName.textContent = `${sc.next.ev.name} ${hm(sc.next.t)}`;
    el.nextLeft.textContent = formatLeft(sc.next.t - now);
  }

  let arcs = '', legend = '';
  const open = [];
  sessions.forEach((s, i) => {
    const { iv, open: on } = s;
    if (on) open.push(s.name);
    const rest = s.rest ? ' hol' : '';
    if (iv) arcs += `<path d="${arc(RING[i], angle(iv.a), ((iv.b - iv.a) / 36e5) * DEG_H)}" class="arc s-${s.id}${on ? '' : ' off'}${rest}"/>`;
    legend += `<span class="${on ? 'on' : ''}"><i class="b-${s.id}"></i>${s.name}</span>`;
  });
  el.arcs.innerHTML = arcs;
  el.legend.innerHTML = legend;
  el.state.textContent = closed ? '土日は市場がお休み' : open.length ? `${open.join('・')} 取引中` : '';

  let marks = '', list = '';
  const [dotBig, dotMinor] = G['mark-dot'];
  for (const x of sc.list) {
    const m = pt(G['mark-r'], angle(x.t));
    marks += `<circle cx="${f2(m[0])}" cy="${f2(m[1])}" r="${x.ev.kind === 'minor' ? dotMinor : dotBig}" class="mark${x.off ? ' off' : ''}"/>`;
    const past = x.t <= now, isNext = sc.next === x;
    const goto = x.gotobi ? `<small>${x.gotobi}</small>` : '';
    const cls = [past && 'past', isNext && 'next', x.ev.kind === 'minor' && 'minor', x.off && 'off'].filter(Boolean).join(' ');
    list += `<li class="${cls}"><time>${hm(x.t)}</time><span>${x.ev.name}${goto}</span><em>${x.off || (isNext ? formatLeft(x.t - now) : '')}</em></li>`;
  }
  el.marks.innerHTML = marks;

  // 指標：輪の上に小さなひし形（★3は少し大きく）。その日の範囲（前の NY クローズから24時間）だけ
  let im = '';
  const [indBig, indSmall] = G['ind-dot'];
  for (const e of indDay) {
    const [x, y] = pt(G['mark-r'], angle(e.t)), r = e.imp >= 3 ? indBig : indSmall;
    im += `<path d="M${f2(x)} ${f2(y - r)}L${f2(x + r)} ${f2(y)}L${f2(x)} ${f2(y + r)}L${f2(x - r)} ${f2(y)}Z" class="ind${e.imp >= 3 ? ' ind3' : ''}"/>`;
  }
  el.ind.innerHTML = im;
  el.list.innerHTML = list;

  const same = dst.us.summer === dst.uk.summer;
  let d = same
    ? `<b>${dir(dst.us)}</b>　米 ${shortDate(dst.us.p)}・英 ${shortDate(dst.uk.p)}<br>`
    : `米 ${shortDate(dst.us.p)}<b>${dir(dst.us)}</b>・英 ${shortDate(dst.uk.p)}<b>${dir(dst.uk)}</b><br>`;
  d += dst.gapNow
    ? `いまはNYだけ夏時間（${shortDate(dst.first.p)}まで）`
    : `${dst.first.p.mo}/${dst.first.p.d}〜${dst.second.p.mo}/${dst.second.p.d} はNYだけ夏時間`;
  el.dst.innerHTML = d;
}

// 形のえらぶ所の小さな絵（丸い文字盤）。c は [地の色, 針の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="${c2}" stroke-width="1.6" stroke-dasharray="2.2 3.3"/><path d="M16 16 L16 6.5" stroke="${c2}" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="1.8" fill="${c2}"/></svg>`;
}

export default { id: 'dial', name: '24時間の輪', group: 'analog', chip: 'round', icon, build, render };
