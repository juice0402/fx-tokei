import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, diaRange, timetableRows, tickContext, seasonLabel } from '../app/time.js';

const jst = (s) => Date.parse(s + '+09:00');
const iso = (t) => new Date(t).toISOString();
const shape = (rows) => rows.map((r) => (r.type === 'day' ? `[${r.label}]`
  : `${r.h}:${r.items.map((it) => String(it.mi).padStart(2, '0') + it.ev.id + (it.gotobi ? '*' : '')).join(',')}${r.past ? ' past' : ''}${r.next ? ' next' : ''}`));

test('ダイヤの範囲は日本時間の7時から翌7時', () => {
  const a = diaRange(jst('2026-11-13T16:30:00'), 7);
  assert.equal(iso(a.from), '2026-11-12T22:00:00.000Z');
  assert.equal(iso(a.to), '2026-11-13T22:00:00.000Z');
  const b = diaRange(jst('2026-11-14T03:00:00'), 7); // 夜中は前の日の7時から
  assert.equal(iso(b.from), '2026-11-12T22:00:00.000Z');
  const c = diaRange(jst('2026-11-14T07:00:00'), 7); // ちょうど7時はその日から
  assert.equal(iso(c.from), '2026-11-13T22:00:00.000Z');
});

test('時刻表の行（冬時間の平日・ゴトー日）', () => {
  const now = jst('2026-11-13T16:30:00');
  assert.deepEqual(shape(timetableRows(schedule(now), now)), [
    '9:55nakane* past', '17:00ldn next', '22:00ny', '23:30nys', '[翌日]', '1:00fix', '7:00nyc',
  ]);
});

test('時刻表の行（夏時間・同じ時の行はまとめない日もある）', () => {
  const now = jst('2027-07-01T21:30:00');
  assert.deepEqual(shape(timetableRows(schedule(now), now)), [
    '9:55nakane past', '16:00ldn past', '21:00ny past', '22:30nys next', '[翌日]', '0:00fix', '6:00nyc',
  ]);
});

test('週末は月曜の並びで、区切りは日付', () => {
  const now = jst('2026-11-14T12:00:00');
  assert.deepEqual(shape(timetableRows(schedule(now), now)), [
    '[11/16（月）]', '9:55nakane next', '17:00ldn', '22:00ny', '23:30nys', '[11/17（火）]', '1:00fix', '7:00nyc',
  ]);
});

test('形へ渡す計算の結果と季節の言葉', () => {
  const c = tickContext(jst('2027-03-17T12:00:00'));
  assert.equal(seasonLabel(c.dst), 'NYだけ夏時間');
  assert.equal(c.closed, false);
  assert.equal(c.p.h, 12);
  assert.equal(seasonLabel(tickContext(jst('2026-11-13T12:00:00')).dst), '冬時間');
  assert.equal(seasonLabel(tickContext(jst('2027-07-01T12:00:00')).dst), '夏時間');
});
