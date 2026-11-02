# プレイ・READY・TOP改善

## 変更ファイル

- `src/play/view.js`, `src/play/style.css`: 「日本語のお題」を削除し、日本語本文をヘッダー直下へ。回答・単語バンクの余白を縮小。小さい横画面は単語バンク/回答内で必要な分だけスクロールし、ページ全体は固定。フィードバックの重複和訳を削除、英文と文法解説を維持。解説は不透明度80%の濃紺パネルで表示。
- `data/play/display_titles.json`, `src/play/controller.js`: 40文法の一覧用短縮名を追加読込。番号・学年・選択・正式名称・説明・問題本文はそのまま。右の詳細は正式名、一覧ボタンのtitle属性にも正式名を保持。
- `src/play/view.js`, `src/play/store.js`: 難易度ボタンに選択文法の各最高スコアを表示。未プレイは「—」、0点で完了した記録は「0」。既存`mrsEnglishV3.play.v1.records[文法ID:難易度]`を再利用。10問完了精算の確定最終スコアで更新し、過去の最高点を超えない結果ではbestScoreを変更しない。完了件数・各結果・報酬は従来どおり保存。中断は記録しない。
- `src/app.js`, `src/home-hud.js`, `src/inventory/store.js`: TOPの固定「9,979」を廃止。既存のwallet読取関数を公開し、共通保存バリアを通って`mrsEnglishV3.wallet.v1.rCoin`を取得。TOPへ戻る/再起動/別タブ更新/復帰時に再取得。文字は元のフォント・高さを使用し、桁数に応じた幅で右寄せ、縦横比を保持。背景・ステータス枠・他の文字/アイコン・下部ボタン配置は維持。
- Play専用touch-actionを調整。ボタンはmanipulation、スクロール部はpan-y pinch-zoom。二重タップの拡大を抑え、ピンチを禁止するviewport設定や全体touchイベントのpreventDefaultは追加しない。
- `tests/play-improvements.mjs`, `tests/play-store.mjs`: 修正項目と低い記録で最高点を上書きしないことを検証。
- `tests/home-hud.mjs`, `tests/inventory-browser.mjs`, `tests/play-browser.mjs`: 動的コイン表示に対応。育成/プレイで残高が変化する往復比較では通貨欄をマスクし、残りのデザイン一致と実残高は個別に検証。
- `package.json`: `npm run test:play-ui`を追加。`qa/play-improvements/`に実ブラウザー撮影と結果を保存。

## 保存互換性

新しい通貨/最高スコア保存キーは作成しない。既存の所持枚数・個体・レベル・編成・初回入手日・開発配布/無料受領/購入履歴を初期化しない。Rコインは従来のShop/育成/Playと同じキー。報酬計算・日次2倍・精算ID/journal・抽選・正誤判定・採点/コンボ/カード効果は維持。

## 確認

- HARD14タイルを844×390、667×375、左右47px/下21pxの模擬セーフエリアで撮影。全タイルがバンク内に入り、下部UIと重ならず、ページ全体のスクロールなし。実タッチの連続選択、取消、ダブルクリックで倍率が変化せず、全ての異なるタイルが選択できることを確認。
- 正解/不正解とも和訳1回、原英文と原解説は維持。不透明度80%のパネル、英文/解説/得点と下部UIの非重複を確認。最長英文32-04と最長解説11-01も確認。
- 一覧40短縮名、未プレイの「—」、難易度別・カテゴリ別の実記録、完了後更新、再起動維持、低い結果での最高点維持。
- 実際の完了APIによる報酬加算、TOP復帰/再起動後の残高一致、Shop1000R消費後の一致、別タブのwallet更新反映、既存カード・編成・育成・入手日・購入履歴保持。
- `npm test`, `npm run test:collection`, `npm run test:inventory`, `npm run test:shop`, `npm run test:play`, `npm run test:play-ui`, `npm run test:home`。

環境はタッチ対応Chromiumの横画面エミュレーション。iPhone Safariおよびホーム画面に追加したPWA実機でのダブルタップ・ピンチ動作は未検証。実機検証済みとは扱わない。ブラウザーのPWAオフライン再読込は従来テストで確認。
