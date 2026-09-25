/**
 * 連鎖の解決: 揃うものがなくなるまで「消去 → 落下 → 補充」を繰り返し、1段ごとに記録する。
 */
import type { SeededRng } from '../../core/SeededRng';
import type { PuzzleConfig } from '../../data/puzzleConfig';
import { compareCells, type Grid } from './Board';
import { applyGravity } from './Gravity';
import { findMatchesInGrid } from './MatchFinder';
import { refill } from './Refill';
import type { CascadeStep, Cell } from './types';

/** 連鎖の段数が上限を超えたときのエラー */
export class CascadeLimitError extends Error {
  constructor(limit: number) {
    super(`連鎖が ${limit} 段を超えました(無限ループの可能性)`);
    this.name = 'CascadeLimitError';
  }
}

/**
 * Grid の連鎖を最後まで解決する(Grid を書き換える)。
 * 揃っているものがなければ空の配列を返す。
 */
export function resolveCascade(
  grid: Grid,
  rng: SeededRng,
  config: Pick<PuzzleConfig, 'kindCount' | 'maxCascadeSteps'>,
): CascadeStep[] {
  const steps: CascadeStep[] = [];
  for (;;) {
    const matches = findMatchesInGrid(grid);
    if (matches.length === 0) {
      return steps;
    }
    if (steps.length >= config.maxCascadeSteps) {
      throw new CascadeLimitError(config.maxCascadeSteps);
    }
    // まとまりどうしはマスを共有しない(共有する並びは1つにまとめている)が、念のため重複を除く
    const removedMap = new Map<string, Cell>();
    for (const group of matches) {
      for (const cell of group.cells) {
        removedMap.set(`${cell.row},${cell.col}`, cell);
      }
    }
    const removed = [...removedMap.values()].sort(compareCells);
    for (const cell of removed) {
      (grid[cell.row] as Grid[number])[cell.col] = null;
    }
    const falls = applyGravity(grid);
    const spawns = refill(grid, rng, config.kindCount);
    steps.push({ matches, removed, falls, spawns });
  }
}
