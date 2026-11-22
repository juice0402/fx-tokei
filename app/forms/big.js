// 形「大きな数字」（見本D）。計算は time.js（ctx）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, seasonLabel, formatHms, diaRange, eventsBetween } from '../time.js';
import { SIZE } from '../skins.js';

const G = SIZE.big.geo;
const f2 = (n) => n.toFixed(2);

// 一日の線：7時〜翌7時。大事な時間は縦の印（値が決まる時間は赤）、指標はひし形、いまは丸
function dayLine(now, hol, ind) {
  const { from, to } = diaRange(now, G['start-hour']);
  const px = G['day-w'] / 24, Y = G['axis-y'], X = (t) => ((t - from) / 36e5) * px;
  const [top, topMinor] = G['mark-top'];
  let s = `<line x1="0" y1="${Y}" x2="${G['day-w']}" y2="${Y}" class="bg-axis"/>`;
  for (const off of G['hour-marks']) {
    s += `<text x="${off * px + G['hour-dx']}" y="${G['hour-y']}" class="bg-hr">${(G['start-hour'] + off) % 24}</text>`;
  }
  for (const x of eventsBetween(from, to, hol, ind)) {
    const xx = f2(X(x.t)), k = x.ev.kind;
    if (k === 'ind') {
      const r = G['ind-r'][x.ev.imp >= 3 ? 0 : 1], c = Y - top + r;
      s += `<path d="M${xx} ${f2(c - r)}l${r} ${r}l${-r} ${r}l${-r} ${-r}Z" class="bg-ind${x.ev.imp >= 3 ? ' imp3' : ''}"/>`;
    } else {
      s += `<line x1="${xx}" y1="${k === 'minor' ? topMinor : top}" x2="${xx}" y2="${Y}" class="bg-mk${k === 'fix' ? ' fix' : ''}${x.off ? ' off' : ''}"/>`;
    }
  }
  s += `<circle cx="${f2(X(now))}" cy="${Y}" r="${G['now-r']}" class="bg-now"/>`;
  return `<svg viewBox="0 0 ${G['day-w']} ${G['day-h']}" role="img" aria-label="きょうの大事な時間（${G['start-hour']}時から翌${G['start-hour']}時）。丸がいま">${s}</svg>`;
}

function build(root) {
  root.className = 'page big';
  root.innerHTML = `<header class="bg-head"><h1>FX時計</h1><div class="top-r"><span data-k="season"></span><span class="tools-slot"></span></div></header>
<div class="bg-main">
  <div class="bg-clock swipe">
    <p class="bg-next" data-k="next"></p>
    <div class="bg-num" data-k="num" role="timer"></div>
    <div class="bg-bar"><i data-k="bar"></i></div>
    <div class="bg-day" data-k="day"></div>
    <p class="bg-foot" data-k="foot"></p>
  </div>
  <div class="dots-slot"></div>
  <div class="bg-side">
    <div class="hol-slot"></div>
    <div class="events-slot"></div>
    <div class="pick-slot"></div>
  </div>
</div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['season', 'next', 'num', 'bar', 'day', 'foot'].map((k) => [k, q(k)]));
}

function render(root, { now, p, sc, dst, closed, sessions, progress, gotobi, hol, ind }) {
  const el = root._k;
  el.season.textContent = `${p.mo}/${p.d}（${WD[p.wd]}）${seasonLabel(dst)}`;
  if (sc.next) {
    el.next.innerHTML = `${closed ? '土日はお休み・次は' : '次は'}<b>${sc.next.ev.name}</b>${hm(sc.next.t)}`;
    el.num.textContent = formatHms(sc.next.t - now);
  }
  el.bar.style.width = `${(progress * 100).toFixed(1)}%`;
  el.day.innerHTML = dayLine(now, hol, ind);
  const ses = sessions.filter((s) => s.id !== 'syd').map((s) => {
    const st = s.open ? `${s.name} 取引中` : s.rest || `${s.name} お休み`;
    return `<span class="${s.open ? 'on' : ''}">${st}</span>`;
  }).join('');
  el.foot.innerHTML = `<span>いま <b>${p.h}:${pad(p.mi)}</b></span>${ses}${gotobi ? `<span class="g">${gotobi}</span>` : ''}`;
}

// 形のえらぶ所の小さな絵（大きな数字）。c は [地の色, 字の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="3" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><text x="20" y="20" text-anchor="middle" font-size="14" font-weight="700" font-family="sans-serif" fill="${c2}">1:23</text><path d="M6 24.5h28" stroke="${c2}" stroke-opacity=".35" stroke-width="1.5"/><path d="M6 24.5h15" stroke="${c2}" stroke-width="1.5"/></svg>`;
}

export default { id: 'big', name: '大きな数字', group: 'business', chip: 'rect', icon, build, render };
