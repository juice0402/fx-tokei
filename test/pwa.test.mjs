import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { generate, appFiles } from '../scripts/gen-sw.mjs';
import { SKINS } from '../app/skins.js';

const read = (f) => readFileSync(f, 'utf8');

test('sw.js がいまの app の中身と合っている（app を変えたら npm run sw）', () => {
  assert.equal(read('app/sw.js'), generate());
  const files = appFiles();
  for (const f of ['index.html', 'main.js', 'style.css', 'skins.css', 'manifest.webmanifest', 'icon-192.png', 'fonts/bizud-400.woff2', 'fonts/OFL.txt']) {
    assert.ok(files.includes(f), f);
  }
  assert.ok(!files.includes('sw.js'));
});

test('manifest：名前・範囲・色・アイコン', () => {
  const m = JSON.parse(read('app/manifest.webmanifest'));
  assert.equal(m.name, 'FX時計');
  assert.equal(m.short_name, 'FX時計');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.theme_color, SKINS.kon.color.bg);
  assert.equal(m.background_color, SKINS.kon.color.bg);
  for (const i of m.icons) assert.ok(existsSync(join('app', i.src)), i.src);
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'));
  const html = read('app/index.html');
  for (const f of ['manifest.webmanifest', 'icon.svg', 'favicon-32.png', 'apple-touch-icon.png']) assert.match(html, new RegExp(`href="\\./${f.replace('.', '\\.')}"`));
});

test('画面の文字が全部フォントに入っている（漢字を足したら npm run fonts）', () => {
  const have = new Set(read('app/fonts/chars.txt'));
  const miss = new Set();
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { if (n !== 'fonts') walk(p); continue; }
      if (!/\.(html|js|css|json|webmanifest)$/.test(n) || n === 'sw.js') continue;
      for (const c of read(p)) if (c >= ' ' && !have.has(c)) miss.add(c);
    }
  };
  walk('app');
  assert.deepEqual([...miss].join(''), '');
});

test('外のドメインから読みこまない・リンクは相対パス', () => {
  for (const f of ['app/index.html', 'app/style.css', 'app/main.js', 'app/clock.js', 'app/board.js', 'app/tools.js', 'app/events.js', 'app/holidays.js', 'app/sw.js', 'app/skins.css']) {
    assert.doesNotMatch(read(f), /https?:\/\/|\/\/fonts|src="\/|href="\//, f);
  }
  const fonts = readdirSync('app/fonts').filter((n) => n.endsWith('.woff2'));
  assert.equal(fonts.length, 6);
  assert.match(read('app/fonts/OFL.txt'), /SIL OPEN FONT LICENSE Version 1\.1/);
});
