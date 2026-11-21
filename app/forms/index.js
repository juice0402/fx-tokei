// 形の一覧。形を足すときは、形のファイル（build・render・icon と CSS）を作ってここに1行足す
// 色は app/skins.json の skins に、その形（form）の色を足す（はじめから2色ずつ）
// 分け方と順番（スワイプもこの順）：アナログ・ビジネス・かわいい・ガジェット
import { SKINS } from '../skins.js';
import dial from './dial.js';
import board from './board.js';
import dep from './dep.js';
import line from './line.js';

export const GROUPS = [
  { id: 'analog', name: 'アナログ' },
  { id: 'business', name: 'ビジネス' },
  { id: 'kawaii', name: 'かわいい' },
  { id: 'gadget', name: 'ガジェット' },
];

const colorsOf = (id) => Object.entries(SKINS).filter(([, s]) => s.form === id).map(([k, s]) => ({ id: k, name: s.name }));

// { id, name, group, colors: [{ id, name }], chip, icon, build, render }
export const FORMS = [
  dial,
  board,
  dep,
  line,
].map((f) => ({ ...f, colors: colorsOf(f.id) }))
  .sort((a, b) => GROUPS.findIndex((g) => g.id === a.group) - GROUPS.findIndex((g) => g.id === b.group));
