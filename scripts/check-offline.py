"""dist/ を http で開き、電波がなくても動くか・外のドメインから読みこまないかを確かめる。

使い方：npm run build のあと python3 scripts/check-offline.py（いる物：pip install playwright）
- dist/ を http://localhost:<port>/fx-tokei/ で開く（本番の /fx-tokei/ と同じ範囲）
- 1回目：service worker が入るのを待ち、読みこんだ URL を全部記録（外のドメインは0のはず）
- ネットを切って読みこみ直し：時計が動く・時刻表に切りかえられる・フォントが中のものになっている
- manifest とアイコンが読める。結果を1行ずつ出し、だめなら終わりのコードが1
"""
import functools
import http.server
import json
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Quiet, directory=str(DIST))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    srv = serve()
    base = f'http://127.0.0.1:{srv.server_address[1]}/fx-tokei/'
    ok = True
    def check(name, cond, info=''):
        nonlocal ok
        ok = ok and bool(cond)
        print(('OK  ' if cond else 'NG  ') + name + (f'（{info}）' if info else ''))

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        urls, errors = [], []
        ctx.on('request', lambda r: urls.append(r.url))
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(base)
        pg.evaluate('navigator.serviceWorker.ready.then(() => true)')
        pg.reload()
        pg.wait_for_function('navigator.serviceWorker.controller !== null')
        external = sorted({u for u in urls if not u.startswith(base.rsplit('/fx-tokei/', 1)[0])})
        check('外のドメインへの読み込みが0', not external, ', '.join(external[:5]))
        man = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
        icons = pg.evaluate("Promise.all(['icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png','icon.svg'].map(u => fetch(u).then(r => r.status)))")
        check('manifest とアイコンが読める', man.get('name') == 'FX時計' and all(s == 200 for s in icons), json.dumps(icons))

        ctx.set_offline(True)
        pg.reload()
        pg.wait_for_selector('.dial-svg [data-k="time"]')
        t1 = pg.text_content('[data-k="time"]')
        pg.wait_for_timeout(1300)
        sec = pg.evaluate("document.querySelector('[data-k=\"sec\"]').getAttribute('cx')")
        pg.wait_for_timeout(1100)
        sec2 = pg.evaluate("document.querySelector('[data-k=\"sec\"]').getAttribute('cx')")
        check('ネットを切って読みこみ直しても時計が動く', bool(t1) and sec != sec2, t1)
        pg.click('.fchip[data-form="board"]')
        pg.wait_for_selector('.tt tbody tr')
        fonts = pg.evaluate("document.fonts.ready.then(() => ['12px \"BIZ UDPGothic\"', '500 12px \"Shippori Mincho B1\"', '12px \"Zen Kaku Gothic New\"'].map(f => document.fonts.check(f)))")
        check('ネットなしで時刻表に切りかえられ、中のフォントが使える', all(fonts), json.dumps(fonts))
        check('画面のエラーが0', not errors, '; '.join(errors[:3]))
        b.close()
    srv.shutdown()
    size = sum(f.stat().st_size for f in (DIST / 'fx-tokei').rglob('*') if f.is_file())
    print(f'dist/fx-tokei/ の大きさ：{size / 1024:.0f}KB')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
