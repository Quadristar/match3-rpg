/**
 * Game.start に渡す内容(レイアウト定義・マニフェスト・セーブデータの形式・シーン)。
 */
import { BattleScene } from '../scenes/battle/BattleScene';
import { TitleScene } from '../scenes/title/TitleScene';
import type { SceneRegistry } from '../scenes/Scene';
import { gameManifest, type GameManifest } from './gameAssets';
import { gameLayout, type GameLayout } from './gameLayout';
import { type GameSave, gameSaveSchema } from './gameSave';
import type { SceneKey } from './sceneKeys';

const scenes: SceneRegistry<SceneKey, GameLayout, GameManifest, GameSave> = {
  title: (context) => new TitleScene(context),
  battle: (context) => new BattleScene(context),
};

const firstScene: SceneKey = 'title';

export const gameSetup = { layout: gameLayout, manifest: gameManifest, save: gameSaveSchema, scenes, firstScene };
