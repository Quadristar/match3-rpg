import { describe, expect, it } from 'vitest';
import { BoardGeometry } from '../../../../src/presentation/views/board/BoardGeometry';

describe('BoardGeometry', () => {
  it('領域の中央に正方形のマスで置く(横長の領域)', () => {
    const g = new BoardGeometry({ x: 100, y: 50, width: 900, height: 700 }, 7, 7);
    expect(g.cellSize).toBe(100);
    expect(g.origin).toEqual({ x: 200, y: 50 });
    expect(g.width).toBe(700);
    expect(g.height).toBe(700);
  });

  it('縦長の領域・行と列が違う盤面', () => {
    const g = new BoardGeometry({ x: 0, y: 0, width: 600, height: 1000 }, 8, 6);
    expect(g.cellSize).toBe(100);
    expect(g.origin).toEqual({ x: 0, y: 100 });
  });

  it('マスの中心(盤面の左上が原点)。盤面の上のマスも計算できる', () => {
    const g = new BoardGeometry({ x: 0, y: 0, width: 700, height: 700 }, 7, 7);
    expect(g.localCenter({ row: 0, col: 0 })).toEqual({ x: 50, y: 50 });
    expect(g.localCenter({ row: 6, col: 3 })).toEqual({ x: 350, y: 650 });
    expect(g.localCenter({ row: -2, col: 1 })).toEqual({ x: 150, y: -150 });
  });

  it('点からマスを求める。盤面の外は null', () => {
    const g = new BoardGeometry({ x: 100, y: 100, width: 700, height: 700 }, 7, 7);
    expect(g.cellAt({ x: 100, y: 100 })).toEqual({ row: 0, col: 0 });
    expect(g.cellAt({ x: 799.9, y: 250 })).toEqual({ row: 1, col: 6 });
    expect(g.cellAt({ x: 800, y: 250 })).toBeNull();
    expect(g.cellAt({ x: 99, y: 250 })).toBeNull();
    expect(g.cellAt({ x: 300, y: 850 })).toBeNull();
  });

  it('大きさ 0 の領域でも例外にならない', () => {
    const g = new BoardGeometry({ x: 0, y: 0, width: 0, height: 0 }, 7, 7);
    expect(g.cellSize).toBe(0);
    expect(g.cellAt({ x: 0, y: 0 })).toBeNull();
  });
});
