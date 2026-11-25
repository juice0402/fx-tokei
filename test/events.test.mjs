import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  hm, parts, TZ, normalizeEvents, nextIndicator, indicatorDays, indicatorTime, indicatorLeft, staleInfo,
  withIndicators, schedule, timetableRows, indicatorsIn,
} from '../app/time.js';
import {
  parseBlsIcs, parseBlsTable, parseBea, parseEstat, parseFomcPage, parseBojPage, compareMeetings, unknownNext, needsNextYear,
  meetingEvents, buildEvents, makeJson, sameContent, blsKind,
} from '../scripts/events-lib.mjs';

const fx = (n) => readFileSync(`test/fixtures/events/${n}.txt`, 'utf8');
const meetings = JSON.parse(readFileSync('app/data/meetings.json', 'utf8'));
const jst = (s) => Date.parse(s + '+09:00');
// 日本時間の「12/4（金）22:30」の形
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const jp = (t) => { const p = parts(t, TZ.tky); return `${p.mo}/${p.d}（${WD[p.wd]}）${hm(t)}`; };
const NOW = jst('2026-11-22T05:47:00');

test('BLS の ics：折り返しの行・州の分と別の指標は拾わない・NY の時刻', () => {
  const r = parseBlsIcs(fx('bls-ics'));
  assert.deepEqual(r.map((x) => x.kind), ['nfp', 'uscpi']);
  assert.equal(jp(r[0].t), '12/4（金）22:30'); // 米雇用統計 2026-12-04 8:30 ET
  assert.equal(blsKind('State Job Openings and Labor Turnover for October 2026'), null);
  assert.equal(blsKind('Job Openings and Labor Turnover Survey for October 2026'), 'jolts');
  assert.equal(blsKind('Producer Price Index for November 2026'), 'ppi');
});

test('BLS の予定の表：「Dec. 04, 2026」「June 10, 2027」の形と 08:30 AM', () => {
  const e = parseBlsTable(fx('bls-empsit'), 'nfp');
  assert.deepEqual(e.map((x) => x.day), ['20261204', '20270108', '20270205', '20270305']);
  const c = parseBlsTable(fx('bls-cpi'), 'uscpi');
  assert.equal(c.length, 13);
  assert.equal(c.find((x) => x.day === '20270610').t, Date.parse('2027-06-10T12:30:00Z')); // 夏時間
  assert.equal(c.find((x) => x.day === '20261210').t, Date.parse('2026-12-10T13:30:00Z')); // 冬時間
});

test('BEA の JSON：同じ日時は1つに・ほかのキーは拾わない', () => {
  const r = parseBea(JSON.parse(fx('bea')));
  assert.deepEqual(r.map((x) => x.kind + x.day), ['pce20261125', 'pce20261223']);
  assert.equal(jp(r[0].t), '11/25（水）22:30'); // 米PCE 2026-11-25T13:30Z
});

test('e-Stat：全国と東京を分け、年平均と遡及は拾わない', () => {
  const r = parseEstat(fx('estat'));
  assert.deepEqual(r.filter((x) => x.kind === 'jpcpi').map((x) => x.day), ['20261120', '20261218', '20270122', '20270219', '20270319']);
  assert.deepEqual(r.filter((x) => x.kind === 'tkcpi').map((x) => x.day), ['20261127', '20261225', '20270129', '20270226', '20270326']);
  assert.equal(jp(r.find((x) => x.kind === 'tkcpi').t), '11/27（金）8:30'); // 東京CPI 2026-11-27 8:30
});

test('会合の表：FOMC の結果・会見・議事録と日銀の時刻（夏時間は自動）', () => {
  const ev = Object.fromEntries(meetingEvents(meetings, NOW).map((e) => [e.id, e]));
  const t = (id) => jp(Date.parse(ev[id].t));
  assert.equal(t('fomc-20261209'), '12/10（木）4:00');
  assert.equal(jp(Date.parse(ev['fomc-20261209'].sub.t)), '12/10（木）4:30');
  assert.equal(t('fomc-20270317'), '3/18（木）3:00'); // 米は 3/14 から夏時間
  assert.equal(t('fomcmin-20261230'), '12/31（木）4:00');
  assert.equal(jp(Date.parse(ev['boj-20261218'].sub.t)), '12/18（金）15:30');
  assert.equal(ev['boj-20261218'].approx, true);
  assert.equal(t('bojop-20270201'), '2/1（月）8:50');
  // 次の会合（12月）は確定・その先は（予定）
  assert.equal(ev['fomc-20261209'].tentative, false);
  assert.equal(ev['fomc-20270127'].tentative, true);
  assert.equal(ev['fomcmin-20261230'].tentative, false);
});

test('公式ページと照らす：同じなら差なし・ちがえば出す・その年がないページは見ない', () => {
  const today = '2026-11-22';
  assert.deepEqual(compareMeetings(meetings.fomc, parseFomcPage(fx('fed')), today), []);
  assert.deepEqual(compareMeetings(meetings.boj, parseBojPage(fx('boj-sche')), today), []);
  assert.deepEqual(unknownNext(meetings.boj, parseBojPage(fx('boj-cal')), today), []);
  const moved = fx('fed').replace('<strong>April</strong></div><div class="fomc-meeting__date">27-28', '<strong>May</strong></div><div class="fomc-meeting__date">4-5');
  assert.deepEqual(compareMeetings(meetings.fomc, parseFomcPage(moved), today).map((m) => m.d2), ['2027-04-28']);
  const only2026 = fx('fed').split('2027 FOMC')[0];
  assert.deepEqual(compareMeetings(meetings.fomc, parseFomcPage(only2026), today), []);
  assert.deepEqual(unknownNext(meetings.boj, parseBojPage('<p>2027年1月21日(木)、22日(金)</p>'), today), []);
  assert.deepEqual(unknownNext(meetings.boj, parseBojPage('<p>2026年12月18日（金）、19日（土）</p>'), today).map((m) => m.d2), ['2026-12-19']);
  assert.deepEqual(parseFomcPage('<h4>2027 FOMC Meetings</h4><div>Oct/Nov</div><div>31-1*</div>')[2027], [{ d1: '2027-10-31', d2: '2027-11-01' }]);
});

test('8/1 をすぎて来年の表がないとき', () => {
  assert.deepEqual(needsNextYear(meetings, jst('2027-07-31T12:00:00')), []);
  assert.deepEqual(needsNextYear(meetings, jst('2027-08-01T06:00:00')), ['FOMC', '日銀会合']);
  assert.deepEqual(needsNextYear(meetings, jst('2026-11-22T06:00:00')), []);
});

const results = () => ({
  'bls-ics': parseBlsIcs(fx('bls-ics')),
  'bls-empsit': parseBlsTable(fx('bls-empsit'), 'nfp'),
  'bls-cpi': parseBlsTable(fx('bls-cpi'), 'uscpi'),
  bea: parseBea(JSON.parse(fx('bea'))),
  estat: parseEstat(fx('estat')),
});

test('events.json を組み立てる：issue の4件が入り、きょう−7日より前は入らない・同じ日は1つ', () => {
  const { events, shrunk } = buildEvents({ results: results(), meetings, prev: null, now: NOW });
  assert.deepEqual(shrunk, []);
  const ids = events.map((e) => e.id);
  for (const id of ['nfp-20261204', 'fomc-20261209', 'boj-20261218', 'tkcpi-20261127', 'jpcpi-20261120']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  const j = makeJson(events, NOW, meetings);
  assert.equal(j.updated, '2026-11-22 05:47');
  assert.ok(j.sources.every((s) => s.url.startsWith('https://')));
  assert.equal(new Set(j.sources.map((s) => s.url)).size, j.sources.length);
  const later = buildEvents({ results: results(), meetings, prev: null, now: jst('2026-11-28T06:00:00') }).events;
  assert.ok(!later.some((e) => e.id === 'jpcpi-20261120')); // 11/20 は 11/21 より前
  assert.ok(sameContent(j, { ...makeJson(events, NOW + 864e5, meetings) }));
});

test('読めないページ・件数が半分より少ないページは前の分を残す', () => {
  const prev = makeJson(buildEvents({ results: results(), meetings, prev: null, now: NOW }).events, NOW, meetings);
  const r = results();
  r.estat = null;
  r['bls-cpi'] = r['bls-cpi'].slice(0, 2);
  const { events, shrunk } = buildEvents({ results: r, meetings, prev, prevCounts: { 'bls-cpi': 13 }, now: NOW });
  assert.deepEqual(shrunk, ['bls-cpi']);
  const ids = events.map((e) => e.id);
  assert.ok(ids.includes('tkcpi-20261127'));
  assert.ok(ids.includes('uscpi-20270811'));
});

test('画面の計算：次の指標・7日の一覧・しぼり込み・お昼ごろ・古い予定', () => {
  const j = makeJson(buildEvents({ results: results(), meetings, prev: null, now: NOW }).events, NOW, meetings);
  const d = normalizeEvents(JSON.parse(JSON.stringify(j)));
  assert.equal(nextIndicator(d.events, NOW, 2).id, 'pce-20261125');
  assert.equal(nextIndicator(d.events, NOW, 3).id, 'nfp-20261204');
  const days = indicatorDays(d.events, jst('2026-11-25T09:00:00'), 2);
  assert.deepEqual(days.map((x) => x.label), ['11/25（水）', '11/27（金）']);
  assert.deepEqual(indicatorDays(d.events, jst('2026-11-25T09:00:00'), 3), []);
  const boj = d.events.find((e) => e.id === 'boj-20261218');
  assert.equal(indicatorTime(boj), 'お昼ごろ');
  assert.equal(indicatorLeft(boj, jst('2026-12-18T09:00:00')), 'あと3時間ごろ');
  const nfp = d.events.find((e) => e.id === 'nfp-20261204');
  assert.equal(indicatorLeft(nfp, jst('2026-12-04T20:00:00')), 'あと2時間30分');
  assert.deepEqual(staleInfo('2026-11-22 05:47', jst('2026-12-05T12:00:00')), { stale: false, label: '11月22日' });
  assert.deepEqual(staleInfo('2026-11-22 05:47', jst('2026-12-07T12:00:00')), { stale: true, label: '11月22日' });
  assert.equal(normalizeEvents({}), null);
  assert.equal(normalizeEvents({ events: [{ id: 'x', name: '<b>', imp: 3, t: '2026-12-01T00:00:00Z' }] }).events.length, 0);
});

test('時刻表に混ぜる：FOMC の日は 4:00 に結果・4:30 に会見', () => {
  const d = normalizeEvents(makeJson(buildEvents({ results: results(), meetings, prev: null, now: NOW }).events, NOW, meetings));
  const now = jst('2026-12-09T16:00:00');
  const sc = withIndicators(schedule(now), d.events.filter((e) => e.imp >= 2));
  const rows = timetableRows(sc, now).filter((r) => r.type === 'hour').map((r) => `${r.h}:${r.items.map((it) => String(it.mi).padStart(2, '0') + it.ev.id).join(',')}`);
  assert.ok(rows.includes('4:00fomc-20261209,30fomc-20261209-sub'), rows.join(' '));
  assert.equal(indicatorsIn(d.events, schedule(now).start, schedule(now).start + 864e5, 3).map((e) => e.id).join(), 'fomc-20261209');
});
