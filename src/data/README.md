# src/data/

## 役割

ゲームデータを**型付きの定数**として置く層です(キャラクター・アイテム・ステージ・台詞などの定義や、調整用の数値)。

このゲームでは、次のデータを置いています(詳細は `docs/GAME_DESIGN.md` §2・§5)。

- `puzzleConfig.ts`: 盤面の大きさ・パネルの種類数など
- `characters.ts` / `enemies.ts` / `stages.ts`: 味方・敵・ステージ(ID で参照し合う。整合性は `tests/data/` で検査する)
- `tileEffects.ts`: パネルが消えたときの効果(パネル → 行動 の変換規則)
- `battleRules.ts`: ダメージ計算の数値

## 依存ルール

- import してよいもの: `src/core/` のみ
- import してはいけないもの: `systems` / `services` / `presentation` / `app`、および外部ライブラリ(`pixi.js` / `gsap` / `howler` など)
- 違反は ESLint(`no-restricted-imports`)でエラーになります(`npm run lint`)

## 書き方の方針

- データは純粋な TypeScript の値と型で表す(描画オブジェクトや関数の副作用を含めない)
- アセットは、ファイルパスではなくマニフェストのキー(型付き定数)で参照する
- 詳細は `docs/ARCHITECTURE.md` の「レイヤー構造」を参照
