// 指標の予定を公式から読んで app/data/events.json を作る（Actions「毎日の更新」が毎朝動かす）
// node scripts/fetch-events.mjs [--dry-run]
// - Node 標準の fetch だけ。中身（updated をのぞく）が前と同じなら書きかえない
// - 読めないページは前の分を残す（失敗にしない・ログに1行）。7日続けて読めない・件数が前の半分より少ない・
//   会合の日程が公式とちがう・8/1 をすぎて来年の会合の表がない → mihari の issue（GITHUB_TOKEN があるときだけ）
// - --dry-run か DRY_RUN=true：issue を作らず、作るはずの題をログに出す
// - FIXTURES=<フォルダ>：ネットを見ずに、そのフォルダの見本（unit 名.txt）を読む（手元で確かめる用）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeMihari, fetchText, readJson, trackFail } from './mihari-lib.mjs';
import {
  UNITS, parseBlsIcs, parseBlsTable, parseBea, parseEstat, parseFomcPage, parseBojPage,
  compareMeetings, unknownNext, needsNextYear, buildEvents, makeJson, sameContent, jstStamp,
} from './events-lib.mjs';

const EVENTS = 'app/data/events.json';
const MEETINGS = 'app/data/meetings.json';
const STATE = 'state/events-state.json';
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const FIX = process.env.FIXTURES || '';
const NOW = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();
const TITLE = {
  meet: '【見張り】FX時計：会合の日程が公式とちがう',
  year: '【見張り】FX時計：来年の会合の表を足して',
  fail: (name) => `【見張り】FX時計：指標の予定を7日続けて読めない（${name}）`,
  shrink: (name) => `【見張り】FX時計：指標の予定の件数が急に減った（${name}）`,
};

const { report, resolve, today } = makeMihari({ now: NOW, dry: DRY, by: 'scripts/fetch-events.mjs' });

async function get(url, unit) {
  if (FIX) {
    const f = join(FIX, `${unit}.txt`);
    if (!existsSync(f)) throw new Error('見本なし');
    return readFileSync(f, 'utf8');
  }
  return fetchText(url);
}

const PARSE = {
  'bls-ics': (t) => parseBlsIcs(t),
  'bls-empsit': (t) => parseBlsTable(t, 'nfp'),
  'bls-cpi': (t) => parseBlsTable(t, 'uscpi'),
  bea: (t) => parseBea(JSON.parse(t)),
  estat: (t) => parseEstat(t),
  fed: (t) => parseFomcPage(t),
  'boj-cal': (t) => parseBojPage(t),
  'boj-sche': (t) => parseBojPage(t),
};
const count = (r) => (Array.isArray(r) ? r.length : Object.values(r).flat().length);

// ---- 本体 ----
const meetings = readJson(MEETINGS);
if (!meetings) { console.log('meetings.json を読めない'); process.exit(1); }
const prev = readJson(EVENTS);
const state = readJson(STATE) || { units: {} };
const stateBefore = JSON.stringify(state);
const results = {};
const prevCounts = Object.fromEntries(Object.entries(state.units).map(([k, v]) => [k, v.count || 0]));

for (const [unit, def] of Object.entries(UNITS)) {
  const st = state.units[unit] || (state.units[unit] = { count: 0, firstFail: null });
  try {
    const r = PARSE[unit](await get(def.url, unit));
    if (!count(r)) throw new Error('1件も拾えない');
    results[unit] = r;
    console.log(`${unit}：${count(r)}件`);
  } catch (e) {
    results[unit] = null;
    console.log(`${unit}：読めなかった（${e.message}）。前の分を残す`);
  }
}

const { events, shrunk } = buildEvents({ results, meetings, prev, prevCounts, now: NOW });

// 読めた日・読めない日の数え（7日続けて読めなければ issue）
for (const [unit, def] of Object.entries(UNITS)) {
  const st = state.units[unit];
  const days = trackFail(st, !!results[unit], today);
  if (results[unit]) {
    if (!shrunk.includes(unit)) st.count = count(results[unit]);
    await resolve(TITLE.fail(def.name));
  } else {
    if (days >= 7) await report(TITLE.fail(def.name), [`${def.name}（${def.url}）を ${st.firstFail} から ${days} 日続けて読めない。events.json は前の分のまま。`]);
  }
  if (shrunk.includes(unit)) {
    await report(TITLE.shrink(def.name), [`${def.name}（${def.url}）で拾えた件数が ${count(results[unit])} 件（前は ${prevCounts[unit]} 件）。ページの形が変わったかもしれない。events.json は前の分のまま。`]);
  } else if (results[unit] && !def.check) {
    await resolve(TITLE.shrink(def.name));
  }
}

// 会合の日程を照らす（表が正。ちがっても events.json は表のまま）
const diffs = [];
const checked = [];
if (results.fed) {
  checked.push('fed');
  for (const m of compareMeetings(meetings.fomc, results.fed, today)) diffs.push(`FOMC ${m.d1}〜${m.d2} が FRB のページにない`);
}
if (results['boj-cal']) {
  checked.push('boj-cal');
  for (const m of unknownNext(meetings.boj, results['boj-cal'], today)) diffs.push(`日銀のカレンダーの次回 ${m.d1}〜${m.d2} が表にない`);
}
if (results['boj-sche']) {
  checked.push('boj-sche');
  for (const m of compareMeetings(meetings.boj, results['boj-sche'], today)) diffs.push(`日銀会合 ${m.d1}〜${m.d2} が日銀の日程の表にない`);
}
if (diffs.length) await report(TITLE.meet, ['meetings.json（手で入れた表）と公式ページの日付がちがう。events.json は表のまま。公式を開いて確かめ、表を直す。', ...diffs.map((d) => `- ${d}`)]);
else if (checked.length === 3) await resolve(TITLE.meet);

const miss = needsNextYear(meetings, NOW);
if (miss.length) await report(TITLE.year, [`8/1 をすぎたのに、app/data/meetings.json に来年の ${miss.join('・')} の日程がない。公式の発表を見て足す。`]);
else await resolve(TITLE.year);

// 書き出し
const next = makeJson(events, NOW, meetings);
// 統計のページがどれも読めなかった日は updated を前のままに（画面の「予定が古いかもしれません」のため）
const anyStat = Object.entries(UNITS).some(([u, d]) => !d.check && results[u] && !shrunk.includes(u));
if (!anyStat && prev && prev.updated) next.updated = prev.updated;
if (sameContent(prev, next)) {
  console.log(`events.json：変わりなし（${events.length}件）`);
} else {
  mkdirSync('app/data', { recursive: true });
  writeFileSync(EVENTS, toText(next));
  console.log(`events.json：書きかえた（${events.length}件）`);
}
if (JSON.stringify(state) !== stateBefore) {
  mkdirSync('state', { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
  console.log('state/events-state.json：書きかえた');
}
