import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, GROUPS } from '../app/forms/index.js';
import { SKINS } from '../app/skins.js';
import { tickContext, dayFraction, diaBands, normalizeHolidays, bandWindow } from '../app/time.js';
import { windowSize, placeLabels } from '../app/forms/line.js';

const jst = (s) => Date.parse(s + '+09:00');

test('形の一覧：id がかぶらない・色が1つ以上・分け方の順', () => {
  const ids = FORMS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['dial', 'board', 'dep', 'line']);
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

test('横に流れる帯の窓：360px は前2時間・後ろ10時間、広いと後ろが長く（最大22時間・1時間30〜48px）', () => {
  assert.deepEqual(windowSize(328), { after: 10, px: 30, w: 360 });
  const m = windowSize(736);
  assert.equal(m.after, 22);
  assert.ok(m.px >= 30 && m.px <= 48);
  assert.deepEqual(windowSize(1180), { after: 22, px: 48, w: 1152 });
  assert.equal(windowSize(500).after, 14);
});

test('横に流れる帯の並び：日をまたいで大事な時間・指標・休みが入る', () => {
  const hol = normalizeHolidays({ jp: [], uk: [], us: [['2026-11-26', '感謝祭']], jpYears: [2026] });
  const ind = [{ id: 'x', name: '米雇用統計', imp: 3, t: Date.parse('2026-11-13T13:30:00Z'), approx: false, tentative: false, sub: null }];
  const w = bandWindow(jst('2026-11-13T16:30:00'), 2, 22, hol, ind);
  assert.equal(w.now, 2);
  assert.equal(w.span, 24);
  assert.deepEqual(w.items.map((x) => x.ev.id), ['ldn', 'ny', 'x', 'nys', 'fix', 'nyc']);
  assert.equal(w.items[0].at, 2.5);
  assert.equal(w.hours[0].h, 15);
  assert.deepEqual(w.bands.find((b) => b.id === 'tky').segs.map((g) => [g.a, g.b, g.past]), [[0, 2.5, false]]);
  // 土曜の朝まで：土曜の東京・シドニーの帯は出さない
  const fri = bandWindow(jst('2026-11-20T12:00:00'), 2, 22, hol, []);
  assert.deepEqual(fri.items.map((x) => x.ev.id), ['ldn', 'ny', 'nys', 'fix', 'nyc']);
  assert.deepEqual(fri.bands.find((b) => b.id === 'tky').segs.map((g) => [g.a, g.b]), [[0, 7]]);
  const thu = bandWindow(jst('2026-11-26T12:00:00'), 2, 22, hol, []);
  assert.equal(thu.items.find((x) => x.ev.id === 'ny').off, 'NY休み');
  assert.ok(thu.bands.find((b) => b.id === 'ny').segs.some((g) => g.rest));
});

test('横に流れる帯の名前：重なるときは2段目へ、どちらも重なるときは右へずらす（小さい印は名前を出さない）', () => {
  const m = (x, minor = false) => ({ x, text: '0:00 ロンドンオープン', minor });
  const r = placeLabels([m(100), m(110), m(120, true), m(400)], 600);
  assert.deepEqual(r.map((x) => x.row), [0, 1, -1, 0]);
  assert.ok(placeLabels([m(0)], 600)[0].lx > 0);
  const s = placeLabels([m(100), m(110), m(130)], 600);
  assert.equal(s[2].row, 0);
  assert.ok(s[2].lx - s[0].lx > 100); // 3つめは重ならないところまで右へ
});
