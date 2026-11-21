// 休場の予定：日本・英国・米国の祝日の公式データを読む関数と、holidays.json を組み立てる関数（ネットもファイルも見ない）
// 読むのは scripts/fetch-holidays.mjs。テストは test/holidays.test.mjs（手で書いた小さな見本で）
import { TZ, parts, addDays } from '../app/time.js';
import { jstStamp } from './events-lib.mjs';

export const HOL_UNITS = {
  jp: { name: '内閣府「国民の祝日」', url: 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv', binary: true },
  uk: { name: '英国政府の祝日（イングランドとウェールズ）', url: 'https://www.gov.uk/bank-holidays.json' },
  us: { name: 'FRB の休み（K.8）', url: 'https://www.federalreserve.gov/aboutthefed/k8.htm' },
};

export const HOL_SOURCES = Object.values(HOL_UNITS).map((u) => ({ name: u.name, url: u.url }));

const dstr = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const wdOf = (s) => new Date(s + 'T12:00:00Z').getUTCDay();

// ---- 日本：内閣府の CSV（Shift_JIS・1行目は見出し・「2027/1/1,元日」）----
export function parseJpCsv(data) {
  const text = typeof data === 'string' ? data : new TextDecoder('shift_jis').decode(data);
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*"?(\d{4})\/(\d{1,2})\/(\d{1,2})"?\s*,\s*"?([^",]+?)"?\s*$/.exec(line);
    if (m) out.push({ d: dstr(+m[1], +m[2], +m[3]), name: m[4].trim() });
  }
  return out;
}

// ---- 英国：gov.uk の JSON（england-and-wales だけ。代休も入っている）----
const UK_NAMES = [
  [/new year/i, '元日'],
  [/good friday/i, '聖金曜日'],
  [/easter monday/i, 'イースターマンデー'],
  [/early may/i, '5月の祝日'],
  [/spring/i, '春の祝日'],
  [/summer/i, '夏の祝日'],
  [/christmas/i, 'クリスマス'],
  [/boxing/i, 'ボクシング・デー'],
];
export function ukName(title) {
  const t = String(title);
  const base = (UK_NAMES.find(([re]) => re.test(t)) || [null, '英国の祝日'])[1];
  return /substitute/i.test(t) ? `${base}（振替）` : base;
}

export function parseUkJson(json) {
  const ew = json && json['england-and-wales'];
  const list = ew && Array.isArray(ew.events) ? ew.events : [];
  return list.filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map((e) => ({ d: e.date, name: ukName(e.title) }));
}

// ---- 米国：FRB の休み表（K.8）----
// 表の見出しの行に年、各行は祝日の名前と年ごとの日付（「January 1」「July 4*」）
// 土曜の祝日は前の金曜も FRB は開く（休みなし）、日曜の祝日は次の月曜が休み
const US_NAMES = [
  [/new year/i, '元日'],
  [/king/i, 'キング牧師の日'],
  [/washington|president/i, '大統領の日'],
  [/memorial/i, '戦没者追悼記念日'],
  [/juneteenth/i, 'ジューンティーンス'],
  [/independence/i, '独立記念日'],
  [/labor/i, 'レイバー・デー'],
  [/columbus|indigenous/i, 'コロンブス・デー'],
  [/veterans/i, '退役軍人の日'],
  [/thanksgiving/i, '感謝祭'],
  [/christmas/i, 'クリスマス'],
];
export const usName = (s) => (US_NAMES.find(([re]) => re.test(s)) || [null, '米国の祝日'])[1];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const cellText = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;|’/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function parseK8(html) {
  const out = [];
  let years = null;
  for (const row of String(html).matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi)) {
    const cells = [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => cellText(m[1]));
    if (cells.length < 2) continue;
    const ys = cells.slice(1).map((c) => (/^\d{4}$/.test(c) ? +c : null));
    if (ys.every((y) => y)) { years = ys; continue; }
    if (!years) continue;
    const name = usName(cells[0]);
    cells.slice(1).forEach((c, i) => {
      const m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(c);
      if (!m || !years[i] || !MONTHS[m[1].toLowerCase()]) return;
      const d = dstr(years[i], MONTHS[m[1].toLowerCase()], +m[2]);
      const wd = wdOf(d);
      if (wd === 6) return; // 土曜：前の金曜は開く
      if (wd === 0) {
        const x = new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10);
        out.push({ d: x, name: `${name}（振替）` });
        return;
      }
      out.push({ d, name });
    });
  }
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

// ---- holidays.json を組み立てる ----
// results：{ jp|uk|us: [{d,name}] | null（読めなかった） }。読めない・件数が前の半分より少ない国は前の分を残す
export function buildHolidays({ results, prev, prevCounts = {}, now }) {
  const p = parts(now, TZ.tky);
  const s = addDays(p, -7);
  const from = dstr(s.y, s.mo, s.d);
  const out = { jpYears: [], jp: [], uk: [], us: [] };
  const shrunk = [];
  for (const k of ['jp', 'uk', 'us']) {
    const r = results[k];
    const before = prevCounts[k] || 0;
    const useNew = r && !(before >= 4 && r.length < before / 2);
    if (r && !useNew) shrunk.push(k);
    if (useNew) {
      const seen = new Set();
      out[k] = r.filter((x) => x.d >= from && !seen.has(x.d) && seen.add(x.d)).map((x) => [x.d, x.name]);
      if (k === 'jp') out.jpYears = [...new Set(r.map((x) => +x.d.slice(0, 4)))].filter((y) => y >= p.y - 1).sort();
    } else if (prev) {
      out[k] = (prev[k] || []).filter((x) => x[0] >= from);
      if (k === 'jp') out.jpYears = prev.jpYears || [];
    }
  }
  return { ...out, shrunk };
}

export function makeHolidaysJson(h, now) {
  return { updated: jstStamp(now), sources: HOL_SOURCES, jpYears: h.jpYears, jp: h.jp, uk: h.uk, us: h.us };
}

export function sameHolidays(a, b) {
  if (!a || !b) return false;
  const pick = (x) => JSON.stringify([x.sources, x.jpYears, x.jp, x.uk, x.us]);
  return pick(a) === pick(b);
}

// 1行に1件（差分が読みやすいように）
export function holidaysText(j) {
  const list = (a) => a.map((x) => '  ' + JSON.stringify(x)).join(',\n');
  return `{\n "updated": ${JSON.stringify(j.updated)},\n "sources": [\n${list(j.sources)}\n ],\n "jpYears": ${JSON.stringify(j.jpYears)},\n`
    + ` "jp": [\n${list(j.jp)}\n ],\n "uk": [\n${list(j.uk)}\n ],\n "us": [\n${list(j.us)}\n ]\n}\n`;
}
