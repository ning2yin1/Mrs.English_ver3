# 既存アプリ接続・保存・終了データ

公開中リポジトリは未調査。以下の名称は概念モデルであり、新しいlocalStorageキーの設置指示ではない。既存のカード所持・装備・コイン・取引更新関数を調べて拡張する。同じカード情報やコイン残高を別ストアに複製して二重管理しない。

## 必要な参照

- 装備3枠→カード個体ID→カード種類/画像/フレーム/レベル/能力/スキル。
- デッキ総合力：Inventoryで表示する関数と同じ値。再計算式を勝手に作らない。
- 読取専用の開始時snapshot：個体ID、種類ID、level、power、resolvedSkill、総合力、効果仕様version。
- ステージ中の装備/強化変更は当該snapshotへ反映しない。保存のカード本体をsnapshotで上書きしない。

## StageSession（既存保存モデルの拡張案）

stageId、一意なquestionIds[10]、categoryId、difficulty、datasetHash、backgroundId、deckSnapshot、状態(input/feedback/paused/quitConfirm/completed/aborted)、questionIndex、各問のタイルシャッフル順/選択tileIds/またはEASY選択、elapsedActiveMs、answers、combo、maxCombo、supportChargesRemaining、未丸めの累計点と内訳、createdAt/updatedAt。
再開時は抽選済み順序を使う。datasetHashが合わない場合は途中の問題データの同一性を確認し、読めないセッションは安全に中断として扱う（新しい10問で結果だけ継続しない）。既存残高と所持カードは保持。

## StageResult（次工程のリザルト/ミッション用）

stageId / categoryId / difficulty / datasetHash / startedAt / completedAt / rewardDateKey / backgroundId。
questionResults[10] = questionId, correct, elapsedActiveMs, basePointsRaw, speedPointsRaw, comboPointsRaw, comboAfter, supportConsumed, resolvedSkillSnapshot, awardedQuestionPointsRaw。
correctCount / wrongCount / maxCombo / totalActiveMs / questionScoreRaw / deckPowerSnapshot / cardBonusRaw / finalScoreInteger / rewardBase / dailyMultiplier / rewardCoins / completionStatus / settlementId。
最高スコアはcategoryId+difficultyで分離。ミッションは将来stageIdで一度だけ取り込めるようイベントを重複排除。現時点で達成条件・報酬・ランクS/A/B等は追加しない。

## 一度だけの精算

10問目の採点を保存しNEXT時に完了精算。途中で落ちても再起動で同じstageIdに戻し、二重採点を防ぐ。
精算前に最新の既存残高を読む。開始時残高へ上書きしない。現在の日付・日次完了数を読み、倍率を確定。stageIdの精算済み記録があれば同じ結果を返し追加加算しない。
以下を単一の永続化トランザクションで保存：最新コイン残高+報酬、StageResult、stageIdの精算済み印、日次完了数+1、既存最高スコアの必要な更新、session=completed。保存成功後のみUIを完了扱いにする。途中終了はabortedのみ保存して付与なし。

既存がIndexedDBなら同一DBトランザクションを使う。localStorageなら既存のひとつのルート保存JSONを読み取り、未知フィールドを残して一度のsetItemで置換できるか確認。複数キーへの連続setItemは原子的でない。localStorageにトランザクションがあるとは説明しない。既存方式が複数キーなら、既存の復旧可能なjournal方式を使うか、移行の具体案を報告してから適用。破壊的な全消去・初期化は禁止。

## 排他・復旧

決定/NEXT/STARTを同期的にロックし、同じstageId+questionIdの採点を一度だけ反映。二重タップをdisabledの見た目だけに依存しない。
複数タブ/PWAとブラウザが同時に動く場合のstageId精算競合を検出。既存の排他/保存revisionを優先。IDBの同一取引か共有ロック＋revision照合で再読込し、last-write-winsでコインを消さない。Safari対応の既存方式がなければ競合時は別タブ側プレイを止める仕様を明示。
保存失敗/容量不足は未精算のまま「保存できませんでした。再試行」を表示。成功していないのにREADYへ遷移して結果を破棄しない。保存後に画面描画前クラッシュしてもstageId印から復元し、再加算しない。
pause/回答確定/各タイル変更はsession保存対象（頻繁な操作は短くデバウンス可、pagehideでflushを試みる）。OS強制終了で直前操作が保存されない可能性はあるので、少なくとも最後に確定保存された回答時点へ戻す。同じ問題を二度計上しない。
端末時計変更による日次報酬はクライアントPWAだけで厳密な不正防止はできない。今回はサーバー機能を追加せず、既存の日時方針を優先。

## 既存データの保全

TOP/Collection/Inventory/Shop/ガチャのCSSや素材を置換しない。レベル/個体ID/初回入手日/所持枚数/無料10枚受領済み/開発用配布履歴/コイン残高/購入履歴を保持。プレイ追加でカード配布処理を実行しない。スタミナ消費は依頼されていないため新たに設けない。
