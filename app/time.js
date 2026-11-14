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

export function isSessionOpen(s, now) {
  if (isMarketClosed(now)) return false;
  const p = parts(now, s.tz);
  if (!isWeekday(p.wd)) return false;
  const m = p.h * 60 + p.mi;
  return m >= s.o * 60 && m < s.c * 60;
}

// その日（前の NY クローズから次の NY クローズまで）の大事な時間の並び
export function schedule(now) {
  const start = prevOccurrence(CLOSE, now);
  const list = EVENTS.map((ev) => ({ ev, t: nextOccurrence(ev, start) })).sort((x, y) => x.t - y.t);
  const next = list.find((x) => x.t > now) || null;
  return { start, list, next };
}

// ゴトー日：5・10・15・20・25・30日と月末。土日なら前の金曜（祝日は未対応）
const lastDay = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
const isGotobiDate = (q) => q.d % 5 === 0 || q.d === lastDay(q.y, q.mo);
export function isGotobi(t) {
  const p = parts(t, TZ.tky);
  if (!isWeekday(p.wd)) return false;
  if (isGotobiDate(p)) return true;
  if (p.wd === 5) return isGotobiDate(addDays(p, 1)) || isGotobiDate(addDays(p, 2));
  return false;
}

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
export function tickContext(now) {
  return { now, p: parts(now, TZ.tky), sc: schedule(now), dst: dstInfo(now), closed: isMarketClosed(now) };
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
export function timetableRows(sc, now) {
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
    r.items.push({ ev: x.ev, t: x.t, mi: q.mi, gotobi: x.ev.id === 'nakane' && isGotobi(x.t) });
  }
  for (const r of rows) {
    if (r.type !== 'hour') continue;
    r.past = r.items.every((it) => it.t <= now);
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
