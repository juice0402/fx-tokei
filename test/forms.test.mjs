import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, GROUPS } from '../app/forms/index.js';
import { SKINS } from '../app/skins.js';
import { tickContext, dayFraction, diaBands, normalizeHolidays } from '../app/time.js';

const jst = (s) => Date.parse(s + '+09:00');

test('形の一覧：id がかぶらない・色が1つ以上・分け方の順', () => {
  const ids = FORMS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['dial', 'board']);
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
