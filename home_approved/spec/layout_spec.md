# Home layout specification

基準：1844×853px。Xは左端、Yは上端。PNGの透明な余白を含む配置座標です。見える縁の位置はPNGの内側に数px入ります。

## 装飾画像の配置

| パーツ | X | Y | 幅 | 高さ | Z | ファイル |
|---|---:|---:|---:|---:|---:|---|
| プレイヤーバー | 98 | 0 | 529 | 83 | 10 | assets/home/status_player.png |
| スタミナバー | 623 | 0 | 302 | 83 | 10 | assets/home/status_stamina.png |
| 通貨バー | 921 | 0 | 541 | 83 | 10 | assets/home/status_currency.png |
| メニューバー | 1458 | 0 | 290 | 83 | 10 | assets/home/status_menu.png |
| Inventory枠 | 72 | 736 | 339 | 111 | 10 | assets/home/button_inventory.png |
| Collection枠 | 406 | 736 | 344 | 111 | 10 | assets/home/button_collection.png |
| Mission枠 | 745 | 736 | 355 | 111 | 10 | assets/home/button_mission.png |
| Shop枠 | 1095 | 736 | 332 | 111 | 10 | assets/home/button_shop.png |
| Ready枠 | 1423 | 736 | 350 | 112 | 10 | assets/home/button_ready.png |

配置は元画像を目視で確認し、画素座標で領域を指定して抽出しています。輪郭は元の形に合わせたマスクを使用しています。完全な自動セグメンテーションではありません。

背景はZ=0、上記の枠はZ=10、アイコンはZ=20、HTMLの文字はZ=30。アイコンと文字の全座標・実測表示領域は `home_layout.json` と `home_layout.csv` に記録しています。アイコンには縦横比を維持したままPNGを配置します。

## 文字

Nene、RANK 1、MAX、25/25、9,979、21、Menu、Inventory、Collection、Mission、Shop、Readyを別要素で表示します。JSONに位置・表示サイズ・色・採用フォントを格納しています。数値・名前・ラベルの変更はDOM文字を書き換えます。PNG側に文字を加えないでください。

Readyの字形フォントはR/e/a/d/yの5文字だけを収録しています。ラベル変更時は収録文字を確認し、それ以外の文字には同梱近似フォントのフォールバックが必要です。任意の日本語ニックネームは端末の日本語サンセリフへフォールバックします。

現在の表示文字を参考寸法に合わせた数値を記録しています。変更後の文字列を同じ横幅に強制変形させないでください。定義した欄内で左寄せまたは右寄せし、長い名前は省略します。基準画面のグループ全体は均一縮小し、文字単体に無理な縦横変形をかけないでください。

## タップ範囲と遷移

| 操作 | X | Y | 幅 | 高さ | 遷移先 |
|---|---:|---:|---:|---:|---|
| プレイヤー | 100 | 0 | 525 | 80 | placeholder/profile |
| Menu | 1460 | 0 | 285 | 80 | placeholder/menu |
| Inventory | 75 | 739 | 333 | 105 | placeholder/inventory |
| Collection | 408 | 739 | 339 | 105 | placeholder/collection |
| Mission | 747 | 739 | 350 | 105 | placeholder/mission |
| Shop | 1097 | 739 | 328 | 105 | placeholder/shop |
| Ready | 1425 | 739 | 345 | 106 | placeholder/ready |

全仮画面にホームへの戻る操作を設けます。エネルギーの丸いアイコン・スタミナ数値・通貨はこの段階では表示のみです。中央にはタップ用の大型ボタンを追加しません。

## リサイズとセーフエリア

1. `viewport-fit=cover` を指定し、画面の上下左右から `env(safe-area-inset-*)` を引いた安全な矩形を求めます。
2. `scale=min(safeWidth/1844,safeHeight/853)` で基準キャンバス全体を均一拡縮します。XとYで別の倍率を使わないでください。
3. 安全な矩形の中央にキャンバスを置き、全座標とタップ領域に同じ倍率を掛けます。余った領域は背景写真または暗色で埋めます。
4. 見本比較では基準キャンバス全体を維持します。背景切り替え時の写真は縦横比を維持したcover表示とし、顔が切れないよう画像ごとに表示位置を指定します。
5. 1844×853px時はPNGを等倍表示します。9-sliceは将来バー幅を変える際の候補で、JSONに暫定の境界値を記録しています。今回の等倍比較では9-sliceによる引き伸ばしを使用していません。

この方法は写真を最大化する端末ごとのUI再配置よりも、決定済みモックアップの比率を維持することを優先します。
