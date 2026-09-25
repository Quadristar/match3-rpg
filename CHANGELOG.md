# CHANGELOG

このゲーム(match3-rpg)の変更履歴です。
雛形 alcyon-game-template の履歴は、雛形のリポジトリの `CHANGELOG.md` を参照してください。
雛形から変更を取り込んだときは、取り込んだ雛形のバージョンもここに記録します。

形式: 新しい変更を上に追記する。区分は「追加」「変更」「修正」「削除」。

## [Unreleased] — Phase 4a: バトルロジック

### 追加

- `src/data/`(すべて仮仕様)
  - `characters.ts`: 味方1人(HP 100・攻撃力 10・防御 0)
  - `enemies.ts`: 敵1体(HP 300・攻撃力 20・防御 0・3ターンごとに攻撃・経験値 50)
  - `stages.ts`: 戦う敵と味方の編成
  - `tileEffects.ts`: パネル → 行動 の変換規則(今は全種類が攻撃。属性型・行動型に差し替えられる形)
  - `battleRules.ts`: 段の倍率の増え幅(0.25)・最低ダメージ(1)
- `src/systems/battle/`: バトルロジック(Pixi・GSAP に依存しない純粋な TypeScript)
  - `AttackResolver.ts`: MoveResult → 行動(段ごとの内訳付き)
  - `DamageCalculator.ts`: 段の倍率・防御・切り捨て・最低値・修飾子(バフ・デバフ)
  - `BattleState.ts`: 戦闘の状態の作成と行動の適用(出来事を返す)
  - `EnemyAI.ts`: 規定ターンごとの攻撃と、次の攻撃までの残りターン数
  - `TurnFlow.ts`: ターンの進行(状態機械)と勝敗の判定
- テスト: データの整合性、ダメージ計算、パネル → 行動、ターンの進行・敵の攻撃の間隔・勝敗、ランダムな操作での戦闘

### 変更

- `CLAUDE.md`: 現在のフェーズを Phase 4a に更新
- `docs/GAME_DESIGN.md`: ディレクトリ構成、Phase 4a で決めたこと、§9 のダメージの書き方(段ごとの倍率)

## [Unreleased] — ライセンス表記と favicon

### 追加

- ビルドの成果物にライセンス一覧 `licenses.txt` を含める(`vite.config.ts` の `build.license`。**共通基盤の変更**)
- 仮の favicon(`public/favicon.svg`)。`index.html` から参照する(favicon がなく 404 になっていたのを解消)

### 変更

- `vite.config.ts`: ライブラリの著作権表記のコメントを、圧縮後も残す(`build.rolldownOptions.output.comments.legal`。**共通基盤の変更**)。GSAP の著作権表記がビルド後に消えていたため
- `docs/decisions/002-adopt-gsap.md`・`README.md`: 著作権表記とライセンス一覧の扱いを追記

## [Unreleased] — Phase 3b: パズル表示

### 追加

- 依存ライブラリ: **GSAP 3.15**(`presentation/` でのみ使う。`docs/decisions/002-adopt-gsap.md`)
- `src/core/ObjectPool.ts`: オブジェクトプール(**共通基盤への追加**)とテスト
- `src/presentation/debug/LayoutRegionsOverlay.ts`: レイアウトの領域の枠と名前の表示(**共通基盤への追加**)
- `src/presentation/views/board/`: 盤面の表示
  - `BoardView.ts`: 盤面の描画と再生(GSAP のタイムライン)。全体の速さの変更・即座の完了・ObjectPool での再利用
  - `TileView.ts`: パネルの表示(仮: 色付きの図形)
  - `BoardGeometry.ts`: マスと論理座標の変換(Pixi 非依存)
  - `BoardInputController.ts`: ドラッグ・2回タップを入れ替えの意図に変換(Pixi 非依存)
  - `playbackPlan.ts`: MoveResult を再生の手順に変換(Pixi・GSAP 非依存)
  - `boardViewConfig.ts`: 再生の時間・全体の速さ・ドラッグのしきい値・見た目(仮仕様)
- `src/presentation/scenes/battle/`: BattleScene(盤面・連鎖の段数の表示・仮の「タイトルへ」ボタン)
- `src/presentation/game/urlOptions.ts`: `?seed=数値` で盤面のシードを固定
- テスト: ObjectPool・gameLayout・urlOptions・BoardGeometry・BoardInputController・playbackPlan
- `docs/decisions/002-adopt-gsap.md`

### 変更

- `gameLayout.ts`: 領域 `board` / `enemy` / `portrait` / `info` と基準点 `boardCenter` / `comboText` / `backButton` を追加(仮仕様)
- `TitleScene`: 「タップしてはじめる」を表示し、タップでバトル画面へ移る
- `sceneKeys.ts`: `battle` を追加
- `CLAUDE.md`: 技術に GSAP を追加、現在のフェーズを Phase 3b に更新
- `docs/GAME_DESIGN.md`・`README.md`: 操作・表示と再生・`?seed` を追記

## [Unreleased] — Phase 3a: パズルロジック

### 追加

- `src/data/puzzleConfig.ts`: パズルの設定値(仮仕様: 7×7・5種・連鎖の上限 100 段・生成のやり直し 100 回・並べ替えのやり直し 50 回)
- `src/systems/puzzle/`: パズルロジック(Pixi に依存しない純粋な TypeScript)
  - `types.ts`: `Tile`(`{ kind, modifiers }`。modifiers は今は常に空)・`BoardState`・`MatchGroup`・`CascadeStep`・`MoveResult` など
  - `Board.ts`: 盤面の補助(生成・参照・隣接判定・入れ替え)
  - `MatchFinder.ts`: 縦・横 3 個以上のマッチ判定。マスを共有する縦と横は1つにまとめ、形状(line3 / line4 / line5 / L / T)を判別
  - `MoveValidator.ts`: 入れ替えの判定(盤面の外・隣でない・揃わない)
  - `DeadlockChecker.ts`: 動かせる手の検索 `findMoves`(ヒント機能にも使える)と `hasMove`
  - `Gravity.ts` / `Refill.ts` / `CascadeResolver.ts`: 消去・落下・補充・連鎖。1段ごとに記録し、上限を超えたら `CascadeLimitError`
  - `BoardGenerator.ts`: 揃っている箇所がなく手が1つ以上ある盤面の生成
  - `Reshuffle.ts`: 詰んだ盤面の並べ替え
  - `resolveMove.ts`: 入口 `resolveMove(board, a, b, rng)` と `nextBoard(result)`
  - `puzzleConfigCheck.ts`: 設定値の検査
- テスト: `tests/systems/puzzle/`(盤面を文字で書く補助 `boardText.ts`、MoveResult だけで盤面を再生する `replay.ts` を含む)
- `docs/decisions/001-puzzle-swap-input.md`: パネルの入れ替え操作の決定(速さを問わないドラッグ方式＋2回タップ。実装は Phase 3b)

### 変更

- `CLAUDE.md`: 現在のフェーズを Phase 3a に更新
- `docs/GAME_DESIGN.md`: ディレクトリ構成と MoveResult の型を実装に合わせて更新

## [0.1.0] - 2026-09-24 — 開発準備

雛形 alcyon-game-template **v1.0.0** から作成し、`docs/NEW_GAME.md` の手順でゲーム開発を始められる状態にした。

### 追加

- `src/presentation/game/`: Game.start に渡す設定一式(`sceneKeys` / `gameLayout` / `gameAssets` / `gameSave` / `index`)。内容は `docs/NEW_GAME.md` の「最小の形」のまま
- `src/presentation/scenes/title/`: 仮のタイトル画面(`TitleScene`・`titleStyle`)。「(仮)タイトル」を中央に表示するだけ。main 領域の幅に収まらない場合は縮小する
- `docs/GAME_DESIGN.md`: ゲーム固有の設計(リポジトリ直下の `GAME_DESIGN.md` から移動)

### 変更

- `gameId` を `match3-rpg` に、`package.json` の `name` を `match3-rpg`・`version` を `0.1.0` に変更(`package-lock.json` も追従)
- `index.html` の `<title>` を `match3-rpg` に変更
- `src/main.ts`: デモの代わりに `presentation/game` の設定で起動する
- `CLAUDE.md`: 雛形の最新版を土台に、ゲーム固有のルール(リポジトリの説明・雛形との関係・パズルとバトルの絶対ルール・作業報告の項目・権限エラーのルール・現在のフェーズ)を統合
- `README.md`: ゲーム用に書き換え、雛形のバージョン(v1.0.0)を記録
- `docs/GAME_DESIGN.md`: ディレクトリ構成を雛形の最小の形(`presentation/game/`・`scenes/<シーン名>/`)に合わせ、リポジトリ名・ゲーム ID を「決定: match3-rpg」に更新
- `CHANGELOG.md`: 雛形の履歴を消し、ゲームの履歴として書き始めた

### 削除

- `src/presentation/scenes/demo/` と `public/assets/demo/`(雛形のデモ)
- `CLAUDE.game.md`(`CLAUDE.md` に統合)
