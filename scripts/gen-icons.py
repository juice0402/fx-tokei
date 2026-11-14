"""アイコンを作る：紺と真鍮の小さな文字盤（24時間の輪・真鍮の針）をコードで描く。

使い方：python3 scripts/gen-icons.py（npm run icons）
- いる物：pip install playwright && python3 -m playwright install chromium
- 色は app/skins.json の「紺と真鍮」（kon）から取る。Canva・写真は使わない
- 書き出し：app/icon.svg（元）、icon-192.png・icon-512.png（manifest）、apple-touch-icon.png（180）、favicon-32.png
- 地は四すみまでぬり、文字盤は真ん中の 80% の円の中（maskable でも切れない）
"""
import json
import math
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'app'


def build_svg():
    t = json.loads((APP / 'skins.json').read_text(encoding='utf-8'))
    c = t['skins']['kon']['color']
    S, C = 512, 256

    def pt(r, deg):
        a = math.radians(deg)
        return C + r * math.sin(a), C - r * math.cos(a)

    def arc(r, h0, h1):
        a0, a1 = h0 * 15, h1 * 15
        x0, y0 = pt(r, a0)
        x1, y1 = pt(r, a1)
        large = 1 if (a1 - a0) % 360 > 180 else 0
        return f'M{x0:.1f} {y0:.1f}A{r} {r} 0 {large} 1 {x1:.1f} {y1:.1f}'

    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">',
         f'<rect width="{S}" height="{S}" fill="{c["bg"]}"/>',
         f'<circle cx="{C}" cy="{C}" r="196" fill="{c["bg2"]}" stroke="{c["line"]}" stroke-width="3"/>',
         f'<circle cx="{C}" cy="{C}" r="118" fill="{c["face"]}" stroke="{c["line"]}" stroke-width="2"/>']
    # 市場の輪：東京 9〜17・ロンドン 17〜25（冬）・NY 22〜31（冬）を日本時間で
    for r, h0, h1, key in [(166, 9, 17, 's-tky'), (150, 17, 25, 's-ldn'), (134, 22, 31, 's-ny')]:
        s.append(f'<path d="{arc(r, h0, h1)}" fill="none" stroke="{c[key]}" stroke-width="11" stroke-linecap="butt"/>')
    for h in range(24):
        big = h % 6 == 0
        x0, y0 = pt(176 if big else 182, h * 15)
        x1, y1 = pt(190, h * 15)
        s.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="{c["ink"]}" stroke-width="{8 if big else 4}" stroke-linecap="round"/>')
    hx, hy = pt(176, 17 * 15)
    tx, ty = pt(30, 17 * 15 + 180)
    s.append(f'<line x1="{tx:.1f}" y1="{ty:.1f}" x2="{hx:.1f}" y2="{hy:.1f}" stroke="{c["metal"]}" stroke-width="12" stroke-linecap="round"/>')
    s.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="13" fill="{c["metal"]}"/>')
    s.append(f'<circle cx="{C}" cy="{C}" r="16" fill="{c["metal"]}"/>')
    s.append('</svg>')
    return '\n'.join(s) + '\n'


def main():
    svg = build_svg()
    (APP / 'icon.svg').write_text(svg, encoding='utf-8')
    with sync_playwright() as p:
        b = p.chromium.launch()
        for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
            pg = b.new_page(viewport={'width': size, 'height': size})
            pg.set_content(f'<style>html,body{{margin:0}}svg{{display:block;width:{size}px;height:{size}px}}</style>{svg}')
            pg.screenshot(path=str(APP / name), omit_background=False)
            pg.close()
            print(name)
        b.close()


if __name__ == '__main__':
    main()
