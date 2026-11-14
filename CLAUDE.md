# fx-tokei（FX時計）

FX の大事な時間が出る、飾れる時計。sakutto-keisan.com/fx-tokei/ に載せ、同じ中身を ios-kobo でアプリにする。企画はプロジェクトの claude/tokei-idea.md、報告は claude/reports/tokei.md。

## 作り
- app/ がそのまま /fx-tokei/ に置かれる中身（HTML・JS・CSS・SVG。画像はアイコンの PNG だけで、icon.svg から作る〔npm run icons〕。Canva の素材は使わない）
- 形は app/forms.js の一覧（形ごとのファイルに mount と icon）。色と時計の大きさは app/skins.json だけ（`npm run skins` で skins.css・skins.js を作ってコミット。Swift のウィジェットも読む）。形のファイルと style.css に色や半径の数字を書かない
- 時間の計算は app/time.js だけ。夏時間は Intl のタイムゾーンで自動（決め打ちの時差を書かない）
- `npm test`（node --test）・`npm run build`（dist/fx-tokei/ に出す）。app を変えたら最後に `npm run sw`、画面に漢字を足したら先に `npm run fonts`（フォントは中に入れたもの・外から読みこまない）。電波なしの確かめは build のあと scripts/check-offline.py
- リンクと読み込みは相対パス。PWA の manifest と service worker の範囲は /fx-tokei/
- 版は RELEASES.md とタグ（v0.1.0 の形）

## 決まり
- 見た目・文章はプロジェクトの claude/site-principles.md
- NYオープン＝NY 8:00（大きく）、NY株の寄り付き＝NY 9:30（小さく）。NYカットは出さない
- 売買のおすすめはしない。指標の予定は公式の発表から取る（経済指標カレンダーのサイトは写さない）
- サクッと計算の側（ページの文・つぎに・広告・取りこみ）は、このリポジトリでは作らない
