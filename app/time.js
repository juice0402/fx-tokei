// FX時計の時間の計算（画面から切りはなした純粋な関数だけ）
// 夏時間は Intl のタイムゾーンで自動。決め打ちの時差は書かない。

export const TZ = {
  tky: 'Asia/Tokyo',
  ldn: 'Europe/London',
  ny: 'America/New_York',
  syd: 'Australia/Sydney',
};

export const WD = ['日', '月', '火', '水', '木', '金', '土'];
const WDE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 大事な時間。h:m はその市場の現地時刻
export const EVENTS = [
  { id: 'nakane', name: '仲値', tz: TZ.tky, h: 9, m: 55, kind: 'fix' },
  { id: 'ldn', name: 'ロンドンオープン', tz: TZ.ldn, h: 8, m: 0, kind: 'open' },
  { id: 'ny', name: 'NYオープン', tz: TZ.ny, h: 8, m: 0, kind: 'open' },
  { id: 'nys', name: 'NY株の寄り付き', tz: TZ.ny, h: 9, m: 30, kind: 'minor' },
  { id: 'fix', name: 'ロンドンフィックス', tz: TZ.ldn, h: 16, m: 0, kind: 'fix' },
  { id: 'nyc', name: 'NYクローズ', tz: TZ.ny, h: 17, m: 0, kind: 'close' },
];
export const CLOSE = EVENTS.find((e) => e.id === 'nyc');

// 市場の時間帯（現地時刻）。東京とシドニーは仮の値
export const SESSIONS = [
  { id: 'syd', name: 'シドニー', tz: TZ.syd, o: 7, c: 16 },
  { id: 'tky', name: '東京', tz: TZ.tky, o: 9, c: 17 },
  { id: 'ldn', name: 'ロンドン', tz: TZ.ldn, o: 8, c: 17 },
  { id: 'ny', name: 'NY', tz: TZ.ny, o: 8, c: 17 },
];

const fmtCache = {};
export function parts(ms, tz) {
  const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
  }));
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second, wd: WDE.indexOf(o.weekday) };
}

// その時点の UTC からの差（分）。夏時間なら NY は -240、冬は -300
export function offsetMin(ms, tz) {
  const p = parts(ms, tz);
  return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
}

// 現地の日付と時刻 → その瞬間（ms）
export function zonedTime(y, mo, d, h, mi, tz) {
  const base = Date.UTC(y, mo - 1, d, h, mi);
  let t = base - offsetMin(base, tz) * 60000;
  t = base - offsetMin(t, tz) * 60000;
  return t;
}

export function addDays(p, n) {
  const x = new Date(Date.UTC(p.y, p.mo - 1, p.d + n));
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate(), wd: x.getUTCDay() };
}
const isWeekday = (wd) => wd >= 1 && wd <= 5;

// after より後で、いちばん近い回（現地の平日だけ）
export function nextOccurrence(ev, after) {
  const p = parts(after, ev.tz);
  for (let n = -1; n <= 9; n++) {
    const q = addDays(p, n);
    if (!isWeekday(q.wd)) continue;
    const t = zonedTime(q.y, q.mo, q.d, ev.h, ev.m, ev.tz);
    if (t > after) return t;
  }
  return null;
}

// before 以前で、いちばん近い回
export function prevOccurrence(ev, before) {
  const p = parts(before, ev.tz);
  for (let n = 1; n >= -9; n--) {
    const q = addDays(p, n);
    if (!isWeekday(q.wd)) continue;
    const t = zonedTime(q.y, q.mo, q.d, ev.h, ev.m, ev.tz);
    if (t <= before) return t;
  }
  return null;
}

// from〜to に重なる市場の時間帯
export function sessionIntervals(s, from, to) {
  const out = [];
  const p = parts(from, s.tz);
  for (let n = -1; n <= 3; n++) {
    const q = addDays(p, n);
    const a = zonedTime(q.y, q.mo, q.d, s.o, 0, s.tz);
    const b = zonedTime(q.y, q.mo, q.d, s.c, 0, s.tz);
    if (b > from && a < to) out.push({ a, b });
  }
  return out;
}

// 週末のお休み：NY の金曜 17:00 から日曜 17:00 まで
export function isMarketClosed(now) {
  const p = parts(now, TZ.ny);
  const m = p.h * 60 + p.mi;
  return (p.wd === 5 && m >= 1020) || p.wd === 6 || (p.wd === 0 && m < 1020);
}

export function isSessionOpen(s, now, hol = null) {
  if (isMarketClosed(now)) return false;
  if (marketHoliday(s.id, now, hol)) return false;
  const p = parts(now, s.tz);
  if (!isWeekday(p.wd)) return false;
  const m = p.h * 60 + p.mi;
  return m >= s.o * 60 && m < s.c * 60;
}

// その日（前の NY クローズから次の NY クローズまで）の大事な時間の並び
// 休みで止まる回は off（「NY休み」など）にして、次の大事な時間（カウントダウン）からはずす
export function schedule(now, hol = null) {
  const start = prevOccurrence(CLOSE, now);
  const list = EVENTS.map((ev) => {
    const t = nextOccurrence(ev, start);
    const off = eventHoliday(ev, t, hol);
    return { ev, t, off, gotobi: ev.id === 'nakane' && !off ? gotobiMark(t, hol) : null };
  }).sort((x, y) => x.t - y.t);
  const next = list.find((x) => x.t > now && !x.off) || null;
  return { start, list, next };
}

// ===== 休み（app/data/holidays.json）とゴトー日 =====
// hol は normalizeHolidays の結果（読めないときは null。土日と年末年始だけで判定する）
export const ymdKey = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
const lastDay = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
// 5・10・15・20・25・30日と月末（31日の月は30日と31日、2月は月末）
const isGotobiDate = (q) => q.d % 5 === 0 || q.d === lastDay(q.y, q.mo);

// 日本の銀行の休み：土日・祝日・12/31〜1/3（銀行法施行令）。この日は仲値なし
export function isJpBankHoliday(q, hol) {
  if (!isWeekday(q.wd)) return true;
  if ((q.mo === 12 && q.d === 31) || (q.mo === 1 && q.d <= 3)) return true;
  return !!(hol && hol.jp.has(ymdKey(q)));
}

// ゴトー日の印：その日がゴトー日なら「ゴトー日」、その日から次の営業日までのあいだにゴトー日があれば「ゴトー日（前倒し）」
// いくつ重なっても印は1つ。銀行の休みの日は null
export function gotobiMark(t, hol) {
  const p = parts(t, TZ.tky);
  if (isJpBankHoliday(p, hol)) return null;
  if (isGotobiDate(p)) return 'ゴトー日';
  for (let n = 1; n <= 10; n++) {
    const q = addDays(p, n);
    if (!isJpBankHoliday(q, hol)) return null;
    if (isGotobiDate(q)) return 'ゴトー日（前倒し）';
  }
  return null;
}
export const isGotobi = (t, hol) => !!gotobiMark(t, hol);

// 市場ごとの休み（その市場の日付で見る）。東京＝日本の銀行の休み（祝日・年末年始）、ロンドン＝英国の祝日、NY＝FRB の休み
const HOL_LABEL = { tky: '東京休み', ldn: 'ロンドン休み', ny: 'NY休み' };
export function marketHoliday(market, t, hol) {
  if (market === 'tky') {
    const q = parts(t, TZ.tky);
    return isWeekday(q.wd) && isJpBankHoliday(q, hol) ? HOL_LABEL.tky : null;
  }
  if (!hol || (market !== 'ldn' && market !== 'ny')) return null;
  const q = parts(t, market === 'ldn' ? TZ.ldn : TZ.ny);
  return isWeekday(q.wd) && hol[market === 'ldn' ? 'uk' : 'us'].has(ymdKey(q)) ? HOL_LABEL[market] : null;
}

// 大事な時間ごとに、どの市場の休みで止まるか（NYクローズはスワップの切りかえなので止めない）
const EV_MARKET = { nakane: 'tky', ldn: 'ldn', fix: 'ldn', ny: 'ny', nys: 'ny' };
export const eventHoliday = (ev, t, hol) => (EV_MARKET[ev.id] ? marketHoliday(EV_MARKET[ev.id], t, hol) : null);

// 次の夏時間・冬時間の切りかえ（その地域の日付と、夏時間へかどうか）
export function nextDstChange(tz, now) {
  const p = parts(now, 'UTC');
  const base = Date.UTC(p.y, p.mo - 1, p.d, 12);
  let prev = offsetMin(base, tz);
  for (let i = 1; i <= 400; i++) {
    const t = base + i * 864e5;
    const o = offsetMin(t, tz);
    if (o !== prev) return { t, p: parts(t, tz), summer: o > prev };
    prev = o;
  }
  return null;
}

export const pad = (n) => String(n).padStart(2, '0');
export function hm(t) {
  const p = parts(t, TZ.tky);
  return p.h + ':' + pad(p.mi);
}

function jstAfterChange(ev, ch) {
  const q = addDays(ch.p, 1);
  return hm(zonedTime(q.y, q.mo, q.d, ev.h, ev.m, ev.tz));
}

export function dstInfo(now) {
  const us = nextDstChange(TZ.ny, now);
  const uk = nextDstChange(TZ.ldn, now);
  const gapNow = offsetMin(now, TZ.ny) - offsetMin(now, TZ.ldn) !== -300;
  const first = us.t < uk.t ? us : uk;
  const second = us.t < uk.t ? uk : us;
  const ev = (id) => EVENTS.find((e) => e.id === id);
  return {
    us, uk, gapNow, first, second,
    summerNow: offsetMin(now, TZ.ny) === -240,
    nyAfter: jstAfterChange(ev('ny'), us),
    ldnAfter: jstAfterChange(ev('ldn'), uk),
    fixAfter: jstAfterChange(ev('fix'), uk),
  };
}

export function seasonLabel(dst) {
  return dst.gapNow ? 'NYだけ夏時間' : dst.summerNow ? '夏時間' : '冬時間';
}

// 1秒ごとに形へ渡す計算の結果（どの形も同じものを使う）
// 形はこれだけを見て描く（形の中で時間の計算をしない）
// now・p（日本時間の各部分）・sc（その日の大事な時間と次）・day（大事な時間＋指標の並び）・rows（時刻表の行）
// progress（前の大事な時間から次までの進み 0〜1）・dst（夏時間）・gotobi（きょうのゴトー日の印）・closed（土日）
// sessions（市場ごとに いま開いているか・次の時間帯・休み）・ind（しぼった指標）・indDay（その日の範囲の指標）・hol（休みの表）
export function tickContext(now, hol = null, ind = []) {
  const sc = schedule(now, hol);
  const withInd = withIndicators(sc, ind);
  const live = sc.list.filter((x) => !x.off);
  const prev = [...live].reverse().find((x) => x.t <= now);
  const from = prev ? prev.t : sc.start;
  const progress = sc.next ? Math.min(1, Math.max(0, (now - from) / (sc.next.t - from))) : 0;
  const sessions = SESSIONS.map((s) => {
    const iv = sessionIntervals(s, now, now + 3 * 864e5)[0] || null;
    return { ...s, open: isSessionOpen(s, now, hol), iv, rest: iv ? marketHoliday(s.id, iv.a, hol) : null };
  });
  return {
    now, p: parts(now, TZ.tky), sc, day: withInd.list, rows: timetableRows(withInd, now, hol), progress,
    dst: dstInfo(now), gotobi: gotobiMark(now, hol), closed: isMarketClosed(now), sessions,
    ind, indDay: indicatorsIn(ind, sc.start, sc.start + 864e5, 1), hol,
    cities: CITIES.map((c) => cityInfo(c, now, hol)),
  };
}

// ===== 針の時計（アナログ・世界時計）=====
// 針の角度（度・12時が0）。p は parts の結果
export function handAngles(p) {
  return { h: ((p.h % 12) + p.mi / 60 + p.s / 3600) * 30, m: (p.mi + p.s / 60) * 6, s: p.s * 6 };
}
// 日本時間の12時間の文字盤の上の角度
export const dial12 = (t) => handAngles(parts(t, TZ.tky)).h;
// 残りを「1:23」（時間:分）で
export function clockLeft(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return Math.floor(m / 60) + ':' + pad(m % 60);
}

// 世界時計の街：その街の時刻・夜（18時〜6時）・夏時間・市場のようす
// state：open（取引中）・soon（開く1時間前から）・rest（その市場の休み）・closed（お休み）
export const CITIES = [
  { id: 'tky', name: '東京', tz: TZ.tky },
  { id: 'ldn', name: 'ロンドン', tz: TZ.ldn },
  { id: 'ny', name: 'ニューヨーク', tz: TZ.ny },
];
const STD_OFFSET = { [TZ.ldn]: 0, [TZ.ny]: -300 };
export function cityInfo(c, now, hol = null) {
  const p = parts(now, c.tz);
  const s = SESSIONS.find((x) => x.id === c.id);
  let state = 'closed';
  if (isSessionOpen(s, now, hol)) state = 'open';
  else if (!isMarketClosed(now) && isWeekday(p.wd) && marketHoliday(s.id, now, hol)) state = 'rest';
  else {
    const nx = sessionIntervals(s, now, now + 36e5).find((iv) => iv.a > now && iv.a - now <= 36e5);
    if (nx && isSessionOpen(s, nx.a, hol)) state = 'soon';
  }
  const season = c.id === 'tky' ? null : offsetMin(now, c.tz) > STD_OFFSET[c.tz] ? '夏時間' : '冬時間';
  return { ...c, p, night: p.h < 6 || p.h >= 18, state, season };
}

// 日本時間の1日のうちの位置（0〜1）。文字盤の角度などに使う
export function dayFraction(t) {
  const p = parts(t, TZ.tky);
  return (p.h + p.mi / 60 + p.s / 3600) / 24;
}

// 時刻表のダイヤの範囲：日本時間の startHour 時から次の日の startHour 時まで（いまをふくむ）
export function diaRange(now, startHour) {
  const p = parts(now, TZ.tky);
  let d = p;
  let from = zonedTime(d.y, d.mo, d.d, startHour, 0, TZ.tky);
  if (from > now) {
    d = addDays(p, -1);
    from = zonedTime(d.y, d.mo, d.d, startHour, 0, TZ.tky);
  }
  const e = addDays(d, 1);
  return { from, to: zonedTime(e.y, e.mo, e.d, startHour, 0, TZ.tky) };
}

const dayLabel = (p) => `${p.mo}/${p.d}（${WD[p.wd]}）`;

// 時刻表の行：日本時間の「時」ごとにまとめ、日付が変わる所に区切りを入れる
// 並びがきょうから始まるときの区切りは「翌日」、週末などで先の日から始まるときは日付
export function timetableRows(sc, now, hol = null) {
  const today = parts(now, TZ.tky);
  const key = (p) => `${p.y}-${p.mo}-${p.d}`;
  const rows = [];
  let date = null;
  let fromToday = true;
  for (const x of sc.list) {
    const q = parts(x.t, TZ.tky);
    const d = key(q);
    if (date === null) {
      fromToday = d === key(today);
      if (!fromToday) rows.push({ type: 'day', label: dayLabel(q) });
    } else if (d !== date) {
      rows.push({ type: 'day', label: fromToday ? '翌日' : dayLabel(q) });
    }
    let r = rows[rows.length - 1];
    if (!r || r.type !== 'hour' || r.h !== q.h || d !== date) {
      r = { type: 'hour', h: q.h, items: [] };
      rows.push(r);
    }
    date = d;
    r.items.push({ ev: x.ev, t: x.t, mi: q.mi, off: x.off || null, gotobi: x.gotobi || null });
  }
  for (const r of rows) {
    if (r.type !== 'hour') continue;
    r.past = r.items.every((it) => it.t <= now || it.off);
    r.next = !!sc.next && r.items.some((it) => it.t === sc.next.t && it.ev === sc.next.ev);
  }
  return rows;
}

export function formatLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return 'あと' + Math.floor(h / 24) + '日' + (h % 24) + '時間';
  if (h > 0) return 'あと' + h + '時間' + m + '分';
  if (m >= 10) return 'あと' + m + '分';
  return 'あと' + m + '分' + pad(sec) + '秒';
}

// 残りを 時:分:秒（大きな数字・ロック画面）と 時:分（タイルの輪）で
const secs = (ms) => Math.max(0, Math.floor(ms / 1000));
export function formatHms(ms) {
  const s = secs(ms);
  return Math.floor(s / 3600) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
}
export function formatHmShort(ms) {
  const s = secs(ms);
  return Math.floor(s / 3600) + ':' + pad(Math.floor((s % 3600) / 60));
}

// ===== 指標の予定（app/data/events.json）=====
// events.json の行：{ id, name, imp, t（UTC の ISO）, src, approx, tentative, sub? }
// ここでは ms に直した行（t が数）を使う。読みこみと形の点検は normalizeEvents
export const IMP_CHOICES = [
  { v: 3, label: '★3だけ' },
  { v: 2, label: '★2以上' },
  { v: 1, label: '全部' },
];
export const IMP_DEFAULT = 2;
export const STALE_DAYS = 14;

// 読んだ JSON を画面で使う形に。形がおかしいときは null（画面は止めずに「読めませんでした」）
export function normalizeEvents(json) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.events)) return null;
  const events = [];
  for (const e of json.events) {
    if (!e || typeof e.name !== 'string' || typeof e.id !== 'string' || /[<>&"]/.test(e.name)) continue;
    const t = Date.parse(e.t);
    if (!Number.isFinite(t)) continue;
    const imp = [1, 2, 3].includes(e.imp) ? e.imp : 1;
    const sub = e.sub && typeof e.sub.name === 'string' && !/[<>&"]/.test(e.sub.name) && Number.isFinite(Date.parse(e.sub.t))
      ? { name: e.sub.name, t: Date.parse(e.sub.t) } : null;
    events.push({ id: e.id, name: e.name, imp, t, approx: !!e.approx, tentative: !!e.tentative, sub });
  }
  events.sort((a, b) => a.t - b.t || b.imp - a.imp);
  const sources = Array.isArray(json.sources)
    ? json.sources.filter((s) => s && typeof s.name === 'string' && /^https:\/\//.test(s.url || '')) : [];
  return { updated: typeof json.updated === 'string' ? json.updated : '', sources, events };
}

export const filterEvents = (events, minImp) => events.filter((e) => e.imp >= minImp);

// いまより後で、いちばん近い指標
export function nextIndicator(events, now, minImp) {
  return events.find((e) => e.imp >= minImp && e.t > now) || null;
}

// 日本時間のきょうから days 日先まで（きょうの終わった分もふくむ）を、日ごとにまとめる
export function indicatorDays(events, now, minImp, days = 7) {
  const p = parts(now, TZ.tky);
  const from = zonedTime(p.y, p.mo, p.d, 0, 0, TZ.tky);
  const e = addDays(p, days + 1);
  const to = zonedTime(e.y, e.mo, e.d, 0, 0, TZ.tky);
  const out = [];
  for (const ev of events) {
    if (ev.imp < minImp || ev.t < from || ev.t >= to) continue;
    const q = parts(ev.t, TZ.tky);
    const label = `${q.mo}/${q.d}（${WD[q.wd]}）`;
    let day = out[out.length - 1];
    if (!day || day.label !== label) { day = { label, items: [] }; out.push(day); }
    day.items.push(ev);
  }
  return out;
}

// from〜to に入る指標（形の中に混ぜる分）
export function indicatorsIn(events, from, to, minImp) {
  return events.filter((e) => e.imp >= minImp && e.t >= from && e.t < to);
}

// 時刻の書き方：日銀の結果のように時刻が決まっていないものは「お昼ごろ」
export function indicatorTime(ev) {
  if (!ev.approx) return hm(ev.t);
  const h = parts(ev.t, TZ.tky).h;
  return h >= 11 && h <= 13 ? 'お昼ごろ' : hm(ev.t) + 'ごろ';
}

export function indicatorLeft(ev, now) {
  if (!ev.approx) return formatLeft(ev.t - now);
  const s = Math.max(0, Math.floor((ev.t - now) / 1000));
  const h = Math.floor(s / 3600);
  if (h >= 24) return 'あと' + Math.floor(h / 24) + '日' + (h % 24) + '時間ごろ';
  if (h > 0) return 'あと' + h + '時間ごろ';
  return 'もうすぐ';
}

export const stars = (imp) => '★'.repeat(imp);

// 予定が古いか：updated（日本時間「2026-11-21 05:47」）から STALE_DAYS 日より前
export function staleInfo(updated, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(updated || '');
  if (!m) return { stale: true, label: '' };
  const t = zonedTime(+m[1], +m[2], +m[3], 0, 0, TZ.tky);
  return { stale: now - t > STALE_DAYS * 864e5, label: `${+m[2]}月${+m[3]}日` };
}

// 時刻表に指標を混ぜた並び（その日の範囲＝前の NY クローズから次の NY クローズまで）。会見は小さな行
// 指標の行を大事な時間の並びと同じ形にする（lo より後・hi まで）
function indicatorItems(ind, lo, hi) {
  const add = [];
  for (const e of ind || []) {
    const ev = { id: e.id, name: e.name + (e.tentative ? '（予定）' : ''), kind: 'ind', imp: e.imp, approx: e.approx };
    if (e.t > lo && e.t <= hi) add.push({ ev, t: e.t });
    if (e.sub && e.sub.t > lo && e.sub.t <= hi) add.push({ ev: { id: e.id + '-sub', name: e.sub.name, kind: 'minor' }, t: e.sub.t });
  }
  return add;
}

export function withIndicators(sc, ind) {
  if (!ind || !ind.length || !sc.list.length) return sc;
  const add = indicatorItems(ind, sc.start, sc.list[sc.list.length - 1].t);
  if (!add.length) return sc;
  return { ...sc, list: [...sc.list, ...add].sort((x, y) => x.t - y.t) };
}

// from〜to の大事な時間と指標（日をまたいでもよい）。大きな数字の一日の線・手帳の行に使う
export function eventsBetween(from, to, hol = null, ind = []) {
  const out = [];
  for (const ev of EVENTS) {
    let t = nextOccurrence(ev, from - 1);
    for (let g = 0; t && t <= to && g < 12; g++) {
      const off = eventHoliday(ev, t, hol);
      out.push({ ev, t, off, gotobi: ev.id === 'nakane' && !off ? gotobiMark(t, hol) : null });
      t = nextOccurrence(ev, t);
    }
  }
  return [...out, ...indicatorItems(ind, from - 1, to)].sort((x, y) => x.t - y.t);
}

// いまの時の前 before 時間から、後ろ after 時間まで（日本時間のちょうどの時から。手帳のページ）
export function hourWindow(now, before, after) {
  const p = parts(now, TZ.tky);
  const from = zonedTime(p.y, p.mo, p.d, p.h, 0, TZ.tky) - before * 36e5;
  return { from, to: from + (before + after) * 36e5 };
}

// ===== 休みの予定（app/data/holidays.json）=====
// { updated, sources, jpYears, jp: [[日付, 名前]…], uk, us } → { jp: Map, uk: Map, us: Map, jpYears: Set, sources }
export function normalizeHolidays(json) {
  if (!json || typeof json !== 'object') return null;
  const map = (a) => new Map((Array.isArray(a) ? a : [])
    .filter((x) => Array.isArray(x) && /^\d{4}-\d{2}-\d{2}$/.test(x[0]) && typeof x[1] === 'string' && !/[<>&"]/.test(x[1])));
  if (!Array.isArray(json.jp) || !Array.isArray(json.uk) || !Array.isArray(json.us)) return null;
  const sources = Array.isArray(json.sources)
    ? json.sources.filter((s) => s && typeof s.name === 'string' && /^https:\/\//.test(s.url || '')) : [];
  return {
    updated: typeof json.updated === 'string' ? json.updated : '',
    jp: map(json.jp), uk: map(json.uk), us: map(json.us),
    jpYears: new Set((json.jpYears || []).filter(Number.isInteger)),
    sources,
  };
}

// 日本時間のきょうから days 日先までの休み（日付・国・名前）。土日は出さない
export function holidayDays(now, hol, days = 7) {
  const p = parts(now, TZ.tky);
  const out = [];
  for (let n = 0; n <= days; n++) {
    const q = addDays(p, n);
    if (!isWeekday(q.wd)) continue;
    const k = ymdKey(q);
    const label = `${q.mo}/${q.d}（${WD[q.wd]}）`;
    const jp = hol && hol.jp.get(k);
    if (jp) out.push({ label, key: k, where: '日本', name: jp });
    else if ((q.mo === 12 && q.d === 31) || (q.mo === 1 && q.d <= 3)) out.push({ label, key: k, where: '日本', name: '銀行の休み（年末年始）' });
    if (hol && hol.uk.has(k)) out.push({ label, key: k, where: '英国', name: hol.uk.get(k) });
    if (hol && hol.us.has(k)) out.push({ label, key: k, where: '米国', name: hol.us.get(k) });
  }
  return out;
}

// 大事な時間の下に出す小さなお知らせ（日本時間のきょうで見る）
export function holidayNotes(now, hol, failed, days = 7) {
  const p = parts(now, TZ.tky);
  const notes = [];
  if (isWeekday(p.wd) && isJpBankHoliday(p, hol)) notes.push('きょうは仲値なし（東京休み）');
  if (p.mo === 12 && p.d === 25) notes.push('主な休み：クリスマス（取引時間は FX 会社ごとにちがいます）');
  if (p.mo === 1 && p.d === 1) notes.push('主な休み：元日（取引時間は FX 会社ごとにちがいます）');
  if ((p.mo === 12 && p.d === 24) || (p.mo === 12 && p.d === 31)) notes.push('取引時間が変わる会社があります');
  if (failed) notes.push('祝日の予定を読めませんでした');
  else if (hol) {
    const e = addDays(p, days);
    if (!hol.jpYears.has(p.y) || !hol.jpYears.has(e.y)) notes.push('来年の祝日は内閣府の発表待ち');
  }
  return notes;
}

// 時刻表の「市場のダイヤ」：日本時間の startHour 時から24時間のうち、市場ごとの時間帯（0〜24 の時間の位置）と、いまの位置
export function diaBands(now, startHour, hol = null) {
  const { from, to } = diaRange(now, startHour);
  return { bands: bandsIn(from, to, hol), now: (now - from) / 36e5 };
}

// from〜to の4つの市場の帯（from からの時間で a・b。休みの帯は rest）
export function bandsIn(from, to, hol = null) {
  const h = (t) => (t - from) / 36e5;
  return SESSIONS.map((s) => ({
    id: s.id,
    name: s.name,
    segs: sessionIntervals(s, from, to)
      .map((iv) => ({ a: h(Math.max(iv.a, from)), b: h(Math.min(iv.b, to)), rest: !!marketHoliday(s.id, iv.a, hol) }))
      .filter((x) => x.b > x.a),
  }));
}

// 横に流れる帯：いまの before 時間前から after 時間後まで（日本時間）の、市場の時間帯と大事な時間＋指標の並び
// 位置はどれも from からの時間（0〜before+after）。並びは schedule と withIndicators を日ごとにつないだもの（休みの off・ゴトー日もそのまま）
export function bandWindow(now, before, after, hol = null, ind = []) {
  const from = now - before * 36e5, to = now + after * 36e5;
  const h = (t) => (t - from) / 36e5;
  const bands = SESSIONS.map((s) => ({
    id: s.id,
    name: s.name,
    segs: sessionIntervals(s, from, to)
      .filter((iv) => isWeekday(parts(iv.a, s.tz).wd)) // 窓が週末をまたぐので、土日の回は出さない
      .map((iv) => ({ a: h(Math.max(iv.a, from)), b: h(Math.min(iv.b, to)), rest: !!marketHoliday(s.id, iv.a, hol), past: iv.b <= now }))
      .filter((x) => x.b > x.a),
  }));
  const seen = new Set();
  const items = [];
  let at = from;
  for (let n = 0; n < 8; n++) {
    const day = withIndicators(schedule(at, hol), ind);
    if (!day.list.length) break;
    for (const x of day.list) {
      const k = x.ev.id + '@' + x.t;
      if (x.t >= from && x.t <= to && !seen.has(k)) { seen.add(k); items.push({ ...x, at: h(x.t) }); }
    }
    const last = day.list[day.list.length - 1].t;
    if (last >= to || last <= at) break;
    at = last;
  }
  items.sort((x, y) => x.t - y.t);
  const hours = [];
  for (let t = Math.ceil(from / 36e5) * 36e5; t <= to; t += 36e5) hours.push({ at: h(t), h: parts(t, TZ.tky).h });
  return { from, to, now: before, span: before + after, bands, items, hours };
}
