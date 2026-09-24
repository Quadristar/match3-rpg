/**
 * パズルの入口: 1回の入れ替えを、連鎖の最後まで計算して結果を返す。
 *
 * ロジックは描画を待たない。描画側は MoveResult を順に再生するだけにする
 * (docs/GAME_DESIGN.md §3「先に全部計算して、後から再生する」)。
 */
import type { SeededRng } from '../../core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../data/puzzleConfig';
import { boardFromGrid, swapInGrid, toGrid } from './Board';
import { resolveCascade } from './CascadeResolver';
import { hasMove } from './DeadlockChecker';
import { validateMove } from './MoveValidator';
import { assertValidPuzzleConfig } from './puzzleConfigCheck';
import { reshuffleBoard } from './Reshuffle';
import type { BoardState, Cell, MoveResult } from './types';

/**
 * マス a と b を入れ替え、連鎖の最後まで解決する。
 *
 * - 入れ替えられない場合は valid: false(盤面は変えず、乱数も使わない)
 * - 連鎖が config.maxCascadeSteps 段を超えたら CascadeLimitError
 * - 連鎖の後に動かせる手がなければ、並べ替えた盤面を reshuffled に入れる
 *
 * 元の盤面は変更しない。
 */
export function resolveMove(
  board: BoardState,
  a: Cell,
  b: Cell,
  rng: SeededRng,
  config: PuzzleConfig = PUZZLE_CONFIG,
): MoveResult {
  assertValidPuzzleConfig(config);
  const move = { a, b };
  const reason = validateMove(board, a, b);
  if (reason !== null) {
    return { valid: false, move, reason, steps: [], finalBoard: board };
  }
  const grid = toGrid(board);
  swapInGrid(grid, a, b);
  const steps = resolveCascade(grid, rng, config);
  const finalBoard = boardFromGrid(grid);
  if (hasMove(finalBoard)) {
    return { valid: true, move, steps, finalBoard };
  }
  return { valid: true, move, steps, finalBoard, reshuffled: reshuffleBoard(finalBoard, rng, config) };
}

/** 次の操作に使う盤面(並べ替えがあればその盤面) */
export function nextBoard(result: MoveResult): BoardState {
  return result.valid ? (result.reshuffled ?? result.finalBoard) : result.finalBoard;
}
