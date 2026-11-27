import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, GROUPS } from '../app/forms/index.js';
import { SKINS } from '../app/skins.js';
import { tickContext, dayFraction, diaBands, normalizeHolidays, eventsBetween, hourWindow, bandsIn, formatHms, formatHmShort, bandWindow, handAngles, dial12, clockLeft, parts, TZ } from '../app/time.js';
import { windowSize, placeLabels } from '../app/forms/line.js';

const jst = (s) => Date.parse(s + '+09:00');

test('形の一覧：id がかぶらない・色が1つ以上・分け方の順', () => {
  const ids = FORMS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['dial', 'classic', 'rose', 'board', 'dep', 'world', 'big', 'donut', 'planner', 'line', 'widget']);
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

test('針の角度：日本時間で正しく動く（10:10:30 と 午後の時刻）', () => {
  const a = handAngles(parts(jst('2026-11-20T10:10:30'), TZ.tky));
  assert.deepEqual([a.h.toFixed(2), a.m, a.s], ['305.25', 63, 180]);
  assert.equal(dial12(jst('2026-11-20T15:00:00')), 90);
  assert.equal(dial12(jst('2026-11-20T21:30:00')), 285);
  assert.equal(clockLeft(83 * 60000 + 59000), '1:23');
});

test('世界時計の街：その街の時刻・夏時間・夜・ランプ（取引中・まもなく・休み・お休み）', () => {
  const hol = normalizeHolidays({ jp: [['2026-11-23', '勤労感謝の日']], uk: [], us: [['2026-11-26', '感謝祭']], jpYears: [2026] });
  const at = (s) => Object.fromEntries(tickContext(jst(s), hol, []).cities.map((c) => [c.id, c]));
  const a = at('2026-11-20T21:47:00');
  assert.deepEqual([a.tky.state, a.ldn.state, a.ny.state], ['closed', 'open', 'soon']);
  assert.equal(a.ny.p.h, 7);
  assert.equal(a.ldn.p.h, 12);
  assert.deepEqual([a.tky.night, a.ldn.night, a.ny.night], [true, false, false]);
  assert.deepEqual([a.tky.season, a.ldn.season, a.ny.season], [null, '冬時間', '冬時間']);
  const s = at('2027-07-01T21:30:00');
  assert.deepEqual([s.ldn.season, s.ny.season, s.ny.p.h], ['夏時間', '夏時間', 8]);
  assert.equal(at('2026-11-23T10:00:00').tky.state, 'rest');
  assert.equal(at('2026-11-26T23:00:00').ny.state, 'rest');
  const w = at('2026-11-21T12:00:00'); // 土曜
  assert.deepEqual([w.tky.state, w.ldn.state, w.ny.state], ['closed', 'closed', 'closed']);
  assert.equal(at('2026-11-23T08:30:00').tky.state, 'rest'); // 休みの日の開く前は「まもなく」にしない
});
