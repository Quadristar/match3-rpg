/**
 * AssetManager のテスト。Pixi の代わりに偽の読み込み処理を使う。
 */
import { describe, expect, it, vi } from 'vitest';
import { AssetLoadError, AssetManager } from '../../../src/services/assets/AssetManager';
import type { AssetFailure, AssetLoader, AssetManifest } from '../../../src/services/assets/assetTypes';

const MANIFEST = {
  boot: { logo: 'boot/logo.png' },
  title: { bg: 'title/bg.png', button: 'common/button.png' },
  stage: { bg: 'stage/bg.png', button: 'common/button.png' },
  empty: {},
} as const satisfies AssetManifest;

/** 偽のアセット: どのファイルから作られたかと、大きさを持つ */
interface FakeAsset {
  readonly url: string;
  readonly bytes: number;
}

/** 手動で完了させられる、偽の読み込み処理 */
class FakeLoader implements AssetLoader<FakeAsset> {
  readonly loadCalls: string[] = [];
  readonly unloadCalls: string[] = [];
  /** 失敗させる残り回数(ファイルごと)。Infinity なら常に失敗 */
  readonly failures = new Map<string, number>();
  /** true の間は完了を保留する */
  hold = false;
  private readonly pending: (() => void)[] = [];

  load(url: string): Promise<FakeAsset> {
    this.loadCalls.push(url);
    const remaining = this.failures.get(url) ?? 0;
    if (remaining > 0) {
      this.failures.set(url, remaining - 1);
      return Promise.reject(new Error(`not found: ${url}`));
    }
    const asset = { url, bytes: 100 };
    if (!this.hold) {
      return Promise.resolve(asset);
    }
    return new Promise((resolve) => this.pending.push(() => resolve(asset)));
  }

  unload(url: string): void {
    this.unloadCalls.push(url);
  }

  /** 保留中の読み込みをすべて完了させる */
  flush(): void {
    this.hold = false;
    for (const resolve of this.pending.splice(0)) {
      resolve();
    }
  }
}

const FALLBACK: FakeAsset = { url: '(fallback)', bytes: 4 };

function setup(options: { retryCount?: number } = {}) {
  const loader = new FakeLoader();
  const wait = vi.fn(() => Promise.resolve());
  const onFailure = vi.fn<(failure: AssetFailure) => void>();
  const createFallback = vi.fn(() => FALLBACK);
  const manager = new AssetManager(MANIFEST, {
    loader,
    retryCount: options.retryCount ?? 2,
    retryDelayMs: 500,
    criticalBundles: ['boot'],
    createFallback,
    measure: (asset) => asset.bytes,
    onFailure,
    wait,
  });
  return { loader, manager, wait, onFailure, createFallback };
}

/** 保留中の Promise のコールバックを実行させる */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AssetManager: 読み込みと取り出し', () => {
  it('バンドルのすべてのアセットを読み込み、キーで取り出せる', async () => {
    const { manager, loader } = setup();
    await manager.acquire('title');
    expect(loader.loadCalls.sort()).toEqual(['common/button.png', 'title/bg.png']);
    expect(manager.isLoaded('title')).toBe(true);
    expect(manager.get('title', 'bg').url).toBe('title/bg.png');
  });

  it('読み込んでいないバンドルから取り出すとエラー', () => {
    const { manager } = setup();
    expect(() => manager.get('title', 'bg')).toThrow();
  });

  it('進捗を 0〜1 で通知し、最後は 1 になる', async () => {
    const { manager } = setup();
    const progress: number[] = [];
    await manager.acquire('title', (p) => progress.push(p));
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it('アセットのないバンドルもすぐに読み込み済みになる', async () => {
    const { manager } = setup();
    await manager.acquire('empty');
    expect(manager.isLoaded('empty')).toBe(true);
  });
});

describe('AssetManager: 重複防止と参照カウント', () => {
  it('読み込み中に同じバンドルを要求しても、ファイルは1回しか読み込まない', async () => {
    const { manager, loader } = setup();
    loader.hold = true;
    const first = manager.acquire('title');
    const second = manager.acquire('title');
    loader.flush();
    await Promise.all([first, second]);
    expect(loader.loadCalls).toHaveLength(2);
    expect(manager.getBundleStatuses()).toEqual([{ name: 'title', state: 'loaded', refCount: 2, progress: 1 }]);
  });

  it('読み込み済みのバンドルを要求しても再読み込みせず、進捗 1 をすぐ通知する', async () => {
    const { manager, loader } = setup();
    await manager.acquire('title');
    const onProgress = vi.fn();
    await manager.acquire('title', onProgress);
    expect(loader.loadCalls).toHaveLength(2);
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it('参照数が 0 になったときだけ解放する', async () => {
    const { manager, loader } = setup();
    await manager.acquire('title');
    await manager.acquire('title');
    manager.release('title');
    expect(loader.unloadCalls).toEqual([]);
    expect(manager.isLoaded('title')).toBe(true);
    manager.release('title');
    expect(loader.unloadCalls.sort()).toEqual(['common/button.png', 'title/bg.png']);
    expect(manager.isLoaded('title')).toBe(false);
    expect(manager.getBundleStatuses()).toEqual([]);
  });

  it('解放後にもう一度要求すると、読み込み直す', async () => {
    const { manager, loader } = setup();
    await manager.acquire('empty');
    await manager.acquire('title');
    manager.release('title');
    await manager.acquire('title');
    expect(loader.loadCalls).toHaveLength(4);
  });

  it('読み込み中に参照が 0 になった場合は、読み込み完了後に解放する', async () => {
    const { manager, loader } = setup();
    loader.hold = true;
    const promise = manager.acquire('title');
    manager.release('title');
    loader.flush();
    await promise;
    expect(loader.unloadCalls.sort()).toEqual(['common/button.png', 'title/bg.png']);
    expect(manager.isLoaded('title')).toBe(false);
  });

  it('読み込み中に参照が 0 になっても、完了前に再び要求されれば解放しない', async () => {
    const { manager, loader } = setup();
    loader.hold = true;
    const promise = manager.acquire('title');
    manager.release('title');
    const again = manager.acquire('title');
    loader.flush();
    await Promise.all([promise, again]);
    expect(loader.unloadCalls).toEqual([]);
    expect(manager.isLoaded('title')).toBe(true);
  });

  it('複数のバンドルが含む同じファイルは、どちらも使わなくなるまで解放しない', async () => {
    const { manager, loader } = setup();
    await manager.acquire('title');
    await manager.acquire('stage');
    manager.release('title');
    expect(loader.unloadCalls).toEqual(['title/bg.png']);
    manager.release('stage');
    expect(loader.unloadCalls.sort()).toEqual(['common/button.png', 'stage/bg.png', 'title/bg.png']);
  });

  it('読み込んでいないバンドルの release は何もせず false を返す', () => {
    const { manager, loader } = setup();
    expect(manager.release('title')).toBe(false);
    expect(loader.unloadCalls).toEqual([]);
  });
});

describe('AssetManager: 失敗と再試行', () => {
  it('失敗したら設定回数まで待ってから再試行し、成功すればそのまま使う', async () => {
    const { manager, loader, wait, onFailure } = setup({ retryCount: 2 });
    loader.failures.set('title/bg.png', 2);
    await manager.acquire('title');
    expect(loader.loadCalls.filter((u) => u === 'title/bg.png')).toHaveLength(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(500);
    expect(manager.get('title', 'bg').url).toBe('title/bg.png');
    expect(onFailure).not.toHaveBeenCalled();
    expect(manager.failures).toEqual([]);
  });

  it('必須でないバンドルが最終的に失敗したら、代わりのアセットで続行し、失敗を記録する', async () => {
    const { manager, loader, onFailure } = setup({ retryCount: 2 });
    loader.failures.set('title/bg.png', Infinity);
    await manager.acquire('title');
    expect(loader.loadCalls.filter((u) => u === 'title/bg.png')).toHaveLength(3);
    expect(manager.get('title', 'bg')).toBe(FALLBACK);
    expect(manager.get('title', 'button').url).toBe('common/button.png');
    expect(manager.failures).toHaveLength(1);
    expect(manager.failures[0]).toMatchObject({ bundle: 'title', key: 'bg', url: 'title/bg.png', attempts: 3, critical: false });
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it('代わりのアセットは解放しない', async () => {
    const { manager, loader } = setup();
    loader.failures.set('title/bg.png', Infinity);
    await manager.acquire('title');
    manager.release('title');
    expect(loader.unloadCalls).toEqual(['common/button.png']);
  });

  it('必須バンドル(boot)が最終的に失敗したら acquire が失敗し、失敗を記録して読み込めた分も解放する', async () => {
    const { manager, loader } = setup({ retryCount: 1 });
    loader.failures.set('boot/logo.png', Infinity);
    await expect(manager.acquire('boot')).rejects.toBeInstanceOf(AssetLoadError);
    expect(manager.failures[0]).toMatchObject({ bundle: 'boot', attempts: 2, critical: true });
    expect(manager.isLoaded('boot')).toBe(false);
    expect(manager.getBundleStatuses()).toEqual([]);
  });

  it('retryCount が 0 なら再試行しない', async () => {
    const { manager, loader, wait } = setup({ retryCount: 0 });
    loader.failures.set('title/bg.png', Infinity);
    await manager.acquire('title');
    expect(loader.loadCalls.filter((u) => u === 'title/bg.png')).toHaveLength(1);
    expect(wait).not.toHaveBeenCalled();
  });
});

describe('AssetManager: 状況と推定メモリ', () => {
  it('読み込み中のバンドルは loading、進捗は途中の値になる', async () => {
    const { manager, loader } = setup();
    loader.hold = true;
    const promise = manager.acquire('title');
    await flushPromises();
    expect(manager.getBundleStatuses()[0]).toMatchObject({ name: 'title', state: 'loading', refCount: 1 });
    loader.flush();
    await promise;
    expect(manager.getBundleStatuses()[0]).toMatchObject({ state: 'loaded', progress: 1 });
  });

  it('推定メモリは読み込み済みのファイルの合計で、同じファイルは1回だけ数え、代わりのアセットは含まない', async () => {
    const { manager, loader } = setup();
    expect(manager.estimateBytes()).toBe(0);
    await manager.acquire('title');
    expect(manager.estimateBytes()).toBe(200);
    await manager.acquire('stage');
    expect(manager.estimateBytes()).toBe(300);
    manager.release('title');
    expect(manager.estimateBytes()).toBe(200);
    manager.release('stage');
    expect(manager.estimateBytes()).toBe(0);

    loader.failures.set('title/bg.png', Infinity);
    await manager.acquire('title');
    expect(manager.estimateBytes()).toBe(100); // 代わりのアセット(bg)は含まない
  });
});
