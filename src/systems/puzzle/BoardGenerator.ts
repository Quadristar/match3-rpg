/**
 * 盤面の生成: 揃っている箇所がなく、動かせる手が1つ以上ある盤面を作る。
 */
import type { SeededRng } from '../../core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../data/puzzleConfig';
import { boardFromGrid, createEmptyGrid, createTile, type ReadonlyGrid, tileAt } from './Board';
import { findMovesInGrid } from './DeadlockChecker';
import { assertValidPuzzleConfig } from './puzzleConfigCheck';
import type { BoardState, TileKind } from './types';

/**
 * 新しい盤面を作る。
 * 左上から順に、左の2マス・上の2マスと揃わない種類から等確率で選ぶ。
 * 動かせる手がなければ作り直し、maxGenerateAttempts 回で作れなければエラーにする。
 */
export function generateBoard(rng: SeededRng, config: PuzzleConfig = PUZZLE_CONFIG): BoardState {
  assertValidPuzzleConfig(config);
  for (let attempt = 0; attempt < config.maxGenerateAttempts; attempt++) {
    const grid = createEmptyGrid(config.rows, config.cols);
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const candidates: TileKind[] = [];
        for (let kind = 0; kind < config.kindCount; kind++) {
          if (!wouldMatchFromTopLeft(grid, row, col, kind)) {
            candidates.push(kind);
          }
        }
        // 種類が3以上なら、除かれるのは最大2種類なので候補は必ず残る
        (grid[row] as (typeof grid)[number])[col] = createTile(rng.pick(candidates));
      }
    }
    if (findMovesInGrid(grid, 1).length > 0) {
      return boardFromGrid(grid);
    }
  }
  throw new Error(`動かせる手のある盤面を ${config.maxGenerateAttempts} 回で作れませんでした`);
}

/**
 * 左上から順に埋めるとき、(row, col) に kind を置くと揃うか。
 * まだ埋めていない右・下は見ない。
 */
export function wouldMatchFromTopLeft(grid: ReadonlyGrid, row: number, col: number, kind: TileKind): boolean {
  const same = (r: number, c: number): boolean => tileAt(grid, r, c)?.kind === kind;
  return (same(row, col - 1) && same(row, col - 2)) || (same(row - 1, col) && same(row - 2, col));
}
