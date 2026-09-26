/**
 * 表示中のシーン1つ分: 生成・レイヤーへの追加と、exit・破棄・入力の解除をまとめる。
 * シーンの root の中の UI(Button・Panel)への入力は、UIInputRouter が自動で振り分ける。
 */
import type { Container } from 'pixi.js';
import type { Scene, SceneContext, SceneFactory } from '../presentation/scenes/Scene';
import { UIInputRouter } from '../presentation/ui/UIInputRouter';
import type { AssetManifest, BundleName } from '../services/assets/assetTypes';
import type { Layout } from '../services/layout/layoutTypes';
import { type InputController, SceneInputScope } from './SceneInputScope';

export interface MountTarget {
  /** シーンの root を追加する先 */
  readonly sceneLayer: Container;
  /** シーンの background を追加する先 */
  readonly backgroundLayer: Container;
  readonly input: InputController;
}

export class MountedScene<K extends string, L extends Layout, M extends AssetManifest> {
  /** 最後に resize() に渡したレイアウト(同じレイアウトで二重に呼ばないため) */
  layout: L | null = null;
  /** enter が完了したか(読み込みや enter が失敗したシーンには update・resize を呼ばない) */
  entered = false;

  private constructor(
    readonly key: K,
    readonly scene: Scene<L, M>,
    private readonly inputScope: SceneInputScope,
  ) {}

  /** このシーンで使うバンドル */
  get bundles(): readonly BundleName<M>[] {
    return this.scene.bundles ?? [];
  }

  /** シーンを生成し、レイヤーに追加する */
  static mount<K extends string, L extends Layout, M extends AssetManifest, D>(
    key: K,
    factory: SceneFactory<K, L, M, D>,
    context: Omit<SceneContext<K, M, D>, 'input'>,
    target: MountTarget,
  ): MountedScene<K, L, M> {
    const inputScope = new SceneInputScope(target.input);
    const scene = factory({ ...context, input: inputScope });
    // UI への入力を、ゲーム側(context.input.on)より先に振り分ける
    inputScope.addPointerHandler(new UIInputRouter(scene.root));
    target.sceneLayer.addChild(scene.root);
    if (scene.background !== undefined) {
      target.backgroundLayer.addChild(scene.background);
    }
    return new MountedScene(key, scene, inputScope);
  }

  /**
   * exit を呼び、入力の登録を解除し、表示物を子要素ごと破棄する。
   * 各段階は個別に行い、どこかで例外が起きても残りの段階を必ず行う(例外は onError に渡す)。
   * 例外を外に出すと、切り替えが途中で止まり、暗転したままになるため。
   */
  dispose(onError: (error: unknown) => void): void {
    const steps = [
      () => this.scene.exit(),
      () => this.inputScope.dispose(),
      () => this.scene.root.destroy({ children: true }),
      () => this.scene.background?.destroy({ children: true }),
    ];
    for (const step of steps) {
      try {
        step();
      } catch (error) {
        onError(error);
      }
    }
  }
}
