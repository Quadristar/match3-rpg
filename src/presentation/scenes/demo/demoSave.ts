/**
 * デモのセーブデータ: タップした回数(再読み込み後も残る)。
 * ゲームを作るときは、このファイルごと削除し、ゲーム用のセーブデータの形式に差し替える。
 */
import type { SaveSlot } from '../../../services/save/SaveManager';
import type { SaveSchema } from '../../../services/save/saveTypes';

export interface DemoSave {
  readonly tapCount: number;
}

export const demoSaveSchema: SaveSchema<DemoSave> = {
  key: 'demo',
  version: 1,
  createDefault: () => ({ tapCount: 0 }),
  validate: (data): data is DemoSave =>
    typeof data === 'object' && data !== null && Number.isInteger((data as DemoSave).tapCount),
};

/** タップ回数を 1 増やして保存し、新しい回数を返す */
export function addTap(save: SaveSlot<DemoSave>): number {
  const tapCount = save.get().tapCount + 1;
  save.set({ tapCount });
  return tapCount;
}
