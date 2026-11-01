# 統合手順と変更対象

ZIPにはassets/inventory、layouts/inventory、data/inventory、docs/inventory、mockups/inventory、qa/inventoryだけを収録。余分な親フォルダはありません。リポジトリルートへ追加できます。旧TOP/Collectionの同名ファイルを一切含めず、既存コードや共有素材の上書きは0件です。

1. 展開前にdocs/inventory/FILES.csvで追加パスを確認し、同名Inventoryファイルが現行リポジトリにないか確認する。あれば自動上書きせず比較する。今回GitHubへアクセスしていないため、現行ツリーの衝突ゼロを外部確認したとは扱わない。
2. 既存Collectionキットが追加済みであることを確認。REUSED_ASSETS.csv / reused_assets.jsonの25依存ファイルを既存パスで参照する。sha256差があれば最新版の理由を確認し、TOP/Collectionを本キットへ合わせて巻き戻さない。
3. ルートへ展開し、README・CODEX_SPEC・DATA_AND_SAVEをCodexに渡す。展開だけではアプリ機能は変わらない。今回の承認画像と再構成画像はQA資料であり、ゲームの背景素材に流用しない。
4. 実装時に既存Inventoryルート・所有API・残高APIの実名を確認し接続表を埋める。既存ROOT README/package.json/ビルド/SW/プロフィール/画面レイアウトをキットで置換しない。
5. 実装後はCHECKLISTと同サイズの画像比較を行い、既存TOP/Collectionの回帰差分を確認する。GitHub操作・公開はこのキットの制作範囲外。

|区分|対象|
|---|---|
|追加|FILES.csv全件（Inventory専用パス）|
|既存ファイル更新|今回0件|
|既存ファイル上書き|今回0件|
|将来追加する実装|src/inventory/*等の専用処理（本ZIPには未収録）|
|将来最小接続候補|既存ルーターのInventory遷移箇所のみ。実ファイルはCodexが現行から確認|

|実装時に確認する接続先|今回の確定状況|
|---|---|
|現行Inventoryボタン/ルート|既存ボタンを再利用。現行コードは未確認|
|現行Collection所有API/保存キー|過去キットの候補あり。実装時の現行コードが正|
|現行RコインAPI/保存キー|未確認。残高の別台帳や9979への初期化は禁止|
|現行個体IDの有無|未確認。既存IDがあれば再利用|
|現行の追加data/フォントのビルド収録|実装時に確認。既存設定を推測で置換しない|

画像QAは既存ローカル素材を使って完了しています。この接続情報の未確認は素材の再現検証とは別で、実装前の現行確認項目です。
