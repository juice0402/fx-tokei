// app の中のファイルの一覧と版（中身から作る）を入れた app/sw.js を作る（npm run sw）。
// app のファイルを変えたら、さいごにこれを流す（npm test が古いままだと止める）。
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ためない物：sw.js 自身と、画面が読みこまない元の表・文字の一覧
const SKIP = new Set(['sw.js', 'skins.json', 'fonts/chars.txt']);

export function appFiles(dir = 'app') {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else {
        const rel = relative(dir, p).split(sep).join('/');
        if (!SKIP.has(rel)) out.push(rel);
      }
    }
  };
  walk(dir);
  return out;
}

export function generate(dir = 'app') {
  const files = appFiles(dir);
  const h = createHash('sha256');
  for (const f of files) h.update(f).update('\0').update(readFileSync(join(dir, f))).update('\0');
  const version = h.digest('hex').slice(0, 12);
  return `// scripts/gen-sw.mjs が作る。手で直さない（npm run sw）
// 範囲は ./（＝/fx-tokei/）。app の中のファイルを先にためて、電波がなくても開ける。
// 版が変わると、新しい版をためて古いためを消す（次に開いたときに新しい画面になる）
const VERSION = '${version}';
const CACHE = 'fx-tokei-' + VERSION;
const FILES = ${JSON.stringify(['./', ...files], null, 2)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('fx-tokei-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // 指標・休場のデータ（data/）は新しいほうを先に。読めないときはためた分
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || caches.match('./'))
      .then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync('app/sw.js', generate());
  console.log('app/sw.js を作った');
}
