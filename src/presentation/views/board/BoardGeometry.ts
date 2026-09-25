/**
 * 盤面の位置の計算: マスと論理座標の変換。Pixi に依存しない。
 *
 * 盤面は領域の中央に置き、マスは正方形にする。
 */
import type { Cell } from '../../../systems/puzzle';
import type { Point, Rect } from '../../../services/layout/layoutTypes';

export class BoardGeometry {
  /** マスの一辺の長さ(論理座標) */
  readonly cellSize: number;
  /** 盤面の左上(論理座標) */
  readonly origin: Point;

  constructor(
    region: Rect,
    readonly rows: number,
    readonly cols: number,
  ) {
    this.cellSize = Math.max(0, Math.min(region.width / cols, region.height / rows));
    this.origin = {
      x: region.x + (region.width - this.cellSize * cols) / 2,
      y: region.y + (region.height - this.cellSize * rows) / 2,
    };
  }

  /** 盤面の幅 */
  get width(): number {
    return this.cellSize * this.cols;
  }

  /** 盤面の高さ */
  get height(): number {
    return this.cellSize * this.rows;
  }

  /** マスの中心(盤面の左上を原点とした座標)。盤面の外(上に並ぶ補充待ちなど)も計算できる */
  localCenter(cell: Cell): Point {
    return { x: (cell.col + 0.5) * this.cellSize, y: (cell.row + 0.5) * this.cellSize };
  }

  /** 論理座標の点があるマス。盤面の外なら null */
  cellAt(point: Point): Cell | null {
    if (this.cellSize <= 0) {
      return null;
    }
    const col = Math.floor((point.x - this.origin.x) / this.cellSize);
    const row = Math.floor((point.y - this.origin.y) / this.cellSize);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return { row, col };
  }
}
