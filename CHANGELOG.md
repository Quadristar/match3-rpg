# CHANGELOG

この雛形の変更履歴です。雛形から作ったゲームのリポジトリは自動では更新されないため、
必要な変更をここから確認して各ゲームへ手動で取り込んでください。

形式: 新しい変更を上に追記する。区分は「追加」「変更」「修正」「削除」。

## [1.0.0] - 2026-09-24 — Phase 2 完了

Phase 2(共通基盤)の完了を区切りとして、バージョンを 1.0.0 とする。
雛形から作ったゲームは、README にこのバージョンを記録し、以降の変更をここから取り込む。

### 追加

- `docs/NEW_GAME.md`: 新しいゲームを始める手順
  - テンプレートから引き継がれない GitHub の設定(Pages の Source、main のブランチ保護ルール)のやり直し
  - `gameId`・`package.json` の `name`・`<title>` の変更
  - デモを削除し、最小の形(`src/presentation/game/` と最初のシーン)に置き換えるコード例
  - `CLAUDE.md` の差し替え・`docs/GAME_DESIGN.md` の追加・README への雛形のバージョンの記録

### 変更

- `package.json` の `version` を 1.0.0 に変更
- README・ARCHITECTURE の「新しいゲームを始める手順」を `docs/NEW_GAME.md` への案内に変更
- CLAUDE.md の現在のフェーズを「Phase 2 完了(v1.0.0)」に更新

## [0.5.0] - 2026-09-24 — Phase 2-4: 基本UI

### 追加

- `src/presentation/ui/`: 基本UI
  - `Button.ts`: 文字付きのボタン(押下中・無効の見た目)
  - `Panel.ts`: 角丸の板。背後への入力を遮る。`modal` で背後の操作を受け付けない。背後を暗くする `setBackdrop()`
  - `ProgressBar.ts`: 0〜1 の横棒
  - `uiTargets.ts`: 当たり判定の対象の型と、最も手前の対象を探す `findUITarget()`
  - `UIInputRouter.ts`: UI への入力の振り分け(押下・外に出たときの取り消し・離したときの実行、モーダル)
  - `uiStyle.ts`: 既定の見た目
- `InputManager.addPointerHandler()`: ジェスチャーの判定より先に指を受け取るポインタ処理。独占した指はゲーム側に渡さない
- `src/app/disablePixiEvents.ts`: Pixi のイベントシステムの DOM イベントを外す
- デモ: A に「設定パネル」ボタンと、モーダルの設定パネル(`DemoSettingsPanel.ts`。品質の切り替え・マスター音量)。デモのレイアウト定義に基準点 `button` を追加
- テスト: `tests/presentation/ui/uiInput.test.ts`(当たり判定・重なり・非表示・無効・モーダル・拡大縮小した親・押下の判定)、InputManager のポインタ処理、SceneManager でボタンのタップがゲーム側に渡らないこと

### 変更

- **Pixi のイベントシステムを無効にした**(`eventMode: 'none'`・`eventFeatures` をすべて false・DOM イベントを外す)。Pixi の `pointertap` などは使えない。UI は Button・Panel、それ以外の入力は `context.input` を使う
- `SceneInputScope` / `InputController`: `addPointerHandler` を追加。シーンごとに `UIInputRouter` を自動で登録する(`MountedScene`)
- `LoadingView`: 進捗バーを `ProgressBar` に置き換え

## [0.4.0] - 2026-09-23 — Phase 2-3: 入力・セーブ・設定

### 追加

- `src/services/input/`: 入力
  - `GestureRecognizer.ts`: タップ・ドラッグ・スワイプ(方向付き)の判定(DOM 非依存)。1本の指だけを扱い、2本目以降は無視
  - `InputManager.ts`: 判定結果を論理座標にして通知。一時停止(停止要求の数を数える)
  - `attachPointerInput.ts`: Pointer Events をつなぎ、スクロール・ズーム・長押しメニューを抑止
  - `inputTypes.ts`: 入力イベントの型としきい値の型
- `src/services/layout/computeLayout.ts`: `screenToLogical()`(画面座標 → 論理座標)
- `src/services/save/`: セーブ
  - `SaveManager.ts`: ゲーム ID の名前空間、バージョン移行と書き戻し、壊れたデータの退避(`キー.corrupt`)、保存できないときのメモリ上での継続と記録
  - `readSaveRecord.ts`: 保存形式の読み取りと移行(純粋な関数)
  - `storages.ts`: `MemoryStorage`・`FailingStorage`・`openBrowserStorage()`
  - `saveTypes.ts`: `SaveSchema`・`SaveStorage` などの型
- `src/services/settings/`: 設定(音量・ミュート・品質プリセット)。音量は 500ms まとめて保存、品質から描画解像度を決める `renderResolution()`
- `src/app/`: `createPersistence.ts`(SaveManager と Settings の用意、ページを閉じる前の保存)、`SceneInputScope.ts`(シーンごとの入力の登録を exit で解除)、`MountedScene.ts`(SceneManager から分割)
- デモ: `demoSave.ts`(タップ回数の保存)。A にスワイプの方向・開始位置・軌跡、A・B にタップ回数を表示
- デバッグ表示: 品質と描画解像度、保存の状態。URL パラメータ `quality` と `savefail`
- テスト: `tests/services/input/`・`tests/services/save/`・`tests/services/settings/`・`tests/app/SceneInputScope.test.ts`、SceneManager の入力関連

### 変更

- **`gameConfig.ts` に `gameId`(仮: `alcyon-template`)を追加。雛形から作ったゲームでは必ず変えること**。入力のしきい値・設定の初期値も追加
- `renderConfig.ts`: `maxResolution` を、品質プリセットごとの `quality`(高・中: 2、低: 1.5)に置き換え
- `Scene`: `SceneContext` に `input`・`save`・`settings` を追加。型引数にセーブデータの型 `D` を追加
- `SceneManager`: 切り替え中は入力を一時停止する。シーンの入力の登録と一時停止を exit で自動的に解除する
- `Game`: 起動時にセーブと設定を読み込み、品質から描画解像度を決める。品質の変更を実行中に反映する。`GameOptions` に `save`(ゲームのセーブデータの形式)を追加
- デモ: Pixi のイベント(pointertap)をやめ、InputManager で入力を受け取るように変更
- README: セーブデータの保存先(localStorage と容量の共有、`gameId`)を追記

## [0.3.0] - 2026-09-23 — Phase 2-2: アセット管理・デバッグ表示

### 追加

- `src/services/assets/`: アセット管理
  - `assetTypes.ts`: マニフェストの型(バンドル名 → キー → パス)と、型付きのバンドル名・キー
  - `AssetManager.ts`: バンドル単位の読み込みと進捗通知、参照カウントによる重複防止と解放(読み込み中の解放にも対応)、再試行、代わりの画像、失敗の記録、推定メモリ
  - `pixiTextureLoader.ts`: Pixi の `Assets` での画像の読み込み・破棄と、テクスチャのメモリ推定(縦×横×4)
  - `createFallbackTexture.ts`: 読み込めなかった画像の代わり(マゼンタと黒の市松模様)
  - `withSimulatedIssues.ts`: 読み込みの失敗・遅延をわざと起こす(`?debug&assetfail` / `assetdelay` 用)
- `src/presentation/debug/`: デバッグ表示(`?debug` のときだけ生成)
  - `DebugOverlay.ts`: FPS・推定テクスチャメモリ・表示オブジェクト数・向きと論理解像度・バンドルと参照数・読み込み失敗数を 250ms ごとに表示
  - `debugStats.ts`: FPS の計測・表示オブジェクトの数え上げ・表示文字列の組み立て
  - `debugOptions.ts`: デバッグ用の URL パラメータ(`debug` / `safearea` / `assetfail` / `assetdelay`)の読み取り
- `src/presentation/loading/LoadingView.ts`: 読み込み中表示(文字と進捗バー)
- `src/app/createAssetManager.ts`: Pixi の読み込み処理・代わりの画像・設定値から AssetManager を作る
- `src/app/LoadingProgressTracker.ts`・`src/app/sceneManagerTypes.ts`: SceneManager から分割(300行を超えたため)
- デモ: `demoAssets.ts`(マニフェスト)、`fitPicture.ts`、画像 `public/assets/demo/shapes-a.png`・`shapes-b.png`(オリジナルの図形)
- テスト: `tests/services/assets/`、`tests/presentation/debug/`、SceneManager のバンドル関連のテスト

### 変更

- `Scene`: `bundles`(使うバンドル)を宣言できるようにした。`SceneContext` に `assets.get(バンドル, キー)` を追加。型引数にマニフェストを追加
- `SceneManager`: 新シーンの生成後に bundles を読み込み、完了してから enter を呼ぶ。旧シーンの bundles は新シーンの読み込み後に解放する。読み込みが長引いたら読み込み中表示を出す。読み込み中の切り替え要求は保留する
- `Game`: 起動時に boot バンドルを読み込む(失敗したら起動エラー)。`GameOptions` に `manifest` を追加。読み込み中表示とデバッグ表示の層を追加
- `gameConfig.ts`: 読み込み中表示までの時間、再試行の回数と間隔、boot バンドル名、デバッグ表示の更新間隔を追加
- **`?safearea` は `?debug` と併用したときだけ有効になった**(例: `?debug&safearea=40,0,24,0`)
- デモシーンA・B: バンドルの画像を表示する(B の回る四角は画像に置き換え)。デモのレイアウト定義に基準点 `picture` を追加

### 削除

- `src/services/layout/safeAreaOverride.ts`(`presentation/debug/debugOptions.ts` に統合)

## [0.2.0] - 2026-09-23 — Phase 2-1: レイアウト・シーン管理

### 追加

- `src/services/layout/`: LayoutManager とレイアウト定義の仕組み
  - `computeLayout.ts`: 画面サイズとセーフエリアから、向き・拡大率・余白・論理座標のセーフエリア・領域・基準点を求める純粋な関数
  - `LayoutManager.ts`: 現在のレイアウトを持ち、向き・サイズ・セーフエリアの変化を通知する
  - `SafeAreaProbe.ts`: CSS の `env(safe-area-inset-*)` からセーフエリアを読み取る
  - `safeAreaOverride.ts`: URL の `?safearea=上,右,下,左` でセーフエリアを上書きする(動作確認用・仮仕様)
  - 論理解像度は仮仕様で縦 720×1280、横 1280×720(`src/app/gameConfig.ts`)
- `src/presentation/scenes/Scene.ts`: シーンの型(`Scene` / `SceneContext` / `SceneFactory` / `SceneRegistry`)
- `src/app/SceneManager.ts`: シーンの遅延生成、enter / exit / update / resize のライフサイクル、ticker によるフェード、exit 時の表示物の破棄、回転時のフェード即時完了
- `src/app/Game.ts`: Pixi Application・LayoutManager・SceneManager を初期化し、最初のシーンを開始する。描画を背景レイヤー・ゲーム用ルート・フェード用の覆いに分ける
- `src/app/gameConfig.ts`: 論理解像度とフェード時間
- `src/presentation/scenes/demo/`: デモシーンA(レイアウト定義・セーフエリア・環境情報の表示)とデモシーンB。タップで切り替え
- テスト: `tests/services/layout/`(配置計算・LayoutManager・URL パラメータ)、`tests/app/SceneManager.test.ts`

### 変更

- `src/main.ts`: `Game.start` でデモを起動する形に変更
- `eslint.config.js`: `main.ts` 以外からデモ(`demo` フォルダ)を import するとエラーにする。`app` にもこの規則を適用
- `CLAUDE.md`: 現在のフェーズを Phase 2 に更新。Claude Code のセッションで指定されたブランチ名を使ってよいことを追記
- `docs/ARCHITECTURE.md`: シーンの型の置き場所、描画の構成、切り替え要求の扱い、`?safearea` を追記

### 削除

- `src/app/bootstrap.ts`(`Game.ts` に置き換え)
- `src/presentation/debug/BootCheckView.ts`(デモシーンAに統合)

## [0.1.0] - 2026-09-23 — Phase 1: プロジェクト初期構築

### 追加

- Vite 8 + TypeScript 6.0(`strict`)のプロジェクト。Vite の `base` は相対パス(`./`)
- PixiJS 8.21。レンダラは `preference: ['webgl']` で WebGL に固定し、描画解像度は `devicePixelRatio` に上限 2 をかける
- `src/core/SeededRng.ts`: シード付き乱数(sfc32 + splitmix32)。`next` / `nextUint32` / `nextFloat` / `nextInt` / `chance` / `pick` / `shuffle` / `getState` / `setState`
- Vitest とテスト(`tests/core/SeededRng.test.ts`、`tests/eslint/dependencyRules.test.ts`)
- ESLint 10 + typescript-eslint(`strict`)。`docs/ARCHITECTURE.md` の依存ルールを `no-restricted-imports` で強制し、`systems` での `Math.random()` / `Date.now()` を `no-restricted-properties` で禁止
- `src/data/README.md`、`src/systems/README.md`(役割と依存ルールの説明)
- npm スクリプト: `dev` / `build` / `test` / `lint` / `typecheck` / `check`
- GitHub Actions: `ci.yml`(PR 時に `npm run check`)、`deploy.yml`(`main` への push 時に GitHub Pages へ公開、手動実行も可)
- 起動確認画面(`src/presentation/debug/BootCheckView.ts`): 「Phase 1 OK」と、レンダラ名・画面サイズ・devicePixelRatio・画面の向きを表示。リサイズと回転に追従
- 起動失敗時にエラー内容を画面に表示する処理(`src/app/showBootError.ts`)
- `.gitignore`、`README.md`、`CHANGELOG.md`
