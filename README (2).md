# Mrs. English Ver.3 — MISSION制作キット

承認済み1536×710の3画面を再現するための素材と実装準備資料です。アプリ本体、画面制御JavaScript、GitHub変更、デプロイは含みません。

## Codexへ渡す手順

1. このフォルダを既存リポジトリの資料置き場へ追加する。
2. `CODEX_INSTRUCTIONS.md`を最初に読むよう依頼する。
3. 既存コードと共通素材を調査後、同じ素材があれば既存パスを利用する。新規フォルダを丸ごと本番へ複製する必要はない。
4. `references/`は見た目の比較専用。実行時の背景やクリックマップにしない。
5. `styles/mission.css`は独立した見た目のレシピ。既存コンポーネント方式に合わせてクラス・URL・単位の接続を調整する。

## 収録

- `references/`：承認済みJPEG3枚、原本のバイトを維持。
- `assets/mission/`：既存画像8点を無加工で再収録、新規チェックSVG1点。
- `styles/mission.css`：行・タブ・バー・通知・縮小時の一覧スクロール。
- `docs/LAYOUT_SPEC.md`：位置、寸法、DOMクラスの対応、セーフエリア。
- `docs/MISSION_SPEC.md`：達成判定、更新時刻、保存、二重付与防止。
- `docs/MISSION_DATA.md` / `mission_definitions.json`：確定12件、データ定義。
- `docs/NOTIFICATION_SPEC.md`：全画面共通通知とキュー。
- `docs/DIAMOND_SPEC.md`：通貨交換とS/R強化条件。
- `docs/ASSET_MANIFEST.md` / `asset_sources.json`：素材用途・元ファイル・ハッシュ。
- `docs/IMPLEMENTATION_CHECKLIST.md`：Codex実装後の確認。
- `docs/DELIVERY_VALIDATION.md`：本制作キットの納品検証結果。

## 再利用が必要なもの

既存のTOP写真22枚、TOP/各画面ヘッダー、Menu、ナビゲーション、フォント、通貨・カード管理・保存・強化処理を優先します。人物写真は参照JPEG内にのみ存在し、実行素材として切り出していません。通貨アイコン等は元の共通画像と同一です。

## 未確定事項

ダイヤ交換の入口・配置・確認UIは今回の画像にありません。新画面を創作せず、Shop等での接続候補をCodexが確認し、必要なら配置だけ別途確認してください。ログインボーナスの具体的な付与量・日次仕様は本依頼で未定義のため変更しません。既存API・保存先・サーバー時刻の有無は未調査です。実装済みと推定しないでください。
