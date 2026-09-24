import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../src/core/SeededRng';

/** 指定回数だけ next() を呼んだ結果を配列で返す */
function take(rng: SeededRng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe('SeededRng', () => {
  it('同じシードなら同じ乱数列になる', () => {
    expect(take(new SeededRng(42), 100)).toEqual(take(new SeededRng(42), 100));
  });

  it('異なるシードなら異なる乱数列になる', () => {
    expect(take(new SeededRng(1), 10)).not.toEqual(take(new SeededRng(2), 10));
  });

  it('既知のシードの出力が変わらない(アルゴリズムの意図しない変更を検出する)', () => {
    const rng = new SeededRng(12345);
    expect(Array.from({ length: 5 }, () => rng.nextUint32())).toEqual([
      2345461488, 1344865159, 2974739204, 3448212715, 1746298622,
    ]);
    const zero = new SeededRng(0);
    expect(Array.from({ length: 3 }, () => zero.nextUint32())).toEqual([
      4205396811, 3543653536, 1222415357,
    ]);
  });

  it('シードは 32bit 符号なし整数に丸めて扱う', () => {
    expect(take(new SeededRng(-1), 5)).toEqual(take(new SeededRng(0xffffffff), 5));
  });

  it('整数でないシードはエラーになる', () => {
    expect(() => new SeededRng(1.5)).toThrow(RangeError);
    expect(() => new SeededRng(Number.NaN)).toThrow(RangeError);
  });

  it('next() は 0 以上 1 未満を返す', () => {
    for (const v of take(new SeededRng(7), 10000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt() は両端を含む範囲の整数を返し、すべての値が出現する', () => {
    const rng = new SeededRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.nextInt(-3, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
  });

  it('nextInt() は min === max のときその値を返す', () => {
    expect(new SeededRng(5).nextInt(4, 4)).toBe(4);
  });

  it('nextInt() は不正な範囲でエラーになる', () => {
    const rng = new SeededRng(1);
    expect(() => rng.nextInt(3, 2)).toThrow(RangeError);
    expect(() => rng.nextInt(0.5, 2)).toThrow(RangeError);
    expect(() => rng.nextInt(0, 2 ** 32)).toThrow(RangeError);
  });

  it('nextFloat() は min 以上 max 未満を返す', () => {
    const rng = new SeededRng(11);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextFloat(-2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
    expect(() => rng.nextFloat(1, 0)).toThrow(RangeError);
  });

  it('chance() は 0 なら常に false、1 なら常に true', () => {
    const rng = new SeededRng(3);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
    expect(() => rng.chance(1.1)).toThrow(RangeError);
    expect(() => rng.chance(Number.NaN)).toThrow(RangeError);
  });

  it('pick() は配列の要素を返し、空配列ではエラーになる', () => {
    const rng = new SeededRng(8);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('shuffle() は元の配列を変更せず、同じ要素の並べ替えを返す', () => {
    const rng = new SeededRng(13);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = original.slice();
    const shuffled = rng.shuffle(original);
    expect(original).toEqual(copy);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(copy);
    expect(new SeededRng(13).shuffle(original)).toEqual(shuffled);
  });

  it('getState() / setState() で途中から同じ乱数列を再現できる', () => {
    const rng = new SeededRng(2024);
    take(rng, 10);
    const state = rng.getState();
    const expected = take(rng, 20);

    const restored = new SeededRng(0);
    restored.setState(state);
    expect(take(restored, 20)).toEqual(expected);
  });

  it('setState() は不正な状態でエラーになる', () => {
    const rng = new SeededRng(1);
    expect(() => rng.setState([1, 2, 3, -1])).toThrow(RangeError);
    expect(() => rng.setState([1, 2, 3, 2 ** 32])).toThrow(RangeError);
    expect(() => rng.setState([1, 2, 3, 0.5])).toThrow(RangeError);
  });
});
