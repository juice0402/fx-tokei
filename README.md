# FX時計

仲値・ロンドンオープン・NYオープン・ロンドンフィックスまでの残り時間を、日本時間の24時間の文字盤か時刻表で出す時計（形と色は6つから選べる）。夏時間は自動で切りかわります。

公開先：https://sakutto-keisan.com/fx-tokei/ （準備中）

## 作り直すもの（app を変えたとき）
- 色と大きさ：app/skins.json を直して `npm run skins`
- フォント：画面に漢字を足したら `npm run fonts`（fonttools と brotli がいる。元のフォントは google/fonts・SIL OFL 1.1）
- アイコン：`npm run icons`（Playwright がいる。色は skins.json の紺と真鍮）
- service worker：さいごに `npm run sw`（app の中身から版を作る）
- 電波なしの確かめ：`npm run build` のあと `python3 scripts/check-offline.py`

## 指標の予定（app/data/events.json）
- Actions「毎日の更新」（`.github/workflows/data.yml`）が毎朝 5:47 に `node scripts/fetch-events.mjs` を動かし、公式（BLS・BEA・e-Stat）から読んで、変わった日だけ main にコミットする。読むページと拾う指標は `scripts/events-lib.mjs` の `UNITS`・`KINDS`
- FOMC と日銀会合は `app/data/meetings.json`（手で入れる表が正）。毎朝 FRB・日銀のページと照らし、ちがえば mihari の issue。8/1 をすぎたら来年の分を足す
- 読めない日は前の分を残す。7日続けて読めない・件数が前の半分より少ない → mihari の issue。数えた記録は `state/events-state.json`
- ネットなしで確かめる：`FIXTURES=test/fixtures/events node scripts/fetch-events.mjs --dry-run`（手で書いた見本を読む）
- データだけが変わった日は sw.js を作り直さなくてよい（data/ は版の印に入れない）
