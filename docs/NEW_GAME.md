# 新しいゲームを始める手順

この雛形(alcyon-game-template)から新しいゲームのリポジトリを作り、デモを取り除いて開発を始めるまでの手順です。
スマートフォンだけで進められるように書いています。

- GitHub の設定画面はスマホのアプリにはないため、**スマホのブラウザで github.com を開いて**操作します
- コードの変更は、Claude Code に「docs/NEW_GAME.md の手順 4〜6 を実施して」と依頼すれば進められます

---

## 1. リポジトリを作る

1. 雛形のリポジトリ(`alcyon-game-template`)を開き、「Use this template」→「Create a new repository」を押す
2. リポジトリ名(例: `my-game`)を入れて作成する

テンプレートからは**ファイルだけがコピーされます**。Pages の設定・ブランチ保護・タグ・Release は引き継がれないため、次の手順 2・7 でやり直します。

## 2. GitHub Pages を有効にする

1. 新しいリポジトリの Settings → Pages を開く
2. 「Build and deployment」の Source を「**GitHub Actions**」にする

これで、`main` にマージするたびに `https://<ユーザー名>.github.io/<リポジトリ名>/` へ公開されます。

## 3. 雛形のバージョンを確認する

雛形の Releases(または `CHANGELOG.md` の一番上)で、作成元の雛形のバージョン(例: `v1.0.0`)を確認し、控えておきます。
手順 6 でゲームの README に記録します。雛形を更新したときに、どの変更を取り込めばよいかを判断するために使います。

## 4. ゲーム固有の値に変える(作業ブランチで行う)

作業用のブランチを作り、次を変更します(`main` へ直接コミットしない)。

1. **`src/app/gameConfig.ts` の `gameId`** をゲーム固有の値にする(例: `'my-game'`)
   - GitHub Pages では、同じアカウントの全ゲームが localStorage を共有します。`gameId` が同じだとセーブデータが混ざります
2. **`package.json` の `name`** をリポジトリ名にする(例: `"my-game"`)。`version` は `"0.1.0"` に戻す
   - 続けて `npm install --package-lock-only` を実行し、`package-lock.json` の名前とバージョンも合わせる
     (実行しなくてもビルドと CI は通るが、`package-lock.json` に雛形の名前が残る)
3. `index.html` の `<title>` をゲーム名にする

## 5. デモを取り除き、最小の形に置き換える

1. 次を削除する
   - `src/presentation/scenes/demo/`(フォルダごと)
   - `public/assets/demo/`(フォルダごと)
2. 下の「最小の形」のファイルを作る(レイアウト定義・マニフェスト・セーブデータの形式・最初のシーン)
3. `src/main.ts` を、下の内容に置き換える
4. `npm run check` が通ることを確認する

### 最小の形

ゲームの設定一式は `src/presentation/game/` に、シーンは `src/presentation/scenes/<シーン名>/` に置きます
(シーンが使う型をまとめるため `presentation` に置く。`app` には置けない — `presentation` から `app` は import できないため)。

<!-- file: src/presentation/game/sceneKeys.ts -->
```ts
/** シーンのキー。シーンを増やしたらここに足す */
export type SceneKey = 'title';
```

<!-- file: src/presentation/game/gameLayout.ts -->
```ts
/**
 * レイアウト定義。領域と基準点は、ゲームの画面構成に合わせて増やす。
 */
import type { Layout, LayoutDefinition } from '../../services/layout/layoutTypes';

export type GameRegion = 'main';
export type GameAnchor = 'center';
export type GameLayout = Layout<GameRegion, GameAnchor>;

/** 縦横どちらも、セーフエリア全体を main とする */
const spec: LayoutDefinition<GameRegion, GameAnchor>['portrait'] = ({ safeArea }) => ({
  regions: { main: safeArea },
  anchors: { center: { x: safeArea.x + safeArea.width / 2, y: safeArea.y + safeArea.height / 2 } },
});

export const gameLayout: LayoutDefinition<GameRegion, GameAnchor> = { portrait: spec, landscape: spec };
```

<!-- file: src/presentation/game/gameAssets.ts -->
```ts
/**
 * アセットのマニフェスト。画像は public/assets/ に置き、ここにパスを登録する。
 * boot は起動時に読み込む(ロゴや読み込み画面の画像など)。
 */
import type { AssetManifest } from '../../services/assets/assetTypes';

export const gameManifest = {
  boot: {},
} as const satisfies AssetManifest;

export type GameManifest = typeof gameManifest;
```

<!-- file: src/presentation/game/gameSave.ts -->
```ts
/**
 * セーブデータの形式。形を変えたら version を上げ、migrations に移行処理を足す。
 */
import type { SaveSchema } from '../../services/save/saveTypes';

export interface GameSave {
  readonly version: 1;
}

export const gameSaveSchema: SaveSchema<GameSave> = {
  key: 'game',
  version: 1,
  createDefault: () => ({ version: 1 }),
  validate: (data): data is GameSave => typeof data === 'object' && data !== null,
};
```

<!-- file: src/presentation/scenes/title/TitleScene.ts -->
```ts
/**
 * 最初のシーン(仮)。ゲームの最初の画面に置き換える。
 */
import { Container, Text } from 'pixi.js';
import type { GameManifest } from '../../game/gameAssets';
import type { GameLayout } from '../../game/gameLayout';
import type { GameSave } from '../../game/gameSave';
import type { SceneKey } from '../../game/sceneKeys';
import type { Scene, SceneContext } from '../Scene';

export class TitleScene implements Scene<GameLayout, GameManifest> {
  readonly root = new Container({ label: 'TitleScene' });
  private readonly title = new Text({ text: 'My Game', style: { fontSize: 64, fill: 0xffffff } });

  constructor(private readonly context: SceneContext<SceneKey, GameManifest, GameSave>) {}

  enter(): void {
    this.title.anchor.set(0.5);
    this.root.addChild(this.title);
    this.context.input.on((event) => {
      if (event.type === 'tap') {
        // タップしたときの処理を書く
      }
    });
  }

  exit(): void {
    // 入力の解除・表示物の破棄は SceneManager が行う
  }

  update(): void {
    // 毎フレームの処理を書く
  }

  resize(layout: GameLayout): void {
    this.title.position.set(layout.anchors.center.x, layout.anchors.center.y);
  }
}
```

<!-- file: src/presentation/game/index.ts -->
```ts
/**
 * Game.start に渡す内容(レイアウト定義・マニフェスト・セーブデータの形式・シーン)。
 */
import { TitleScene } from '../scenes/title/TitleScene';
import type { SceneRegistry } from '../scenes/Scene';
import { gameManifest, type GameManifest } from './gameAssets';
import { gameLayout, type GameLayout } from './gameLayout';
import { type GameSave, gameSaveSchema } from './gameSave';
import type { SceneKey } from './sceneKeys';

const scenes: SceneRegistry<SceneKey, GameLayout, GameManifest, GameSave> = {
  title: (context) => new TitleScene(context),
};

const firstScene: SceneKey = 'title';

export const gameSetup = { layout: gameLayout, manifest: gameManifest, save: gameSaveSchema, scenes, firstScene };
```

<!-- file: src/main.ts -->
```ts
/**
 * エントリーポイント。ゲームを起動するだけで、処理は app/ に置く。
 */
import { Game } from './app/Game';
import { showBootError } from './app/showBootError';
import { gameSetup } from './presentation/game';

const root = document.getElementById('app');

if (root === null) {
  throw new Error('#app 要素が見つかりません');
}

Game.start(root, gameSetup).catch((error: unknown) => {
  showBootError(root, error);
});
```

## 6. ドキュメントをゲーム用にする

1. **`CLAUDE.md` をゲーム用に差し替える**
   - 雛形の `CLAUDE.md` を元に、「このリポジトリについて」をゲームの説明に、「雛形としてのルール」をゲームの開発ルールに書き換える
   - 「アーキテクチャと依存ルール」「コーディング規約」「画面の向き」「テスト」「Git 運用」「作業報告のテンプレート」はそのまま使える
   - 「現在のフェーズ」はゲームの開発フェーズにする
2. **`docs/GAME_DESIGN.md` を追加する**(ゲーム固有の設計。例: ゲームの概要、画面とシーンの一覧、操作、ルール、データ、セーブする内容、アセットの一覧)
3. **`docs/ARCHITECTURE.md` は雛形のものをそのまま使う**(ゲーム固有の設計は GAME_DESIGN.md に書く)
4. **`README.md` をゲーム用に書き換え、雛形のバージョンを記録する**(例: 「雛形: alcyon-game-template v1.0.0」)
5. `CHANGELOG.md` は、雛形の履歴を消してゲームの履歴として書き始める(雛形の履歴は雛形のリポジトリで見られる)

ここまでを PR にし、CI(`check`)が通ったら次の手順 7 を行ってからマージします。

## 7. main のブランチ保護ルールを作る

最初の PR で CI が一度動くと、`check` を必須の確認として選べるようになります。

1. Settings → Rules → Rulesets → 「New ruleset」→「New branch ruleset」
2. Ruleset Name: `main`、Enforcement status: **Active**
3. Target branches → 「Add target」→「**Include default branch**」
4. Rules で次にチェックを入れる
   - **Restrict deletions**(ブランチの削除を禁止)
   - **Require a pull request before merging**(PR を必須にする)→ Required approvals: **0**
   - **Require status checks to pass** →「Add checks」で **`check`** を選ぶ
   - **Block force pushes**(force push を禁止)
5. 「Create」を押す

## 8. マージして公開を確認する

1. PR をマージする
2. Actions の「Deploy to GitHub Pages」が緑になったら、`https://<ユーザー名>.github.io/<リポジトリ名>/` をスマホで開き、最初のシーン(「My Game」の文字)が表示されることを確認する

---

## 雛形を更新したとき

雛形から作ったリポジトリは自動では更新されません。雛形の `CHANGELOG.md` で、ゲームの README に記録したバージョンより新しい変更を確認し、必要なものを手動で取り込みます。取り込んだら、README の雛形のバージョンも更新します。
