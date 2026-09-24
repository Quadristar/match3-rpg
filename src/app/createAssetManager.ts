/**
 * ゲームで使う AssetManager を作る(Pixi の読み込み処理・代わりの画像・設定値をつなぐ)。
 */
import type { Texture } from 'pixi.js';
import type { DebugOptions } from '../presentation/debug/debugOptions';
import { AssetManager } from '../services/assets/AssetManager';
import type { AssetManifest } from '../services/assets/assetTypes';
import { createFallbackTexture } from '../services/assets/createFallbackTexture';
import { measureTexture, pixiTextureLoader } from '../services/assets/pixiTextureLoader';
import { withSimulatedIssues } from '../services/assets/withSimulatedIssues';
import { GAME_CONFIG } from './gameConfig';

export function createAssetManager<M extends AssetManifest>(manifest: M, debug: DebugOptions): AssetManager<M, Texture> {
  // ?debug&assetfail=… で指定したバンドルのファイルは、わざと失敗させる
  const failUrls = new Set(debug.assetFailBundles.flatMap((bundle) => Object.values(manifest[bundle] ?? {})));
  const loader = withSimulatedIssues(pixiTextureLoader, { failUrls, delayMs: debug.assetDelayMs });

  return new AssetManager(manifest, {
    loader,
    retryCount: GAME_CONFIG.assets.retryCount,
    retryDelayMs: GAME_CONFIG.assets.retryDelayMs,
    criticalBundles: [GAME_CONFIG.assets.bootBundle],
    createFallback: createFallbackTexture,
    measure: measureTexture,
    onFailure: (failure) => {
      console.warn(
        `[AssetManager] 読み込みに失敗しました: ${failure.bundle}/${failure.key} (${failure.url}, ${failure.attempts} 回試行)`,
        failure.error,
      );
    },
  });
}
