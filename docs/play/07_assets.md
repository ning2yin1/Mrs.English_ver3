# 素材一覧・再利用

## 今回収録

|ファイル/分類|用途|取り扱い|
|---|---|---|
|assets/play/backgrounds/bg-01〜22|プレイ背景22枚|ZIP原本のバイト一致。画像処理なし。写真への文字焼込なし|
|assets/play/decor/ready_book.png|READY右上の本の装飾|承認画像で使った透過原画像、137×137内にcontain|
|assets/play/decor/feedback_correct.png|正解の固定文字装飾|承認画像で使った透過原画像、370×160内にcontain。余白込み|
|styles/play/play_reference.css|選択、発光、暗幕、配置の参考|アプリ実装ではない。既存画像参照を置換して使う|
|references/play/*.png|承認済み6画面の原本|UI背景として実装しない|
|previews/play/*.png|仕様反映後の組合せ確認|クリック背景・素材として使わない|

全素材の実寸・アルファ有無はspecs/play/new_assets.json、一覧全体はfile_manifest.csv。

## 再利用（今回再収録なし）

紫バー assets/nickname/nickname_header.png。
青ボタン assets/home/button_collection.png：9-slice 上18/右20/下17/左20。
紫ボタン assets/home/status_menu.png：上16/右18/下16/左18。
暗いパネル assets/collection/ui/list_panel.png：各16。
READY背景 assets/collection/background.png。
戻る矢印 assets/icons/nickname_back.png、決定矢印 assets/icons/nickname_confirm_arrow.png。
既存のカード描画、R/S/A/B/Cフレーム、元写真、カードカタログはそのまま。カード3枚のサンプルは新規配布しない。既存フォントを使い、日本語は全問題文字のglyph coverageを確認。Noto系の既存ライセンスを維持。

これらは前回キット内のパス。公開リポジトリの場所は未確認。ファイル名の衝突や不足があればCodexが既存資産のハッシュ・見た目・余白を照合して結び直す。見つからない場合に別デザインのCSSボタンへ勝手に置換しない。

今回新しい人物・カード・光沢ボタンを生成していない。承認時の本/正解装飾を初めてキットへ収録し、共通装飾は既存PNGを参照する構成。
