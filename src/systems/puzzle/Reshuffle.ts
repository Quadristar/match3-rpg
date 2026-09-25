/**
 * 詰みの解消: 盤面のパネルを並べ替え、揃っている箇所がなく動かせる手がある盤面にする。
 */
import type { SeededRng } from '../../core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../data/puzzleConfig';
import { boardFromGrid, createEmptyGrid } from './Board';
import { generateBoard, wouldMatchFromTopLeft } from './BoardGenerator';
import { findMovesInGrid } from './DeadlockChecker';
import type { BoardState, Tile } from './types';

/**
 * 盤面のパネルを並べ替えた新しい盤面を返す(パネルの組み合わせは変えない)。
 *
 * 仮仕様:
 * - パネルを混ぜ、左上から順に「揃わない最初のパネル」を置いていく
 * - 途中で置けなくなった、または動かせる手がない場合はやり直す
 * - maxReshuffleAttempts 回で作れなければ、新しい盤面を生成する(パネルの組み合わせは変わる)
 */
export function reshuffleBoard(board: BoardState, rng: SeededRng, config: PuzzleConfig = PUZZLE_CONFIG): BoardState {
  const tiles = board.tiles.flat();
  for (let attempt = 0; attempt < config.maxReshuffleAttempts; attempt++) {
    const pool: Tile[] = rng.shuffle(tiles);
    const grid = createEmptyGrid(board.rows, board.cols);
    let placedAll = true;
    for (let row = 0; row < board.rows && placedAll; row++) {
      for (let col = 0; col < board.cols; col++) {
        const index = pool.findIndex((tile) => !wouldMatchFromTopLeft(grid, row, col, tile.kind));
        if (index < 0) {
          placedAll = false;
          break;
        }
        (grid[row] as (typeof grid)[number])[col] = pool.splice(index, 1)[0] as Tile;
      }
    }
    if (placedAll && findMovesInGrid(grid, 1).length > 0) {
      return boardFromGrid(grid);
    }
  }
  return generateBoard(rng, { ...config, rows: board.rows, cols: board.cols });
}
