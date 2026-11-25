// 形「時刻表」（見本B）。計算は time.js、色と大きさは skins.json（skins.js）、ここは描くだけ
import {
  TZ, WD, SESSIONS, parts, pad, hm, sessionIntervals, formatLeft, seasonLabel, diaRange, timetableRows, withIndicators,
} from './time.js';
import { SIZE } from './skins.js';

const G = SIZE.board.geo;
const f2 = (n) => n.toFixed(2);
const sd = (p) => `${p.mo}/${p.d}（${WD[p.wd]}）`;
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;
const dir = (c) => (c.summer ? '夏時間へ' : '冬時間へ');

// 市場のダイヤ：7時〜翌7時の4本の帯と、いまの赤い線
function dia(now) {
  const { from, to } = diaRange(now, G['start-hour']);
  const L = G['lane-x0'], R = G['lane-x1'], px = (R - L) / 24, Y = G['lane-y'], H = G['lane-h'];
  let s = '';
  SESSIONS.forEach((se, i) => {
    s += `<text x="0" y="${Y[i] + G['lab-dy']}" class="st-lab">${se.name}</text><rect x="${L}" y="${Y[i]}" width="${R - L}" height="${H}" class="st-lane"/>`;
    for (const iv of sessionIntervals(se, from, to)) {
      const a = Math.max(iv.a, from), b = Math.min(iv.b, to);
      if (b > a) s += `<rect x="${f2(L + ((a - from) / 36e5) * px)}" y="${Y[i]}" width="${f2(((b - a) / 36e5) * px)}" height="${H}" class="f-${se.id}"/>`;
    }
  });
  const [g0, g1] = G['grid-y'];
  for (const off of G['hour-marks']) {
    const x = L + off * px;
    s += `<line x1="${f2(x)}" y1="${g0}" x2="${f2(x)}" y2="${g1}" class="st-grid"/><text x="${f2(x)}" y="${G['hour-y']}" class="st-hr">${(G['start-hour'] + off) % 24}</text>`;
  }
  const nx = L + ((now - from) / 36e5) * px, [n0, n1] = G['now-y'], w = G['now-tip-w'] / 2;
  s += `<line x1="${f2(nx)}" y1="${n0}" x2="${f2(nx)}" y2="${n1}" class="st-now"/><path d="M${f2(nx - w)} 0H${f2(nx + w)}L${f2(nx)} ${G['now-tip-h']}Z" class="st-nowtip"/>`;
  return `<svg viewBox="0 0 ${G['dia-w']} ${G['dia-h']}" role="img" aria-label="きょうの市場の時間帯（${G['start-hour']}時から翌${G['start-hour']}時）。赤い線がいま">${s}</svg>`;
}

function mount(root) {
  root.className = 'page board';
  root.innerHTML = `<header class="b-top"><h1 class="b-brand">FX時計<small>ドル円の時刻表</small></h1><div class="top-r"><span class="b-date" data-k="date"></span><span class="tools-slot"></span></div></header>
<div class="b-now"><div class="b-time" data-k="time"></div><div class="b-next" data-k="next"></div></div>
<div class="b-dia" data-k="dia"></div>
<table class="tt"><caption>大事な時間の時刻表（日本時間）</caption><tbody data-k="table"></tbody></table>
<p class="b-foot" data-k="foot"></p>
<div class="events-slot"></div>
<div class="pick-slot"></div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  const el = Object.fromEntries(['date', 'time', 'next', 'dia', 'table', 'foot'].map((k) => [k, q(k)]));
  return (ctx) => render(el, ctx);
}

function render(el, { now, p, sc, dst, closed, ind }) {
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;
  el.time.innerHTML = `${p.h}:${pad(p.mi)}<small>${pad(p.s)}</small>`;
  if (sc.next) {
    el.next.innerHTML = `${closed ? '土日はお休み・次は' : '次は'}<strong>${hm(sc.next.t)} ${sc.next.ev.name}</strong><span class="b-left">${formatLeft(sc.next.t - now)}</span>`;
  }
  el.dia.innerHTML = dia(now);

  let html = '';
  for (const r of timetableRows(withIndicators(sc, ind), now)) {
    if (r.type === 'day') { html += `<tr class="day"><td colspan="2">${r.label}</td></tr>`; continue; }
    const ents = r.items.map((it) => `<span class="ent ${it.ev.kind}${it.ev.imp >= 3 ? ' imp3' : ''}"><b>${it.ev.approx ? 'ごろ' : pad(it.mi)}</b><span>${it.ev.name}${it.gotobi ? '<em>ゴトー日</em>' : ''}</span></span>`).join('');
    const rel = r.next ? `<span class="rel">${formatLeft(sc.next.t - now)}</span>` : '';
    html += `<tr class="${r.past ? 'past' : r.next ? 'next' : ''}"><th scope="row">${r.h}</th><td><div class="row">${ents}${rel}</div></td></tr>`;
  }
  el.table.innerHTML = html;

  let f = '<b>赤</b>は値が決まる時間（仲値・フィックス）<br>';
  f += `米 ${sd(dst.us.p)}${dir(dst.us)} NYオープン ${dst.nyAfter}<br>`;
  f += `英 ${sd(dst.uk.p)}${dir(dst.uk)} ロンドン ${dst.ldnAfter}・フィックス ${dst.fixAfter}<br>`;
  f += `<span class="gap">${dst.gapNow ? `いまはNYだけ夏時間（${sd(dst.first.p)}まで）` : `${dst.first.p.mo}/${dst.first.p.d}〜${dst.second.p.mo}/${dst.second.p.d} はNYだけ夏時間`}</span>`;
  el.foot.innerHTML = f;
}

// 形のえらぶ所の小さな絵（時刻表）。c は [地の色, 線の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="5" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><rect x="5" y="6" width="7" height="18" fill="${c2}" opacity=".85"/><path d="M15 9.5h20M15 15h14M15 20.5h18" stroke="${c2}" stroke-width="2"/></svg>`;
}

export default { id: 'board', name: '時刻表', chip: 'rect', icon, mount };
