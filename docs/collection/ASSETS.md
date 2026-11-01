# 再利用・追加素材一覧

厳密なパス・寸法・SHAは NEW_ASSETS.csv / REUSED_ASSETS.csv と layouts/collection内の同名JSONに記録しています。

|共通部品|参照する既存パス|用途|
|---|---|---|
|紫タイトルバー|assets/nickname/nickname_header.png|全3画面|
|青ボタン|home_approved/assets/home/button_collection.png|フィルター・左右・ホーム復帰|
|紫ボタン|home_approved/assets/home/status_menu.png|レアリティ未選択|
|戻る矢印|assets/icons/nickname_back.png|全3画面|
|決定矢印|assets/icons/nickname_confirm_arrow.png|詳細左右・ドロップダウン|
|Collection徽章|home_approved/assets/icons/collection.png|空状態|
|数字フォント|home_approved/assets/fonts/NimbusSansNarrow-Bold.otf|詳細ページカウンター|
|3メンバー名フォント|assets/fonts/member_{motoki,hiroto,ryoka}_name.ttf|カード名/詳細名|

これら10ファイルは無変更・非再収録。新しいボタンやタイトルバー画像は生成していません。派生する寸法は既存PNGの9-sliceで再現します。

新規装飾PNGは list_panel（1653×542）、detail_info_panel（385×245）、empty_aura（350×230）、detail_aura（650×730）、scroll_track（8×496）、scroll_thumb（8×175）の6点のみ。前4点は中間アルファを含み、人物・数値・文字・カードは含みません。つまみとレールも丸角部分の透過を保持。

承認背景1枚と原本カード79枚、R/S/A/B/C原枠5枚を初回インポート。写真/枠/背景のデータは原本から1byteも変更していません。枠のランク記号は意図的な固定図柄。カード名、初回日、数量、フィルター、ボタン名は独立テキストです。背景はCollection専用であり、TOPの選択背景を差し替えません。

追加フォントは日本語Noto Sans JPの450固定ウェイト・必要文字サブセット（承認時と同一の主フォントと、動的文字補完用extendedフォント）、欧文Nimbus Sans Regular/Bold。ライセンスを同フォルダへ同梱。サブセットは今回の定型文・メンバー名・数字・ASCIIに対応し、任意の自由入力全文を表示するためのフォントではありません。将来の任意文字機能は既存本文フォント等と別途設計してください。
