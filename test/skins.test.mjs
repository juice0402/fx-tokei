import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, readTable } from '../scripts/gen-skins.mjs';
import { SKINS, SIZE } from '../app/skins.js';
import { FORMS } from '../app/forms/index.js';

const table = readTable();

test('skins.css と skins.js が skins.json と合っている（npm run skins で作り直す）', () => {
  const { css, js } = generate(table);
  assert.equal(readFileSync('app/skins.css', 'utf8'), css);
  assert.equal(readFileSync('app/skins.js', 'utf8'), js);
});

test('24時間の輪は9色・時刻表は3色・新しい形は2色ずつ・はじめは紺と真鍮', () => {
  const ids = Object.keys(SKINS);
  assert.equal(ids[0], 'kon');
  assert.deepEqual(ids.filter((id) => SKINS[id].form === 'dial'), ['kon', 'hakuji', 'midori', 'sakura', 'washi', 'yakou', 'neon', 'koku', 'sus']);
  assert.deepEqual(ids.filter((id) => SKINS[id].form === 'board'), ['eki', 'yako', 'wakakusa']);
  const two = (f) => ids.filter((id) => SKINS[id].form === f).map((id) => SKINS[id].name);
  assert.deepEqual(two('big'), ['白', '黒']);
  assert.deepEqual(two('donut'), ['ピンク', 'ミント']);
  assert.deepEqual(two('planner'), ['方眼の白', 'クラフト紙']);
  assert.deepEqual(two('widget'), ['くらい', '明るい']);
});

test('名前は英字の小文字とハイフン・色の項目は形の中でそろっている', () => {
  const ok = /^[a-z][a-z0-9-]*$/;
  for (const [id, s] of Object.entries(SKINS)) {
    assert.match(id, ok);
    for (const k of Object.keys(s.color)) assert.match(k, ok);
    const same = Object.values(SKINS).find((x) => x.form === s.form);
    assert.deepEqual(Object.keys(s.color), Object.keys(same.color), id);
    assert.equal(s.chip.length, 2);
    assert.ok(SIZE[s.form], id);
  }
  for (const f of Object.values(SIZE)) for (const g of ['geo', 'font', 'stroke', 'size']) {
    for (const k of Object.keys(f[g] || {})) assert.match(k, ok);
  }
});

test('形の一覧と表がそろっている', () => {
  assert.deepEqual(FORMS.map((f) => f.id), Object.keys(SIZE));
  for (const f of FORMS) {
    assert.equal(f.name, SIZE[f.id].name);
    assert.equal(typeof f.build, 'function');
    assert.equal(typeof f.render, 'function');
    assert.match(f.icon(['#000', '#fff']), /^<svg /);
  }
});

test('形と色のファイルに色や半径の数字を直接書かない', () => {
  const forms = ['dial', 'board', 'big', 'donut', 'planner', 'widget'].flatMap((f) => [`app/forms/${f}.js`, `app/forms/${f}.css`]);
  for (const file of [...forms, 'app/forms/index.js', 'app/style.css']) {
    const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, file);
  }
  const js = readFileSync('app/forms/dial.js', 'utf8');
  for (const r of SIZE.dial.geo['ring-r']) assert.doesNotMatch(js, new RegExp(`\\b${r}\\b`), `dial.js の ${r}`);
});
