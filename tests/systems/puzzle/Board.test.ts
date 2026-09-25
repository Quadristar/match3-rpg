import { describe, expect, it } from 'vitest';
import { boardFromGrid, createTile, isAdjacent, isInside } from '../../../src/systems/puzzle/Board';
import { at, boardToText, cell, parseBoard } from './boardText';

describe('盤面の補助関数', () => {
  it('文字の盤面を読み書きできる(A が種類 0)', () => {
    const board = parseBoard(`
      ABC
      CAB
    `);
    expect(board.rows).toBe(2);
    expect(board.cols).toBe(3);
    expect(at(board.tiles, 1)[0]).toEqual({ kind: 2, modifiers: [] });
    expect(boardToText(board)).toEqual(['ABC', 'CAB']);
  });

  it('空きマスや長さの違う行がある盤面は作れない', () => {
    expect(() => boardFromGrid([[createTile(0), null]])).toThrow();
    expect(() => boardFromGrid([[createTile(0), createTile(1)], [createTile(0)]])).toThrow(RangeError);
    expect(() => boardFromGrid([])).toThrow(RangeError);
  });

  it('isInside: 盤面の内側か', () => {
    const board = parseBoard('ABC\nCAB');
    expect(isInside(board, cell(1, 2))).toBe(true);
    expect(isInside(board, cell(2, 0))).toBe(false);
    expect(isInside(board, cell(0, -1))).toBe(false);
    expect(isInside(board, cell(0.5, 0))).toBe(false);
  });

  it('isAdjacent: 上下左右の隣だけ', () => {
    expect(isAdjacent(cell(1, 1), cell(0, 1))).toBe(true);
    expect(isAdjacent(cell(1, 1), cell(1, 2))).toBe(true);
    expect(isAdjacent(cell(1, 1), cell(1, 1))).toBe(false);
    expect(isAdjacent(cell(1, 1), cell(2, 2))).toBe(false);
    expect(isAdjacent(cell(1, 1), cell(1, 3))).toBe(false);
  });
});
