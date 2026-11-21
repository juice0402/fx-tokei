// 形「世界時計」（見本 forms の C）。東京・ロンドン・ニューヨークの針の時計（その街の時刻・夏時間は Intl で自動）
// ランプ：取引中・まもなく（開く1時間前から）・休み（その市場の休みの日）・お休み。その街が夜（18時〜6時）は文字盤が暗い
// 下の並び＝この先の大事な時間と指標（ctx の並び）
// 計算は time.js（ctx の cities・handAngles）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, formatLeft, seasonLabel, handAngles, CITIES } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.world.geo;
const C = G.view / 2;
const f2 = (n) => n.toFixed(2);
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;
const pt = (r, a) => { const t = (a * Math.PI) / 180; return [C + r * Math.sin(t), C - r * Math.cos(t)]; };
const rot = (a) => `translate(${C} ${C}) rotate(${f2(a)})`;
const STATE = { open: '取引中', soon: 'まもなく', rest: '休み', closed: 'お休み' };
const NEXT = 3;

function clock(c) {
  const [big, small, out] = G.tick;
  let k = `<circle cx="${C}" cy="${C}" r="${G['bezel-r']}" class="w-bezel"/><circle cx="${C}" cy="${C}" r="${G['face-r']}" class="w-face"/>`;
  for (let h = 0; h < 12; h++) {
    const isBig = h % 3 === 0, a = pt(isBig ? big : small, h * 30), b = pt(out, h * 30);
    k += `<line x1="${f2(a[0])}" y1="${f2(a[1])}" x2="${f2(b[0])}" y2="${f2(b[1])}" class="w-tk${isBig ? ' big' : ''}"/>`;
  }
  k += `<path class="w-h" d="${G['hand-h']}"/><path class="w-m" d="${G['hand-m']}"/><line class="w-s" x1="0" y1="${G['hand-s'][0]}" x2="0" y2="${G['hand-s'][1]}"/><circle cx="${C}" cy="${C}" r="${G['cap-r']}" class="w-cap"/>`;
  return `<svg viewBox="0 0 ${G.view} ${G.view}" role="img" aria-label="${c.name}の時計">${k}</svg>`;
}

function build(root) {
  root.className = 'page world';
  root.style.setProperty('--world-max', G.max);
  root.style.setProperty('--world-max-wide', G['max-wide']);
  const cities = CITIES.map((c) => `<div class="city" data-city="${c.id}">${clock(c)}<div class="w-name">${c.name}</div><div class="w-dig"></div><div class="w-st"><i></i><span></span></div><div class="w-sea"></div></div>`).join('');
  root.innerHTML = `<header class="w-top"><h1 class="w-brand">FX時計<small>世界時計</small></h1><div class="top-r"><span class="w-date" data-k="date"></span><span class="tools-slot"></span></div></header>
<div class="w-row swipe">${cities}</div>
<div class="w-next" data-k="next"></div>
<div class="dots-slot"></div>
<div class="events-slot"></div>
<div class="hol-slot"></div>
<div class="pick-slot"></div>`;
  root._k = { date: root.querySelector('[data-k="date"]'), next: root.querySelector('[data-k="next"]'), city: {} };
  for (const c of CITIES) {
    const box = root.querySelector(`[data-city="${c.id}"]`);
    const q = (s) => box.querySelector(s);
    root._k.city[c.id] = { box, h: q('.w-h'), m: q('.w-m'), s: q('.w-s'), dig: q('.w-dig'), st: q('.w-st'), stt: q('.w-st span'), sea: q('.w-sea') };
  }
}

function render(root, ctx) {
  const { now, p, sc, day, dst, closed, cities } = ctx;
  const el = root._k;
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;
  for (const c of cities) {
    const k = el.city[c.id], a = handAngles(c.p);
    k.h.setAttribute('transform', rot(a.h));
    k.m.setAttribute('transform', rot(a.m));
    k.s.setAttribute('transform', rot(a.s));
    k.box.classList.toggle('night', c.night);
    k.dig.textContent = `${c.p.h}:${pad(c.p.mi)}`;
    k.st.className = `w-st ${c.state}`;
    k.stt.textContent = STATE[c.state];
    k.sea.textContent = c.season || '時差の基準';
  }
  let h = '';
  day.filter((x) => x.t > now).slice(0, NEXT).forEach((x) => {
    const isNext = sc.next === x;
    h += `<div class="${isNext ? 'first' : ''}${x.off ? ' off' : ''}${x.ev.kind === 'ind' ? ' ind' : ''}"><time>${hm(x.t)}</time><span>${x.ev.name}${x.off ? `・${x.off}` : ''}</span><em>${isNext ? formatLeft(x.t - now) : ''}</em></div>`;
  });
  el.next.innerHTML = (closed && sc.next ? '<p class="w-closed">土日はお休み</p>' : '') + h;
}

// 形のえらぶ所の小さな絵（3つの丸い時計）。c は [地の色, 文字盤の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="4" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><circle cx="8.5" cy="15" r="5.5" fill="${c2}"/><circle cx="20" cy="15" r="5.5" fill="${c2}"/><circle cx="31.5" cy="15" r="5.5" fill="${c2}" opacity=".45"/></svg>`;
}

export default { id: 'world', name: '世界時計', group: 'business', chip: 'rect', icon, build, render };
