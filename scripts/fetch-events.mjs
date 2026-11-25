// 指標の予定を公式から読んで app/data/events.json を作る（Actions「毎日の更新」が毎朝動かす）
// node scripts/fetch-events.mjs [--dry-run]
// - Node 標準の fetch だけ。中身（updated をのぞく）が前と同じなら書きかえない
// - 読めないページは前の分を残す（失敗にしない・ログに1行）。7日続けて読めない・件数が前の半分より少ない・
//   会合の日程が公式とちがう・8/1 をすぎて来年の会合の表がない → mihari の issue（GITHUB_TOKEN があるときだけ）
// - --dry-run か DRY_RUN=true：issue を作らず、作るはずの題をログに出す
// - FIXTURES=<フォルダ>：ネットを見ずに、そのフォルダの見本（unit 名.txt）を読む（手元で確かめる用）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  UNITS, parseBlsIcs, parseBlsTable, parseBea, parseEstat, parseFomcPage, parseBojPage,
  compareMeetings, unknownNext, needsNextYear, buildEvents, makeJson, sameContent, jstStamp,
} from './events-lib.mjs';

const EVENTS = 'app/data/events.json';
const MEETINGS = 'app/data/meetings.json';
const STATE = 'state/events-state.json';
const UA = 'fx-tokei/1.0 (+https://github.com/juice0402/fx-tokei)';
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const FIX = process.env.FIXTURES || '';
const NOW = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();
const today = jstStamp(NOW).slice(0, 10);
const TITLE = {
  meet: '【見張り】FX時計：会合の日程が公式とちがう',
  year: '【見張り】FX時計：来年の会合の表を足して',
  fail: (name) => `【見張り】FX時計：指標の予定を7日続けて読めない（${name}）`,
  shrink: (name) => `【見張り】FX時計：指標の予定の件数が急に減った（${name}）`,
};

const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return null; } };

async function get(url, unit) {
  if (FIX) {
    const f = join(FIX, `${unit}.txt`);
    if (!existsSync(f)) throw new Error('見本なし');
    return readFileSync(f, 'utf8');
  }
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
    }
  }
  throw last;
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

// ---- GitHub の issue（mihari-spec のとおり）----
const GH = process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY
  ? { token: process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPOSITORY } : null;
const RUN = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '（手元で動かした）';

async function api(path, method = 'GET', body) {
  const res = await fetch(`https://api.github.com/repos/${GH.repo}${path}`, {
    method,
    headers: { Authorization: `Bearer ${GH.token}`, Accept: 'application/vnd.github+json', 'User-Agent': UA, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 422) throw new Error(`GitHub ${method} ${path}: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function openIssue(title) {
  const list = await api('/issues?state=open&labels=mihari&per_page=100');
  return list.find((i) => i.title === title && !i.pull_request) || null;
}

async function report(title, lines) {
  const body = [...lines, `いつ：${jstStamp(NOW)}（日本時間）`, `実行：${RUN}`, '', '見張り（.github/workflows/data.yml の scripts/fetch-events.mjs）が作った'].join('\n');
  if (DRY || !GH) { console.log(`[issue を作るはず] ${title}`); return; }
  try {
    const found = await openIssue(title);
    if (found) {
      const cs = await api(`/issues/${found.number}/comments?per_page=100`);
      if (!cs.some((c) => c.body.startsWith('まだ続いている') && jstStamp(Date.parse(c.created_at)).startsWith(today))) {
        await api(`/issues/${found.number}/comments`, 'POST', { body: `まだ続いている（${RUN}）` });
      }
      console.log(`issue #${found.number} はもうある：${title}`);
      return;
    }
    await api('/labels', 'POST', { name: 'mihari', color: 'd93f0b', description: '見張りが見つけた。しょーくんに知らせるだけ' });
    const made = await api('/issues', 'POST', { title, body, labels: ['mihari'] });
    console.log(`issue #${made.number} を作った：${title}`);
  } catch (e) {
    console.log(`issue を作れなかった：${e.message}`);
  }
}

async function resolve(title) {
  if (DRY || !GH) return;
  try {
    const found = await openIssue(title);
    if (!found) return;
    await api(`/issues/${found.number}/comments`, 'POST', { body: `直った（${RUN}）` });
    await api(`/issues/${found.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
    console.log(`issue #${found.number} を閉じた：${title}`);
  } catch (e) {
    console.log(`issue を閉じられなかった：${e.message}`);
  }
}

// 1行に1件（差分が読みやすいように）
const toText = (j) => `{\n "updated": ${JSON.stringify(j.updated)},\n "sources": [\n${j.sources.map((x) => '  ' + JSON.stringify(x)).join(',\n')}\n ],\n "events": [\n${j.events.map((x) => '  ' + JSON.stringify(x)).join(',\n')}\n ]\n}\n`;

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
  if (results[unit]) {
    st.firstFail = null;
    if (!shrunk.includes(unit)) st.count = count(results[unit]);
    await resolve(TITLE.fail(def.name));
  } else {
    st.firstFail = st.firstFail || today;
    const days = Math.round((Date.parse(today) - Date.parse(st.firstFail)) / 864e5) + 1;
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
