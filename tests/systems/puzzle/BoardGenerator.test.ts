import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../../src/data/puzzleConfig';
import { generateBoard } from '../../../src/systems/puzzle/BoardGenerator';
import { hasMove } from '../../../src/systems/puzzle/DeadlockChecker';
import { findMatches } from '../../../src/systems/puzzle/MatchFinder';
import { boardToText } from './boardText';

describe('generateBoard', () => {
  it('同じシードなら同じ盤面になる', () => {
    expect(boardToText(generateBoard(new SeededRng(7)))).toEqual(boardToText(generateBoard(new SeededRng(7))));
  });

  it('異なるシードなら異なる盤面になる', () => {
    expect(boardToText(generateBoard(new SeededRng(1)))).not.toEqual(boardToText(generateBoard(new SeededRng(2))));
  });

  it('既定の設定(7×7・5種)の大きさと種類で作る', () => {
    const board = generateBoard(new SeededRng(3));
    expect(board.rows).toBe(PUZZLE_CONFIG.rows);
    expect(board.cols).toBe(PUZZLE_CONFIG.cols);
    expect(board.tiles).toHaveLength(7);
    for (const row of board.tiles) {
      expect(row).toHaveLength(7);
      for (const tile of row) {
        expect(tile.kind).toBeGreaterThanOrEqual(0);
        expect(tile.kind).toBeLessThan(5);
        expect(tile.modifiers).toEqual([]);
      }
    }
  });

  it('多数のシードで、揃っている箇所がなく、動かせる手が1つ以上ある', () => {
    for (let seed = 0; seed < 500; seed++) {
      const board = generateBoard(new SeededRng(seed));
      expect(findMatches(board), `seed ${seed}`).toEqual([]);
      expect(hasMove(board), `seed ${seed}`).toBe(true);
    }
  });

  it('設定を変えた盤面(5×6・3種)も条件を満たす', () => {
    const config: PuzzleConfig = { ...PUZZLE_CONFIG, rows: 5, cols: 6, kindCount: 3 };
    for (let seed = 0; seed < 100; seed++) {
      const board = generateBoard(new SeededRng(seed), config);
      expect(board.rows).toBe(5);
      expect(board.cols).toBe(6);
      expect(findMatches(board)).toEqual([]);
      expect(hasMove(board)).toBe(true);
    }
  });

  it('使えない設定はエラーになる', () => {
    const rng = new SeededRng(0);
    expect(() => generateBoard(rng, { ...PUZZLE_CONFIG, kindCount: 2 })).toThrow(RangeError);
    expect(() => generateBoard(rng, { ...PUZZLE_CONFIG, rows: 0 })).toThrow(RangeError);
    expect(() => generateBoard(rng, { ...PUZZLE_CONFIG, rows: 2, cols: 2 })).toThrow(RangeError);
    expect(() => generateBoard(rng, { ...PUZZLE_CONFIG, maxCascadeSteps: 0 })).toThrow(RangeError);
  });

  it('手のある盤面を作れない大きさでは、上限回数でエラーになる', () => {
    // 1×3 の盤面では、揃っていない並びから1回の入れ替えで3個を揃えられない
    expect(() => generateBoard(new SeededRng(0), { ...PUZZLE_CONFIG, rows: 1, cols: 3 })).toThrow(/作れませんでした/);
  });
});

describe('PUZZLE_CONFIG', () => {
  it('仮仕様の値(7×7・5種)で、使える設定になっている', () => {
    expect(PUZZLE_CONFIG.rows).toBe(7);
    expect(PUZZLE_CONFIG.cols).toBe(7);
    expect(PUZZLE_CONFIG.kindCount).toBe(5);
    expect(() => generateBoard(new SeededRng(0), PUZZLE_CONFIG)).not.toThrow();
  });
});
