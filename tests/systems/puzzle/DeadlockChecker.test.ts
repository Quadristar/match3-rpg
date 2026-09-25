import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../../src/data/puzzleConfig';
import { generateBoard } from '../../../src/systems/puzzle/BoardGenerator';
import { findMoves, hasMove } from '../../../src/systems/puzzle/DeadlockChecker';
import { findMatches } from '../../../src/systems/puzzle/MatchFinder';
import { reshuffleBoard } from '../../../src/systems/puzzle/Reshuffle';
import { nextBoard, resolveMove } from '../../../src/systems/puzzle/resolveMove';
import type { BoardState } from '../../../src/systems/puzzle/types';
import { at, boardToText, cellKeys, parseBoard } from './boardText';
import { replay } from './replay';

/** 動かせる手がない盤面 */
const DEADLOCK = `
  ABCD
  CDAB
  ABCD
  CDAB
`;

/** 盤面のパネルの種類を数える */
function kindCounts(board: BoardState): number[] {
  const counts: number[] = [];
  for (const tile of board.tiles.flat()) counts[tile.kind] = (counts[tile.kind] ?? 0) + 1;
  return counts;
}

describe('findMoves / hasMove', () => {
  it('揃う入れ替えをすべて返す', () => {
    const board = parseBoard(`
      AABC
      CDAB
      BCBC
    `);
    // (0,2)↔(1,2) で上の行に A が3個、(1,2)↔(1,3) で3列目に B が3個
    const moves = findMoves(board);
    expect(moves.map((m) => `${cellKeys([m.a])[0]}-${cellKeys([m.b])[0]}`)).toEqual(['0,2-1,2', '1,2-1,3']);
    expect(hasMove(board)).toBe(true);
  });

  it('手がない盤面では空', () => {
    const board = parseBoard(DEADLOCK);
    expect(findMoves(board)).toEqual([]);
    expect(hasMove(board)).toBe(false);
  });

  it('見つけた手は、どれも resolveMove で有効になる', () => {
    const board = generateBoard(new SeededRng(4));
    const moves = findMoves(board);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(resolveMove(board, move.a, move.b, new SeededRng(0)).valid).toBe(true);
    }
  });
});

describe('reshuffleBoard', () => {
  const config: PuzzleConfig = { ...PUZZLE_CONFIG, rows: 4, cols: 4, kindCount: 4 };

  it('詰んだ盤面を、揃っておらず手がある盤面に並べ替える(パネルの組み合わせは同じ)', () => {
    const board = parseBoard(DEADLOCK);
    for (let seed = 0; seed < 50; seed++) {
      const shuffled = reshuffleBoard(board, new SeededRng(seed), config);
      expect(findMatches(shuffled)).toEqual([]);
      expect(hasMove(shuffled)).toBe(true);
      expect(kindCounts(shuffled)).toEqual(kindCounts(board));
    }
  });

  it('同じシードなら同じ並びになる', () => {
    const board = parseBoard(DEADLOCK);
    expect(boardToText(reshuffleBoard(board, new SeededRng(8), config))).toEqual(
      boardToText(reshuffleBoard(board, new SeededRng(8), config)),
    );
  });

  it('並べ替えで作れない組み合わせなら、新しい盤面を生成する(仮仕様)', () => {
    // 全部同じ種類では、揃わない並びを作れない
    const board = parseBoard(`
      AAAA
      AAAA
      AAAA
    `);
    const result = reshuffleBoard(board, new SeededRng(1), config);
    expect(result.rows).toBe(3);
    expect(result.cols).toBe(4);
    expect(findMatches(result)).toEqual([]);
    expect(hasMove(result)).toBe(true);
  });
});

describe('resolveMove: 詰みの検出', () => {
  it('連鎖の後に手がなければ reshuffled に並べ替えた盤面を入れる', () => {
    // 小さい盤面は詰みやすい。詰みが起きる操作をシードを変えて探す
    const config: PuzzleConfig = { ...PUZZLE_CONFIG, rows: 4, cols: 4, kindCount: 5 };
    let found = 0;
    for (let seed = 0; seed < 300 && found < 5; seed++) {
      const rng = new SeededRng(seed);
      const board = generateBoard(rng, config);
      const move = at(findMoves(board), 0);
      const result = resolveMove(board, move.a, move.b, rng, config);
      if (!result.valid || result.reshuffled === undefined) {
        expect(result.valid && hasMove(result.finalBoard)).toBe(true);
        continue;
      }
      found++;
      expect(hasMove(result.finalBoard)).toBe(false);
      expect(findMatches(result.reshuffled)).toEqual([]);
      expect(hasMove(result.reshuffled)).toBe(true);
      expect(nextBoard(result)).toBe(result.reshuffled);
      expect(replay(board, result)).toEqual(result.finalBoard);
    }
    expect(found).toBeGreaterThan(0);
  });
});
