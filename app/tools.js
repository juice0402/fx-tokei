// 右上の小さな2つのボタン：画面をつけたまま（Screen Wake Lock）と全画面（Fullscreen API）
// 使えないブラウザでは、そのボタンを出さない。色はいまのスキンの色（currentColor）
const ICON = {
  wake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M12 3.2a6 6 0 0 0-3.7 10.7c.7.6 1.1 1.3 1.1 2.1v.4h5.2V16c0-.8.4-1.5 1.1-2.1A6 6 0 0 0 12 3.2z"/><path d="M9.6 19.2h4.8M10.5 21.6h3"/><path class="ray" d="M12 .6v1M3.4 4.2l.8.7M20.6 4.2l-.8.7M1.2 11h1M21.8 11h1"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="out" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path class="in" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
};

export function makeTools(doc = document) {
  const nav = doc.createElement('div');
  nav.className = 'tools';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', '画面の設定');

  const button = (k, label) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `tool tool-${k}`;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = ICON[k];
    nav.append(b);
    return b;
  };

  // 画面をつけたまま：ほかのアプリから戻ったときに取りなおす
  if ('wakeLock' in navigator) {
    const b = button('wake', '画面をつけたまま');
    let want = false;
    let lock = null;
    const sync = () => b.setAttribute('aria-pressed', String(want));
    const take = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      } catch (e) {
        want = false; // ことわられたとき（電池の節約中など）は押していない形に戻す
      }
      sync();
    };
    b.addEventListener('click', () => {
      want = !want;
      sync();
      if (want) take();
      else if (lock) lock.release();
    });
    doc.addEventListener('visibilitychange', () => {
      if (want && !lock && doc.visibilityState === 'visible') take();
    });
  }

  // 全画面
  const el = doc.documentElement;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
  if (request && exit && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
    const b = button('full', '全画面');
    const now = () => doc.fullscreenElement || doc.webkitFullscreenElement;
    const sync = () => b.setAttribute('aria-pressed', String(!!now()));
    b.addEventListener('click', () => {
      try {
        const r = now() ? exit.call(doc) : request.call(el);
        if (r && r.catch) r.catch(() => {});
      } catch (e) { /* 全画面にできないとき */ }
    });
    doc.addEventListener('fullscreenchange', sync);
    doc.addEventListener('webkitfullscreenchange', sync);
  }
  return nav;
}
