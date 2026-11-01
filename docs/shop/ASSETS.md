# 素材と再利用

新規一覧はNEW_ASSETS.csv、依存一覧はREUSED_ASSETS.csv / layouts/shop/reused_assets.jsonに寸法・SHAを記録しています。ファイル名は英数字です。

- pack_one / pack_five / pack_ten.pngは承認時の透過RGBA原本（1024×1536）をbyte変更せず再使用。ブランド装飾のみで、変更可能な枚数・価格・説明文は含めない。原本に含まれる外周の光/影と透明余白を保持し、四角い背景色を追加しない。
- count_badge_{silver,violet,gold}_{32,44}.pngは背景だけ。小は78×78、大は102×102。数値・「枚」は別テキスト。バッジは円形のまま等倍比率で使用し、9-sliceしない。
- 光/放射/星はそれぞれ独立透過PNG。scene JSONに位置・大きさ・pivot_canvas・元のエフェクトパラメータを記録。重複する同一星画像は共通化。
- rarity_c_halo（白）、b（赤）、a（紫）、s（強い紫+金）とreveal_flashは要求されたアニメーション状態用。承認済みR静止画の見た目は差し替えない。Rは05_card_reveal.json内の既存金色の2重ハロー・放射・金色星を使用。
- close.pngは独立した透明の閉じるアイコン。
- card_back.pngは提供済みカードZIPの原本を変更せず初回インポート。前回のCollection/Inventoryキットに裏面が含まれていなかったため新パスで収録したもの。現行リポジトリに同一裏面がすでにあれば、その原本を優先し参照先を合わせて重複を避ける。別デザインを生成しない。

|用途|参照する既存素材|
|---|---|
|紫タイトルバー|assets/nickname/nickname_header.png|
|戻る/右矢印|assets/icons/nickname_back.png、nickname_confirm_arrow.png|
|青い主ボタン|home_approved/assets/home/button_collection.png|
|紫の補助ボタン|home_approved/assets/home/status_menu.png|
|Rコイン/ダイヤ|home_approved/assets/icons/coin.png、diamond.png|
|背景/ガラスパネル|assets/collection/background.png、ui/list_panel.png|
|暗金色の保証ラベル背景|assets/inventory/ui/tag_rank_r.png|
|日本語フォント450/650|assets/inventory/fonts/noto_sans_jp_450.ttf、noto_sans_jp_650.ttf|
|欧文数値フォント|assets/collection/fonts/nimbus_sans_bold.otf|
|カード|layouts/collection/catalog.jsonと既存写真・R/S/A/B/C枠|

9-sliceの[top,right,bottom,left]は青ボタン[18,20,17,20]、紫ボタン[16,18,16,18]、ガラスパネル[16,16,16,16]、保証タグ[8,8,8,8]。角を固定し中央だけ伸縮。光・人物・カード枠・パック・バッジは一様拡縮のみ。

人物写真/カード枠は新規素材に焼き込まない。原写真をcatalogのphoto_windowとcover中心[0.56,0.42]で枠の内側へ表示し、原枠を重ねる。表示用の縮小配置は行うが、写真ファイルの加工/AI再生成/色変更はしない。カード影は原画像のアルファに対する影（画面基準offset3,8 / Gaussian blur5 / opacity.7）。矩形box-shadowで代用すると角と余白が変わる。

保証文、価格、数値、パック名、カード名、ランク表示、ボタンラベルはすべてHTML等の独立文字。固定図柄のブランド名とカード枠のR/S/A/B/C記号だけは元画像に含まれることが正しい仕様です。
