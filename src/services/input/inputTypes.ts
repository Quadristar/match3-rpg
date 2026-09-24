/**
 * 入力で使う型。DOM や Pixi に依存しない。
 *
 * 位置はすべて論理座標(LayoutManager の論理解像度の座標)で渡す。
 * 今はポインタ(マウス・タッチ)だけを扱う。キーボードなどを追加するときは、
 * InputEvent に種類を足し、InputManager に入力元を足す。
 */
import type { Point } from '../layout/layoutTypes';

/** スワイプの方向(画面の上下左右) */
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/** タップ: 指をほとんど動かさずに、短い時間で離した */
export interface TapEvent {
  readonly type: 'tap';
  readonly position: Point;
}

/** ドラッグ開始: 指が一定距離以上動いた */
export interface DragStartEvent {
  readonly type: 'dragstart';
  /** 指を置いた位置 */
  readonly start: Point;
  readonly position: Point;
}

/** ドラッグ中 */
export interface DragMoveEvent {
  readonly type: 'dragmove';
  readonly start: Point;
  readonly position: Point;
  /** 前回の位置からの移動量 */
  readonly delta: Point;
}

/** ドラッグ終了: 指を離した(スワイプの条件も満たせば、続けて swipe が来る) */
export interface DragEndEvent {
  readonly type: 'dragend';
  readonly start: Point;
  readonly position: Point;
}

/** スワイプ: 一定距離以上を、短い時間で動かして離した */
export interface SwipeEvent {
  readonly type: 'swipe';
  /** 指を置いた位置(どこから動かしたかの判定に使う) */
  readonly start: Point;
  readonly end: Point;
  readonly direction: SwipeDirection;
}

/** 取り消し: 操作の途中で、ブラウザによる中断や入力の一時停止が起きた */
export interface CancelEvent {
  readonly type: 'cancel';
}

export type InputEvent = TapEvent | DragStartEvent | DragMoveEvent | DragEndEvent | SwipeEvent | CancelEvent;

export type InputListener = (event: InputEvent) => void;

/** 判定のしきい値。距離は画面座標(CSS ピクセル)、時間はミリ秒 */
export interface GestureThresholds {
  /** これ以上動いたらドラッグとみなす */
  readonly dragStartDistance: number;
  /** これより長く押していたらタップとみなさない */
  readonly tapMaxDurationMs: number;
  /** スワイプとみなす最短距離 */
  readonly swipeMinDistance: number;
  /** これより長くかけて動かしたらスワイプとみなさない */
  readonly swipeMaxDurationMs: number;
}

/**
 * ジェスチャーの判定より先にポインタを受け取る処理(UI のボタンやモーダルなど)。
 * 位置は画面座標(表示物の toLocal で当たり判定するため)。
 */
export interface PointerHandler {
  /**
   * 指を置いた。true を返すと、離すまでこの指を独占する
   * (その指の操作はジェスチャーとして通知しない = ゲーム側に渡さない)
   */
  down(position: Point): boolean;
  /** 独占中の指が動いた */
  move(position: Point): void;
  /** 独占中の指を離した */
  up(position: Point): void;
  /** 独占中の操作が取り消された(pointercancel・一時停止・登録の解除) */
  cancel(): void;
}
