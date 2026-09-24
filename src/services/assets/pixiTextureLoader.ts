/**
 * Pixi の Assets を使った読み込み処理(画像 → Texture)。
 *
 * 仮仕様: 現在は画像(Texture)だけを扱う。音声やフォントなどは必要になった時点で対応する。
 */
import { Assets, Texture } from 'pixi.js';
import type { AssetLoader } from './assetTypes';

export const pixiTextureLoader: AssetLoader<Texture> = {
  async load(url: string): Promise<Texture> {
    // Pixi の既定では、読み込みに失敗すると例外になり、キャッシュからも消える(再試行できる)
    const asset: unknown = await Assets.load(url);
    if (!(asset instanceof Texture)) {
      throw new Error(`画像として読み込めませんでした: ${url}`);
    }
    return asset;
  },
  unload(url: string): Promise<void> {
    // テクスチャの破棄(GPU メモリの解放)まで行われる
    return Assets.unload(url);
  },
};

/** テクスチャが使う GPU メモリの推定値(縦 × 横 × 4 バイト) */
export function measureTexture(texture: Texture): number {
  const { pixelWidth, pixelHeight } = texture.source;
  return pixelWidth * pixelHeight * 4;
}
