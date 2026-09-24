import { describe, expect, it, vi } from 'vitest';
import { InputManager } from '../../../src/services/input/InputManager';
import type { InputEvent } from '../../../src/services/input/inputTypes';
import { screenToLogical } from '../../../src/services/layout/computeLayout';

/** 拡大率 0.5・余白 (10, 20) のレイアウトを想定した変換 */
const FIT = { scale: 0.5, offset: { x: 10, y: 20 } };

function setup() {
  const input = new InputManager({
    thresholds: { dragStartDistance: 10, tapMaxDurationMs: 300, swipeMinDistance: 50, swipeMaxDurationMs: 500 },
    toLogical: (point) => screenToLogical(FIT, point),
  });
  const events: InputEvent[] = [];
  const off = input.on((e) => events.push(e));
  return { input, events, off };
}

describe('screenToLogical', () => {
  it('余白を引いて拡大率で割る', () => {
    expect(screenToLogical(FIT, { x: 10, y: 20 })).toEqual({ x: 0, y: 0 });
    expect(screenToLogical(FIT, { x: 110, y: 70 })).toEqual({ x: 200, y: 100 });
  });
});

describe('InputManager', () => {
  it('位置を論理座標に変換して通知する(しきい値は画面座標で判定する)', () => {
    const { input, events } = setup();
    input.pointerDown(1, { x: 110, y: 70 }, 0);
    input.pointerUp(1, { x: 115, y: 70 }, 100);
    // 画面上 5px の移動はタップ(論理座標では 10 の移動)
    expect(events).toEqual([{ type: 'tap', position: { x: 210, y: 100 } }]);
  });

  it('スワイプは論理座標の開始位置と方向を通知する', () => {
    const { input, events } = setup();
    input.pointerDown(1, { x: 110, y: 70 }, 0);
    input.pointerMove(1, { x: 110, y: 170 });
    input.pointerUp(1, { x: 110, y: 170 }, 100);
    expect(events.at(-1)).toEqual({ type: 'swipe', start: { x: 200, y: 100 }, end: { x: 200, y: 300 }, direction: 'down' });
  });

  it('ドラッグの移動量は論理座標で通知する', () => {
    const { input, events } = setup();
    input.pointerDown(1, { x: 10, y: 20 }, 0);
    input.pointerMove(1, { x: 30, y: 20 });
    input.pointerMove(1, { x: 40, y: 25 });
    expect(events.at(-1)).toEqual({
      type: 'dragmove',
      start: { x: 0, y: 0 },
      position: { x: 60, y: 10 },
      delta: { x: 20, y: 10 },
    });
  });

  it('登録を解除すると通知されない', () => {
    const { input, events, off } = setup();
    off();
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerUp(1, { x: 0, y: 0 }, 10);
    expect(events).toEqual([]);
  });

  it('pointercancel で操作を取り消す', () => {
    const { input, events } = setup();
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerCancel(1);
    input.pointerUp(1, { x: 0, y: 0 }, 10);
    expect(events).toEqual([{ type: 'cancel' }]);
  });
});

describe('InputManager: 一時停止', () => {
  it('停止中は新しい操作を受け付けない', () => {
    const { input, events } = setup();
    input.pause();
    expect(input.isPaused).toBe(true);
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerUp(1, { x: 0, y: 0 }, 10);
    expect(events).toEqual([]);
  });

  it('停止した時点で操作中の指は取り消す', () => {
    const { input, events } = setup();
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerMove(1, { x: 50, y: 0 });
    input.pause();
    input.pointerUp(1, { x: 100, y: 0 }, 100);
    expect(events.map((e) => e.type)).toEqual(['dragstart', 'cancel']);
  });

  it('複数の停止要求がすべて取り下げられるまで再開しない', () => {
    const { input, events } = setup();
    const resumeA = input.pause();
    const resumeB = input.pause();
    resumeA();
    expect(input.isPaused).toBe(true);
    resumeB();
    expect(input.isPaused).toBe(false);
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerUp(1, { x: 0, y: 0 }, 10);
    expect(events.map((e) => e.type)).toEqual(['tap']);
  });

  it('同じ再開用の関数を2回呼んでも、ほかの停止要求は取り下げない', () => {
    const { input } = setup();
    const resumeA = input.pause();
    input.pause();
    resumeA();
    resumeA();
    expect(input.isPaused).toBe(true);
  });
});

describe('InputManager: ポインタ処理(UI)', () => {
  function handler(captures: boolean) {
    return { down: vi.fn(() => captures), move: vi.fn(), up: vi.fn(), cancel: vi.fn() };
  }

  it('ポインタ処理が独占した指は、ジェスチャーとして通知しない', () => {
    const { input, events } = setup();
    const ui = handler(true);
    input.addPointerHandler(ui);
    input.pointerDown(1, { x: 5, y: 6 }, 0);
    input.pointerMove(1, { x: 7, y: 8 });
    input.pointerUp(1, { x: 9, y: 10 }, 10);
    expect(ui.down).toHaveBeenCalledWith({ x: 5, y: 6 });
    expect(ui.move).toHaveBeenCalledWith({ x: 7, y: 8 });
    expect(ui.up).toHaveBeenCalledWith({ x: 9, y: 10 });
    expect(events).toEqual([]);
  });

  it('独占しなかった指は、ジェスチャーとして通知する', () => {
    const { input, events } = setup();
    const ui = handler(false);
    input.addPointerHandler(ui);
    input.pointerDown(1, { x: 10, y: 20 }, 0);
    input.pointerUp(1, { x: 10, y: 20 }, 10);
    expect(events.map((e) => e.type)).toEqual(['tap']);
    expect(ui.up).not.toHaveBeenCalled();
  });

  it('後から登録したポインタ処理が先に聞かれる', () => {
    const { input } = setup();
    const first = handler(true);
    const second = handler(true);
    input.addPointerHandler(first);
    input.addPointerHandler(second);
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    expect(second.down).toHaveBeenCalled();
    expect(first.down).not.toHaveBeenCalled();
  });

  it('独占中の2本目の指は無視する', () => {
    const { input } = setup();
    const ui = handler(true);
    input.addPointerHandler(ui);
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerDown(2, { x: 50, y: 50 }, 5);
    input.pointerUp(2, { x: 50, y: 50 }, 10);
    expect(ui.down).toHaveBeenCalledTimes(1);
    expect(ui.up).not.toHaveBeenCalled();
  });

  it('pointercancel・一時停止・登録の解除で、独占中の操作を取り消す', () => {
    const { input } = setup();
    const ui = handler(true);
    const off = input.addPointerHandler(ui);

    input.pointerDown(1, { x: 0, y: 0 }, 0);
    input.pointerCancel(1);
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    const resume = input.pause();
    resume();
    input.pointerDown(1, { x: 0, y: 0 }, 0);
    off();
    expect(ui.cancel).toHaveBeenCalledTimes(3);
    input.pointerUp(1, { x: 0, y: 0 }, 10);
    expect(ui.up).not.toHaveBeenCalled();
  });
});
