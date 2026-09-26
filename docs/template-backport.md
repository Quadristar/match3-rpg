# 雛形への還元候補の一覧

これまでの作業報告で「雛形への還元候補」に挙げた項目の一覧です。
雛形リポジトリ `alcyon-game-template` での作業は、この一覧を渡して**別のセッションで**行います(このリポジトリでは雛形を変更しません)。

- 「ゲーム固有の部分」: 雛形にそのまま持ち込めない部分があるかどうか。ある場合は、還元のときに外す・一般化する内容を書いています
- 還元したら、その項目に「還元済み(雛形 vX.Y.Z)」と書き足してください
- 新しい候補が出たら、ここに追記します

## 一覧

| # | 項目 | 種類 | ゲーム固有の部分 | 出どころ |
|---|---|---|---|---|
| 1 | SceneManager: 失敗時に幕を外し、エラーを画面に表示する | バグ修正・機能 | なし | 今回(fix: SceneManager) |
| 2 | ObjectPool | 汎用機能 | なし | PR #3 |
| 3 | LayoutRegionsOverlay | 汎用機能(デバッグ) | 使う側(BattleScene)はゲーム固有 | PR #3 |
| 4 | GSAP の採用(decisions/002) | 決定・依存 | なし(採用するかは雛形の方針次第) | PR #3 |
| 5 | ビルドで著作権表記とライセンス一覧を残す | ビルド設定 | なし | PR #4 |
| 6 | favicon の置き場所と参照 | 雛形の構成 | 画像の中身はゲーム固有 | PR #4 |
| 7 | URL でシードを固定する仕組み(`?seed`) | 汎用機能 | 読み取りは汎用、使い道(盤面)はゲーム固有 | PR #3 |
| 8 | ESLint: 層の中のフォルダ同士の依存を禁止する仕組み | lint 設定 | 対象のフォルダ名(puzzle・battle・session)はゲーム固有 | PR #6 |
| 9 | ロジック同士の接続を systems に置く考え方(decisions/003) | 設計の指針 | 具体例(パズルとバトル)はゲーム固有 | PR #6 |
| 10 | 画面の切り替えを伴う変更で、行き来を確認するルール | 開発ルール | シーン名(タイトル ⇄ バトル)はゲーム固有 | PR #7・今回 |
| 11 | NEW_GAME.md のタイトル画面の例が型エラーになる | ドキュメントの修正 | なし | PR #1 |
| 12 | デモを削除した後に残る ESLint のデモ用ルール | ドキュメント・lint | なし | PR #1 |
| 13 | 縦画面でデバッグ表示が右上の角より少し下に出る | 不具合(未調査) | なし | PR #1 |

## 各項目の詳細

### 1. SceneManager: 失敗時に幕を外し、エラーを画面に表示する

- **関係するファイル**
  - `src/app/SceneManager.ts`(`guard`・`fail`・`failIfCurrent`、`update`・`resize` で enter 済みのシーンだけを扱う)
  - `src/app/MountedScene.ts`(`dispose` の各段階を個別に try/catch する。`entered` を追加)
  - `src/app/sceneManagerTypes.ts`(`onError` の説明)
  - `src/app/errorReport.ts`(表示する文面。?debug なら詳しく、なければ短い案内)
  - `src/app/globalErrorHandlers.ts`(window の error・unhandledrejection)
  - `src/app/ErrorPanel.ts`(画面下部に DOM で重ねるパネル。「再読み込み」「閉じる」)
  - `src/app/Game.ts`(ErrorPanel の生成と登録。`onError` で ticker を止めて画面を差し替えるのをやめた)
  - `src/app/gameConfig.ts`(`errors.stackLines`)
  - `index.html`(`.error-panel` の CSS)
  - テスト: `tests/app/SceneManager.test.ts`(「失敗したとき」)、`tests/app/errorReport.test.ts`、`tests/app/globalErrorHandlers.test.ts`
- **変更の要点**
  - 雛形の不具合: `MountedScene.dispose` の `finally`(入力の解除・表示物の破棄)で例外が起きると、`swap()` の外へ抜けて ticker が止まり、暗転したまま操作できなくなる。エラーも画面に出ない
  - 生成・読み込み・enter・配置で失敗したら、切り替えを打ち切り、読み込み中表示と暗転用の幕を外し、入力の一時停止を解除してから `onError` を呼ぶ。保留中の要求は捨てる(仮仕様)
  - exit・破棄の失敗は `onError` に渡し、残りの破棄と切り替えを続ける
  - enter が完了していないシーンには `update`・`resize` を呼ばない
  - 読み込みや enter を待つ間に破棄された場合の失敗は、状態を変えずに通知だけする
  - 起動後のエラーは画面を差し替えず、キャンバスの上にパネルを重ねる(起動時の失敗は従来どおり `showBootError`)
- **ゲーム固有の部分**: なし。パネルの文面・色は仮仕様なので、雛形でも「仮」として扱うとよい

### 2. ObjectPool

- **関係するファイル**: `src/core/ObjectPool.ts`、`tests/core/ObjectPool.test.ts`
- **変更の要点**: 生成・初期化・破棄の関数を受け取る汎用のオブジェクトプール(盤面のパネルの表示物の使い回しに使用)
- **ゲーム固有の部分**: なし(使う側の `TileView`・`BoardView` はゲーム固有で、還元しない)

### 3. LayoutRegionsOverlay

- **関係するファイル**: `src/presentation/debug/LayoutRegionsOverlay.ts`
- **変更の要点**: レイアウト定義の領域を枠と名前で表示する(?debug のときの確認用)。デモを削除した後も、レイアウトを確認する手段として使える
- **ゲーム固有の部分**: 本体はなし。表示するかの判断と追加の場所(`BattleScene`)はゲーム固有。雛形では NEW_GAME.md かタイトル画面の例で使い方を示すとよい

### 4. GSAP の採用

- **関係するファイル**: `docs/decisions/002-adopt-gsap.md`、`package.json`、`CLAUDE.md`(GSAP は presentation でのみ使う)
- **変更の要点**: ライセンスの確認結果(著作権表記の削除の禁止など)と、presentation 層だけで使うという制限
- **ゲーム固有の部分**: なし。ただし依存の追加になるため、雛形に標準で入れるか、「導入する場合の手順」として載せるかを雛形側で判断する

### 5. ビルドで著作権表記とライセンス一覧を残す

- **関係するファイル**: `vite.config.ts`、`docs/decisions/002-adopt-gsap.md`、`README.md`
- **変更の要点**
  - `build.rolldownOptions.output.comments.legal: true` … 圧縮後もライブラリの著作権表記(`/*! … */`・`@license`)を残す
  - `build.license: { fileName: 'licenses.txt' }` … ライセンス一覧を成果物に含める
  - 既定の出力先 `.vite/license.md` は、先頭がドットのフォルダのため GitHub Pages に公開されない可能性がある。`.txt` にするのは、スマホのブラウザで文字として表示させるため
- **ゲーム固有の部分**: なし(Pixi の依存にも同じ問題があるため、GSAP を使わないゲームにも役立つ)

### 6. favicon の置き場所と参照

- **関係するファイル**: `public/favicon.svg`、`index.html`(`<link rel="icon">`)
- **変更の要点**: favicon がないとブラウザが 404 を出す。置き場所と参照を雛形に用意しておく
- **ゲーム固有の部分**: 画像の中身(各ゲームで差し替える)。iPhone のホーム画面用アイコン(apple-touch-icon)は未対応

### 7. URL でシードを固定する仕組み

- **関係するファイル**: `src/presentation/game/urlOptions.ts`、`tests/presentation/game/urlOptions.test.ts`
- **変更の要点**: `?seed=数値` で乱数のシードを固定し、不具合を再現できるようにする(0 以上 2^32 未満の整数だけを受け付ける)
- **ゲーム固有の部分**: 読み取りは汎用。今はゲーム用の `presentation/game/` にあり、`?debug` がなくても有効(仮仕様)。雛形では `debugOptions` の仲間として一般化する案がある

### 8. ESLint: 層の中のフォルダ同士の依存を禁止する仕組み

- **関係するファイル**: `eslint.config.js`(`layerPatterns`・`systemsFolderRule`・`forbidSystemsFolder`)、`tests/eslint/dependencyRules.test.ts`
- **変更の要点**: 層の禁止パターンを関数にまとめ、同じ層の中のフォルダ同士(例: `systems/puzzle` と `systems/battle`)の import を禁止するルールを作れるようにした
- **ゲーム固有の部分**: 対象のフォルダ名(puzzle・battle・session)。雛形では仕組みだけを入れ、フォルダ名はゲーム側で設定する形にする

### 9. ロジック同士の接続を systems に置く考え方

- **関係するファイル**: `docs/decisions/003-battle-session-in-systems.md`、`CLAUDE.md` §4
- **変更の要点**: presentation から app を import できないため、ロジック同士の接続(パズル → バトル)を app ではなく `systems/` の中の接続用フォルダに置く。雛形の ARCHITECTURE に指針として載せると、ほかのゲームで同じところで迷わずに済む
- **ゲーム固有の部分**: 具体例(BattleSession・パズルとバトル)。雛形では一般的な書き方にする

### 10. 画面の切り替えを伴う変更で、行き来を確認するルール

- **関係するファイル**: `CLAUDE.md` §7「画面の切り替えを伴う変更の確認」
- **変更の要点**: 画面の切り替えを伴う変更では、ヘッドレスブラウザでシーンの行き来を必ず確認する(単体テストでは、破棄の順番などによる不具合を見逃したため。PR #7)
- **ゲーム固有の部分**: シーン名(タイトル ⇄ バトル)。雛形では「最初のシーン ⇄ ほかのシーン」のように書く

### 11. NEW_GAME.md のタイトル画面の例が型エラーになる

- **関係するファイル**: 雛形の `docs/NEW_GAME.md`(このリポジトリでは `src/presentation/scenes/title/TitleScene.ts` で回避)
- **変更の要点**: 例のように `context` を受け取って使わないと、型チェックで TS6138 になる。例を `context` を受け取らない形にするか、使う形にする
- **ゲーム固有の部分**: なし

### 12. デモを削除した後に残る ESLint のデモ用ルール

- **関係するファイル**: `eslint.config.js`(`FORBID_DEMO`)、`tests/eslint/dependencyRules.test.ts`
- **変更の要点**: デモを削除した後も、デモへの import を禁止するルールとそのテストが残る。害はないが、NEW_GAME.md で扱い(残す・消す)を案内するとよい
- **ゲーム固有の部分**: なし

### 13. 縦画面でデバッグ表示が右上の角より少し下に出る

- **関係するファイル**: `src/presentation/debug/DebugOverlay.ts`(未調査)
- **変更の要点**: 縦画面で、デバッグ表示が右上の角ではなく少し下に出る。原因は調べていない(セーフエリアの扱いの可能性)
- **ゲーム固有の部分**: なし
