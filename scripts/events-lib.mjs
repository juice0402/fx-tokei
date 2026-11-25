// 指標の予定：公式のページを読む関数と、events.json を組み立てる関数（ネットもファイルも見ない）
// 読むのは scripts/fetch-events.mjs。テストは test/events-lib.test.mjs（手で書いた小さな見本の文字列で）
import { TZ, parts, zonedTime, addDays } from '../app/time.js';

// 拾う指標。imp は重要度（11/13 しょーくんと決めた）
export const KINDS = {
  nfp: { name: '米雇用統計', imp: 3, src: 'bls' },
  uscpi: { name: '米CPI（消費者物価）', imp: 3, src: 'bls' },
  ppi: { name: '米PPI（生産者物価）', imp: 2, src: 'bls' },
  jolts: { name: 'JOLTS（求人）', imp: 1, src: 'bls' },
  pce: { name: '米PCE（個人所得・支出）', imp: 2, src: 'bea' },
  gdp: { name: '米GDP', imp: 2, src: 'bea' },
  jpcpi: { name: '全国CPI', imp: 2, src: 'estat' },
  tkcpi: { name: '東京CPI（都区部）', imp: 2, src: 'estat' },
  fomc: { name: 'FOMC 結果', imp: 3, src: 'fed' },
  fomcmin: { name: 'FOMC 議事録', imp: 2, src: 'fed' },
  boj: { name: '日銀会合 結果', imp: 3, src: 'boj' },
  bojop: { name: '日銀 主な意見', imp: 1, src: 'boj' },
};

// 読むページ。kinds＝そのページから拾う指標（読めない日は、その指標の前の分を残す）
export const UNITS = {
  'bls-ics': { name: 'BLS のカレンダー', url: 'https://www.bls.gov/schedule/news_release/bls.ics', kinds: ['nfp', 'uscpi', 'ppi', 'jolts'] },
  'bls-empsit': { name: 'BLS 雇用統計の予定', url: 'https://www.bls.gov/schedule/news_release/empsit.htm', kinds: ['nfp'] },
  'bls-cpi': { name: 'BLS CPI の予定', url: 'https://www.bls.gov/schedule/news_release/cpi.htm', kinds: ['uscpi'] },
  bea: { name: 'BEA の公表予定', url: 'https://apps.bea.gov/API/signup/release_dates.json', kinds: ['pce', 'gdp'] },
  estat: { name: 'e-Stat 消費者物価指数の公表予定', url: 'https://www.e-stat.go.jp/release-calendar/statistics/00200573', kinds: ['jpcpi', 'tkcpi'] },
  fed: { name: 'FRB の FOMC の日程', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', check: true },
  'boj-cal': { name: '日銀の次回会合の日程', url: 'https://www.boj.or.jp/about/calendar/index.htm', check: true },
  'boj-sche': { name: '日銀の会合の日程の表', url: 'https://www.boj.or.jp/mopo/mpmsche_minu/index.htm', check: true },
};

// 画面の「出典」に出す一覧（名前・URL）
export const SOURCES = [
  { name: '米国労働統計局（BLS）の公表予定', url: 'https://www.bls.gov/schedule/news_release/bls.ics' },
  { name: 'BLS 雇用統計の公表予定', url: 'https://www.bls.gov/schedule/news_release/empsit.htm' },
  { name: 'BLS CPI の公表予定', url: 'https://www.bls.gov/schedule/news_release/cpi.htm' },
  { name: '米国経済分析局（BEA）の公表予定', url: 'https://apps.bea.gov/API/signup/release_dates.json' },
  { name: 'e-Stat 消費者物価指数の公表予定', url: 'https://www.e-stat.go.jp/release-calendar/statistics/00200573' },
  { name: '日本銀行 金融政策決定会合の日程', url: 'https://www.boj.or.jp/mopo/mpmsche_minu/index.htm' },
];

const ymd = (y, mo, d) => `${y}${String(mo).padStart(2, '0')}${String(d).padStart(2, '0')}`;
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z');
const ny = (y, mo, d, h, mi) => zonedTime(y, mo, d, h, mi, TZ.ny);
const jp = (y, mo, d, h, mi) => zonedTime(y, mo, d, h, mi, TZ.tky);

// 1件：{ kind, day（公式の現地の日付 YYYYMMDD）, t（ms） }
const item = (kind, y, mo, d, t) => ({ kind, day: ymd(y, mo, d), t });

// ---- BLS のカレンダー（ics）----
// SUMMARY の頭の言葉で拾う（「State Employment …」などの州の分は拾わない）
const BLS_NAMES = [
  ['nfp', /^employment situation/i],
  ['uscpi', /^consumer price index/i],
  ['ppi', /^producer price index/i],
  ['jolts', /^job openings and labor turnover/i],
];
export function blsKind(summary) {
  const s = String(summary).replace(/\\,/g, ',').trim();
  for (const [k, re] of BLS_NAMES) if (re.test(s)) return k;
  return null;
}

export function parseBlsIcs(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out = [];
  let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT') {
      if (ev && ev.summary && ev.start) {
        const k = blsKind(ev.summary);
        const m = /(?:^|[:;])(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{0,2}(Z?)$/.exec(ev.start);
        if (k && m) {
          const [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
          const t = m[6] === 'Z' ? Date.UTC(y, mo - 1, d, h, mi) : ny(y, mo, d, h, mi);
          const p = parts(t, TZ.ny);
          out.push(item(k, p.y, p.mo, p.d, t));
        }
      }
      ev = null;
      continue;
    }
    if (!ev) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).split(';')[0].toUpperCase();
    if (key === 'SUMMARY') ev.summary = line.slice(i + 1);
    else if (key === 'DTSTART') ev.start = line;
  }
  return out;
}

// ---- BLS の指標ごとの予定の表（empsit.htm・cpi.htm）----
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MON_RE = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_RE = new RegExp(`${MON_RE}\\.?\\s+(\\d{1,2}),\\s*(\\d{4})`, 'i');
const TIME_RE = /(\d{1,2}):(\d{2})\s*([AP])\.?M\.?/i;
const stripTags = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function parseBlsTable(html, kind) {
  const out = [];
  for (const m of String(html).matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi)) {
    const row = stripTags(m[0]);
    const d = DATE_RE.exec(row);
    const tm = TIME_RE.exec(row);
    if (!d || !tm) continue;
    const mo = MONTHS[d[1].slice(0, 3).toLowerCase()];
    let h = +tm[1] % 12;
    if (tm[3].toUpperCase() === 'P') h += 12;
    out.push(item(kind, +d[3], mo, +d[2], ny(+d[3], mo, +d[2], h, +tm[2])));
  }
  return out;
}

// ---- BEA の JSON ----
function beaDates(json, name) {
  if (!json || typeof json !== 'object') return [];
  const key = Object.keys(json).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  if (!key) return [];
  const v = json[key];
  const list = Array.isArray(v) ? v : v && Array.isArray(v.release_dates) ? v.release_dates : [];
  return list.filter((x) => typeof x === 'string');
}

export function parseBea(json) {
  const out = [];
  for (const [kind, name] of [['pce', 'Personal Income and Outlays'], ['gdp', 'Gross Domestic Product']]) {
    for (const s of beaDates(json, name)) {
      const t = Date.parse(s);
      if (!Number.isFinite(t)) continue;
      const p = parts(t, TZ.ny);
      out.push(item(kind, p.y, p.mo, p.d, t));
    }
  }
  return dedupe(out);
}

// ---- e-Stat の公表予定（消費者物価指数）----
// 「全国」と「東京都区部」の見出しのあとの「2026年10月分 … 公表日 2026-11-20 08:30」を拾う。年平均・年度平均・遡及は拾わない
export function parseEstat(html) {
  const text = stripTags(String(html).replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, '\n'));
  const out = [];
  const re = /(\d{4})年(\d{1,2})月分([^公]{0,40}?)公表日\s*(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?\s*(\d{1,2}):(\d{2})/g;
  for (const m of text.matchAll(re)) {
    if (/年平均|年度平均|遡及/.test(m[3])) continue;
    const before = text.slice(0, m.index);
    const tk = before.lastIndexOf('東京都区部');
    const zk = before.lastIndexOf('全国');
    if (tk < 0 && zk < 0) continue;
    const kind = tk > zk ? 'tkcpi' : 'jpcpi';
    const [y, mo, d] = [+m[4], +m[5], +m[6]];
    out.push(item(kind, y, mo, d, jp(y, mo, d, +m[7], +m[8])));
  }
  return dedupe(out);
}

// ---- 会合の表（meetings.json）→ 行 ----
const dparse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : null; };

export function meetingEvents(meetings, now) {
  const out = [];
  const fomc = (meetings.fomc || []).map((m) => ({ m, d: dparse(m.d2) })).filter((x) => x.d)
    .map(({ m, d }) => ({ m, d, t: ny(d[0], d[1], d[2], 14, 0) })).sort((a, b) => a.t - b.t);
  // 次の会合（まだ結果が出ていないいちばん近いもの）より先は「（予定）」
  const nextIdx = fomc.findIndex((x) => x.t > now);
  fomc.forEach(({ m, d, t }, i) => {
    const tentative = nextIdx >= 0 && i > nextIdx;
    out.push({ ...row('fomc', d, t), tentative, sub: { name: 'FOMC 会見', t: iso(ny(d[0], d[1], d[2], 14, 30)) } });
    const md = addDays({ y: d[0], mo: d[1], d: d[2] }, 21);
    out.push({ ...row('fomcmin', [md.y, md.mo, md.d], ny(md.y, md.mo, md.d, 14, 0)), tentative });
  });
  for (const m of meetings.boj || []) {
    const d = dparse(m.d2);
    if (!d) continue;
    out.push({ ...row('boj', d, jp(d[0], d[1], d[2], 12, 0)), approx: true, sub: { name: '日銀 総裁会見', t: iso(jp(d[0], d[1], d[2], 15, 30)) } });
  }
  for (const s of meetings.bojOpinions || []) {
    const d = dparse(s);
    if (d) out.push(row('bojop', d, jp(d[0], d[1], d[2], 8, 50)));
  }
  return out;
}

function row(kind, d, t) {
  const k = KINDS[kind];
  return { id: `${kind}-${ymd(d[0], d[1], d[2])}`, name: k.name, imp: k.imp, t: iso(t), src: k.src, approx: false, tentative: false };
}

export function itemsToEvents(items) {
  return items.map((x) => row(x.kind, [+x.day.slice(0, 4), +x.day.slice(4, 6), +x.day.slice(6, 8)], x.t));
}

// 同じ指標・同じ日の分は1つに（先に来たほうを残す＝ics を表より先に渡す）
export function dedupe(items) {
  const seen = new Set();
  return items.filter((x) => { const k = `${x.kind}-${x.day}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---- 会合の日程を公式ページと照らす ----
const MON_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// FRB：「2027 FOMC Meetings」の節ごとに、月の名前（「Apr/May」もある）と「27-28」「8-9*」
export function parseFomcPage(html) {
  const text = stripTags(html);
  const byYear = {};
  const heads = [...text.matchAll(/(\d{4}) FOMC Meetings/gi)];
  heads.forEach((h, i) => {
    const y = +h[1];
    const seg = text.slice(h.index + h[0].length, i + 1 < heads.length ? heads[i + 1].index : undefined);
    const re = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?\s+(\d{1,2})-(\d{1,2})\*?/g;
    const list = byYear[y] || (byYear[y] = []);
    for (const m of seg.matchAll(re)) {
      const mo1 = MON_NAMES.findIndex((n) => n.startsWith(m[1].toLowerCase().slice(0, 3))) + 1;
      const mo2 = m[2] ? MON_NAMES.findIndex((n) => n.startsWith(m[2].toLowerCase().slice(0, 3))) + 1 : mo1;
      const y2 = mo2 < mo1 ? y + 1 : y;
      list.push({ d1: dstr(y, mo1, +m[3]), d2: dstr(y2, mo2, +m[4]) });
    }
  });
  return byYear;
}

const dstr = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const zen = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[（(]/g, '（').replace(/[）)]/g, '）');

// 日銀：「2026年12月17日（木）、18日（金）」「12月17日（木）・18日（金）」の形。年は前にある「◯年」から
export function parseBojPage(html) {
  const text = zen(stripTags(html));
  const byYear = {};
  const re = /(?:(\d{4})年\s*)?(\d{1,2})月(\d{1,2})日（[月火水木金土日]）\s*[、・,，]\s*(?:(\d{1,2})月)?(\d{1,2})日（[月火水木金土日]）/g;
  for (const m of text.matchAll(re)) {
    let y = m[1] ? +m[1] : null;
    if (!y) {
      const ys = [...text.slice(0, m.index).matchAll(/(\d{4})年/g)];
      if (!ys.length) continue;
      y = +ys[ys.length - 1][1];
    }
    const mo1 = +m[2], mo2 = m[4] ? +m[4] : mo1;
    const list = byYear[y] || (byYear[y] = []);
    list.push({ d1: dstr(y, mo1, +m[3]), d2: dstr(mo2 < mo1 ? y + 1 : y, mo2, +m[5]) });
  }
  return byYear;
}

// 表（meetings.json）の会合が、ページに同じ日付であるか。ページにその年が1つもないときは見ない
export function compareMeetings(table, byYear, today) {
  const missing = [];
  for (const m of (table || []).filter((x) => x.d2 >= today)) {
    const page = byYear[+m.d1.slice(0, 4)];
    if (!page || !page.length) continue;
    if (!page.some((x) => x.d1 === m.d1 && x.d2 === m.d2)) missing.push(m);
  }
  return missing;
}

// 日銀のカレンダーの「次回」：ページに出ているきょう以降の会合が、表にあるか（会合の日の前後でずれても困らない向き）
export function unknownNext(table, byYear, today) {
  return Object.values(byYear).flat()
    .filter((x) => x.d2 >= today && !(table || []).some((m) => m.d1 === x.d1 && m.d2 === x.d2));
}

// 8/1 をすぎて、来年の会合の表がないか
export function needsNextYear(meetings, now) {
  const p = parts(now, TZ.tky);
  if (p.mo < 8) return [];
  const ny1 = String(p.y + 1);
  const miss = [];
  if (!(meetings.fomc || []).some((m) => (m.d1 || '').startsWith(ny1))) miss.push('FOMC');
  if (!(meetings.boj || []).some((m) => (m.d1 || '').startsWith(ny1))) miss.push('日銀会合');
  return miss;
}

// ---- events.json を組み立てる ----
// results：{ unit: items[] | null（読めなかった） }。prev：前の events.json（なければ null）
// 読めなかった・件数が前の半分より少ないページの指標は、前の分を残す
export function buildEvents({ results, meetings, prev, prevCounts = {}, now }) {
  const p = parts(now, TZ.tky);
  const s = addDays(p, -7);
  const from = jp(s.y, s.mo, s.d, 0, 0);
  const keepKinds = new Set();
  const shrunk = [];
  const fresh = [];
  for (const [unit, def] of Object.entries(UNITS)) {
    if (def.check) continue;
    const items = results[unit];
    if (!items) { def.kinds.forEach((k) => keepKinds.add(k)); continue; }
    const before = prevCounts[unit] || 0;
    if (before >= 4 && items.length < before / 2) { shrunk.push(unit); def.kinds.forEach((k) => keepKinds.add(k)); continue; }
    fresh.push(...items.map((x) => ({ ...x, unit })));
  }
  // ics を表より先に（同じ日の分は ics のほうを残す）
  const order = ['bls-ics', 'bls-empsit', 'bls-cpi'];
  fresh.sort((a, b) => order.indexOf(a.unit) - order.indexOf(b.unit));
  const events = [...itemsToEvents(dedupe(fresh)), ...meetingEvents(meetings, now)];
  const ids = new Set(events.map((e) => e.id));
  if (prev && Array.isArray(prev.events)) {
    for (const e of prev.events) {
      const kind = e.id.split('-')[0];
      if (keepKinds.has(kind) && !ids.has(e.id)) { events.push(e); ids.add(e.id); }
    }
  }
  const list = events.filter((e) => Date.parse(e.t) >= from)
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t) || b.imp - a.imp || a.id.localeCompare(b.id));
  return { events: list, shrunk };
}

// 日本時間の「2026-11-21 05:47」
export function jstStamp(now) {
  const p = parts(now, TZ.tky);
  const z = (n) => String(n).padStart(2, '0');
  return `${p.y}-${z(p.mo)}-${z(p.d)} ${z(p.h)}:${z(p.mi)}`;
}

// 出典＝統計のページ＋会合の表の出典（同じ URL は1つ）
export function makeJson(events, now, meetings = {}) {
  const sources = [];
  for (const x of [...SOURCES, ...(meetings.sources || [])]) {
    if (x && x.url && !sources.some((y) => y.url === x.url)) sources.push({ name: x.name, url: x.url });
  }
  return { updated: jstStamp(now), sources, events };
}

// 中身（updated をのぞく）が同じか
export function sameContent(a, b) {
  if (!a || !b) return false;
  return JSON.stringify({ s: a.sources, e: a.events }) === JSON.stringify({ s: b.sources, e: b.events });
}
