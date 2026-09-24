/**
 * 保存先の実装。
 */
import type { SaveStorage } from './saveTypes';

/** メモリ上の保存先(テスト用。localStorage を使えないときの代わり) */
export class MemoryStorage implements SaveStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  /** 保存されているキー(テスト用) */
  keys(): string[] {
    return [...this.items.keys()];
  }
}

/** 書き込みが常に失敗する保存先(容量超過の再現用。?debug&savefail で使う) */
export class FailingStorage implements SaveStorage {
  constructor(private readonly base: SaveStorage) {}

  getItem(key: string): string | null {
    return this.base.getItem(key);
  }
  setItem(key: string): void {
    throw new Error(`動作確認のため書き込みを失敗させました: ${key}`);
  }
  removeItem(key: string): void {
    this.base.removeItem(key);
  }
}

/**
 * ブラウザの localStorage を開く。使えない場合(プライベートブラウズ・無効化など)は
 * メモリ上の保存先を返し、available を false にする。
 */
export function openBrowserStorage(probeKey: string): { storage: SaveStorage; available: boolean; error?: unknown } {
  try {
    const storage = window.localStorage;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return { storage, available: true };
  } catch (error) {
    return { storage: new MemoryStorage(), available: false, error };
  }
}
