// 形「発着の掲示」（見本 skins-2 の .dep）。色はパタパタ（1文字ずつの板）と電光掲示（点の文字・流れる帯）
// 計算は time.js（ctx）、色と大きさは skins.json（skins.js）、ここは描くだけ
import { WD, pad, hm, formatLeft, seasonLabel, diaBands } from '../time.js';
import { SIZE, SKINS } from '../skins.js';

const G = SIZE.dep.geo;
const f2 = (n) => n.toFixed(2);
const ld = (p) => `${p.mo}月${p.d}日（${WD[p.wd]}）`;
const isLed = (skin) => ((SKINS[skin] && SKINS[skin].deco) || {}).clock === 'led';

// 市場のダイヤ：7時〜翌7時の4本の帯と、いまの線（時刻表と同じ並び）
function dia(now, hol) {
  const d = diaBands(now, G['start-hour'], hol);
  const L = G['lane-x0'], R = G['lane-x1'], px = (R - L) / 24, Y = G['lane-y'], H = G['lane-h'];
  let s = '';
  d.bands.forEach((se, i) => {
    s += `<text x="0" y="${Y[i] + G['lab-dy']}" class="dp-lab">${se.name}</text><rect x="${L}" y="${Y[i]}" width="${R - L}" height="${H}" class="dp-lane"/>`;
    for (const g of se.segs) {
      s += `<rect x="${f2(L + g.a * px)}" y="${Y[i]}" width="${f2((g.b - g.a) * px)}" height="${H}" class="dp-${se.id}${g.rest ? ' hol' : ''}"/>`;
    }
  });
  const [g0, g1] = G['grid-y'];
  for (const off of G['hour-marks']) {
    const x = L + off * px;
    s += `<line x1="${f2(x)}" y1="${g0}" x2="${f2(x)}" y2="${g1}" class="dp-grid"/><text x="${f2(x)}" y="${G['hour-y']}" class="dp-hr">${(G['start-hour'] + off) % 24}</text>`;
  }
  const nx = L + d.now * px, [n0, n1] = G['now-y'], w = G['now-tip-w'] / 2;
  s += `<line x1="${f2(nx)}" y1="${n0}" x2="${f2(nx)}" y2="${n1}" class="dp-now-l"/><path d="M${f2(nx - w)} 0H${f2(nx + w)}L${f2(nx)} ${G['now-tip-h']}Z" class="dp-now-t"/>`;
  return `<svg viewBox="0 0 ${G['dia-w']} ${G['dia-h']}" role="img" aria-label="きょうの市場の時間帯（${G['start-hour']}時から翌${G['start-hour']}時）。線がいま">${s}</svg>`;
}

// 時刻を小さな板の並びに（電光掲示では点の文字）
const mini = (str) => `<span class="mini">${str.split('').map((c) => (c === ':' ? '<span class="c">:</span>' : `<span>${c}</span>`)).join('')}</span>`;

function build(root, skin) {
  const led = isLed(skin);
  root.className = `page dep${led ? ' led' : ' flap'}`;
  root.innerHTML = `<header class="dp-top"><h1 class="dp-brand">FX時計<small>${led ? '電光掲示' : '発着案内'}</small></h1><div class="top-r"><span class="dp-date" data-k="date"></span><span class="tools-slot"></span></div></header>
<div class="dp-now swipe"><div class="${led ? 'led-clock' : 'tiles'}" data-k="clock" role="timer" aria-label="いまの時刻"></div><div class="dp-next" data-k="next"></div></div>
${led ? '<div class="dp-ticker swipe" aria-hidden="true"><span data-k="ticker"></span></div>' : ''}
<div class="dp-dia swipe" data-k="dia"></div>
<div class="dots-slot"></div>
<table class="dp-tt"><caption>大事な時間の発着案内（日本時間）</caption><thead><tr><th scope="col">時刻</th><th scope="col">内容</th><th scope="col">状況</th></tr></thead><tbody data-k="body"></tbody></table>
<div class="hol-slot"></div>
<div class="events-slot"></div>
<div class="pick-slot"></div>`;
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  root._k = Object.fromEntries(['date', 'clock', 'next', 'ticker', 'dia', 'body'].map((k) => [k, q(k)]));
  root._led = led;
  root._tick = '';
  if (!led) {
    // 時・分・秒の8まい（2と5は区切り。秒の前の区切りは出さない）
    let t = '';
    for (let i = 0; i < 8; i++) t += `<span class="tile${i === 2 || i === 5 ? ' colon' : ''}${i > 5 ? ' sm' : ''}"></span>`;
    root._k.clock.innerHTML = t;
    root._k.clock.children[5].hidden = true;
  }
}

// 変わった板だけめくる
function setTiles(box, str) {
  for (let i = 0; i < str.length; i++) {
    const c = box.children[i];
    if (!c || c.textContent === str[i]) continue;
    c.textContent = str[i];
    c.classList.remove('flip');
    void c.offsetWidth;
    c.classList.add('flip');
  }
}

function render(root, { now, p, sc, day, dst, closed, gotobi, hol }) {
  const el = root._k;
  el.date.textContent = `${ld(p)} ${seasonLabel(dst)}`;
  if (root._led) el.clock.innerHTML = `${p.h}:${pad(p.mi)}<small>${pad(p.s)}</small>`;
  else {
    setTiles(el.clock, `${pad(p.h)}:${pad(p.mi)} ${pad(p.s)}`);
    el.clock.setAttribute('aria-label', `いまの時刻 ${p.h}時${p.mi}分`);
  }
  if (sc.next) {
    el.next.innerHTML = `${closed ? '土日はお休み・次は' : '次は'}<strong>${hm(sc.next.t)} ${sc.next.ev.name}</strong><span class="dp-left">${formatLeft(sc.next.t - now)}</span>`;
  }
  // 流れる帯は1分に1回だけ書きかえる（流れが途中で止まらないように）
  if (el.ticker && sc.next) {
    const key = `${p.h}:${p.mi}`;
    if (root._tick !== key) {
      root._tick = key;
      el.ticker.textContent = `つぎは ${hm(sc.next.t)} ${sc.next.ev.name}　${formatLeft(sc.next.t - now).replace(/\d+秒$/, '')}　／　${seasonLabel(dst)}${gotobi ? `　／　きょうは${gotobi}` : ''}`;
    }
  }
  el.dia.innerHTML = dia(now, hol);

  let html = '';
  for (const x of day) {
    const past = x.t <= now, nx = sc.next === x;
    const st = past ? '済' : x.off ? x.off : nx ? formatLeft(x.t - now) : '予定';
    const time = x.ev.approx ? `${mini(hm(x.t).split(':')[0])}<small class="approx">時ごろ</small>` : mini(hm(x.t));
    const cls = [x.ev.kind, x.ev.imp >= 3 ? 'imp3' : '', past ? 'past' : '', nx ? 'next' : '', x.off ? 'off' : ''].filter(Boolean).join(' ');
    html += `<tr class="${cls}"><td class="t">${time}</td><td class="n">${x.ev.name}${x.gotobi ? `<span class="badge">${x.gotobi}</span>` : ''}</td><td class="s">${st}</td></tr>`;
  }
  el.body.innerHTML = html;
}

// 形のえらぶ所の小さな絵（板の並び）。c は [地の色, 文字の色]
function icon([c1, c2]) {
  return `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x=".5" y=".5" width="39" height="29" rx="4" fill="${c1}" stroke="${c2}" stroke-opacity=".5"/><rect x="5" y="6" width="6" height="9" rx="1" fill="${c2}" opacity=".9"/><rect x="12.5" y="6" width="6" height="9" rx="1" fill="${c2}" opacity=".9"/><rect x="21.5" y="6" width="6" height="9" rx="1" fill="${c2}" opacity=".9"/><rect x="29" y="6" width="6" height="9" rx="1" fill="${c2}" opacity=".9"/><path d="M5 20h30M5 24.5h22" stroke="${c2}" stroke-width="1.6" opacity=".6"/></svg>`;
}

export default { id: 'dep', name: '発着の掲示', group: 'business', chip: 'rect', icon, build, render };
