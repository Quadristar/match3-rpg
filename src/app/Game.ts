/**
 * Game: 起動処理と各層の接続。
 *
 * - セーブと設定を読み込む(品質プリセットから描画解像度を決めるため、最初に行う)
 * - Pixi Application を WebGL 固定で生成する
 * - AssetManager を作り、boot バンドルを読み込む(失敗したら起動エラー)
 * - 描画の構成(背面から順に):
 *     背景レイヤー(画面座標。余白を含む画面全体を覆う)
 *     ゲーム用ルート(論理座標。LayoutManager の拡大率と余白に合わせて拡大縮小・移動する)
 *     フェード用の覆い(画面座標)
 *     読み込み中表示(論理座標)
 *     デバッグ表示(画面座標。?debug のときだけ)
 * - InputManager でキャンバスへの入力を受け、論理座標にしてシーンに渡す
 * - LayoutManager に画面サイズとセーフエリアを渡し、変化したら各層とシーンを配置し直す
 * - 品質プリセットが変わったら、描画解像度を実行中に切り替える
 * - SceneManager を ticker で動かし、最初のシーンを開始する
 *
 * ゲームのルールやシーンの中身は知らない。レイアウト定義・マニフェスト・セーブの形式・シーンは外から受け取る。
 */
import { Application, Container, Graphics, type Texture, WebGLRenderer } from 'pixi.js';
import { DebugOverlay } from '../presentation/debug/DebugOverlay';
import { parseDebugOptions } from '../presentation/debug/debugOptions';
import { countDisplayObjects } from '../presentation/debug/debugStats';
import { LoadingView } from '../presentation/loading/LoadingView';
import type { RendererInfo, SceneRegistry } from '../presentation/scenes/Scene';
import type { AssetManager } from '../services/assets/AssetManager';
import type { AssetManifest } from '../services/assets/assetTypes';
import { attachPointerInput } from '../services/input/attachPointerInput';
import { InputManager } from '../services/input/InputManager';
import { screenToLogical } from '../services/layout/computeLayout';
import { LayoutManager } from '../services/layout/LayoutManager';
import type { Layout, LayoutDefinition, ScreenInput } from '../services/layout/layoutTypes';
import { SafeAreaProbe } from '../services/layout/SafeAreaProbe';
import type { SaveSchema } from '../services/save/saveTypes';
import { renderResolution } from '../services/settings/quality';
import { createAssetManager } from './createAssetManager';
import { createPersistence } from './createPersistence';
import { disablePixiEvents } from './disablePixiEvents';
import { GAME_CONFIG } from './gameConfig';
import { RENDER_CONFIG } from './renderConfig';
import { SceneManager } from './SceneManager';
import { showBootError } from './showBootError';

/** ゲームごとに渡す内容 */
export interface GameOptions<K extends string, R extends string, A extends string, M extends AssetManifest, D> {
  /** レイアウト定義 */
  readonly layout: LayoutDefinition<R, A>;
  /** アセットのマニフェスト */
  readonly manifest: M;
  /** ゲームのセーブデータの形式 */
  readonly save: SaveSchema<D>;
  /** キーとシーン生成関数の対応 */
  readonly scenes: SceneRegistry<K, Layout<R, A>, M, D>;
  /** 最初に表示するシーン */
  readonly firstScene: K;
}

export class Game<K extends string, R extends string, A extends string, M extends AssetManifest, D> {
  private constructor(
    readonly app: Application,
    readonly layout: LayoutManager<R, A>,
    readonly assets: AssetManager<M, Texture>,
    readonly input: InputManager,
    readonly scenes: SceneManager<K, Layout<R, A>, M, D>,
  ) {}

  /** ゲームを起動する。root 要素にキャンバスを追加する */
  static async start<K extends string, R extends string, A extends string, M extends AssetManifest, D>(
    root: HTMLElement,
    options: GameOptions<K, R, A, M, D>,
  ): Promise<Game<K, R, A, M, D>> {
    const debug = parseDebugOptions(window.location.search);
    const { save, settings } = createPersistence(debug);
    const gameSave = save.open(options.save);
    const resolutionFor = (): number =>
      renderResolution(window.devicePixelRatio, settings.quality, RENDER_CONFIG.quality);

    const app = new Application();
    await app.init({
      // WebGL に固定する(配列指定にすると、列挙したレンダラ以外は使われない)。
      // WebGL が使えない端末では例外になり、main.ts でエラー表示する
      preference: ['webgl'],
      resizeTo: window,
      background: RENDER_CONFIG.backgroundColor,
      resolution: resolutionFor(),
      autoDensity: true,
      antialias: RENDER_CONFIG.antialias,
      // Pixi のイベントシステムは使わない(入力は InputManager に一本化し、二重に反応しないようにする)
      eventMode: 'none',
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
    });

    const renderer = app.renderer;
    if (!(renderer instanceof WebGLRenderer)) {
      throw new Error(`WebGL 以外のレンダラが選ばれました: ${renderer.name}`);
    }
    // Pixi がキャンバスに登録した DOM のイベントも外す(以降は attachPointerInput だけが受け取る)
    disablePixiEvents(renderer);
    root.appendChild(app.canvas);

    // 品質プリセットが変わったら、描画解像度を切り替える(文字なども新しい解像度で描き直される)
    settings.onChange(() => {
      const resolution = resolutionFor();
      if (resolution !== renderer.resolution) {
        renderer.resize(app.screen.width, app.screen.height, resolution);
      }
    });
    const rendererInfo: RendererInfo = {
      name: `WebGL ${renderer.context.webGLVersion}`,
      get resolution() {
        return renderer.resolution;
      },
    };

    // アセット: 起動時は boot バンドルだけを読み込む(失敗したら例外になり、main.ts でエラー表示する)
    const assets = createAssetManager(options.manifest, debug);
    const bootBundle = GAME_CONFIG.assets.bootBundle;
    if (bootBundle in options.manifest) {
      await assets.acquire(bootBundle);
    }

    // 描画の構成
    const backgroundLayer = new Container({ label: 'backgroundLayer' });
    const gameRoot = new Container({ label: 'gameRoot' });
    const fadeOverlay = new Graphics({ label: 'fadeOverlay' });
    const loadingRoot = new Container({ label: 'loadingRoot' });
    const loadingView = new LoadingView();
    loadingRoot.addChild(loadingView);
    app.stage.addChild(backgroundLayer, gameRoot, fadeOverlay, loadingRoot);

    // レイアウト
    const safeAreaProbe = new SafeAreaProbe();
    const measure = (): ScreenInput => ({
      width: app.screen.width,
      height: app.screen.height,
      safeAreaInsets: debug.safeAreaOverride ?? safeAreaProbe.read(),
    });
    const layout = new LayoutManager(GAME_CONFIG.logicalSizes, options.layout, measure());

    // 入力: キャンバス上の操作を、論理座標にしてシーンに渡す
    const input = new InputManager({
      thresholds: GAME_CONFIG.input.thresholds,
      toLogical: (point) => screenToLogical(layout.current, point),
    });
    attachPointerInput(app.canvas, input);

    // デバッグ表示(?debug のときだけ生成する)
    const debugOverlay = debug.enabled
      ? new DebugOverlay({
          updateIntervalMs: GAME_CONFIG.debug.updateIntervalMs,
          collect: () => ({
            textureBytes: assets.estimateBytes(),
            displayObjects: countDisplayObjects(app.stage),
            orientation: layout.current.orientation,
            logical: layout.current.logical,
            scale: layout.current.scale,
            bundles: assets.getBundleStatuses(),
            assetFailures: assets.failures.length,
            quality: settings.quality,
            resolution: renderer.resolution,
            saveStatus: save.status,
          }),
        })
      : null;
    if (debugOverlay !== null) {
      app.stage.addChild(debugOverlay);
    }

    const applyLayout = (current: Layout<R, A>): void => {
      for (const logicalRoot of [gameRoot, loadingRoot]) {
        logicalRoot.scale.set(current.scale);
        logicalRoot.position.set(current.offset.x, current.offset.y);
      }
      fadeOverlay.clear().rect(0, 0, current.screen.width, current.screen.height).fill(GAME_CONFIG.fadeColor);
      loadingView.layout(current);
      debugOverlay?.layout(current);
    };
    applyLayout(layout.current);

    // シーン
    const scenes = new SceneManager<K, Layout<R, A>, M, D>({
      scenes: options.scenes,
      sceneLayer: gameRoot,
      backgroundLayer,
      fadeOverlay,
      fadeDurationMs: GAME_CONFIG.fadeDurationMs,
      assets,
      input,
      loading: loadingView,
      loadingDelayMs: GAME_CONFIG.loadingDelayMs,
      getLayout: () => layout.current,
      context: {
        renderer: rendererInfo,
        assets: { get: (bundle, key) => assets.get(bundle, key) },
        save: gameSave,
        settings,
      },
      onError: (error) => {
        app.ticker.stop();
        showBootError(root, error);
      },
    });

    layout.onChange((current) => {
      applyLayout(current);
      scenes.resize(current);
    });

    // Pixi は window の resize を検知してキャンバスを合わせ、その後 renderer の resize を発行する
    renderer.on('resize', () => {
      layout.update(measure());
    });
    // 端末によっては回転時に window の resize が遅れる・来ないことがあるため、
    // 画面の向きの変更でもサイズの再計算を依頼する
    const requestResize = (): void => {
      app.queueResize();
    };
    screen.orientation?.addEventListener('change', requestResize);
    window.addEventListener('orientationchange', requestResize);

    app.ticker.add((ticker) => {
      scenes.update(ticker.deltaMS);
      debugOverlay?.update(ticker.deltaMS);
    });

    scenes.start(options.firstScene);
    // ?debug&quality=… … 実行中に品質を切り替える(実行中の反映の確認用)
    if (debug.quality !== null) {
      settings.setQuality(debug.quality);
    }
    return new Game(app, layout, assets, input, scenes);
  }
}
