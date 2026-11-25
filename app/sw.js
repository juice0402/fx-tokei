// scripts/gen-sw.mjs が作る。手で直さない（npm run sw）
// 範囲は ./（＝/fx-tokei/）。app の中のファイルを先にためて、電波がなくても開ける。
// 版が変わると、新しい版をためて古いためを消す（次に開いたときに新しい画面になる）
const VERSION = '35d243a00ea8';
const CACHE = 'fx-tokei-' + VERSION;
const FILES = [
  "./",
  "apple-touch-icon.png",
  "board.js",
  "clock.js",
  "data/events.json",
  "events.js",
  "favicon-32.png",
  "fonts/OFL.txt",
  "fonts/bizud-400.woff2",
  "fonts/bizud-700.woff2",
  "fonts/shippori-500.woff2",
  "fonts/shippori-700.woff2",
  "fonts/zenkaku-400.woff2",
  "fonts/zenkaku-700.woff2",
  "forms.js",
  "icon-192.png",
  "icon-512.png",
  "icon.svg",
  "index.html",
  "main.js",
  "manifest.webmanifest",
  "skins.css",
  "skins.js",
  "style.css",
  "time.js",
  "tools.js"
];

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
