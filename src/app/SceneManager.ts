/**
 * SceneManager: シーンの生成・切り替え・アセットの読み込みと解放・破棄を管理する。
 *
 * 切り替えの流れ(フェードは fadeOverlay の alpha を ticker の経過時間で変える):
 *   フェードアウト → 旧シーンの exit と破棄 → 新シーンの生成 → bundles の読み込み
 *   → 旧シーンの bundles を解放 → enter → resize → フェードイン
 * 旧シーンの bundles は、新シーンの読み込み後に解放する(両方で使うバンドルを読み直さないため)。
 * 読み込みが loadingDelayMs を超えたら、読み込み中表示を出す。
 *
 * 切り替え中に別の切り替え要求が来た場合(仮仕様):
 * - フェードアウト中: 行き先を新しい要求で上書きする(最新の要求を優先)
 * - 読み込み中・enter の完了待ち・フェードイン中: 最新の要求を1つだけ保留し、
 *   フェードイン完了後に切り替える(読み込みは中断しない)
 * - 切り替え中でないとき、現在のシーンと同じキーの要求は無視する
 *
 * 画面の回転などで resize() が呼ばれたら、進行中のフェードを即座に完了させてから
 * シーンの resize を呼ぶ。読み込み中・enter の完了待ちの場合は、完了時にフェードを省略する。
 * 切り替え中(idle 以外)は入力を一時停止する。
 */
import type { SceneContext } from '../presentation/scenes/Scene';
import type { AssetManifest, BundleName } from '../services/assets/assetTypes';
import type { Layout } from '../services/layout/layoutTypes';
import { LoadingProgressTracker } from './LoadingProgressTracker';
import { MountedScene } from './MountedScene';
import type { SceneManagerOptions } from './sceneManagerTypes';

export type { LoadingIndicator, SceneBundleLoader, SceneManagerOptions } from './sceneManagerTypes';

/** 切り替えの段階 */
type Phase = 'idle' | 'fadeOut' | 'loading' | 'entering' | 'fadeIn';

export class SceneManager<K extends string, L extends Layout = Layout, M extends AssetManifest = AssetManifest, D = unknown> {
  private active: MountedScene<K, L, M> | null = null;
  private phase: Phase = 'idle';
  /** 切り替え中の入力の一時停止を解除する関数 */
  private resumeInput: (() => void) | null = null;
  private elapsedMs = 0;
  /** フェードアウト後に切り替える先 */
  private target: K | null = null;
  /** 切り替え中に来た次の要求(最新の1つだけ) */
  private queued: K | null = null;
  /** 読み込み・enter の完了待ち中に回転した場合、フェードインを省略する */
  private skipFadeIn = false;
  /** 新しいシーンの読み込み後に解放する、旧シーンのバンドル */
  private pendingRelease: BundleName<M>[] = [];
  private readonly loading: LoadingProgressTracker;
  private readonly context: Omit<SceneContext<K, M, D>, 'input'>;

  constructor(private readonly options: SceneManagerOptions<K, L, M, D>) {
    this.context = { ...options.context, changeScene: (key) => this.change(key) };
    this.loading = new LoadingProgressTracker(options.loading, options.loadingDelayMs);
    this.setOverlay(1);
  }

  /** 現在のシーンのキー(まだない場合は null) */
  get currentKey(): K | null {
    return this.active?.key ?? null;
  }

  /** 切り替え中かどうか */
  get isTransitioning(): boolean {
    return this.phase !== 'idle';
  }

  /** 最初のシーンを開始する(暗転した状態から、フェードインで表示する) */
  start(key: K): void {
    if (this.active !== null || this.phase !== 'idle') {
      throw new Error('SceneManager.start は最初の1回だけ呼べます');
    }
    this.target = key;
    this.swap();
  }

  /** シーンを切り替える。扱いはファイル先頭のコメントを参照 */
  change(key: K): void {
    switch (this.phase) {
      case 'idle':
        if (this.active?.key === key) {
          return;
        }
        this.target = key;
        this.setPhase('fadeOut');
        this.elapsedMs = 0;
        this.setOverlay(0);
        return;
      case 'fadeOut':
        this.target = key;
        return;
      case 'loading':
      case 'entering':
      case 'fadeIn':
        this.queued = key;
        return;
    }
  }

  /** 毎フレーム呼ぶ。現在のシーンの update とフェード・読み込み中表示を進める */
  update(deltaMs: number): void {
    if (this.active !== null && (this.phase === 'idle' || this.phase === 'fadeOut' || this.phase === 'fadeIn')) {
      this.active.scene.update(deltaMs);
    }
    if (this.phase === 'fadeOut') {
      this.elapsedMs += deltaMs;
      const t = this.progress();
      this.setOverlay(t);
      if (t >= 1) {
        this.swap();
      }
    } else if (this.phase === 'loading') {
      this.loading.update(deltaMs);
    } else if (this.phase === 'fadeIn') {
      this.elapsedMs += deltaMs;
      const t = this.progress();
      this.setOverlay(1 - t);
      if (t >= 1) {
        this.finishFadeIn();
      }
    }
  }

  /**
   * レイアウトが変わったときに呼ぶ。
   * 進行中のフェードを即座に完了させてから、現在のシーンの resize を呼ぶ。
   */
  resize(layout: L): void {
    this.completeTransition();
    this.resizeActive(layout);
  }

  /** 現在のシーンを終了・破棄し、バンドルを解放する(ゲームの終了時用) */
  destroy(): void {
    this.disposeActive();
    this.releasePending();
    this.loading.finish();
    this.setPhase('idle');
    this.target = null;
    this.queued = null;
    this.skipFadeIn = false;
  }

  /** 進行中のフェードを即座に完了させる */
  private completeTransition(): void {
    if (this.phase === 'fadeOut') {
      this.swap();
    }
    if (this.phase === 'loading' || this.phase === 'entering') {
      // 完了を待っている間は完了させられないため、完了時にフェードインを省略する
      this.skipFadeIn = true;
      return;
    }
    if (this.phase === 'fadeIn') {
      this.finishFadeIn();
    }
  }

  /** 旧シーンを終了・破棄し、新シーンを生成してバンドルを読み込む */
  private swap(): void {
    const key = this.target;
    this.target = null;
    if (key === null) {
      return;
    }
    this.disposeActive();
    this.setOverlay(1);
    this.setPhase('loading');
    this.elapsedMs = 0;

    let mounted: MountedScene<K, L, M>;
    try {
      mounted = MountedScene.mount(key, this.options.scenes[key], this.context, this.options);
    } catch (error) {
      this.options.onError(error);
      return;
    }
    this.active = mounted;
    const scene = mounted.scene;

    const bundles = mounted.bundles;
    if (bundles.length === 0) {
      this.releasePending();
      this.beginEnter(scene);
      return;
    }
    this.loading.begin(bundles);
    Promise.all(
      bundles.map((bundle) => this.options.assets.acquire(bundle, (p) => this.loading.setProgress(bundle, p))),
    ).then(
      () => {
        this.releasePending();
        this.beginEnter(scene);
      },
      (error: unknown) => {
        this.releasePending();
        this.options.onError(error);
      },
    );
  }

  /** 読み込みの完了後: enter を呼ぶ */
  private beginEnter(scene: MountedScene<K, L, M>['scene']): void {
    // 待っている間に破棄された場合は何もしない
    if (this.active?.scene !== scene || this.phase !== 'loading') {
      return;
    }
    this.loading.finish();
    this.setPhase('entering');

    let entered: void | Promise<void>;
    try {
      entered = scene.enter();
    } catch (error) {
      this.options.onError(error);
      return;
    }
    if (entered instanceof Promise) {
      entered.then(
        () => this.afterEnter(scene),
        (error: unknown) => this.options.onError(error),
      );
    } else {
      this.afterEnter(scene);
    }
  }

  /** enter の完了後: 配置してフェードインを始める */
  private afterEnter(scene: MountedScene<K, L, M>['scene']): void {
    if (this.active?.scene !== scene || this.phase !== 'entering') {
      return;
    }
    this.setPhase('fadeIn');
    this.elapsedMs = 0;
    this.resizeActive(this.options.getLayout());
    if (this.skipFadeIn) {
      this.skipFadeIn = false;
      this.finishFadeIn();
    }
  }

  /** フェードインを終える。保留中の要求があれば、次の切り替え(フェードアウト)を始める */
  private finishFadeIn(): void {
    this.setPhase('idle');
    this.elapsedMs = 0;
    this.setOverlay(0);
    const next = this.queued;
    this.queued = null;
    if (next !== null) {
      this.change(next);
    }
  }

  private resizeActive(layout: L): void {
    const active = this.active;
    if (active === null || this.phase === 'loading' || this.phase === 'entering' || active.layout === layout) {
      return;
    }
    active.layout = layout;
    active.scene.resize(layout);
  }

  /** 現在のシーンの exit を呼んで表示物を破棄し、そのバンドルを解放待ちにする */
  private disposeActive(): void {
    const active = this.active;
    if (active === null) {
      return;
    }
    this.active = null;
    this.pendingRelease.push(...active.bundles);
    active.dispose(this.options.onError);
  }

  /** 段階を変え、切り替え中は入力を一時停止する */
  private setPhase(phase: Phase): void {
    this.phase = phase;
    if (phase === 'idle') {
      this.resumeInput?.();
      this.resumeInput = null;
    } else {
      this.resumeInput ??= this.options.input.pause();
    }
  }

  private releasePending(): void {
    for (const bundle of this.pendingRelease.splice(0)) {
      this.options.assets.release(bundle);
    }
  }

  private progress(): number {
    const duration = this.options.fadeDurationMs;
    return duration <= 0 ? 1 : Math.min(1, this.elapsedMs / duration);
  }

  private setOverlay(alpha: number): void {
    this.options.fadeOverlay.alpha = alpha;
    this.options.fadeOverlay.visible = alpha > 0;
  }
}
