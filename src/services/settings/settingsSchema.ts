/**
 * 設定の保存形式(SaveManager で保存する)。
 */
import type { SaveSchema } from '../save/saveTypes';
import { QUALITY_PRESETS, type SettingsData, VOLUME_CATEGORIES } from './settingsTypes';

/** 設定の保存キー */
export const SETTINGS_SAVE_KEY = 'settings';

function isVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isSettingsData(data: unknown): data is SettingsData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { volume, muted, quality } = data as Record<string, unknown>;
  return (
    typeof volume === 'object' &&
    volume !== null &&
    VOLUME_CATEGORIES.every((category) => isVolume((volume as Record<string, unknown>)[category])) &&
    typeof muted === 'boolean' &&
    QUALITY_PRESETS.includes(quality as SettingsData['quality'])
  );
}

export function createSettingsSchema(defaults: SettingsData): SaveSchema<SettingsData> {
  return {
    key: SETTINGS_SAVE_KEY,
    version: 1,
    createDefault: () => ({ ...defaults, volume: { ...defaults.volume } }),
    validate: isSettingsData,
  };
}
