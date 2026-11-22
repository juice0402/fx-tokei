// app/skins.json（形と色の表）から app/skins.css と app/skins.js を作る。
// 作ったファイルもコミットする（app/ をそのまま置いても動き、実行中に JSON を読みこまない）。
// node scripts/gen-skins.mjs で書き出す。テストは generate() の結果とファイルをくらべる。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEAD = 'scripts/gen-skins.mjs が app/skins.json から作る。手で直さない';

export function generate(table) {
  const css = [`/* ${HEAD} */`];
  const root = [];
  for (const [form, f] of Object.entries(table.forms)) {
    for (const [k, v] of Object.entries(f.font)) root.push(`--${form}-f-${k}:${v}px`);
    for (const [k, v] of Object.entries(f.stroke)) root.push(`--${form}-s-${k}:${v}`);
    // 部品の大きさと角の丸み（px）。はじめの2つの形にはない
    for (const [k, v] of Object.entries(f.size || {})) root.push(`--${form}-z-${k}:${v}px`);
  }
  css.push(`:root{${root.join(';')}}`);
  const ids = Object.keys(table.skins);
  ids.forEach((id, i) => {
    const s = table.skins[id];
    const vars = Object.entries(s.color).map(([k, v]) => `--${k}:${v}`);
    vars.push(`color-scheme:${s.scheme}`);
    // はじめの色（紺と真鍮）は、data-skin がまだないときにも効く
    css.push(`${i === 0 ? ':root,' : ''}[data-skin="${id}"]{${vars.join(';')}}`);
  });
  for (const id of ids) {
    const [a, b] = table.skins[id].chip;
    css.push(`.chip[data-pick="${id}"]{--c1:${a};--c2:${b}}`);
  }
  const js = [
    `// ${HEAD}`,
    `export const TABLE = ${JSON.stringify(table, null, 2)};`,
    'export const SKINS = TABLE.skins;',
    'export const SIZE = TABLE.forms;',
    '',
  ].join('\n');
  return { css: css.join('\n') + '\n', js };
}

export function readTable(dir = 'app') {
  return JSON.parse(readFileSync(`${dir}/skins.json`, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { css, js } = generate(readTable());
  writeFileSync('app/skins.css', css);
  writeFileSync('app/skins.js', js);
  console.log('app/skins.css と app/skins.js を作った');
}
