# Collection実装

承認済みの `docs/collection/`、`layouts/collection/`、`mockups/collection/` と元素材を基準に、一覧・詳細・空状態を実装しました。制作キットの素材・カタログ・配置JSONは変更していません。

## 通常の利用

ホームのCollectionから開き、ヘッダー左の戻る操作でホームへ戻ります。所有台帳が存在しなければ0枚です。テストデータの付与や既存データの初期化は行いません。メンバーとレアリティはAND条件、所持数はフィルターに関係なく全所持枚数の合計です。同一カードは1タイルに集約します。

一覧だけが縦にスクロールし、詳細から戻ると絞り込み・スクロール位置が復元されます。詳細の矢印・単指の横スワイプは絞り込み内のカードを切り替えます。端で停止し、縦移動・複数指操作では切り替えません。指の移動量は変換前のCSS pxで判定します。

背景はCollection専用の元画像を全画面cover表示し、UIは既存の安全領域・均一拡縮処理を使用します。ホーム用のUI幅・下端調整はCollectionに適用しません。

## 保存と将来の連携

- 独立キー: `mrsEnglishV3.collection.v1`。既存の `mrsEnglishV3.profile` は変更しません。
- 形式: `{"version":1,"owned":{"motoki-r-01":{"firstAcquiredAt":"2026-11-01T00:00:00+09:00","quantity":1}}}`。
- `src/collection/store.js` の `createOwnershipStore(catalog)` が共通の所有台帳への入口です。`read()` と将来のShop向け `awardCard(catalogId, amount, acquiredAt)` を提供します。Collectionの閲覧処理から付与は呼びません。
- 再入手時は数量のみ加算し、初回日時を保持します。初回日はAsia/Tokyoで表示し、欠損を現在日時で補完しません。
- 未保存時の閲覧は書き込みません。不正JSON・未知version・保存失敗を通知/エラーとして扱い、元データを空で上書きしません。未知ID・未知フィールドは保存領域に保持し、表示時だけ既知IDと正数整数のquantityを抽出します。
- カードの論理IDとrarityはカタログを使用します。`hiroto-r-01` の画像は `hiloto/r/hiloto-a-06.jpg` であり、画像ファイル名からランクを判定しません。
- 現時点の台帳はlocalStorageのため、将来Shopで取引を実装する際は取引IDの重複排除・複数タブの競合制御を別途設計してください。強化・編成データは今回実装していません。

## 開発用の18枚表示

```sh
PORT=4175 npm run dev
```

開発サーバーの `/dev/collection.html?mode=owned`、`?mode=detail`、`?mode=empty` で承認モックアップと同じ状態を確認できます。この専用ページは `qa/collection/owned_fixture.json` をメモリに読むだけで、localStorageへ保存しません。`dev/` と `qa/` は本番のdist/に含まれません。本番URLのクエリでテスト所持を有効にする仕組みもありません。

## テストと画面比較

別ターミナルで `npm run build` と `npm run preview`（4173番）を起動した状態で:

```sh
npm test
npm run test:collection
python3 scripts/compare-collection.py
```

Collectionのブラウザーテストは上記の開発サーバー4175番も使用します。`TEST_URL` で本番ビルドの検証先を変更できます。Chromiumは既存の `/usr/bin/chromium` を利用し、別の場所なら `CHROMIUM_PATH` を指定してください。画像比較のみPythonのPillow・NumPyが必要です（既存QAと同じ依存）。

比較ページは `qa/collection-browser/index.html`。3状態の1844×853キャプチャ、差分4倍、iPhone相当のスクロール・詳細、ホーム回帰画像、機能検証結果を保存します。スクロールつまみは実データの可視比率から算出し、モックアップに描かれた固定175pxには固定しません。写真・枠のブラウザー縮小と文字アンチエイリアスにはPillow再構成との差があります。

iPhone実機のSafari・ホームインジケーター・実機での指操作は未検証です。Chromiumでは安全領域を模擬した844×390と実際のタッチイベントで確認しています。Shop・Inventory・カード強化・3枚編成は対象外です。
