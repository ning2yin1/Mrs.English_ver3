# 既存リポジトリへの統合手順

確認元: `ning2yin1/Mrs.English_ver3` main `51e65e19727b6ceaea84cc28e3b84dfab4519d9a`。読み取りで構成・共通素材のGit blob SHAを照合しました。

1. 展開前に作業コピーを用意し、`docs/collection/FILES.csv` と既存ツリーの同名パスを確認する。本確認時点の衝突は0。以後同じCollectionフォルダが追加されていたら、自動上書きせず差分照合する。
2. ZIPをリポジトリのルートへ展開する。親フォルダは不要。追加先は assets/collection、layouts/collection、docs/collection、mockups/collection、qa/collection のみ。既存root READMEやpackage.jsonを置換しない。
3. `layouts/collection/reused_assets.json` にある10依存ファイルが既存パスに存在し、記載sha256と一致するか確認する。違う場合は最新版の理由を確認し、TOP素材を本キットに合わせて戻さない。
4. 説明書と再構成PNGを確認。展開だけではアプリ動作は変わらない。ゲームのルート接続などはユーザーが次工程を依頼した際に `CODEX_IMPLEMENTATION.md` の限定範囲で行う。
5. 実装段階では既存 scripts/build.mjs が assets/layouts/src を再帰コピーし、既存キャッシュ一覧を組み立てる構造を活用。今回の配置なら新フォルダ収録のためのビルド/SW改変は不要。public/sw.jsを手動書換えしない。今回ビルド・デプロイは行っていない。

既存の assets、home_approved、layouts 内の旧ファイルは同梱していません。既存のTOP・初期設定の素材/配置/実装と保存キーはそのままです。新規カード原本79枚と枠5枚は提供ZIPからの初回インポートで、sha256をcatalogと素材一覧に記載。人物・カード・枠は未改変。

## ファイル変更区分

|区分|今回のZIP|理由|
|---|---|---|
|追加|FILES.csvの全件|Collection専用の新規パス|
|既存ファイル更新|0件|独立追加キットのため|
|既存ファイル上書き|0件|既存のTOPと保存処理を保護|
|将来の最小更新候補|src/app.js（ZIPには含まない）|placeholder/collectionの画面遷移を新Collectionへ渡すためだけ|
|将来の新規実装候補|src/collection/*（ZIPには含まない）|専用renderer/controller/storeと限定CSS|

保護対象: src/home-hud.js、src/profile.js、既存home/初期設定のJSON、home_approved以下全て、既存UI素材、既存保存キー。既存の共通実装にCollection対応が必要でもホーム挙動を変更する広域リファクタリングはしない。新規Collectionの扱いは専用処理へ分離する。

本ZIPは新素材の追加と設計文書の納品であり、GitHubの変更操作はしていません。統合時も衝突が見つかったらこの一覧を根拠に確認し、フォルダごとの強制上書きをしないでください。
