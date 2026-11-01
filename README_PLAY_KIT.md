# Mrs. English Ver.3 — READY / English Play 制作キット

素材と実装指示書のみ。アプリ実装・GitHub操作・デプロイは行っていません。

## 最初に読む順番

1. `docs/play/00_findings.md`：添付資料の差分、未確認事項、採用する暫定判断。
2. `docs/play/08_codex_instructions.md`：Codexにそのまま渡す作業指示。
3. `docs/play/01_layout.md` と `specs/play/layouts.json`：画面配置と数値。
4. `docs/play/02_screens_and_flow.md`：画面、回答、停止、終了の仕様。
5. `docs/play/03_scoring_and_skills.md` と `specs/play/scoring_config.json`：採点・報酬。
6. `docs/play/04_data_validation.md`：400問の検証結果。修正は未適用。
7. `docs/play/05_save_and_integration.md`：既存データ接続と二重付与防止。
8. `docs/play/06_css_and_animation.md`、`07_assets.md`、`09_checklist.md`。

## フォルダ

- `assets/play/backgrounds/`：以前添付されたbackgrounds.zipのbg-01〜22をバイト一致で収録。TOP.jpgは22枚に含めない。
- `assets/play/decor/`：承認済み画像で使った原寸透過装飾2点。人物・カードは含まない。
- `data/play/source/`：今回添付のJSON、元README、元検証結果を無変更で収録。
- `specs/play/`：座標、外部素材参照、写真一覧、採点パラメータ、照合用計算例。
- `styles/play/`：CSS表現の参考資料。実装アプリではなく、配置・状態・演出の例。
- `references/play/`：今回の承認済みモックアップ6枚。実装の背景には使用禁止。
- `previews/play/`：今回の仕様差分を反映した組み合わせ確認画像。アプリではない。
- `docs/play/`：日本語仕様書と検証結果。
- `file_manifest.csv`：全ファイルの用途・サイズ・SHA-256。

## 原本と新仕様

承認済み画像は改変せずreferencesに保存。READYの36/360、EASYの3択、スキル+8%、+1,200は旧表示例。新仕様は40/400をデータから表示、EASYは4択、採点・スキルは今回の依頼を基準にする。配色・装飾・写真・カードは変えない。

既存共通画像・カード・フォントは原則再収録しない。`existing_asset_bindings.json`は過去制作キットに存在したパスとハッシュを示すもので、公開中リポジトリのパス確認結果ではない。Codexは既存資産を検索し参照先を結び直す。無断の既存ファイル上書きは禁止。

このZIPには余分な親フォルダを入れていない。既存レポジトリのルートに追加できる構成。ただし同名ファイルが既にある場合は内容を比較してから追加し、上書きしない。
