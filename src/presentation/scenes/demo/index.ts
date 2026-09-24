/**
 * デモ(雛形のサンプル)。
 *
 * このフォルダは他のモジュールから参照されない(main.ts からの起動を除く)。
 * ゲームを作るときは、このフォルダごと削除し、main.ts の demoGame を差し替える。
 */
import type { SceneRegistry } from '../Scene';
import { DemoSceneA } from './DemoSceneA';
import { DemoSceneB } from './DemoSceneB';
import { demoManifest, type DemoManifest } from './demoAssets';
import { type DemoSave, demoSaveSchema } from './demoSave';
import { demoLayout, type DemoLayout } from './demoLayout';
import type { DemoSceneKey } from './demoSceneKeys';

const demoScenes: SceneRegistry<DemoSceneKey, DemoLayout, DemoManifest, DemoSave> = {
  demoA: (context) => new DemoSceneA(context),
  demoB: (context) => new DemoSceneB(context),
};

const firstScene: DemoSceneKey = 'demoA';

/** Game.start に渡す内容 */
export const demoGame = { layout: demoLayout, manifest: demoManifest, save: demoSaveSchema, scenes: demoScenes, firstScene };
