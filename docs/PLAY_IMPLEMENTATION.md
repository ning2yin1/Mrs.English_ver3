# READY・英語プレイ実装記録

## 変更ファイルと接続

- `src/play/data.js`: 配置済み400問を動的読込、構造検査、重複なし10問抽出、4択/タイル単位維持、同じ綴りのタイルを文字列順で採点。
- `src/play/scoring.js`: 基本・速度・コンボ・スキル・カード点を独立計算。整数ミリ秒と300,000,000分の1点の整数単位を使用、最終だけhalf-up。表示の丸め値は再計算に使用しない。
- `src/play/store.js`: 一意stageId・問題順・背景・各入力・回答・装備snapshot・停止状態を追加キー`mrsEnglishV3.play.v1`へ保存。スコア記録は文法×難易度別。完了精算は既存walletと共通journalで処理。途中終了は記録/報酬/日次回数なし。
- `src/play/view.js`, `style.css`, `controller.js`: READY、3難易度、正誤、停止/終了確認、仮完了表示。原写真22枚・既存カード描画・紫バー/光沢ボタン/パネルを使用。新しいCSSはPlay専用。1844×853は配置仕様準拠、小画面は上下固定・中央スクロール・44px以上の操作域。
- `src/app.js`: TOPの既存READYボタンに接続する3行のみ追加。
- `src/layout.js`: Playの端末サイズ配置を呼ぶ接続口を追加。既存画面は従来の共通縮小処理をそのまま使用。小画面のPlayだけ、フォーカス時に中央スクロールがリセットされないようにする。
- `src/inventory/persistence.js`: 共通journalの許可キーにPlayを1件追加。Inventory/Shopの取引方式・既存キーは維持。
- `scripts/build.mjs`: specs/playを公開成果物へ追加。既存の内容ハッシュ付きPWAキャッシュが全新素材/問題/モジュールを自動登録。
- `tests/play-store.mjs`, `tests/play-browser.mjs`, `scripts/compare-play.py`, `qa/play-browser/`: 検証と比較。
- `dev/play.html`, `dev/play.js`: モック比較専用メモリ入口。人物・枠は既存素材。QA入口・サンプル個体・固定抽選は公開成果物に含まれない。

制作キット、既存写真、既存カード定義、Inventory能力計算、TOP/Collection/Inventory/ShopのCSS/素材/配置は変更していない。旧データの初期化・移行・カード配布を実行しない。既存所持データ/購入履歴を読み取り、Rコインだけ完了時に加算する。

## スキル差分

既存`data/inventory/balance.example.json`の実装値はscore_up=0.08、speed_up=0.06、combo_support=1。依頼文の暫定+5%/+20%と相違するため、作業中に報告し、既存カード値を保持した。装備は既存Inventoryのdefinition/power/totalPowerから取得し、開始時にsnapshot化する。UIと採点は同じ解決済み値を使う。同種は加算。未知skillIdは勝手に別スキルへ割り当てず警告情報に保持する。

`scoring_examples.json`は暫定+5%/+20%を明示注入した独立計算テストで全9件一致する。実アプリの+8%/+6%は別途検証する。装備なし/空枠は0能力・効果なしで開始可能。

## 報酬・保存

10問目のNEXTで既存残高を再読込し、EASY300/NORMAL450/HARD600 Rを加算。Asia/Tokyoの完了日で先着5ステージは2倍。stageIdの結果・精算印・日次回数・記録・session=completed・財布を同一prepared→committed→applied journalで確定。commit後の中断は固定afterを復旧し、再加算しない。完了表示を再読込しても同じ結果。READY/ホームへ閉じても結果履歴は保持する。

全操作は共通Web LockとPlay revisionで排他。別タブの更新は当該プレイを止めて再読込する。同時に開いたPlayタブは片方を閉じてから再開する。未対応ブラウザーではSTARTを無効にする。更新前から開いた古いアプリタブは閉じ、公開後に再起動して利用する。

タイル操作は順番に保存し、START/決定/NEXTは同期ロック。画像decodeと操作可能な表示完了後から計時し、停止・非表示・縦画面では止める。確定回答、選択、停止時に保存し、入力中は2秒おきにも保存。OS強制終了の直前最大約2秒の未保存時間/操作は失われる可能性がある。再起動は保存された問題・並び・背景を明示停止状態で復元する。問題データ更新時は同じ10問の本文を照合し、不一致なら続行を止め、途中終了を可能にする。

保存失敗は既存データを保持して再試行を案内。保存容量不足・不正JSON・未知version・競合で空データに置換しない。端末時計変更に対する不正対策はクライアントPWAのみでは保証しない。

## 教材の要確認ID（原データは変更なし）

- `10-01`, `10-02`, `10-03`, `10-06`, `10-07`: 数量は文法だけでは限定できず、特にmany/several等は別候補も成立する。事実/文脈による限定が必要。
- `11-01`〜`11-10`: This/That、These/Thoseを距離・指示対象の文脈だけでは区別できない。
- `39-04`: `that` / `if`は意味・文脈によって成立し得る。
- `33-07`, `33-08`: must not / should not / cannotは強さ・意味を変えると禁止/注意の英文として成立し得る。

UIは和訳に合う原文を作る方針を案内し、指定正答と原文タイル順で判定する。他の並びを一律に「英語として非文」と説明しない。上記は完全な400問意味校正を保証する一覧ではない。元の`question_review_candidates`は51問の修正より前の候補を含むため、修正済み語形を再変更していない。

## 確認と残り

`npm run test:play`、既存`npm test`、`test:collection`、`test:inventory`、`test:shop`。3難易度の10問、正誤/取消、日次境界・日跨ぎ・中断、報酬一意性、全journal失敗点、既存データ不変を確認。既存全画面の回帰とTOP往復画像一致、最大14タイル、長いNo.28、844×390/667×375と模擬セーフエリアを確認する。画像比較は`qa/play-browser/index.html`。

iPhone Safari/PWAの実機操作・描画は未検証。本格リザルト/Mission/新しい配布やスタミナ消費は未実装（今回範囲外）。

## 公開

`npm run build:pages`が正式版（開発配布OFF）を生成する。mainへpushすると既存GitHub Actionsがbuild/deployする。GitHub Pagesは既存のActions設定を継続し、追加の設定操作は不要。ユーザーのlocalStorageを消す必要はない。
