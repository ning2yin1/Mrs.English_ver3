# Inventory実装・開発配布の設定

## 今回の公開モード

`config/pages.json` の `inventoryDevelopment: true` により、現在のGitHub Pagesは明示的なInventory開発検証ビルドです。**初回アクセス時、所持台帳が完全に空で、既存個体・編成・開発付与履歴がない場合だけ**R/S/A/B/C各2枚を共通の所持台帳へ一度だけ登録します。Collectionにも同じ10枚を表示します。既所持カード、入手日、レベル、編成は上書きせず、1枚でも所有していれば追加配布しません。

通常の `npm run build` は常に開発配布を無効にします。正式公開へ切り替えるときは `config/pages.json` をfalseにして再公開してください。URLパラメータやlocalStorageのフラグで配布を有効にする機能はありません。既に付与済みのカードや残高は設定変更で削除しません。正式版の無料パックや受取履歴は未実装で、開発履歴と共用しません。

## Rコイン

既存TOPの「9,979」は固定表示で、保存済み残高/APIは存在しませんでした。TOPの表示は保護し、勝手に実残高とみなしていません。新しい共有残高は `mrsEnglishV3.wallet.v1` の `{version:1,rCoin:...}` で、未保存時は0です。

上記の開発配布に初めて成功した場合だけ、残高未保存なら明示的なテスト残高10,000を設定します。既存の残高は77でも0でも保持し、9,979へ初期化しません。テスト残高の起源はwalletの`origin`に記録します。正式ビルドで残高を自動付与することはありません。TOPの固定カウンターを実残高へ接続する変更は、この保護範囲では行っていません。

## 保存と整合性

- 所持の正: 既存 `mrsEnglishV3.collection.v1`。開発配布は既存の `createOwnershipStore().awardCard()` を仮想保存領域内で利用し、最後に一括確定します。Inventory専用の所持コピーはありません。
- 個体と編成: `mrsEnglishV3.inventory.v1`。数量しかない既存カードには、安定した`legacy:<catalogId>:0001`等を対応付けます。個体IDがあれば再利用し、元の数量・入手日を変更しません。
- デッキ: 3枠、非null個体IDの所有と一意性を確定時にも検証。同じ種類の別個体は使用可能です。未確定の変更はメモリ内だけで、戻ると破棄します。
- 強化: Web Locksで操作を直列化し、最新の所有・レベル・残高を読み直して検証。最大レベルはR50/S40/A30/B20/C10。コスト・能力・スキルはキットのデータを使用し、未定義カードの暫定値だけ`src/inventory/model.js`に分離しています。
- 保存: `mrsEnglishV3.inventory.transaction.v1` に変更前後を記録し、個体・残高を同じ取引として確定。途中の保存失敗は復元し、中断した取引は再読込で復旧します。操作IDの再適用・古いレベル・古い編成revisionを拒否し、二重タップ中はUIをロックします。
- 不正JSON・未知version・不正レベル・未知フィールドを初期化しません。所有数が減った場合も余剰の個体情報は削除せず、現在所有とのjoinだけを表示します。破損deckは画面上で未編成と扱い、元の保存値は保持します。
- Collectionには読み取り専用の個体情報アダプターだけを接続しました。元の種類/数量表示・デザインは維持し、強化後の個体levelを同じサイドカーから参照します。承認デザインにないレベル欄をCollectionへ追加していません。

## 変更箇所

`src/inventory/*` が専用renderer/controller/model/store・保存復旧・CSS・ビルド設定です。既存アプリは`src/app.js`のInventoryルートと開発初期化のみ接続。Collectionは`controller.js`の個体情報の読み取りと`components.js`のDOMメタデータだけを追加しました。既存の画像・フォント・配置JSON、TOP用HUD・背景・拡縮処理・プロフィール保存は変更していません。

ビルドは追加`data/inventory`の収録と開発モード指定だけを拡張しています。`scripts/build-pages.mjs`と`config/pages.json`が公開モードを選び、GitHub Actionsの成果物は従来どおりdistです。サービスワーカーは既存の自動生成を利用します。

## ローカルで確認

```sh
npm ci
npm run build:inventory-dev
PORT=4176 npm run preview:inventory-dev
```

これは完全なアプリで、通常のタイトル・初期設定・TOP・Collection・Inventoryを使えます。所有・編成・強化・テストコインは同じオリジンのlocalStorageへ保存され、再起動でも保持されます。通常版は `npm run build` / `npm run preview`（4173番）。公開ビルドは `npm run build:pages`。

## 検証

通常版4173番、開発版4176番、Collection開発用4175番を起動して:

```sh
npm test
npm run test:collection
node tests/inventory-store.mjs
node tests/inventory-browser.mjs
python3 scripts/compare-inventory.py
```

編成の重複拒否・確定・キャンセル、強化・コイン消費・二重タップ・競合・上限・不足、保存失敗/途中保存の復旧、既存所有と残高の保護、正式ビルドでの配布無効、オフライン復帰を検証します。通常の空状態を評価するテストでは必ず `npm run build` の成果物を使ってください。

`qa/inventory-browser/index.html`に承認3画面との比較を保存します。比較撮影だけは独立ブラウザー内の残高を見本値9,979に設定しており、公開版のテスト残高や実残高を書き換えていません。スクロールバーの長さは実データに連動します。カードの縮小・文字のアンチエイリアスにブラウザー差があります。

未対応: iPhone実機検証、TOP固定コイン表示の実残高接続、Shop/ガチャ/正式無料パック/Mission/英語プレイ/スキルのスコア反映。今回のスキルは設定と表示のみです。正式版への切替時に開発用アカウントの移行方針は別途決めてください（自動削除はしません）。
