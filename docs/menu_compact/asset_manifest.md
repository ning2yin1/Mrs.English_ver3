# 素材一覧

|ファイル|用途|viewBox|表示|
|---|---|---|---|
|assets/menu_compact/icon_gift.svg|ログインボーナス|0 0 24 24|20×20px|
|assets/menu_compact/icon_settings.svg|設定|0 0 24 24|20×20px|
|assets/menu_compact/icon_help.svg|遊び方|0 0 24 24|20×20px|
|assets/menu_compact/icon_chevron_right.svg|各行の右矢印|0 0 8 12|8×12px|
|styles/menu_compact/menu.css|パネル・各行・区切り・文字・配置・開閉のスキン|—|240×146px|
|docs/menu_compact/layout_spec.md|座標・寸法・色・実機位置調整|—|—|
|docs/menu_compact/animation_spec.md|180ms開閉、各行・外側タップ仕様|—|—|
|docs/menu_compact/CODEX_INSTRUCTIONS.md|調査/導入/実装/テスト指示|—|—|

SVGは全てfill=none/stroke=currentColor/線幅1.4/round cap・joinで統一。画像生成・外部アイコンライブラリは使用していない。透明なSVGキャンバスで背景矩形なし。主要3アイコンは文字と同程度の20px。矢印は控えめに小さく表示。
パネル/行のPNGは不要なので制作していない。CSSはこのメニュー専用のスキンで、アプリの開閉ハンドラー・画面遷移・本体実装は含まない。
