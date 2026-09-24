/**
 * セーブと設定を用意する(localStorage を開き、SaveManager と Settings を作る)。
 */
import type { DebugOptions } from '../presentation/debug/debugOptions';
import { SaveManager } from '../services/save/SaveManager';
import { FailingStorage, openBrowserStorage } from '../services/save/storages';
import { Settings } from '../services/settings/Settings';
import { GAME_CONFIG } from './gameConfig';

export function createPersistence(debug: DebugOptions): { save: SaveManager; settings: Settings } {
  const opened = openBrowserStorage(`${GAME_CONFIG.gameId}:__probe__`);
  // ?debug&savefail … 書き込みをわざと失敗させる
  const storage = debug.saveFail ? new FailingStorage(opened.storage) : opened.storage;

  const save = new SaveManager({
    gameId: GAME_CONFIG.gameId,
    storage,
    available: opened.available,
    onIssue: (issue) => {
      console.warn(`[SaveManager] ${issue.kind}: ${issue.key} ${issue.detail}`, issue.error ?? opened.error ?? '');
    },
  });
  const settings = new Settings({
    save,
    defaults: GAME_CONFIG.settings.defaults,
    saveDelayMs: GAME_CONFIG.settings.saveDelayMs,
  });

  // ページを閉じる・裏に回る前に、保留中の設定を保存する
  const flush = (): void => settings.flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });

  return { save, settings };
}
