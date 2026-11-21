import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeHolidays, gotobiMark, isJpBankHoliday, marketHoliday, schedule, holidayDays, holidayNotes, parts, TZ,
  isSessionOpen, SESSIONS, timetableRows,
} from '../app/time.js';
import {
  parseJpCsv, parseUkJson, parseK8, buildHolidays, makeHolidaysJson, sameHolidays, holidaysText, ukName,
} from '../scripts/holidays-lib.mjs';

const dir = 'test/fixtures/holidays/';
const jst = (s) => Date.parse(s + '+09:00');
const NOW = jst('2026-11-22T05:47:00');
const results = () => ({
  jp: parseJpCsv(readFileSync(dir + 'jp.csv')),
  uk: parseUkJson(JSON.parse(readFileSync(dir + 'uk.txt', 'utf8'))),
  us: parseK8(readFileSync(dir + 'us.txt', 'utf8')),
});
const hol = normalizeHolidays(JSON.parse(holidaysText(makeHolidaysJson(buildHolidays({ results: results(), now: NOW }), NOW))));
const sc = (s) => schedule(jst(s), hol);
const offOf = (s) => Object.fromEntries(sc(s).list.map((x) => [x.ev.id, x.off]));

test('内閣府の CSV（Shift_JIS・見出しの行は拾わない）', () => {
  const r = results().jp;
  assert.equal(r[0].d, '2025-11-03');
  assert.deepEqual(r.find((x) => x.d === '2026-11-23'), { d: '2026-11-23', name: '勤労感謝の日' });
  assert.ok(r.some((x) => x.d.startsWith('2027')));
});

test('英国はイングランドとウェールズだけ・代休は（振替）', () => {
  const r = results().uk;
  assert.ok(!r.some((x) => x.d === '2027-01-04')); // スコットランドの分
  assert.deepEqual(r.find((x) => x.d === '2026-12-28'), { d: '2026-12-28', name: 'ボクシング・デー（振替）' });
  assert.equal(ukName('Coronation of King Charles III'), '英国の祝日');
});

test('米国（K.8）：土曜の祝日は休みなし・日曜の祝日は次の月曜', () => {
  const y2027 = results().us.filter((x) => x.d.startsWith('2027')).map((x) => x.d.slice(5));
  assert.deepEqual(y2027, ['01-01', '01-18', '02-15', '05-31', '07-05', '09-06', '10-11', '11-11', '11-25']);
});

test('確かめる日：仲値なし・NY休み・ロンドン休み', () => {
  assert.equal(offOf('2026-11-23T08:00:00').nakane, '東京休み');           // 勤労感謝の日
  assert.equal(offOf('2026-11-26T12:00:00').ny, 'NY休み');                 // 感謝祭
  assert.equal(offOf('2026-11-26T12:00:00').nys, 'NY休み');
  assert.equal(offOf('2026-12-28T12:00:00').ldn, 'ロンドン休み');          // Boxing Day の代休
  assert.equal(offOf('2026-12-28T12:00:00').fix, 'ロンドン休み');
  assert.equal(offOf('2026-12-31T08:00:00').nakane, '東京休み');           // 銀行の休み
  assert.equal(offOf('2027-07-05T12:00:00').ny, 'NY休み');                 // 独立記念日が日曜
  assert.equal(offOf('2027-12-24T12:00:00').ny, null);                    // FRB は開く
  assert.notEqual(sc('2026-11-23T08:00:00').next.ev.id, 'nakane');
  assert.equal(isSessionOpen(SESSIONS.find((s) => s.id === 'tky'), jst('2026-11-23T10:00:00'), hol), false);
  assert.equal(isSessionOpen(SESSIONS.find((s) => s.id === 'tky'), jst('2026-11-24T10:00:00'), hol), true);
});

test('確かめる日：ゴトー日（祝日と年末年始の前倒し・印は1つ）', () => {
  const g = (s) => gotobiMark(jst(s + 'T09:00:00'), hol);
  assert.equal(g('2026-11-13'), 'ゴトー日（前倒し）'); // 15日が日曜
  assert.equal(g('2026-12-30'), 'ゴトー日');           // 30日。31日（銀行の休み）の月末も重なる
  assert.equal(g('2026-12-31'), null);
  assert.equal(g('2027-01-08'), 'ゴトー日（前倒し）'); // 10日が日曜・11日が成人の日
  assert.equal(g('2027-04-30'), 'ゴトー日');           // 30日。5/5 の前倒しも重なる
  assert.equal(g('2026-11-27'), null);
  assert.equal(g('2027-02-26'), 'ゴトー日（前倒し）'); // 2月の月末（28日）が日曜
  // 読めないとき：土日と年末年始だけで判定（成人の日を知らないので 1/8 は前倒しのまま・1/11 もゴトー日ではない）
  assert.equal(gotobiMark(jst('2027-01-08T09:00:00'), null), 'ゴトー日（前倒し）');
  assert.equal(isJpBankHoliday(parts(jst('2027-01-11T09:00:00'), TZ.tky), null), false);
  assert.equal(isJpBankHoliday(parts(jst('2027-01-11T09:00:00'), TZ.tky), hol), true);
  const rows = timetableRows(schedule(jst('2026-11-13T08:00:00'), hol), jst('2026-11-13T08:00:00'), hol);
  assert.equal(rows.find((r) => r.type === 'hour' && r.h === 9).items[0].gotobi, 'ゴトー日（前倒し）');
});

test('7日先までの休みとお知らせ', () => {
  assert.deepEqual(holidayDays(jst('2026-11-20T12:00:00'), hol).map((d) => `${d.label} ${d.where} ${d.name}`),
    ['11/23（月） 日本 勤労感謝の日', '11/26（木） 米国 感謝祭']);
  assert.deepEqual(holidayDays(jst('2026-12-24T12:00:00'), hol).map((d) => `${d.label} ${d.where}`),
    ['12/25（金） 英国', '12/25（金） 米国', '12/28（月） 英国', '12/31（木） 日本']);
  assert.deepEqual(holidayNotes(jst('2026-11-23T12:00:00'), hol, false), ['きょうは仲値なし（東京休み）']);
  assert.deepEqual(holidayNotes(jst('2027-12-24T12:00:00'), hol, false), ['取引時間が変わる会社があります']);
  assert.deepEqual(holidayNotes(jst('2026-12-25T12:00:00'), hol, false), ['主な休み：クリスマス（取引時間は FX 会社ごとにちがいます）']);
  assert.deepEqual(holidayNotes(jst('2027-01-01T12:00:00'), hol, false), ['きょうは仲値なし（東京休み）', '主な休み：元日（取引時間は FX 会社ごとにちがいます）']);
  assert.deepEqual(holidayNotes(jst('2026-11-20T12:00:00'), null, true), ['祝日の予定を読めませんでした']);
  assert.deepEqual(holidayNotes(jst('2027-12-28T12:00:00'), hol, false), ['来年の祝日は内閣府の発表待ち']);
  assert.equal(marketHoliday('tky', jst('2026-11-21T10:00:00'), hol), null); // 土曜は「休み」と出さない
});

test('holidays.json：前の分を残す・中身が同じなら同じ', () => {
  const prev = makeHolidaysJson(buildHolidays({ results: results(), now: NOW }), NOW);
  const r = results();
  r.us = null;
  r.uk = r.uk.slice(0, 2);
  const h = buildHolidays({ results: r, prev, prevCounts: { uk: 16 }, now: NOW });
  assert.deepEqual(h.shrunk, ['uk']);
  assert.deepEqual(h.us, prev.us);
  assert.deepEqual(h.uk, prev.uk);
  assert.ok(sameHolidays(prev, makeHolidaysJson(h, NOW + 864e5)));
  assert.deepEqual(prev.jpYears, [2025, 2026, 2027]);
  assert.ok(prev.jp.some((x) => x[0].startsWith('2027')) && prev.uk.some((x) => x[0].startsWith('2027')) && prev.us.some((x) => x[0].startsWith('2027')));
  assert.equal(normalizeHolidays({ jp: [] }), null);
});
