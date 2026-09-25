/**
 * 多数のランダムな盤面と操作で、処理後の盤面が常に正しい状態になることを確かめる。
 */
import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../../src/data/puzzleConfig';
import { generateBoard } from '../../../src/systems/puzzle/BoardGenerator';
import { findMoves, hasMove } from '../../../src/systems/puzzle/DeadlockChecker';
import { findMatches } from '../../../src/systems/puzzle/MatchFinder';
import { nextBoard, resolveMove } from '../../../src/systems/puzzle/resolveMove';
import type { BoardState } from '../../../src/systems/puzzle/types';
import { replay } from './replay';

/** 空きがなく、揃っている箇所がなく、動かせる手がある(expect の回数を減らすため、まとめて判定する) */
function expectPlayable(board: BoardState, rows: number, cols: number, kindCount: number, label: string): void {
  const filled =
    board.tiles.length === rows &&
    board.tiles.every(
      (row) =>
        row.length === cols &&
        row.every((tile) => Number.isInteger(tile?.kind) && tile.kind >= 0 && tile.kind < kindCount),
    );
  expect(filled, `${label}: 空きや範囲外の種類がある`).toBe(true);
  expect(findMatches(board).length, `${label}: 揃っている箇所が残っている`).toBe(0);
  expect(hasMove(board), `${label}: 動かせる手がない`).toBe(true);
}

/** 実行した操作の集計(テストが想定した場面を通ったかを確かめる) */
interface PlayStats {
  valid: number;
  invalid: number;
  multiStep: number;
  reshuffled: number;
}

/** シードごとに、手を選んで何回も操作する(揃わない操作もときどき混ぜる) */
function playRandomly(config: PuzzleConfig, seeds: number, movesPerSeed: number): PlayStats {
  const stats: PlayStats = { valid: 0, invalid: 0, multiStep: 0, reshuffled: 0 };
  for (let seed = 0; seed < seeds; seed++) {
    const rng = new SeededRng(seed);
    const chooser = new SeededRng(seed + 100_000);
    let board = generateBoard(rng, config);
    expectPlayable(board, config.rows, config.cols, config.kindCount, `seed ${seed} 生成`);
    for (let turn = 0; turn < movesPerSeed; turn++) {
      const label = `seed ${seed} turn ${turn}`;
      const moves = findMoves(board);
      const tryInvalid = chooser.chance(0.2);
      const a = tryInvalid
        ? { row: chooser.nextInt(0, config.rows - 1), col: chooser.nextInt(0, config.cols - 1) }
        : chooser.pick(moves).a;
      const b = tryInvalid
        ? { row: a.row + chooser.pick([-1, 0, 1]), col: a.col + chooser.pick([-1, 0, 1]) }
        : (moves.find((m) => m.a === a)?.b ?? a);
      const result = resolveMove(board, a, b, rng, config);
      if (!result.valid) {
        stats.invalid++;
        expect(result.finalBoard, label).toBe(board);
        continue;
      }
      stats.valid++;
      if (result.steps.length >= 2) stats.multiStep++;
      if (result.reshuffled !== undefined) stats.reshuffled++;
      expect(result.steps.length, label).toBeGreaterThan(0);
      // MoveResult だけで、元の盤面から連鎖の後の盤面を再現できる
      expect(replay(board, result), label).toEqual(result.finalBoard);
      expect(findMatches(result.finalBoard).length, label).toBe(0);
      board = nextBoard(result);
      expectPlayable(board, config.rows, config.cols, config.kindCount, label);
    }
  }
  return stats;
}

describe('ランダムな盤面と操作', () => {
  it('既定の設定(7×7・5種): 200 盤面 × 20 手', () => {
    const stats = playRandomly(PUZZLE_CONFIG, 200, 20);
    expect(stats.valid).toBeGreaterThan(3000);
    expect(stats.invalid).toBeGreaterThan(0);
    expect(stats.multiStep).toBeGreaterThan(0);
  });

  it('詰みやすい設定(4×4・5種): 200 盤面 × 20 手', () => {
    const stats = playRandomly({ ...PUZZLE_CONFIG, rows: 4, cols: 4, kindCount: 5 }, 200, 20);
    expect(stats.reshuffled).toBeGreaterThan(0);
  });

  it('連鎖しやすい設定(8×6・3種): 100 盤面 × 20 手', () => {
    const stats = playRandomly({ ...PUZZLE_CONFIG, rows: 8, cols: 6, kindCount: 3 }, 100, 20);
    expect(stats.multiStep).toBeGreaterThan(0);
  });
});
