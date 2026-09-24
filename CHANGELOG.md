# CHANGELOG

このゲーム(match3-rpg)の変更履歴です。
雛形 alcyon-game-template の履歴は、雛形のリポジトリの `CHANGELOG.md` を参照してください。
雛形から変更を取り込んだときは、取り込んだ雛形のバージョンもここに記録します。

形式: 新しい変更を上に追記する。区分は「追加」「変更」「修正」「削除」。

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
