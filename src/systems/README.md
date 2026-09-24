# src/systems/

## 役割

**純粋なゲームロジック**を置く層です(ルール判定・計算・状態の更新など)。
描画・音声・入力・時刻に依存しないため、Vitest で画面なしにテストできます。

雛形では空です。雛形から作った各ゲームのリポジトリで実装します。

## 依存ルール

- import してよいもの: `src/core/`、`src/data/`
- import してはいけないもの: `services` / `presentation` / `app`、および外部ライブラリ(`pixi.js` / `gsap` / `howler` など)
- `Math.random()` と `Date.now()` は使わない
  - 乱数は `src/core/SeededRng` のインスタンスを**引数で受け取る**
  - 時刻や経過時間が必要な場合も引数で受け取る
- 上記の違反は ESLint(`no-restricted-imports` / `no-restricted-properties`)でエラーになります(`npm run lint`)

## テストの方針

- ロジックを追加・変更したら、`tests/systems/` に対応するテストを追加する
- シードを固定した `SeededRng` を渡し、同じ入力なら同じ結果になることを確認する
- 詳細は `docs/ARCHITECTURE.md` の「レイヤー構造」を参照
