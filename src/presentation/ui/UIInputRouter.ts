/**
 * UIInputRouter: 画面の UI(Button・Panel)への入力を振り分ける PointerHandler。
 *
 * - 指を置いた位置の最も手前の UI 対象を探し、見つかれば指を独占する(ゲーム側に渡さない)
 * - ボタン: 置いた時点で押下中の見た目にし、ボタンの上で離したら実行する。
 *   指がボタンの外に出たら見た目を戻し、そのまま離しても実行しない(戻れば再び押下中)
 * - 無効・非表示のボタンは反応しない。無効なボタンは背後にも入力を通さない(仮仕様)
 * - Panel は入力を遮る。モーダルな Panel の表示中は、背後のボタンやゲーム側に入力を渡さない
 */
import type { Container } from 'pixi.js';
import type { PointerHandler } from '../../services/input/inputTypes';
import type { Point } from '../../services/layout/layoutTypes';
import { findUITarget, isShownWithin, type PressableTarget } from './uiTargets';

export class UIInputRouter implements PointerHandler {
  /** 押している最中のボタン */
  private pressed: (PressableTarget & Container) | null = null;

  constructor(private readonly root: Container) {}

  down(position: Point): boolean {
    const target = findUITarget(this.root, position);
    if (target === null) {
      return false;
    }
    if (target.uiRole === 'pressable' && target.enabled) {
      this.pressed = target;
      target.setPressed(true);
    }
    return true;
  }

  move(position: Point): void {
    const pressed = this.pressed;
    if (pressed !== null) {
      pressed.setPressed(this.isOver(pressed, position));
    }
  }

  up(position: Point): void {
    const pressed = this.pressed;
    this.pressed = null;
    if (pressed === null) {
      return;
    }
    const over = this.isOver(pressed, position);
    pressed.setPressed(false);
    if (over) {
      pressed.activate();
    }
  }

  cancel(): void {
    this.pressed?.setPressed(false);
    this.pressed = null;
  }

  /** ボタンの上にあり、まだ使える状態か(押している間に無効化・非表示になった場合は false) */
  private isOver(target: PressableTarget & Container, position: Point): boolean {
    return target.enabled && isShownWithin(target, this.root) && target.hitTest(position);
  }
}
