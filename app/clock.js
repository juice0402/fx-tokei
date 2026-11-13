// 文字盤の画面。計算は time.js、ここは描くだけ
import {
  TZ, WD, SESSIONS, parts, pad, hm, schedule, sessionIntervals, isSessionOpen,
  isMarketClosed, isGotobi, dstInfo, formatLeft,
} from './time.js';

const $ = (id) => document.getElementById(id);
const RAD = [140, 131, 122, 113]; // シドニー・東京・ロンドン・NY の輪
const f2 = (n) => n.toFixed(2);
const pt = (r, a) => { const t = (a * Math.PI) / 180; return [180 + r * Math.sin(t), 180 - r * Math.cos(t)]; };
const angle = (t) => { const p = parts(t, TZ.tky); return (p.h + p.mi / 60 + p.s / 3600) * 15; };
const arc = (r, a0, len) => {
  const a = pt(r, a0), b = pt(r, a0 + len);
  return `M${f2(a[0])} ${f2(a[1])}A${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${f2(b[0])} ${f2(b[1])}`;
};
const shortDate = (p) => `${p.mo}/${p.d}（${WD[p.wd]}）`;
const dir = (c) => (c.summer ? '夏時間へ' : '冬時間へ');

function buildFace() {
  let s = '<circle cx="180" cy="180" r="178" class="bezel"/><circle cx="180" cy="180" r="104" class="face"/>';
  for (const r of RAD) s += `<circle cx="180" cy="180" r="${r}" class="track"/>`;
  for (let i = 0; i < 96; i++) {
    const a = i * 3.75, big = i % 12 === 0, hour = i % 4 === 0;
    const p1 = pt(big ? 145 : hour ? 149 : 152, a), p2 = pt(155, a);
    s += `<line x1="${f2(p1[0])}" y1="${f2(p1[1])}" x2="${f2(p2[0])}" y2="${f2(p2[1])}" class="tk${big ? ' tk-big' : hour ? '' : ' tk-q'}"/>`;
  }
  for (let h = 0; h < 24; h += 3) {
    const p = pt(167, h * 15);
    s += `<text x="${p[0].toFixed(1)}" y="${(p[1] + 4.5).toFixed(1)}" class="num">${h}</text>`;
  }
  s += '<g id="arcs"></g><g id="marks"></g><g id="ptr"></g><circle id="sec" r="2.4" class="sec" cx="180" cy="83"/>';
  s += '<text id="date" x="180" y="128" class="date"></text><text id="time" x="180" y="170" class="time"></text>';
  s += '<text id="nextName" x="180" y="197" class="next-name"></text><text id="nextLeft" x="180" y="219" class="next-left"></text>';
  s += '<text id="state" x="180" y="246" class="state"></text>';
  $('face').innerHTML = s;
}

function render() {
  const now = Date.now();
  const sc = schedule(now), dst = dstInfo(now), closed = isMarketClosed(now);
  const p = parts(now, TZ.tky);

  $('season').textContent = dst.gapNow ? 'NYだけ夏時間' : dst.summerNow ? '夏時間' : '冬時間';
  $('date').textContent = `${p.mo}月${p.d}日（${WD[p.wd]}）`;
  $('time').textContent = `${p.h}:${pad(p.mi)}`;
  const sp = pt(98, p.s * 6);
  $('sec').setAttribute('cx', f2(sp[0]));
  $('sec').setAttribute('cy', f2(sp[1]));
  const a = angle(now), p1 = pt(106, a), p2 = pt(157, a);
  $('ptr').innerHTML = `<line x1="${f2(p1[0])}" y1="${f2(p1[1])}" x2="${f2(p2[0])}" y2="${f2(p2[1])}" class="ptr"/><circle cx="${f2(p2[0])}" cy="${f2(p2[1])}" r="3.2" class="ptr-dot"/>`;
  if (sc.next) {
    $('nextName').textContent = `${sc.next.ev.name} ${hm(sc.next.t)}`;
    $('nextLeft').textContent = formatLeft(sc.next.t - now);
  }

  let arcs = '', legend = '';
  const open = [];
  SESSIONS.forEach((s, i) => {
    const iv = sessionIntervals(s, now, now + 3 * 864e5)[0];
    const on = isSessionOpen(s, now);
    if (on) open.push(s.name);
    if (iv) arcs += `<path d="${arc(RAD[i], angle(iv.a), ((iv.b - iv.a) / 36e5) * 15)}" class="arc s-${s.id}${on ? '' : ' off'}"/>`;
    legend += `<span class="${on ? 'on' : ''}"><i class="b-${s.id}"></i>${s.name}</span>`;
  });
  $('arcs').innerHTML = arcs;
  $('legend').innerHTML = legend;
  $('state').textContent = closed ? '土日は市場がお休み' : open.length ? `${open.join('・')} 取引中` : '';

  let marks = '', list = '';
  for (const x of sc.list) {
    const q = pt(159, angle(x.t));
    marks += `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="${x.ev.kind === 'minor' ? 1.8 : 2.8}" class="mark"/>`;
    const past = x.t <= now, isNext = sc.next === x;
    const goto = x.ev.id === 'nakane' && isGotobi(x.t) ? '<small>ゴトー日</small>' : '';
    const cls = [past && 'past', isNext && 'next', x.ev.kind === 'minor' && 'minor'].filter(Boolean).join(' ');
    list += `<li class="${cls}"><time>${hm(x.t)}</time><span>${x.ev.name}${goto}</span><em>${isNext ? formatLeft(x.t - now) : ''}</em></li>`;
  }
  $('marks').innerHTML = marks;
  $('list').innerHTML = list;

  const same = dst.us.summer === dst.uk.summer;
  let d = same
    ? `<b>${dir(dst.us)}</b>　米 ${shortDate(dst.us.p)}・英 ${shortDate(dst.uk.p)}<br>`
    : `米 ${shortDate(dst.us.p)}<b>${dir(dst.us)}</b>・英 ${shortDate(dst.uk.p)}<b>${dir(dst.uk)}</b><br>`;
  d += dst.gapNow
    ? `いまはNYだけ夏時間（${shortDate(dst.first.p)}まで）`
    : `${dst.first.p.mo}/${dst.first.p.d}〜${dst.second.p.mo}/${dst.second.p.d} はNYだけ夏時間`;
  $('dst').innerHTML = d;
}

function setupSkins() {
  const root = $('dial');
  const chips = document.querySelectorAll('.chip');
  const apply = (skin) => {
    root.dataset.skin = skin;
    chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.skin === skin ? 'true' : 'false'));
  };
  try { const saved = localStorage.getItem('fx-tokei-skin'); if (saved) apply(saved); } catch (e) { /* 保存できない環境 */ }
  chips.forEach((c) => c.addEventListener('click', () => {
    apply(c.dataset.skin);
    try { localStorage.setItem('fx-tokei-skin', c.dataset.skin); } catch (e) { /* 保存できない環境 */ }
  }));
}

buildFace();
setupSkins();
render();
setTimeout(() => { render(); setInterval(render, 1000); }, 1000 - (Date.now() % 1000));
