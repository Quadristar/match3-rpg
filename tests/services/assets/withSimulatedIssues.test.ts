import { describe, expect, it, vi } from 'vitest';
import type { AssetLoader } from '../../../src/services/assets/assetTypes';
import { withSimulatedIssues } from '../../../src/services/assets/withSimulatedIssues';

function baseLoader(): AssetLoader<string> {
  return { load: vi.fn((url: string) => Promise.resolve(`asset:${url}`)), unload: vi.fn() };
}

describe('withSimulatedIssues', () => {
  it('指定がなければ元の読み込み処理をそのまま返す', () => {
    const loader = baseLoader();
    expect(withSimulatedIssues(loader, { failUrls: new Set(), delayMs: 0 })).toBe(loader);
  });

  it('指定したファイルだけ失敗させる', async () => {
    const loader = withSimulatedIssues(baseLoader(), { failUrls: new Set(['a.png']), delayMs: 0 });
    await expect(loader.load('a.png')).rejects.toThrow();
    await expect(loader.load('b.png')).resolves.toBe('asset:b.png');
  });

  it('読み込みの前に待ち時間を入れる', async () => {
    const wait = vi.fn(() => Promise.resolve());
    const loader = withSimulatedIssues(baseLoader(), { failUrls: new Set(), delayMs: 800 }, wait);
    await loader.load('a.png');
    expect(wait).toHaveBeenCalledWith(800);
  });
});
