import { describe, expect, it } from 'vitest';
import { ObjectPool } from '../../src/core/ObjectPool';

interface Item {
  id: number;
  value: number;
  disposed: boolean;
}

function createPool(maxSize?: number) {
  let nextId = 0;
  return new ObjectPool<Item>({
    create: () => ({ id: nextId++, value: 0, disposed: false }),
    reset: (item) => {
      item.value = 0;
    },
    dispose: (item) => {
      item.disposed = true;
    },
    ...(maxSize === undefined ? {} : { maxSize }),
  });
}

describe('ObjectPool', () => {
  it('空なら新しく作る', () => {
    const pool = createPool();
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a).not.toBe(b);
    expect(pool.createdCount).toBe(2);
  });

  it('返した物を再利用し、reset で初期状態に戻す', () => {
    const pool = createPool();
    const a = pool.acquire();
    a.value = 5;
    pool.release(a);
    expect(pool.freeCount).toBe(1);
    const again = pool.acquire();
    expect(again).toBe(a);
    expect(again.value).toBe(0);
    expect(pool.createdCount).toBe(1);
    expect(pool.freeCount).toBe(0);
  });

  it('二重に返すとエラー', () => {
    const pool = createPool();
    const a = pool.acquire();
    pool.release(a);
    expect(() => pool.release(a)).toThrow(/二重/);
  });

  it('上限を超える分は保管せずに破棄する', () => {
    const pool = createPool(1);
    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);
    expect(pool.freeCount).toBe(1);
    expect(a.disposed).toBe(false);
    expect(b.disposed).toBe(true);
  });

  it('clear で保管中の物をすべて破棄する', () => {
    const pool = createPool();
    const [first, second, inUse] = [pool.acquire(), pool.acquire(), pool.acquire()];
    const items = [first, second];
    for (const item of items) pool.release(item);
    pool.clear();
    expect(pool.freeCount).toBe(0);
    expect(items.every((item) => item.disposed)).toBe(true);
    expect(inUse.disposed).toBe(false);
    // clear の後に返した物は、また保管できる
    pool.release(first);
    expect(pool.freeCount).toBe(1);
  });

  it('maxSize が負ならエラー', () => {
    expect(() => new ObjectPool({ create: () => ({}), maxSize: -1 })).toThrow(RangeError);
  });
});
