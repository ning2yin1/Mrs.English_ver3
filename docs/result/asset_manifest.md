# 素材一覧

PNGは透過。SVGは背景矩形を持たず透過。フォント・写真・カード実画像は既存素材を参照し同梱しない。ボタンの文字・数値は一切焼き込んでいない。5評価のみ特殊文字装飾PNG（user許容の例外）。PERFECTは承認時の原画像、他4種は同じスタイルから追加制作。

|ファイル|原寸/視野|用途・表示配置|
|---|---|---|
|`assets/result/fx/halo_cyan.svg`|0 0 1024 512|スコア背後の発光。中心768/354、1024×512程度。色に応じ1枚を選ぶ。通常画面は減衰。|
|`assets/result/fx/halo_gold.svg`|0 0 1024 512|スコア背後の発光。中心768/354、1024×512程度。色に応じ1枚を選ぶ。通常画面は減衰。|
|`assets/result/fx/halo_silver.svg`|0 0 1024 512|スコア背後の発光。中心768/354、1024×512程度。色に応じ1枚を選ぶ。通常画面は減衰。|
|`assets/result/fx/particles.svg`|0 0 1024 512|確定スコア周囲1024×512。文字より下。強度を評価別に減らす。|
|`assets/result/fx/shockwave.svg`|0 0 1024 512|確定瞬間の光輪。中心768/354、1024×512、scale.8→1.35、opacity減衰。低評価は省略。|
|`assets/result/fx/star.svg`|0 0 64 64|星の独立粒子。16〜48px、スコア外周。過剰に複製しない。|
|`assets/result/ranks/rank_excellent.png`|2172×724|評価固定装飾。通常130/118/550/130、演出430/171/676/149にcontain。余白込み・縦横比固定。DOMにも同じ評価名。|
|`assets/result/ranks/rank_good.png`|2172×724|評価固定装飾。通常130/118/550/130、演出430/171/676/149にcontain。余白込み・縦横比固定。DOMにも同じ評価名。|
|`assets/result/ranks/rank_great.png`|2172×724|評価固定装飾。通常130/118/550/130、演出430/171/676/149にcontain。余白込み・縦横比固定。DOMにも同じ評価名。|
|`assets/result/ranks/rank_nice_try.png`|2172×724|評価固定装飾。通常130/118/550/130、演出430/171/676/149にcontain。余白込み・縦横比固定。DOMにも同じ評価名。|
|`assets/result/ranks/rank_perfect.png`|2172×724|評価固定装飾。通常130/118/550/130、演出430/171/676/149にcontain。余白込み・縦横比固定。DOMにも同じ評価名。|
|`assets/result/reused/arrow.png`|29×47|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|
|`assets/result/reused/button_blue.png`|344×111|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|
|`assets/result/reused/button_purple.png`|290×83|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|
|`assets/result/reused/coin.png`|53×49|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|
|`assets/result/reused/header.png`|1661×84|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|
|`assets/result/reused/panel.png`|1653×542|既存共通画像の無変更コピー。表示位置と9-sliceはdesign_spec/reuse_bindings参照。既存同一画像を優先。|

## 既存素材

reusedは新規生成ではなく既存制作キットのバイト一致コピー。過去キットの相対パス・ハッシュ・9-sliceはreuse_bindings.json。公開リポジトリのパスは未確認。既存ファイルが同一なら今回のコピーの配備は省略し参照を結び直す。異なる素材を独断で上書きしない。コインは承認画像で文字表示が主なので、アイコンは必要な場合のみ既存coin.pngを使う。

## 評価対応

10→rank_perfect.png（金） / 9→rank_excellent.png（銀紫） / 7〜8→rank_great.png（シアン） / 5〜6→rank_good.png（青銀） / 0〜4→rank_nice_try.png（淡紫銀）。png内の常時輝きに加えて動くFXの量で評価差を作る。GOODは追加FX25%、NICE TRYは追加衝撃波なし。ランク名を別の点数計算用データにしない。

背景の写真や数値を抜き取って再利用する必要はない。画面装飾は既存パネルと独立FXで再現。大きい透過PNGを9-sliceしてランク文字を横伸ばししない。
