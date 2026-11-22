import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, GROUPS } from '../app/forms/index.js';
import { SKINS } from '../app/skins.js';
import { tickContext, dayFraction, diaBands, normalizeHolidays, eventsBetween, hourWindow, bandsIn, formatHms, formatHmShort } from '../app/time.js';

const jst = (s) => Date.parse(s + '+09:00');

test('形の一覧：id がかぶらない・色が1つ以上・分け方の順', () => {
  const ids = FORMS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['dial', 'board', 'big', 'donut', 'planner', 'widget']);
  for (const f of FORMS) {
    assert.ok(GROUPS.some((g) => g.id === f.group), f.id);
    assert.ok(f.colors.length >= 1, f.id);
    for (const c of f.colors) assert.equal(SKINS[c.id].form, f.id);
  }
  const order = FORMS.map((f) => GROUPS.findIndex((g) => g.id === f.group));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.deepEqual(GROUPS.map((g) => g.name), ['アナログ', 'ビジネス', 'かわいい', 'ガジェット']);
  assert.deepEqual(FORMS[0].colors.map((c) => c.name), ['紺と真鍮', '白磁', '深緑', '桜の木', '和紙と墨', '夜光', 'ネオン', '航空計器', 'ステンレス']);
});

test('ctx：その日の並び・進み具合・市場・ゴトー日・休み', () => {
  const hol = normalizeHolidays({ jp: [['2026-11-23', '勤労感謝の日']], uk: [], us: [['2026-11-26', '感謝祭']], jpYears: [2026] });
  const ind = [{ id: 'x', name: '米雇用統計', imp: 3, t: Date.parse('2026-11-13T13:30:00Z'), approx: false, tentative: false, sub: null }];
  const c = tickContext(jst('2026-11-13T19:30:00'), hol, ind);
  assert.equal(c.sc.next.ev.id, 'ny');
  assert.ok(c.day.some((x) => x.ev.id === 'x'));
  assert.equal(c.indDay.length, 1);
  assert.equal(c.progress, 0.5); // 17:00 から 22:00 の 2.5 時間め
  assert.equal(c.gotobi, 'ゴトー日（前倒し）');
  assert.deepEqual(c.sessions.filter((s) => s.open).map((s) => s.id), ['ldn']);
  assert.ok(c.rows.length > 0);
  const t = tickContext(jst('2026-11-26T12:00:00'), hol, []);
  assert.equal(t.sessions.find((s) => s.id === 'ny').rest, 'NY休み');
  assert.equal(dayFraction(jst('2026-11-13T18:00:00')), 0.75);
  const d = diaBands(jst('2026-11-13T16:30:00'), 7);
  assert.equal(d.now, 9.5);
  assert.deepEqual(d.bands.find((b) => b.id === 'tky').segs.map((g) => [g.a, g.b]), [[2, 10]]);
});

test('大きな数字・手帳・タイルの計算：範囲の中の大事な時間と指標・手帳のページ・残りの書き方', () => {
  const hol = normalizeHolidays({ jp: [], uk: [], us: [['2026-11-26', '感謝祭']], jpYears: [2026] });
  const ind = [{ id: 'pce', name: '米PCE', imp: 2, t: Date.parse('2026-11-25T13:30:00Z'), approx: false, tentative: false, sub: null }];
  const w = hourWindow(jst('2026-11-25T21:40:00'), 2, 10);
  assert.equal(w.from, jst('2026-11-25T19:00:00'));
  assert.equal(w.to, jst('2026-11-26T07:00:00'));
  const xs = eventsBetween(w.from, w.to, hol, ind);
  assert.deepEqual(xs.map((x) => x.ev.id), ['ny', 'pce', 'nys', 'fix', 'nyc']);
  assert.equal(xs[1].ev.kind, 'ind');
  const th = eventsBetween(jst('2026-11-26T19:00:00'), jst('2026-11-27T07:00:00'), hol, []);
  assert.equal(th.find((x) => x.ev.id === 'ny').off, 'NY休み');
  const b = bandsIn(w.from, w.to, hol);
  assert.deepEqual(b.find((x) => x.id === 'ny').segs.map((g) => [g.a, g.b]), [[3, 12]]);
  assert.equal(formatHms(3 * 36e5 + 5 * 6e4 + 9e3), '3:05:09');
  assert.equal(formatHmShort(46 * 36e5 + 54 * 6e4), '46:54');
});
