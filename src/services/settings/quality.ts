/**
 * 品質プリセットから描画解像度を決める。
 */
import type { QualityPreset } from './settingsTypes';

/** 品質プリセットごとの描画の設定 */
export interface QualitySpec {
  /** 描画解像度の上限(devicePixelRatio がこれより大きくても、この値にする) */
  readonly maxResolution: number;
}

export type QualitySpecs = Readonly<Record<QualityPreset, QualitySpec>>;

/** 描画解像度 = min(devicePixelRatio, 品質プリセットの上限) */
export function renderResolution(devicePixelRatio: number, quality: QualityPreset, specs: QualitySpecs): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, specs[quality].maxResolution);
}
