/**
 * オブジェクトプール: 頻繁に作っては捨てる物(パネルの表示物・パーティクルなど)を再利用する。
 *
 * - acquire() で取り出す。空いている物がなければ create() で作る
 * - release() で返す。reset() で初期状態に戻してから保管する
 * - 保管数が maxSize を超える分は dispose() で破棄する
 * - clear() で保管中の物をすべて dispose() する(シーンの終了時など)
 *
 * 外部に依存しない(core)。表示物の破棄などは dispose に渡す関数で行う。
 */
export interface ObjectPoolOptions<T> {
  /** 新しく作る */
  readonly create: () => T;
  /** 返されたときに初期状態に戻す */
  readonly reset?: (item: T) => void;
  /** 保管しない物・clear() した物を破棄する */
  readonly dispose?: (item: T) => void;
  /** 保管する数の上限(既定: 上限なし) */
  readonly maxSize?: number;
}

export class ObjectPool<T> {
  private readonly free: T[] = [];
  /** 二重に返されていないかを調べるため、保管中の物を覚えておく */
  private readonly freeSet = new Set<T>();
  private created = 0;

  constructor(private readonly options: ObjectPoolOptions<T>) {
    const maxSize = options.maxSize ?? Number.POSITIVE_INFINITY;
    if (!(maxSize >= 0)) {
      throw new RangeError(`ObjectPool: maxSize は 0 以上にしてください (${maxSize})`);
    }
  }

  /** 保管中(すぐに取り出せる)の数 */
  get freeCount(): number {
    return this.free.length;
  }

  /** これまでに create() で作った数 */
  get createdCount(): number {
    return this.created;
  }

  /** 1つ取り出す */
  acquire(): T {
    const item = this.free.pop();
    if (item !== undefined) {
      this.freeSet.delete(item);
      return item;
    }
    this.created += 1;
    return this.options.create();
  }

  /** 返す。同じ物を二重に返したらエラー */
  release(item: T): void {
    if (this.freeSet.has(item)) {
      throw new Error('ObjectPool: 同じ物が二重に返されました');
    }
    this.options.reset?.(item);
    if (this.free.length >= (this.options.maxSize ?? Number.POSITIVE_INFINITY)) {
      this.options.dispose?.(item);
      return;
    }
    this.free.push(item);
    this.freeSet.add(item);
  }

  /** 保管中の物をすべて破棄する(取り出し中の物は対象外) */
  clear(): void {
    const items = this.free.splice(0);
    this.freeSet.clear();
    for (const item of items) {
      this.options.dispose?.(item);
    }
  }
}
