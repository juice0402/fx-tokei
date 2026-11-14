# FX時計

仲値・ロンドンオープン・NYオープン・ロンドンフィックスまでの残り時間を、日本時間の24時間の文字盤か時刻表で出す時計（形と色は6つから選べる）。夏時間は自動で切りかわります。

公開先：https://sakutto-keisan.com/fx-tokei/ （準備中）

## 作り直すもの（app を変えたとき）
- 色と大きさ：app/skins.json を直して `npm run skins`
- フォント：画面に漢字を足したら `npm run fonts`（fonttools と brotli がいる。元のフォントは google/fonts・SIL OFL 1.1）
- アイコン：`npm run icons`（Playwright がいる。色は skins.json の紺と真鍮）
- service worker：さいごに `npm run sw`（app の中身から版を作る）
- 電波なしの確かめ：`npm run build` のあと `python3 scripts/check-offline.py`
