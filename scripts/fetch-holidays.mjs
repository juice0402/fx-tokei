// 日本・英国・米国の祝日を公式から読んで app/data/holidays.json を作る（Actions「毎日の更新」が毎朝動かす）
// node scripts/fetch-holidays.mjs [--dry-run]
// - 中身（updated をのぞく）が前と同じなら書きかえない。読めない国は前の分を残す（ログに1行）
// - 7日続けて読めない・件数が前の半分より少ない → mihari の issue（GITHUB_TOKEN があるときだけ。--dry-run は題をログに出すだけ）
// - FIXTURES=<フォルダ>：ネットを見ずに、見本（jp.csv・uk.txt・us.txt）を読む
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeMihari, fetchText, readJson, trackFail } from './mihari-lib.mjs';
import {
  HOL_UNITS, parseJpCsv, parseUkJson, parseK8, buildHolidays, makeHolidaysJson, sameHolidays, holidaysText,
} from './holidays-lib.mjs';

const OUT = 'app/data/holidays.json';
const STATE = 'state/holidays-state.json';
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const FIX = process.env.FIXTURES || '';
const NOW = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();
const TITLE = {
  fail: (name) => `【見張り】FX時計：祝日の予定を7日続けて読めない（${name}）`,
  shrink: (name) => `【見張り】FX時計：祝日の件数が急に減った（${name}）`,
};
const { report, resolve, today } = makeMihari({ now: NOW, dry: DRY, by: 'scripts/fetch-holidays.mjs' });
const FIXNAME = { jp: 'jp.csv', uk: 'uk.txt', us: 'us.txt' };
const PARSE = {
  jp: (b) => parseJpCsv(b),
  uk: (t) => parseUkJson(JSON.parse(t)),
  us: (t) => parseK8(t),
};

async function get(k, def) {
  if (FIX) {
    const f = join(FIX, FIXNAME[k]);
    if (!existsSync(f)) throw new Error('見本なし');
    const buf = readFileSync(f);
    return def.binary ? buf : buf.toString('utf8');
  }
  return fetchText(def.url, def.binary);
}

const prev = readJson(OUT);
const state = readJson(STATE) || { units: {} };
const stateBefore = JSON.stringify(state);
const prevCounts = Object.fromEntries(Object.entries(state.units).map(([k, v]) => [k, v.count || 0]));
const results = {};
for (const [k, def] of Object.entries(HOL_UNITS)) {
  try {
    const r = PARSE[k](await get(k, def));
    if (!r.length) throw new Error('1件も拾えない');
    results[k] = r;
    console.log(`${k}：${r.length}件`);
  } catch (e) {
    results[k] = null;
    console.log(`${k}：読めなかった（${e.message}）。前の分を残す`);
  }
}

const h = buildHolidays({ results, prev, prevCounts, now: NOW });
for (const [k, def] of Object.entries(HOL_UNITS)) {
  const st = state.units[k] || (state.units[k] = { count: 0, firstFail: null });
  const days = trackFail(st, !!results[k], today);
  if (results[k]) {
    await resolve(TITLE.fail(def.name));
    if (h.shrunk.includes(k)) {
      await report(TITLE.shrink(def.name), [`${def.name}（${def.url}）で拾えた件数が ${results[k].length} 件（前は ${prevCounts[k]} 件）。ページの形が変わったかもしれない。holidays.json は前の分のまま。`]);
    } else {
      st.count = results[k].length;
      await resolve(TITLE.shrink(def.name));
    }
  } else if (days >= 7) {
    await report(TITLE.fail(def.name), [`${def.name}（${def.url}）を ${st.firstFail} から ${days} 日続けて読めない。holidays.json は前の分のまま。`]);
  }
}

const next = makeHolidaysJson(h, NOW);
if (!Object.values(results).some(Boolean) && prev && prev.updated) next.updated = prev.updated;
if (sameHolidays(prev, next)) {
  console.log('holidays.json：変わりなし');
} else {
  mkdirSync('app/data', { recursive: true });
  writeFileSync(OUT, holidaysText(next));
  console.log(`holidays.json：書きかえた（日本 ${next.jp.length}・英国 ${next.uk.length}・米国 ${next.us.length}）`);
}
if (JSON.stringify(state) !== stateBefore) {
  mkdirSync('state', { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
  console.log('state/holidays-state.json：書きかえた');
}
