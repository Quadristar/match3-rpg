import type { QualitySpecs } from '../services/settings/quality';

/**
 * 描画の設定値。
 * docs/ARCHITECTURE.md「メモリ管理」「技術構成」の方針に合わせる。
 */
export const RENDER_CONFIG = {
  /** 背景色 */
  backgroundColor: 0x1b1e2b,
  /**
   * 品質プリセットごとの描画解像度の上限。devicePixelRatio をそのまま使うと
   * 高密度な端末で GPU メモリと負荷が大きくなるため、上限で頭打ちにする
   */
  quality: {
    low: { maxResolution: 1.5 },
    medium: { maxResolution: 2 },
    high: { maxResolution: 2 },
  } satisfies QualitySpecs,
  /** アンチエイリアス */
  antialias: true,
} as const;
