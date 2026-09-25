/**
 * テスト用: 盤面を文字で書く補助関数。
 *
 * 1文字が1マス。A が種類 0、B が種類 1 … を表す。空白と空行は無視する。
 *
 *   parseBoard(`
 *     ABCDE
 *     BCDEA
 *   `)
 */
import { boardFromGrid, createTile } from '../../../src/systems/puzzle/Board';
import type { BoardState, Cell } from '../../../src/systems/puzzle/types';

const A_CODE = 'A'.charCodeAt(0);

/** 文字の盤面を BoardState にする */
export function parseBoard(text: string): BoardState {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s/g, ''))
    .filter((line) => line.length > 0);
  return boardFromGrid(
    lines.map((line) =>
      [...line].map((ch) => {
        const kind = ch.charCodeAt(0) - A_CODE;
        if (kind < 0 || kind >= 26) {
          throw new Error(`盤面の文字は A〜Z で書いてください: "${ch}"`);
        }
        return createTile(kind);
      }),
    ),
  );
}

/** BoardState を文字の行の配列にする */
export function boardToText(board: BoardState): string[] {
  return board.tiles.map((row) => row.map((tile) => String.fromCharCode(A_CODE + tile.kind)).join(''));
}

/** マスを短く書く */
export function cell(row: number, col: number): Cell {
  return { row, col };
}

/** マスの配列を "r,c" の文字列の配列にする(比較しやすくするため) */
export function cellKeys(cells: readonly Cell[]): string[] {
  return cells.map((c) => `${c.row},${c.col}`);
}

/** 配列の要素を取り出す(なければテストを失敗させる) */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`${index} 番目の要素がない(長さ ${items.length})`);
  }
  return item;
}
