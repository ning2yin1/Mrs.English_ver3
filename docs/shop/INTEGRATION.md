# リポジトリへの追加

ZIPはassets/shop、layouts/shop、data/shop、docs/shop、mockups/shop、qa/shopの6専用パスのみ。余分な親フォルダなし。既存ファイルの置換/上書き対象は0件です。FILES.csvに全追加パスとSHAを記録。

今回はGitHub/現行公開コードへアクセスしていません。既存のCollection/Inventory制作キットのローカル原本を参照して再現しています。展開前に現行ツリーで同名Shopファイルがないかを確認し、衝突時に強制上書きしないでください。

1. 現行リポジトリの作業コピーでFILES.csvの追加先を確認。
2. REUSED_ASSETS.csvの依存原本が存在するかとhashを確認。パス/名前が変わっている場合は既存原本へaliasを合わせ、旧TOP/Collection/Inventoryを本キットに合わせて戻さない。
3. ZIPをルートへ展開。既存root README/package.json、旧素材/配置、初期設定、保存キーの上書きファイルはありません。展開だけでゲームは変わりません。
4. READMEとCODEX_GUIDE、購入/保存/演出仕様をCodexへ渡す。将来src/shop等の追加、既存Shopルートと共通保存APIへの必要最小接続を行う。ビルドが追加data/shopと画像を収録するかは現行から確認し、推測のbuild/SW置換をしない。
5. 実装後に画像差分とCHECKLIST、旧画面の回帰確認を行う。

|区分|対象|
|---|---|
|追加|FILES.csv記載のShop専用ファイル全件|
|既存ファイル更新|今回0件|
|既存ファイル上書き|今回0件|
|既存素材参照|REUSED_ASSETS.csv。再収録しない|
|カード裏面|提供原本をassets/shop/cards/card_back.pngへ初回収録。現行に同一原本があれば再利用先を優先|
|将来の最小接続|現行ルーター/保存サービスのShop対応のみ。本ZIPに実装コードは含めない|

未確認の現行接続先：Shopルート名、所持台帳API、RコインAPI/キー、正式無料履歴、個体ID/取引保存機構、開発seederの有効設定。現行コードが正で、推測の新しい財布・所有台帳を作らない。今回の素材納品に必要な画像再現検証は完了しています。
