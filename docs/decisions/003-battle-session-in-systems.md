# 003. パズルとバトルの接続を systems/session に置く

- 状態: 決定
- 日付: 2026-09-26
- 関連: `docs/GAME_DESIGN.md` §2・§4、`CLAUDE.md` §4、`eslint.config.js`

## 背景

当初の設計では、パズルとバトルの接続は `app/` の BattleDirector が行うことにしていた。
しかし、BattleDirector を使う BattleScene は `presentation/` にあり、依存ルールにより `presentation` から `app` は import できない。
BattleDirector を `app/` に置いたまま使うには、起動処理(`app/`)からシーンへ BattleDirector を渡す仕組み(依存性の注入)を新しく作る必要があった。

検討した案:

- 案A: BattleDirector を `app/` に置き、シーンの生成時に渡す → 依存性の注入の仕組みが増え、シーンの登録の仕方も変わる
- 案B: BattleDirector を `presentation/` に置く → ロジックの接続が描画の層に入り、画面なしでテストしにくい
- **案C(採用)**: 接続を `systems/session/` に置く

## 決定

- `src/systems/session/` に **BattleSession** を置く
  - 盤面の状態・バトルの状態・乱数を持つ
  - 入れ替え(a, b)を受け取り、`resolveMove` → `playTurn` を行い、`MoveResult` と `BattleEvent[]` をまとめて返す
  - 描画に依存しない純粋な処理とし、テストする
- **再生の順番(盤面の連鎖 → バトルの出来事)は BattleScene(presentation)が担当する**
- ESLint で次を強制する(違反がエラーになることは `tests/eslint/dependencyRules.test.ts` で確認する)
  - `systems/puzzle` から `systems/battle` を import しない
  - `systems/battle` から `systems/puzzle` を import しない
  - 両方を import してよいのは `systems/session` だけ(`puzzle`・`battle` から `session` も import しない)
- これにあわせ、バトルの入力を `MoveResult` から、バトル側で定めた「消えたパネル」(`ClearedTiles`)に変えた。`MoveResult` からの変換(`toClearedTiles`)は session が行う

## 理由

- `presentation` から `app` を import できないため
- 依存性の注入の仕組みを増やさないため(`presentation` は `systems` を import できるので、BattleScene が BattleSession を直接使える)
- パズルとバトルの接続も、画面なしでテストできる

## 影響

- `CLAUDE.md` §4 の「両者の接続は `app/` の BattleDirector だけが行う」を、「`systems/session` だけが行う」に改めた
- `docs/GAME_DESIGN.md` の BattleDirector を BattleSession に改めた
- `app/` にはゲーム固有の処理を置かないままにできる
