/**
 * SceneManager のオプションと、外から渡す機能の型。
 */
import type { Container } from 'pixi.js';
import type { SceneContext, SceneRegistry } from '../presentation/scenes/Scene';
import type { AssetManifest, BundleName, ProgressListener } from '../services/assets/assetTypes';
import type { Layout } from '../services/layout/layoutTypes';
import type { InputController } from './SceneInputScope';

/** バンドルの読み込みと解放(AssetManager が満たす) */
export interface SceneBundleLoader<M extends AssetManifest> {
  acquire(bundle: BundleName<M>, onProgress?: ProgressListener): Promise<void>;
  release(bundle: BundleName<M>): boolean;
}

/** 読み込み中表示 */
export interface LoadingIndicator {
  /** 表示し、進捗(0〜1)を更新する */
  show(progress: number): void;
  hide(): void;
}

export interface SceneManagerOptions<K extends string, L extends Layout, M extends AssetManifest, D> {
  /** キーとシーン生成関数の対応 */
  readonly scenes: SceneRegistry<K, L, M, D>;
  /** シーンの root を追加する先(論理座標のゲーム用ルート) */
  readonly sceneLayer: Container;
  /** シーンの background を追加する先(画面座標の背景レイヤー) */
  readonly backgroundLayer: Container;
  /** フェード用の覆い。alpha と visible を SceneManager が操作する */
  readonly fadeOverlay: Container;
  /** フェードアウト・フェードインそれぞれの時間(ミリ秒) */
  readonly fadeDurationMs: number;
  /** バンドルの読み込みと解放 */
  readonly assets: SceneBundleLoader<M>;
  /** 入力(切り替え中は SceneManager が一時停止する。シーンごとの登録は exit で解除する) */
  readonly input: InputController;
  /** 読み込み中表示 */
  readonly loading: LoadingIndicator;
  /** 読み込みがこの時間を超えたら読み込み中表示を出す(ミリ秒) */
  readonly loadingDelayMs: number;
  /** 現在のレイアウトを返す */
  readonly getLayout: () => L;
  /** シーンに渡す共通の情報(changeScene と input 以外) */
  readonly context: Omit<SceneContext<K, M, D>, 'changeScene' | 'input'>;
  /** シーンの enter やアセットの読み込みで回復できない失敗が起きたときの処理 */
  readonly onError: (error: unknown) => void;
}
