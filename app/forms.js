// 形の一覧。形を足すときは、描くファイル（mount・icon）を作ってここに1行足す
// 色は app/skins.json の skins に、その形（form）の色を足す
import dial from './clock.js';
import board from './board.js';

export const FORMS = [
  dial,
  board,
];
