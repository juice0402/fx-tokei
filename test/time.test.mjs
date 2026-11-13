import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, hm, dstInfo, isGotobi, isMarketClosed, isSessionOpen, SESSIONS } from '../app/time.js';

const jst = (s) => Date.parse(s + '+09:00');
const times = (now) => Object.fromEntries(schedule(now).list.map((x) => [x.ev.id, hm(x.t)]));

test('冬時間（11月）の大事な時間', () => {
  const now = jst('2026-11-13T16:30:00');
  assert.deepEqual(times(now), { nakane: '9:55', ldn: '17:00', ny: '22:00', nys: '23:30', fix: '1:00', nyc: '7:00' });
  assert.equal(schedule(now).next.ev.id, 'ldn');
});

test('ずれの週（NYだけ夏時間・3月）', () => {
  const now = jst('2027-03-17T12:00:00');
  assert.deepEqual(times(now), { nakane: '9:55', ldn: '17:00', ny: '21:00', nys: '22:30', fix: '1:00', nyc: '6:00' });
  assert.equal(dstInfo(now).gapNow, true);
});

test('夏時間（7月）', () => {
  const now = jst('2027-07-01T12:00:00');
  assert.deepEqual(times(now), { nakane: '9:55', ldn: '16:00', ny: '21:00', nys: '22:30', fix: '0:00', nyc: '6:00' });
  assert.equal(dstInfo(now).summerNow, true);
});

test('週末はお休みで、次は月曜の仲値', () => {
  const now = jst('2026-11-14T12:00:00');
  assert.equal(isMarketClosed(now), true);
  const nx = schedule(now).next;
  assert.equal(nx.ev.id, 'nakane');
  assert.equal(new Date(nx.t).toISOString(), '2026-11-16T00:55:00.000Z');
  assert.equal(SESSIONS.some((s) => isSessionOpen(s, now)), false);
});

test('次の切りかえ日（11/13 から見て）', () => {
  const d = dstInfo(jst('2026-11-13T16:30:00'));
  assert.equal(`${d.us.p.mo}/${d.us.p.d}`, '3/14');
  assert.equal(`${d.uk.p.mo}/${d.uk.p.d}`, '3/28');
  assert.equal(d.us.summer && d.uk.summer, true);
  assert.deepEqual([d.nyAfter, d.ldnAfter, d.fixAfter], ['21:00', '16:00', '0:00']);
});

test('ゴトー日（土日は前の金曜）', () => {
  const g = (s) => isGotobi(jst(s + 'T10:00:00'));
  assert.equal(g('2026-11-13'), true);  // 15日が日曜
  assert.equal(g('2026-11-20'), true);
  assert.equal(g('2026-11-27'), false); // 30日は月曜
  assert.equal(g('2026-11-30'), true);
  assert.equal(g('2026-12-04'), true);  // 5日が土曜
});
