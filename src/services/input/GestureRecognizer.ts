/**
 * ポインタの押す・動かす・離すから、タップ・ドラッグ・スワイプを判定する。
 * DOM に依存しない純粋なロジック(座標は画面座標、時刻はミリ秒で受け取る)。
 *
 * - 同時に扱う指は1本だけ。最初の指を離すまで、2本目以降は無視する
 * - 判定(仮仕様):
 *     タップ   … 移動が dragStartDistance 未満のまま、tapMaxDurationMs 以内に離した
 *     ドラッグ … 移動が dragStartDistance 以上になった時点で開始し、離すと終了
 *     スワイプ … ドラッグの終了時に、開始位置からの距離が swipeMinDistance 以上で、
 *                かつ swipeMaxDurationMs 以内だった(dragend の後に続けて通知する)
 *     方向は、縦横の移動量の大きい方で決める
 */
import type { Point } from '../layout/layoutTypes';
import type { GestureThresholds, SwipeDirection } from './inputTypes';

/** 判定結果(座標は画面座標) */
export type Gesture =
  | { readonly type: 'tap'; readonly position: Point }
  | { readonly type: 'dragstart'; readonly start: Point; readonly position: Point }
  | { readonly type: 'dragmove'; readonly start: Point; readonly position: Point; readonly previous: Point }
  | { readonly type: 'dragend'; readonly start: Point; readonly position: Point }
  | { readonly type: 'swipe'; readonly start: Point; readonly end: Point; readonly direction: SwipeDirection }
  | { readonly type: 'cancel' };

interface ActivePointer {
  readonly id: number;
  readonly start: Point;
  readonly startTime: number;
  last: Point;
  dragging: boolean;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 開始位置から終了位置への方向(縦横の大きい方) */
export function swipeDirection(start: Point, end: Point): SwipeDirection {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
}

export class GestureRecognizer {
  private active: ActivePointer | null = null;

  constructor(
    private readonly thresholds: GestureThresholds,
    private readonly emit: (gesture: Gesture) => void,
  ) {}

  /** 操作中の指があるか */
  get isActive(): boolean {
    return this.active !== null;
  }

  down(id: number, position: Point, time: number): void {
    if (this.active !== null) {
      return; // 2本目以降の指は無視する
    }
    this.active = { id, start: position, startTime: time, last: position, dragging: false };
  }

  move(id: number, position: Point): void {
    const active = this.active;
    if (active === null || active.id !== id) {
      return;
    }
    const previous = active.last;
    active.last = position;
    if (!active.dragging) {
      if (distance(active.start, position) < this.thresholds.dragStartDistance) {
        return;
      }
      active.dragging = true;
      this.emit({ type: 'dragstart', start: active.start, position });
      return;
    }
    this.emit({ type: 'dragmove', start: active.start, position, previous });
  }

  up(id: number, position: Point, time: number): void {
    const active = this.active;
    if (active === null || active.id !== id) {
      return;
    }
    this.active = null;
    const duration = time - active.startTime;
    const moved = distance(active.start, position);

    if (!active.dragging) {
      if (moved < this.thresholds.dragStartDistance) {
        // 動かさずに長く押していた場合は何も通知しない(長押しは未対応。仮仕様)
        if (duration <= this.thresholds.tapMaxDurationMs) {
          this.emit({ type: 'tap', position });
        }
        return;
      }
      // 途中の move が届かないまま大きく動いて離した場合も、ドラッグとして扱う
      this.emit({ type: 'dragstart', start: active.start, position });
    }

    this.emit({ type: 'dragend', start: active.start, position });
    if (moved >= this.thresholds.swipeMinDistance && duration <= this.thresholds.swipeMaxDurationMs) {
      this.emit({ type: 'swipe', start: active.start, end: position, direction: swipeDirection(active.start, position) });
    }
  }

  /** 操作を取り消す(pointercancel や入力の一時停止)。id を省略すると、操作中の指を取り消す */
  cancel(id?: number): void {
    const active = this.active;
    if (active === null || (id !== undefined && active.id !== id)) {
      return;
    }
    this.active = null;
    this.emit({ type: 'cancel' });
  }
}
