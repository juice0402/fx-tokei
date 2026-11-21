// 形「文字盤」。計算は time.js、色と大きさは skins.json（skins.js）、ここは描くだけ
import {
  TZ, WD, SESSIONS, parts, pad, hm, sessionIntervals, isSessionOpen, isGotobi, formatLeft, seasonLabel, indicatorsIn,
} from './time.js';
import { SIZE } from './skins.js';

const G = SIZE.dial.geo;
const C = G.view / 2;
const RING = G['ring-r']; // シドニー・東京・ロンドン・NY の輪
const DEG_H = 360 / 24;
const f2 = (n) => n.toFixed(2);
const pt = (r, a) => { const t = (a * Math.PI) / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; };
const angle = (t) => { const p = parts(t, TZ.tky); return (p.h + p.mi / 60 + p.s / 3600) * DEG_H; };
const arc = (r, a0, len) => {
  const a = pt(r, a0), b = pt(r, a0 + len);
  return `M${f2(a[0])} ${f2(a[1])}A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};
const shortDate = (p) => `${p.mo}/${p.d}（${WD[p.wd]}）`;
const dir = (c) => (c.summer ? '夏時間へ' : '冬時間へ');

function faceSvg() {
  let s = `<circle cx="${C}" cy="${C}" r="${G['bezel-r']}" class="bezel"/><circle cx="${C}" cy="${C}" r="${G['face-r']}" class="face"/>`;
  for (const r of RING) s += `<circle cx="${C}" cy="${C}" r="${r}" class="track"/>`;
  const per = G['ticks-per-hour'], n = 24 * per, [inBig, inHour, inQ] = G['tick-in'];
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n, big = i % (per * G['num-step']) === 0, hour = i % per === 0;
    const p1 = pt(big ? inBig : hour ? inHour : inQ, a), p2 = pt(G['tick-out'], a);
    s += `<line x1="${f2(p1[0])}" y1="${f2(p1[1])}" x2="${f2(p2[0])}" y2="${f2(p2[1])}" class="tk${big ? ' tk-big' : hour ? '' : ' tk-q'}"/>`;
  }
  for (let h = 0; h < 24; h += G['num-step']) {
    const p = pt(G['num-r'], h * DEG_H);
    s += `<text x="${p[0].toFixed(1)}" y="${(p[1] + G['num-dy']).toFixed(1)}" class="num">${h}</text>`;
  }
  s += `<g data-k="arcs"></g><g data-k="marks"></g><g data-k="ind"></g><g data-k="ptr"></g><circle data-k="sec" r="${G['sec-dot']}" class="sec" cx="${C}" cy="${C - G['sec-r']}"/>`;
  s += `<text data-k="date" x="${C}" y="${G['date-y']}" class="date"></text><text data-k="time" x="${C}" y="${G['time-y']}" class="time"></text>`;
  s += `<text data-k="nextName" x="${C}" y="${G['next-name-y']}" class="next-name"></text><text data-k="nextLeft" x="${C}" y="${G['next-left-y']}" class="next-left"></text>`;
  s += `<text data-k="state" x="${C}" y="${G['state-y']}" class="state"></text>`;
  return s;
}

function mount(root) {
  root.className = 'page dial';
  root.innerHTML = `<header class="top"><h1>FX時計</h1><div class="top-r"><span data-k="season"></span><span class="tools-slot"></span></div></header>
<div class="body">
  <svg class="dial-svg" viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="日本時間の24時間の文字盤。色の輪が各市場の取引時間">${faceSvg()}</svg>
  <div class="side">
    <div class="legend" data-k="legend"></div>
    <ul class="list" data-k="list"></ul>
    <p class="dst" data-k="dst"></p>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  const el = Object.fromEntries(['season', 'arcs', 'marks', 'ptr', 'sec', 'date', 'time', 'nextName', 'nextLeft', 'state', 'legend', 'list', 'dst', 'ind'].map((k) => [k, q(k)]));
  return (ctx) => render(el, ctx);
}

function render(el, { now, p, sc, dst, closed, ind }) {
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
  SESSIONS.forEach((s, i) => {
    const iv = sessionIntervals(s, now, now + 3 * 864e5)[0];
    const on = isSessionOpen(s, now);
    if (on) open.push(s.name);
    if (iv) arcs += `<path d="${arc(RING[i], angle(iv.a), ((iv.b - iv.a) / 36e5) * DEG_H)}" class="arc s-${s.id}${on ? '' : ' off'}"/>`;
    legend += `<span class="${on ? 'on' : ''}"><i class="b-${s.id}"></i>${s.name}</span>`;
  });
  el.arcs.innerHTML = arcs;
  el.legend.innerHTML = legend;
  el.state.textContent = closed ? '土日は市場がお休み' : open.length ? `${open.join('・')} 取引中` : '';

  let marks = '', list = '';
  const [dotBig, dotMinor] = G['mark-dot'];
  for (const x of sc.list) {
    const m = pt(G['mark-r'], angle(x.t));
    marks += `<circle cx="${f2(m[0])}" cy="${f2(m[1])}" r="${x.ev.kind === 'minor' ? dotMinor : dotBig}" class="mark"/>`;
    const past = x.t <= now, isNext = sc.next === x;
    const goto = x.ev.id === 'nakane' && isGotobi(x.t) ? '<small>ゴトー日</small>' : '';
    const cls = [past && 'past', isNext && 'next', x.ev.kind === 'minor' && 'minor'].filter(Boolean).join(' ');
    list += `<li class="${cls}"><time>${hm(x.t)}</time><span>${x.ev.name}${goto}</span><em>${isNext ? formatLeft(x.t - now) : ''}</em></li>`;
  }
  el.marks.innerHTML = marks;

  // 指標：輪の上に小さなひし形（★3は少し大きく）。その日の範囲（前の NY クローズから24時間）だけ
  let im = '';
  const [indBig, indSmall] = G['ind-dot'];
  for (const e of indicatorsIn(ind || [], sc.start, sc.start + 864e5, 1)) {
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

export default { id: 'dial', name: '文字盤', chip: 'round', icon, mount };
