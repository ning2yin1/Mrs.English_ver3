# Shop実装・検証メモ

## 実装

- `src/shop/controller.js`, `view.js`, `style.css`: 承認済み6画面、独立した可変文字・カード・操作部品。既存PNG、9-slice、共通等比レイアウト/全画面背景を使用。
- `src/shop/gacha.js`: `data/shop/catalog.json`を正本とする暗号学的乱数の整数抽選。通常R1/S9/A25/B30/C35、10枚目だけR10/S90。全79カードを各ランク内で等確率抽選、重複可。
- `src/shop/effects.js`: パック揺れ・封切り、事前decode済み表裏のY回転、ランク別発光/星/単発フラッシュ。設定は`data/shop/animation.json`。モーション低減は短いフェード、スキップ/バックグラウンド移行は古い演出をキャンセル。
- `src/shop/store.js`: 正式無料イベント`mrs-english-welcome-10-v1`と購入レシートを`mrsEnglishV3.shop.v1`へ保存。受取済み判定は所持数や開発grantとは独立。既存の正式イベント履歴がこのclaimsにあれば再配布しない。従来アプリに別形式の正式無料履歴は存在しない。
- Collectionの数量台帳とInventoryの個体台帳へ同時反映。新規個体IDは`purchase:<purchaseId>:<index>`、Lv.1。既存の初回入手日・個体レベル・編成・未知フィールドは保持。Collectionは従来どおり同じ絵柄を集約、Inventoryは個体ごとに表示。
- Rコインは既存walletを使用（wallet未作成なら0として読取）。ダイヤはwalletの値があれば表示、従来と同じ表示用21が既定。ダイヤの獲得/消費は未実装で書換えなし。TOPの既存ステータス表示・デザインは変更していない。

## 保存と中断

既存`src/inventory/persistence.js`のWeb Lockを共有する。`commitDurable`を追加し、before/afterを含む単一journalの`prepared → committed → applied`で購入を確定する。`committed`の書込を成立点とし、途中停止したら同じafterを投影する。再加算・再減算・再抽選はしない。従来Inventory取引の復旧方式は維持。

Collection読取にも同じ復旧バリアを接続、Inventoryの既存バリアと協調。共通snapshotの読取口だけを追加し、既存データ形式の置換は行わない。所有数量が存在し個体がまだ無い旧データは既存の個体化処理を引き継ぐ。新規カードの取得順表示のため、個体の実入手日時を利用する。

購入の同一ID再送は既存レシートを返す。無料claim・残高・数量・個体・レシートは同じjournalに含む。進捗保存は付与と分離。未開封のまま再起動した場合はShopを開くと同じ結果一覧へ復帰し、追加付与しない。保存容量不足・破損・未知version・外部競合は既存値を保持して停止。ブラウザーがWeb Locks未対応なら購入を無効にする。

公開更新前から開いた古い別タブは、新しいjournalのphaseを理解しない可能性がある。更新後は旧タブを閉じ、アプリを再起動してから購入する。非協調の古いコード/外部ツールが直接localStorageを書き換える状態までの原子性は保証しない。現値がbefore/after以外なら自動上書きせず停止する。

## 開発用配布

`config/pages.json`の`inventoryDevelopment:false`に変更。公開ビルドの新規開発カード/テストコイン配布を停止するだけで、既存配布済みカード・コイン・編成は保持する。正式無料10枚は別機能として受け取り可能。

ローカルの明示的な`npm run build:inventory-dev`だけは、従来どおり完全な空所持へ一度だけ開発10枚とテスト10,000コインを配布できる。公開URLのパラメーターでは有効化不可。`dev/shop.html`は承認画面比較用のメモリ限定入口。QA固定抽選/見本残高はこの入口に限定され、dev/とqa/は公開成果物に含まれない。

## 確認方法

```
npm run build:pages
npm run build:inventory-dev
# 別プロセス: distを4173、リポジトリを4175、dist-developmentを4176でserve
npm run test:shop
npm test
npm run test:collection
npm run test:inventory
python scripts/compare-shop.py
```

保存テストは確率の全整数境界、全79種、10枚目保証、既存値維持、無料一度、同一ID/同時処理、残高ぴったり/不足、不正データ、journal各書込/削除失敗と復旧、外部競合停止を確認する。ブラウザーテストは通常・動き低減、6承認画面、1/5/10結果、購入・公開・スキップ・再起動、Collection/Inventory共有、TOP往復画素一致を確認する。

比較画像と数値は`qa/shop-browser/index.html`, `comparison.json`, `functional-results.json`。1844×853と844×390（左右47px/下21pxの模擬セーフエリア）で検証。iPhone Safari/PWA実機の描画・操作・ホーム画面からの更新は未検証。課金・ダイヤ操作・Mission/英語プレイ等は今回の範囲外。
