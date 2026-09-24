/**
 * テスト用: MoveResult だけを使って、描画側と同じ手順で盤面を再生する。
 * 「MoveResult の中身だけで連鎖をすべて再生できる」ことの検査に使う。
 */
import { boardFromGrid, type Grid, swapInGrid, toGrid } from '../../../src/systems/puzzle/Board';
import { findMatchesInGrid } from '../../../src/systems/puzzle/MatchFinder';
import type { BoardState, MoveResult } from '../../../src/systems/puzzle/types';

/**
 * 元の盤面に MoveResult を再生し、連鎖の後の盤面を返す。再生の途中で矛盾があればエラー。
 * 各段の matches が、その時点の盤面のマッチと一致すること、removed が matches のマスと一致することも調べる。
 */
export function replay(board: BoardState, result: MoveResult): BoardState {
  if (!result.valid) {
    return board;
  }
  const grid: Grid = toGrid(board);
  swapInGrid(grid, result.move.a, result.move.b);
  for (const step of result.steps) {
    if (JSON.stringify(findMatchesInGrid(grid)) !== JSON.stringify(step.matches)) {
      throw new Error('matches がその時点の盤面のマッチと一致しない');
    }
    const matchCells = step.matches.flatMap((m) => m.cells.map((c) => `${c.row},${c.col}`)).sort();
    const removedCells = step.removed.map((c) => `${c.row},${c.col}`).sort();
    if (JSON.stringify(matchCells) !== JSON.stringify(removedCells)) {
      throw new Error('removed が matches のマスと一致しない');
    }
    for (const { row, col } of step.removed) {
      const line = grid[row] as Grid[number];
      if (line[col] === null) throw new Error(`(${row}, ${col}) を2回消そうとした`);
      line[col] = null;
    }
    for (const { from, to } of step.falls) {
      const tile = grid[from.row]?.[from.col] ?? null;
      if (tile === null) throw new Error(`落下元 (${from.row}, ${from.col}) が空`);
      if (grid[to.row]?.[to.col] !== null) throw new Error(`落下先 (${to.row}, ${to.col}) が空いていない`);
      if (from.col !== to.col || to.row <= from.row) throw new Error('落下は同じ列の下方向だけ');
      (grid[to.row] as Grid[number])[to.col] = tile;
      (grid[from.row] as Grid[number])[from.col] = null;
    }
    for (const { cell, tile } of step.spawns) {
      if (grid[cell.row]?.[cell.col] !== null) throw new Error(`補充先 (${cell.row}, ${cell.col}) が空いていない`);
      (grid[cell.row] as Grid[number])[cell.col] = tile;
    }
  }
  return boardFromGrid(grid);
}
