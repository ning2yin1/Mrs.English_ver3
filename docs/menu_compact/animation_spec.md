# 開閉・操作仕様

状態はclosed→opening→open→closing→closed。見た目はdata-stateとCSSで制御し、連打時は最新の開閉要求へ収束させる。

- Menuタップで開く。同じボタンを再タップで閉じる。
- 外側タップで閉じる。Menuとパネル内部を外側判定から除外。
- 各項目を選択すると閉じる。**ログインボーナスも閉じるが、遷移/報酬/保存変更は行わない。**
- 設定/遊び方は一度だけ既存の対応画面へ。未実装なら閉じるだけとして安全な未接続ハンドラーを用意し、接続点を報告。新画面の独断追加はしない。

開く：180ms、opacity0→1、translateY(-4px)→0、ease。閉じる：180ms、opacity1→0のみ。強い発光・拡大・効果音なし。押下は使用可能行の背景だけ白6%程度を控えめに重ねる。未実装行は暗い色を維持。CSSの初期クローズtransformへ戻す前にopacityが0であることを確認する。

開く直前にhiddenを外し、次の描画でdata-state=open。閉じ始めはdata-state=closingでtransform位置を維持し、pointer-events:none。180ms後にhiddenを付ける。途中で再び開く場合は閉じ完了処理をキャンセルし、古い完了通知で新しいopenを隠さない。transitionendだけに依存せず、最終状態へ到達する処理を持つ。reduced-motionは移動なし・瞬時切替（CSS収録）。

外側タップで背後のReady/Shop等まで同時発動させない。透明な外側クリック捕捉領域を使うならMenuより下、その他TOP操作より上に置く。捕捉領域は暗幕にしない。パネル内のタップを外側ハンドラーへ流さない。スクロールを行選択と誤認しない。ルート退出/破棄時にリスナー/タイマー/捕捉領域を解除する。

HTMLは標準buttonを使い、Menuにaria-expanded/aria-controls、ログイン行にaria-disabled=trueを付けてクリックをガードする。disabled属性でイベントが届かなくなると「選択すると閉じる」を満たせないので、aria-disabledと処理ガードを組み合わせる。Tab/Enter/Space、Escapeで閉じてMenuへフォーカス復帰。アイコンはaria-hidden。安易にrole=menuだけ付けず、nav/操作群として扱うか、menuとして必要なキー操作を全て揃える。
操作領域touch-action:manipulation。利用者のピンチズームを全面禁止しない。
