/**
 * 動かせる手の検索と、詰み(動かせる手がない状態)の判定。
 * findMoves はヒント機能にも使える。
 */
import { type Grid, type ReadonlyGrid } from './Board';
import { swapMakesMatch } from './MoveValidator';
import type { BoardState, Move } from './types';

/**
 * 揃う入れ替えをすべて返す。
 * 各手は a が上または左、b が右または下の隣。a の位置の順(上の行から、同じ行は左から)に並ぶ。
 */
export function findMoves(board: BoardState): Move[] {
  return findMovesInGrid(board.tiles, Number.POSITIVE_INFINITY);
}

/** 揃う入れ替えが1つ以上あるか */
export function hasMove(board: BoardState): boolean {
  return findMovesInGrid(board.tiles, 1).length > 0;
}

/** Grid で、揃う入れ替えを最大 limit 個まで探す */
export function findMovesInGrid(grid: ReadonlyGrid, limit: number): Move[] {
  const work: Grid = grid.map((row) => row.slice());
  const moves: Move[] = [];
  const rows = work.length;
  const cols = work[0]?.length ?? 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = { row, col };
      for (const b of [
        { row, col: col + 1 },
        { row: row + 1, col },
      ]) {
        if (b.row < rows && b.col < cols && swapMakesMatch(work, a, b)) {
          moves.push({ a, b });
          if (moves.length >= limit) {
            return moves;
          }
        }
      }
    }
  }
  return moves;
}
