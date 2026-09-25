/**
 * 盤面の操作を「入れ替えの意図」に変える(docs/decisions/001)。Pixi に依存しない。
 *
 * - ドラッグ: 指を置いたパネルから、パネル幅 × dragThresholdRatio 動いた時点で方向を確定し、
 *   指を離す前に入れ替えを要求する(速さは問わない)。1回のドラッグで要求するのは1回だけ
 * - 2回タップ: 1回目で選択、2回目で入れ替え
 *   - 選択中のパネルをもう一度タップ → 選択を解除
 *   - 隣のパネルをタップ → 入れ替え(選択は解除)
 *   - 隣でないパネルをタップ → そちらを新しく選択
 *   - 盤面の外をタップ → 選択を解除(仮仕様)
 * - ドラッグを始めたら選択は解除する(仮仕様)
 * - スワイプ(swipe)は使わない(共通基盤のスワイプ判定は盤面には使わない)
 */
import type { InputEvent } from '../../../services/input/inputTypes';
import type { Point } from '../../../services/layout/layoutTypes';
import { type Cell, isAdjacent } from '../../../systems/puzzle';
import type { BoardGeometry } from './BoardGeometry';

/** 操作の意図 */
export type BoardIntent =
  | { readonly type: 'select'; readonly cell: Cell }
  | { readonly type: 'deselect' }
  | { readonly type: 'swap'; readonly a: Cell; readonly b: Cell };

/** ドラッグ中の状態 */
interface DragState {
  readonly cell: Cell;
  readonly start: Point;
  /** 入れ替えを要求済みか */
  fired: boolean;
}

export class BoardInputController {
  private selectedCell: Cell | null = null;
  private drag: DragState | null = null;

  constructor(private readonly dragThresholdRatio: number) {}

  /** 選択中のマス */
  get selected(): Cell | null {
    return this.selectedCell;
  }

  /** 状態を初期化する(再生の開始時など)。選択を解除した場合は deselect を返す */
  reset(): BoardIntent[] {
    this.drag = null;
    return this.clearSelection();
  }

  /** 入力を処理し、発生した意図を返す */
  handle(event: InputEvent, geometry: BoardGeometry): BoardIntent[] {
    switch (event.type) {
      case 'tap':
        return this.onTap(geometry.cellAt(event.position));
      case 'dragstart': {
        const cell = geometry.cellAt(event.start);
        if (cell === null) {
          this.drag = null;
          return [];
        }
        this.drag = { cell, start: event.start, fired: false };
        return [...this.clearSelection(), ...this.onDragMove(event.position, geometry)];
      }
      case 'dragmove':
        return this.onDragMove(event.position, geometry);
      case 'dragend':
      case 'cancel':
        this.drag = null;
        return [];
      case 'swipe':
        return [];
    }
  }

  private onTap(cell: Cell | null): BoardIntent[] {
    const selected = this.selectedCell;
    if (cell === null) {
      return this.clearSelection();
    }
    if (selected === null) {
      this.selectedCell = cell;
      return [{ type: 'select', cell }];
    }
    if (selected.row === cell.row && selected.col === cell.col) {
      return this.clearSelection();
    }
    if (isAdjacent(selected, cell)) {
      this.selectedCell = null;
      return [{ type: 'deselect' }, { type: 'swap', a: selected, b: cell }];
    }
    this.selectedCell = cell;
    return [{ type: 'select', cell }];
  }

  private onDragMove(position: Point, geometry: BoardGeometry): BoardIntent[] {
    const drag = this.drag;
    if (drag === null || drag.fired) {
      return [];
    }
    const dx = position.x - drag.start.x;
    const dy = position.y - drag.start.y;
    const threshold = geometry.cellSize * this.dragThresholdRatio;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
      return [];
    }
    drag.fired = true;
    const target =
      Math.abs(dx) >= Math.abs(dy)
        ? { row: drag.cell.row, col: drag.cell.col + Math.sign(dx) }
        : { row: drag.cell.row + Math.sign(dy), col: drag.cell.col };
    if (target.row < 0 || target.row >= geometry.rows || target.col < 0 || target.col >= geometry.cols) {
      return [];
    }
    return [{ type: 'swap', a: drag.cell, b: target }];
  }

  private clearSelection(): BoardIntent[] {
    if (this.selectedCell === null) {
      return [];
    }
    this.selectedCell = null;
    return [{ type: 'deselect' }];
  }
}
