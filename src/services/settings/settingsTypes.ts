/**
 * 設定の型。
 */

/** 品質プリセット */
export type QualityPreset = 'low' | 'medium' | 'high';

export const QUALITY_PRESETS: readonly QualityPreset[] = ['low', 'medium', 'high'];

/** 音量の種類 */
export type VolumeCategory = 'master' | 'bgm' | 'se' | 'voice';

export const VOLUME_CATEGORIES: readonly VolumeCategory[] = ['master', 'bgm', 'se', 'voice'];

/** 保存する設定 */
export interface SettingsData {
  /** 音量(0〜1) */
  readonly volume: Readonly<Record<VolumeCategory, number>>;
  readonly muted: boolean;
  readonly quality: QualityPreset;
}
