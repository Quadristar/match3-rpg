/**
 * 盤面の生成・参照の補助。
 *
 * 計算の途中では、書き換えできる Grid(空きマスは null)を使い、
 * 外に返すときに BoardState(すべてのマスにパネルがある、書き換えない盤面)にする。
 */
import type { SeededRng } from '../../core/SeededRng';
import type { BoardState, Cell, Tile, TileKind } from './types';

/** 計算用の盤面。grid[row][col]。空きマスは null */
export type Grid = (Tile | null)[][];

/** 読み取り専用の盤面(BoardState.tiles も Grid もこの形で読める) */
export type ReadonlyGrid = readonly (readonly (Tile | null)[])[];

/** 修飾なしのパネルを作る */
export function createTile(kind: TileKind): Tile {
  return { kind, modifiers: [] };
}

/** 0 〜 kindCount-1 のどれかの種類のパネルを作る */
export function randomTile(rng: SeededRng, kindCount: number): Tile {
  return createTile(rng.nextInt(0, kindCount - 1));
}

/** 空の Grid を作る */
export function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, (): Tile | null => null));
}

/** 盤面を計算用の Grid に写す(元の盤面は変更しない) */
export function toGrid(board: BoardState): Grid {
  return board.tiles.map((row) => row.slice());
}

/** Grid から盤面を作る。空きマスがある・行の長さがそろっていない場合はエラー */
export function boardFromGrid(grid: ReadonlyGrid): BoardState {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    throw new RangeError('盤面の大きさは 1×1 以上にしてください');
  }
  const tiles = grid.map((line, row) => {
    if (line.length !== cols) {
      throw new RangeError(`盤面の ${row} 行目の長さが ${line.length} です(${cols} であるべき)`);
    }
    return line.map((tile, col) => {
      if (tile === null) {
        throw new Error(`盤面の (${row}, ${col}) が空いています`);
      }
      return tile;
    });
  });
  return { rows, cols, tiles };
}

/** マスのパネルを返す(盤面の外なら null) */
export function tileAt(grid: ReadonlyGrid, row: number, col: number): Tile | null {
  return grid[row]?.[col] ?? null;
}

/** マスが盤面の内側にあるか */
export function isInside(board: Pick<BoardState, 'rows' | 'cols'>, cell: Cell): boolean {
  return (
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.col) &&
    cell.row >= 0 &&
    cell.row < board.rows &&
    cell.col >= 0 &&
    cell.col < board.cols
  );
}

/** 2つのマスが上下左右に隣り合っているか */
export function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/** Grid の2マスを入れ替える(Grid を書き換える) */
export function swapInGrid(grid: Grid, a: Cell, b: Cell): void {
  const rowA = grid[a.row];
  const rowB = grid[b.row];
  if (rowA === undefined || rowB === undefined) {
    throw new RangeError('盤面の外のマスは入れ替えられません');
  }
  const tmp = rowA[a.col] ?? null;
  rowA[a.col] = rowB[b.col] ?? null;
  rowB[b.col] = tmp;
}

/** マスの並び順(上の行から、同じ行は左から)で比べる */
export function compareCells(a: Cell, b: Cell): number {
  return a.row - b.row || a.col - b.col;
}
