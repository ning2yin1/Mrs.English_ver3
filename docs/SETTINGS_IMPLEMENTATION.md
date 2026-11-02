# Menu・設定画面

## 操作と保存

- TOPの既存Menuをアンカーに、承認済み240×146 CSS pxのスキンと4つのinline SVGを使用。TOPの変形キャンバス外のportalへ配置し、safe-areaと下部ナビを避ける。
- Menu再タップ・外側・行選択・Escapeで閉じる。外側のタップは背後へ渡さない。Tab/矢印/Home/Endとフォーカス復帰、180msアニメーション、reduced-motionに対応。
- ログインボーナスと遊び方は閉じるのみ。遷移・配布・データ操作は行わない。
- 設定画面は画像追加なし。横画面用の固定ヘッダー＋スクロール領域。TOPへ戻れる。
- 壁紙22枚、推し3人、ニックネームは既存の初回選択画面を使用。ただし設定から開いた場合は一項目だけ編集し、決定で設定画面へ戻る。戻るはキャンセル。`setupComplete:true`を維持し、初回設定のやり直しや配布処理は行わない。
- プロフィールは既存の`mrsEnglishV3.profile`。サウンドと演出スキップは独立した`mrsEnglishV3.settings.v1`。BGM/効果音は初期ON・100%、演出スキップは初期OFF。保存拒否時は通知し、この起動中のみ保持。
- 推し変更時は既存の人物画像をアバター枠内に再利用。TOPの枠・配置・写真・ナビの変更や、新規画像・フォントは追加しない。

## 更新の仕組み

`npm run build` / `npm run build:pages`で以下を生成する。

- `dist/version.json`: `id`（16桁の内容ハッシュ）、`version`（package.json）、`updatedAt`（UTCのビルド日）。約100バイト。
- `dist/src/release.js`: 実行中アプリの不変の版情報。アプリ起動時に読み込み、設定画面を後で開いてもこの値を渡す。他タブでService Workerが更新されても表示や比較対象はすり替わらない。
- `dist/sw.js`: 同じIDをキャッシュ名へ埋め込む。Workerの処理・実行ファイル・素材・CSS・アプリバージョン・更新日がビルドIDの対象。`SOURCE_DATE_EPOCH`で日付の再現も可能。
- `dist/precache.json`: 既存と同じ配列形式の全オフライン資産一覧。

**確認**は`version.json`のみを`cache:no-store`で取得する。Service WorkerもこのURLをネットワーク専用に扱い、キャッシュへフォールバックしない。実行中アプリのIDとの一致で「最新」、不一致で「アップデートする」を表示。HTTPエラー・不正JSON・不正なメタデータ・タイムアウト・オフラインは案内を表示し、再確認できる。開発サーバーは公開ビルドではないため、その旨を案内する。GitHub Pagesのサブパスにも対応する相対URLを使う。

**更新実行**時のみ`registration.update()`を呼ぶ。待機中WorkerのIDをメッセージで照合し、ユーザーが確認した公開版と違えば再確認を促す。`PREPARE_UPDATE`で別キャッシュへ全資産を2並列で取得する。取得前後で公開IDを再検査し、途中のHTTPエラーがあれば有効化しない。成功したら`skipWaiting`→有効化→操作中タブの再読み込み。取得中は設定画面の操作を一時的に無効にする。

新しいプロトコルに対応したWorker同士では、ブラウザーの自動更新検出で`sw.js`を取得しても全資産の取得は始まらない。初回インストールは従来どおり完全オフライン用の資産を取得する。また、**既存の旧Workerには更新ボタンもメッセージ処理もないため、一度だけ従来方式で自動取得して新しい仕組みへ移行する**。旧Workerへのプロトコル照会に応答がない場合のみ行う。この移行後は通常の更新が手動になる。

更新処理はlocalStorage/IndexedDBを消去・再作成しない。以前のリリースのキャッシュも保持するため、失敗時は現行版のオフライン資産が残る。キャッシュ世代の自動整理は今回追加していない。新バージョンの公開は`dist/`全体を同時に配置する既存Pagesワークフローを使用する。ソースだけの配置では更新確認に必要な版情報は生成されない。

## 検証

```sh
npm run build:pages
npm run test:settings
npm run preview # 別セッション、port 4173
npm test
HOME_HUD_OUTPUT=test-results/home-hud npm run test:home
npm run test:setup-offline
node tests/collection-store.mjs
node tests/inventory-store.mjs
node tests/shop-store.mjs
node tests/play-store.mjs
node tests/result-model.mjs
```

`test:settings`は自前の一時HTTPサーバー（`/game/`サブパス）と一時新版を使用し、Menu・設定保存・最新版/更新あり/不正情報/HTTP失敗/オフライン・自動更新待機・アセット取得失敗/再試行・新版有効化・全保存内容の一致・更新後のオフライン起動・複数タブの版表示・旧Workerからの移行・プレイ操作を検証する。結果と画面はignoredの`test-results/menu-settings/`に出力する。

Chromiumでsafe-areaと横画面サイズを模擬して検証。実機iPhone Safari、App Store配布、公開サイトへのデプロイは未実施。

音源・音声再生、演出スキップの適用、ログインボーナス、遊び方は未実装。データ初期化機能は追加しない。

## 変更ファイル

- `src/app.js`: Menu接続、設定への遷移、初回設定と分離した一項目編集、起動時の版情報保持。
- `src/menu.js`: 承認済みSVGをinline化したMenu、スキン読込み、外側タップ、配置、フォーカス制御。
- `src/home-hud.js`: 推し変更後の既存ポートレートの表示。
- `src/release.js`: ソース実行時の開発版情報。ビルド時に本番の版情報へ置換。
- `src/settings/store.js`, `view.js`, `style.css`, `updates.js`: 設定保存、画面、スタイル、更新処理。
- `public/sw.js`, `scripts/build.mjs`: 軽量更新確認・手動適用、旧版移行、版情報の生成、キットCSSのビルド収録。
- `package.json`: `test:settings`コマンド追加。依存関係・lockfileは不変。
- `tests/browser.mjs`, `tests/menu-settings.mjs`: Menu動作の変更に対応した既存回帰テストと新しい統合テスト。
- `docs/SETTINGS_IMPLEMENTATION.md`: 本説明書。

背景22枚・既存画像・承認Menuキット・カード/コイン/編成/ガチャ/学習データの実装ファイルには変更なし。
