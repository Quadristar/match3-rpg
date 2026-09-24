# match3-rpg

ブラウザで動作する 2D の「3マッチパズル＋RPG」ゲームです(開発中)。

- 雛形: **alcyon-game-template v1.0.0**(このバージョンから作成。雛形の更新を取り込んだら、ここを更新する)
- 技術: TypeScript(strict)/ Vite / PixiJS v8(WebGL 固定)/ Vitest / ESLint
- 対象: PC・スマートフォン・タブレット(縦画面・横画面の両対応、縦を優先)
- 公開: `main` にマージすると GitHub Actions で GitHub Pages に自動公開(https://quadristar.github.io/match3-rpg/)

作業ルールは [`CLAUDE.md`](CLAUDE.md)、ゲームの設計は [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md)、
共通基盤(雛形から引き継いだ部分)の設計は [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、変更履歴は [`CHANGELOG.md`](CHANGELOG.md) を参照してください。

## 現在の状態

**開発準備完了(Phase 3a 着手前)**。起動すると、仮のタイトル画面(「(仮)タイトル」の文字)が表示されます。

### デバッグ用の URL パラメータ

URL の末尾に `?debug` を付けると、画面の右上にデバッグ表示(FPS・推定テクスチャメモリ・表示オブジェクト数・向きと論理解像度・読み込み済みのバンドルと参照数・品質と描画解像度・保存の状態)が出ます。
`?debug` と一緒に、次のパラメータを `&` でつないで使えます(`?debug` がないときは無視されます)。

| パラメータ | 例 | 内容 |
|---|---|---|
| `safearea` | `?debug&safearea=40,0,24,0` | セーフエリアを上,右,下,左(CSS ピクセル)で上書きする |
| `assetfail` | `?debug&assetfail=battle` | 指定したバンドルの読み込みをわざと失敗させる(代わりの画像の確認用) |
| `assetdelay` | `?debug&assetdelay=2000` | アセット1つごとに読み込みを遅らせる(読み込み中表示の確認用。ミリ秒) |
| `quality` | `?debug&quality=low` | 起動後に品質プリセット(`low` / `medium` / `high`)を切り替える。**設定として保存される**ため、戻すときは `quality=medium` を付けて開く |
| `savefail` | `?debug&savefail` | 保存の書き込みをわざと失敗させる(メモリ上での動作の確認用) |

## 使い方

### セーブデータの保存先(重要)

- セーブデータと設定はブラウザの localStorage に保存します
- GitHub Pages では、同じアカウントのゲームはすべて同じドメイン(`<ユーザー名>.github.io`)になり、**localStorage を共有します**
- そのため、保存キーには `gameConfig.ts` の `gameId` を前置きしています(`match3-rpg:settings` など)。値を変えると、保存済みのデータが読めなくなります
- **容量の上限(ブラウザにより約5MB)も、同じドメインの全ゲームで共有**です。大きなデータを保存するゲームがあると、ほかのゲームが保存できなくなることがあります
- 保存できない場合(容量超過・プライベートブラウズなど)も、ゲームは止まらずメモリ上で動作を続けます(再読み込みすると失われます)

### 動作確認(スマホ)

1. 作業ブランチで PR を作ると、CI(`npm run check`)が自動で実行される
2. CI が通ったら `main` にマージする
3. Actions の「Deploy to GitHub Pages」が完了したら、公開 URL(https://quadristar.github.io/match3-rpg/)をスマホのブラウザで開く

起動に失敗した場合は、原因のエラーメッセージが画面に表示されます。

### ローカルで動かす(PC がある場合)

Node.js 22.13 以上が必要です。

```
npm ci
npm run dev
```

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動する |
| `npm run build` | 本番用にビルドする(出力先: `dist/`) |
| `npm run test` | テスト(Vitest)を実行する |
| `npm run lint` | lint(ESLint)を実行する。層の依存ルール違反もここでエラーになる |
| `npm run typecheck` | 型チェック(`tsc --noEmit`)を実行する |
| `npm run check` | typecheck → lint → test → build をまとめて実行する(CI と同じ) |

## ディレクトリ

```
src/
  main.ts                   エントリーポイント(起動のみ)
  app/                      起動処理・各層の接続(Game, SceneManager)
  core/                     汎用基盤(外部依存なし)。SeededRng など
  data/                     ゲームデータ(キャラ・敵・ステージ・パネル効果など。これから作る)
  systems/                  純粋なゲームロジック(パズル・バトル・成長。これから作る)
  services/assets/          AssetManager・マニフェストの型・Pixi での画像の読み込み
  services/input/           InputManager・タップ/ドラッグ/スワイプの判定
  services/layout/          LayoutManager・配置計算・セーフエリアの取得
  services/save/            SaveManager・バージョン移行・保存先
  services/settings/        Settings(音量・ミュート・品質)
  presentation/debug/       デバッグ表示(?debug)
  presentation/loading/     読み込み中表示
  presentation/ui/          基本UI(Button・Panel・ProgressBar)と UI への入力の振り分け
  presentation/game/        Game.start に渡す設定一式(シーンのキー・レイアウト定義・マニフェスト・セーブデータの形式)
  presentation/scenes/      シーンの型(Scene.ts)とシーン(title/ など)
public/assets/              画像などのアセット(マニフェストに登録して使う)
tests/                      Vitest のテスト
.github/workflows/          CI(ci.yml)と公開(deploy.yml)
```

層の依存ルール(どの層が何を import してよいか)は `docs/ARCHITECTURE.md` の「レイヤー構造」を参照してください。
ルールは `eslint.config.js` で強制され、ルール自体が機能していることは `tests/eslint/dependencyRules.test.ts` で検証しています。
