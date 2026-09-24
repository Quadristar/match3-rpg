# src/data/

## 役割

ゲームデータを**型付きの定数**として置く層です(キャラクター・アイテム・ステージ・台詞などの定義や、調整用の数値)。

雛形では空です。雛形から作った各ゲームのリポジトリで実装します。

## 依存ルール

- import してよいもの: `src/core/` のみ
- import してはいけないもの: `systems` / `services` / `presentation` / `app`、および外部ライブラリ(`pixi.js` / `gsap` / `howler` など)
- 違反は ESLint(`no-restricted-imports`)でエラーになります(`npm run lint`)

## 書き方の方針

- データは純粋な TypeScript の値と型で表す(描画オブジェクトや関数の副作用を含めない)
- アセットは、ファイルパスではなくマニフェストのキー(型付き定数)で参照する
- 詳細は `docs/ARCHITECTURE.md` の「レイヤー構造」を参照
