/**
 * AssetManager: マニフェストに従い、バンドル単位でアセットを読み込み・解放する。
 *
 * - acquire(): バンドルを読み込み、参照数を 1 増やす。読み込み中・読み込み済みなら重複して読み込まない
 *   (await せずに呼べば先読みとして使える。使い終わったら release() する)
 * - release(): 参照数を 1 減らし、0 になったら解放する(読み込み中なら、完了後に解放する)
 * - 失敗したアセットは設定回数だけ再試行する。最終的に失敗した場合:
 *     必須バンドル(boot など)… acquire() が失敗する(呼び出し側で起動エラーを表示する)
 *     それ以外 … 代わりのアセット(fallback)を使って続行する
 *   どちらの場合も failures に記録し、onFailure を呼ぶ
 *
 * 読み込み処理(AssetLoader)は外から渡すため、このクラスは Pixi に依存せずテストできる。
 * 同じファイルを複数のバンドルが含む場合は、どのバンドルも使わなくなるまで解放しない。
 */
import type {
  AssetFailure,
  AssetKey,
  AssetLoader,
  AssetManifest,
  BundleName,
  BundleState,
  BundleStatus,
  ProgressListener,
} from './assetTypes';

export interface AssetManagerOptions<T> {
  readonly loader: AssetLoader<T>;
  /** 初回の失敗後に再試行する回数 */
  readonly retryCount: number;
  /** 再試行までの待ち時間(ミリ秒) */
  readonly retryDelayMs: number;
  /** 読み込めなかった場合に起動エラーにするバンドル */
  readonly criticalBundles: readonly string[];
  /** 読み込めなかったアセットの代わり(必要になったときに1回だけ呼ぶ) */
  readonly createFallback: () => T;
  /** アセットが使う GPU メモリの推定値(バイト) */
  readonly measure: (asset: T) => number;
  /** 最終的に読み込めなかったときの通知 */
  readonly onFailure?: (failure: AssetFailure) => void;
  /** 待機処理(テストで差し替える) */
  readonly wait?: (ms: number) => Promise<void>;
}

/** 必須バンドルが読み込めなかったときのエラー */
export class AssetLoadError extends Error {
  constructor(readonly failure: AssetFailure) {
    super(`アセットを読み込めませんでした: ${failure.bundle}/${failure.key} (${failure.url}, ${failure.attempts} 回試行)`);
    this.name = 'AssetLoadError';
  }
}

interface BundleEntry<T> {
  refCount: number;
  state: BundleState;
  progress: number;
  promise: Promise<void>;
  /** キー → アセット(代わりのアセットを含む) */
  readonly assets: Map<string, T>;
  /** 実際に読み込めたファイル → アセット(代わりのアセットは含まない) */
  readonly loaded: Map<string, T>;
  readonly listeners: Set<ProgressListener>;
}

const defaultWait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class AssetManager<M extends AssetManifest, T> {
  private readonly entries = new Map<string, BundleEntry<T>>();
  /** ファイルごとの利用数(同じファイルを含むバンドルの数) */
  private readonly urlUsers = new Map<string, number>();
  /** 読み込みに成功し、まだ解放していないファイル */
  private readonly loadedUrls = new Set<string>();
  private readonly failureLog: AssetFailure[] = [];
  private fallback: T | null = null;

  constructor(
    private readonly manifest: M,
    private readonly options: AssetManagerOptions<T>,
  ) {}

  /** これまでに最終的に読み込めなかったアセット */
  get failures(): readonly AssetFailure[] {
    return this.failureLog;
  }

  /**
   * バンドルを読み込み、参照数を 1 増やす。
   * 読み込み中・読み込み済みなら同じ読み込みを共有する(重複して読み込まない)。
   */
  acquire(bundle: BundleName<M>, onProgress?: ProgressListener): Promise<void> {
    const existing = this.entries.get(bundle);
    if (existing !== undefined) {
      existing.refCount += 1;
      if (onProgress !== undefined) {
        if (existing.state === 'loaded') {
          onProgress(1);
        } else {
          existing.listeners.add(onProgress);
        }
      }
      return existing.promise;
    }

    const listeners = new Set<ProgressListener>();
    if (onProgress !== undefined) {
      listeners.add(onProgress);
    }
    const entry: BundleEntry<T> = {
      refCount: 1,
      state: 'loading',
      progress: 0,
      promise: Promise.resolve(),
      assets: new Map(),
      loaded: new Map(),
      listeners,
    };
    this.entries.set(bundle, entry);
    entry.promise = this.loadBundle(bundle, entry);
    return entry.promise;
  }

  /**
   * 参照数を 1 減らす。0 になったら解放する。
   * 読み込まれていないバンドルを指定した場合は何もせず false を返す。
   */
  release(bundle: BundleName<M>): boolean {
    const entry = this.entries.get(bundle);
    if (entry === undefined || entry.refCount <= 0) {
      return false;
    }
    entry.refCount -= 1;
    if (entry.refCount === 0 && entry.state === 'loaded') {
      this.unloadEntry(bundle);
    }
    return true;
  }

  /** 読み込み済みのバンドルからアセットを取り出す。読み込み済みでなければエラー */
  get<B extends BundleName<M>>(bundle: B, key: AssetKey<M, B>): T {
    const entry = this.entries.get(bundle);
    const asset = entry?.state === 'loaded' ? entry.assets.get(key) : undefined;
    if (asset === undefined) {
      throw new Error(`バンドル "${bundle}" が読み込まれていないため、"${key}" を取り出せません`);
    }
    return asset;
  }

  /** バンドルが読み込み済みか */
  isLoaded(bundle: BundleName<M>): boolean {
    return this.entries.get(bundle)?.state === 'loaded';
  }

  /** 読み込み中・読み込み済みのバンドルの状況 */
  getBundleStatuses(): BundleStatus[] {
    return [...this.entries].map(([name, e]) => ({
      name,
      state: e.state,
      refCount: e.refCount,
      progress: e.progress,
    }));
  }

  /** 読み込み済みのアセットが使う GPU メモリの推定値(バイト)。同じファイルは1回だけ数える */
  estimateBytes(): number {
    const counted = new Map<string, T>();
    for (const entry of this.entries.values()) {
      if (entry.state === 'loaded') {
        for (const [url, asset] of entry.loaded) {
          counted.set(url, asset);
        }
      }
    }
    let total = 0;
    for (const asset of counted.values()) {
      total += this.options.measure(asset);
    }
    return total;
  }

  private async loadBundle(bundle: string, entry: BundleEntry<T>): Promise<void> {
    const items = Object.entries(this.manifest[bundle] ?? {});
    const critical = this.options.criticalBundles.includes(bundle);
    let done = 0;
    const report = (): void => {
      entry.progress = items.length === 0 ? 1 : done / items.length;
      for (const listener of entry.listeners) {
        listener(entry.progress);
      }
    };

    // 必須バンドルでも、すべてのアセットの結果が出るまで待つ
    // (途中で打ち切ると、後から完了したアセットが解放されずに残るため)
    let criticalFailure: AssetFailure | null = null;
    await Promise.all(
      items.map(async ([key, url]) => {
        this.urlUsers.set(url, (this.urlUsers.get(url) ?? 0) + 1);
        const result = await this.loadWithRetry(url);
        if (result.ok) {
          entry.assets.set(key, result.asset);
          entry.loaded.set(url, result.asset);
          this.loadedUrls.add(url);
        } else {
          const failure: AssetFailure = { bundle, key, url, attempts: result.attempts, error: result.error, critical };
          this.failureLog.push(failure);
          this.options.onFailure?.(failure);
          criticalFailure ??= critical ? failure : null;
          entry.assets.set(key, this.getFallback());
        }
        done += 1;
        report();
      }),
    );

    if (criticalFailure !== null) {
      // 必須バンドルの失敗: 読み込めた分も解放し、なかったことにする
      this.unloadEntry(bundle);
      throw new AssetLoadError(criticalFailure);
    }

    report();
    entry.state = 'loaded';
    entry.listeners.clear();
    if (entry.refCount === 0) {
      // 読み込み中に release された
      this.unloadEntry(bundle);
    }
  }

  private async loadWithRetry(
    url: string,
  ): Promise<{ ok: true; asset: T } | { ok: false; attempts: number; error: unknown }> {
    const maxAttempts = 1 + Math.max(0, this.options.retryCount);
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return { ok: true, asset: await this.options.loader.load(url) };
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await (this.options.wait ?? defaultWait)(this.options.retryDelayMs);
        }
      }
    }
    return { ok: false, attempts: maxAttempts, error: lastError };
  }

  private unloadEntry(bundle: string): void {
    this.entries.delete(bundle);
    this.releaseUrls(Object.values(this.manifest[bundle] ?? {}));
  }

  /** ファイルの利用数を減らし、どのバンドルも使わなくなったものを解放する */
  private releaseUrls(urls: readonly string[]): void {
    for (const url of urls) {
      const users = (this.urlUsers.get(url) ?? 1) - 1;
      if (users > 0) {
        this.urlUsers.set(url, users);
        continue;
      }
      this.urlUsers.delete(url);
      if (this.loadedUrls.delete(url)) {
        void this.options.loader.unload(url);
      }
    }
  }

  private getFallback(): T {
    this.fallback ??= this.options.createFallback();
    return this.fallback;
  }
}
