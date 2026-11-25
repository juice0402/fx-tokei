"""画面で使う文字だけにしぼったフォント（woff2）を app/fonts/ に作る。

使い方：python3 scripts/gen-fonts.py（npm run fonts）
- いる物：pip install fonttools brotli
- 元のフォントは GitHub の google/fonts から .cache/fonts/ に取る（SIL OFL 1.1）
- しぼる文字＝app の中の文字（html・js・css・json・webmanifest。画面に出ない sw.js はのぞく）＋数字・英字・記号・ひらがな・カタカナ全部
- しぼった文字の一覧は app/fonts/chars.txt。npm test が「app の文字が全部入っているか」を見る
  → 画面に新しい漢字を足したら、このスクリプトを流し直してコミットする
"""
import os
import pathlib
import urllib.request

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
OUT = APP / 'fonts'
CACHE = ROOT / '.cache' / 'fonts'
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl'

# (google/fonts の場所, ファイル名, 書き出す名前)
FONTS = [
    ('shipporiminchob1', 'ShipporiMinchoB1-Medium.ttf', 'shippori-500.woff2'),
    ('shipporiminchob1', 'ShipporiMinchoB1-Bold.ttf', 'shippori-700.woff2'),
    ('zenkakugothicnew', 'ZenKakuGothicNew-Regular.ttf', 'zenkaku-400.woff2'),
    ('zenkakugothicnew', 'ZenKakuGothicNew-Bold.ttf', 'zenkaku-700.woff2'),
    ('bizudpgothic', 'BIZUDPGothic-Regular.ttf', 'bizud-400.woff2'),
    ('bizudpgothic', 'BIZUDPGothic-Bold.ttf', 'bizud-700.woff2'),
    ('barlowcondensed', 'BarlowCondensed-Medium.ttf', 'barlow-500.woff2'),
    ('barlowcondensed', 'BarlowCondensed-SemiBold.ttf', 'barlow-600.woff2'),
]
LICENSES = [('shipporiminchob1', 'Shippori Mincho B1'), ('zenkakugothicnew', 'Zen Kaku Gothic New'), ('bizudpgothic', 'BIZ UDPGothic'), ('barlowcondensed', 'Barlow Condensed')]

# いつも入れる文字：英数と記号・ひらがな・カタカナ・日本語の記号・全角の英数
RANGES = [
    (0x20, 0x7E), (0xA0, 0xFF),
    (0x2010, 0x2027), (0x2030, 0x203B), (0x2190, 0x2193), (0x2605, 0x2606),
    (0x25A0, 0x25A1), (0x25B2, 0x25B3), (0x25BC, 0x25BD), (0x25CB, 0x25CF),
    (0x3000, 0x303F), (0x3041, 0x3096), (0x309B, 0x309F), (0x30A0, 0x30FF),
    (0xFF01, 0xFF60), (0xFFE0, 0xFFE6),
]
TEXT_EXT = {'.html', '.js', '.css', '.json', '.webmanifest'}


def app_chars():
    chars = set()
    for p in sorted(APP.rglob('*')):
        if p.suffix in TEXT_EXT and OUT not in p.parents and p.name != 'sw.js':
            chars.update(p.read_text(encoding='utf-8'))
    return {c for c in chars if ord(c) >= 0x20}


def fetch(path):
    dst = CACHE / path
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(f'{BASE}/{path}', dst)
    return dst


def main():
    chars = app_chars()
    for a, b in RANGES:
        chars.update(chr(c) for c in range(a, b + 1))
    text = ''.join(sorted(chars))
    OUT.mkdir(exist_ok=True)
    (OUT / 'chars.txt').write_text(text + '\n', encoding='utf-8')
    for folder, name, out in FONTS:
        src = fetch(f'{folder}/{name}')
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.hinting = False
        opts.desubroutinize = True
        opts.layout_features = ['kern', 'palt', 'halt', 'vkrn', 'locl']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        font = subset.load_font(str(src), opts)
        s = subset.Subsetter(opts)
        s.populate(text=text)
        s.subset(font)
        subset.save_font(font, str(OUT / out), opts)
        print(f'{out}: {os.path.getsize(OUT / out) // 1024}KB')
    parts = []
    for folder, title in LICENSES:
        parts.append(f'===== {title} =====\n\n' + fetch(f'{folder}/OFL.txt').read_text(encoding='utf-8').strip() + '\n')
    (OUT / 'OFL.txt').write_text('\n'.join(parts), encoding='utf-8')
    print(f'chars.txt: {len(text)} 文字')


if __name__ == '__main__':
    main()
