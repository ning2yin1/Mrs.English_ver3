# 素材・再利用指示

既存素材は `layouts/inventory/reused_assets.json` / REUSED_ASSETS.csv のパスとSHA256を参照します。既存パスの画像を新しく作り直すことは禁止。写真やフレームが見つからない場合に別写真・一般アイコン・AI画像で代用しないでください。

|用途|既存パス|
|---|---|
|全画面背景|assets/collection/background.png|
|紫タイトルバー|assets/nickname/nickname_header.png|
|青ボタン|home_approved/assets/home/button_collection.png|
|紫の補助ボタン|home_approved/assets/home/status_menu.png|
|戻る/決定矢印|assets/icons/nickname_back.png / nickname_confirm_arrow.png|
|Rコイン|home_approved/assets/icons/coin.png|
|半透明ガラスパネル|assets/collection/ui/list_panel.png|
|数値用フォント|assets/collection/fonts/nimbus_sans_bold.otf|
|カード定義・写真・枠|layouts/collection/catalog.json、assets/collection/cards/*、frames/rank_*.png|

|新規PNG|原寸|使い方|
|---|---|---|
|deck_backplate.png|1774×887|人物/文字なし装飾。編成は851×426・opacity160/255、強化は616×599・opacity140/255。承認時の新規装飾原本をそのまま再使用|
|tag_normal.png|157×29|編成番号・枠番号などの背景のみ|
|tag_used.png|157×29|ほかの枠で編成中の背景のみ|
|tag_rank_s.png|157×29|承認画像のSランク情報タグ背景のみ|
|tag_rank_r.png|157×29|承認画像のRランク情報タグ背景のみ|
|selection_glow_136.png|176×230|一覧の選択枠。カード原点から−20px、余白込みで使用|
|selection_glow_238.png|278×373|デッキ選択枠。カード原点から−20px、余白込みで使用|

タグ4点は9-sliceの[top,right,bottom,left]=[8,8,8,8]。青ボタンは[18,20,17,20]、紫ボタンは[16,18,16,18]、既存ガラスパネルは[16,16,16,16]。角を固定し中央を伸縮。文字は常に別レイヤー。矢印・写真・枠・発光は9-slice禁止。選択発光は136/238の2サイズを用途別に使い、タイトな切抜きや二重発光をしない。

カードのランクR/S/A/B/Cは原枠に含まれる固定図柄です。人物写真と枠は別の既存ファイルで、catalog.jsonのphoto_windowとcover中心[0.56,0.42]を使用して原枠の内側に表示します。写真の輪郭・色・人物・図柄を編集しない。表示全体は1060:1484の比率を保持。承認画像の238px幅は333px、136px幅は190px、420px幅は588px（端数丸めのみ）。

日本語は承認時のNoto Sans JP 450/650固定ウェイトをそのまま追加し、数字は既存Nimbus Boldを使用します。日本語フォントの一部グリフを削ると小サイズでヒンティングと文字端位置が変化することを確認したため、見た目優先で元フォントを保持しました。ライセンスOFL.txtを同梱。画像の無意味な拡大版やカード原本の再収録は行わず、ZIP圧縮で容量を抑えています。

上限・不足・処理中ボタンは青ボタン原本を再利用し、opacityと独立文字とdisabled属性で状態を切り替えます。新しいボタン画像を重複生成しません。状態定義はasset_states.json。追加レアリティの情報タグには既存の紫タグ背景を再利用し、R/S/A/B/Cの文字だけを動的に変更します。人物枠の色は変更しないでください。
