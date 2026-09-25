/**
 * 入れ替えの判定: 隣り合っているか、入れ替えると揃うか。
 */
import { type Grid, isAdjacent, isInside, type ReadonlyGrid, swapInGrid, tileAt } from './Board';
import { MIN_MATCH_LENGTH } from './MatchFinder';
import type { BoardState, Cell, InvalidMoveReason } from './types';

/** 入れ替えられない理由を返す。入れ替えられるなら null */
export function validateMove(board: BoardState, a: Cell, b: Cell): InvalidMoveReason | null {
  if (!isInside(board, a) || !isInside(board, b)) {
    return 'out-of-board';
  }
  if (!isAdjacent(a, b)) {
    return 'not-adjacent';
  }
  const grid = board.tiles.map((row) => row.slice());
  return swapMakesMatch(grid, a, b) ? null : 'no-match';
}

/**
 * 2マスを入れ替えたら、どちらかのマスを含む並びが揃うか。
 * 判定のあと Grid は元に戻す。
 */
export function swapMakesMatch(grid: Grid, a: Cell, b: Cell): boolean {
  const tileA = tileAt(grid, a.row, a.col);
  const tileB = tileAt(grid, b.row, b.col);
  if (tileA === null || tileB === null || tileA.kind === tileB.kind) {
    return false;
  }
  swapInGrid(grid, a, b);
  const result = hasMatchAt(grid, a) || hasMatchAt(grid, b);
  swapInGrid(grid, a, b);
  return result;
}

/** マスを含む縦または横の並びが、3個以上揃っているか */
export function hasMatchAt(grid: ReadonlyGrid, cell: Cell): boolean {
  const tile = tileAt(grid, cell.row, cell.col);
  if (tile === null) {
    return false;
  }
  const countTo = (dRow: number, dCol: number): number => {
    let count = 0;
    let row = cell.row + dRow;
    let col = cell.col + dCol;
    while (tileAt(grid, row, col)?.kind === tile.kind) {
      count++;
      row += dRow;
      col += dCol;
    }
    return count;
  };
  return (
    1 + countTo(0, -1) + countTo(0, 1) >= MIN_MATCH_LENGTH || 1 + countTo(-1, 0) + countTo(1, 0) >= MIN_MATCH_LENGTH
  );
}
