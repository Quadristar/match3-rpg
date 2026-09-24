/**
 * セーブデータの形式。形を変えたら version を上げ、migrations に移行処理を足す。
 * 保存する中身は Phase 5(ゲームループ・セーブ)で決める。
 */
import type { SaveSchema } from '../../services/save/saveTypes';

export interface GameSave {
  readonly version: 1;
}

export const gameSaveSchema: SaveSchema<GameSave> = {
  key: 'game',
  version: 1,
  createDefault: () => ({ version: 1 }),
  validate: (data): data is GameSave => typeof data === 'object' && data !== null,
};
