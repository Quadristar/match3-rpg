import { describe, expect, it } from 'vitest';
import { type Gesture, GestureRecognizer, swipeDirection } from '../../../src/services/input/GestureRecognizer';
import type { GestureThresholds } from '../../../src/services/input/inputTypes';

const THRESHOLDS: GestureThresholds = {
  dragStartDistance: 10,
  tapMaxDurationMs: 300,
  swipeMinDistance: 50,
  swipeMaxDurationMs: 500,
};

function setup() {
  const gestures: Gesture[] = [];
  const recognizer = new GestureRecognizer(THRESHOLDS, (g) => gestures.push(g));
  const types = (): string[] => gestures.map((g) => g.type);
  return { recognizer, gestures, types };
}

const p = (x: number, y: number) => ({ x, y });

describe('GestureRecognizer: タップ', () => {
  it('ほとんど動かさずに短時間で離すとタップ', () => {
    const { recognizer, gestures } = setup();
    recognizer.down(1, p(100, 100), 0);
    recognizer.move(1, p(105, 103));
    recognizer.up(1, p(105, 103), 200);
    expect(gestures).toEqual([{ type: 'tap', position: p(105, 103) }]);
  });

  it('長く押してから離した場合は何も通知しない(長押しは未対応)', () => {
    const { recognizer, gestures } = setup();
    recognizer.down(1, p(100, 100), 0);
    recognizer.up(1, p(100, 100), 301);
    expect(gestures).toEqual([]);
  });
});

describe('GestureRecognizer: ドラッグ', () => {
  it('しきい値以上動くと dragstart、その後は dragmove、離すと dragend', () => {
    const { recognizer, gestures, types } = setup();
    recognizer.down(1, p(100, 100), 0);
    recognizer.move(1, p(105, 100));
    expect(types()).toEqual([]);
    recognizer.move(1, p(112, 100));
    recognizer.move(1, p(120, 100));
    recognizer.up(1, p(125, 100), 1000);
    expect(types()).toEqual(['dragstart', 'dragmove', 'dragend']);
    expect(gestures[0]).toEqual({ type: 'dragstart', start: p(100, 100), position: p(112, 100) });
    expect(gestures[1]).toEqual({ type: 'dragmove', start: p(100, 100), position: p(120, 100), previous: p(112, 100) });
  });

  it('ゆっくり動かした場合はスワイプにならない', () => {
    const { recognizer, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.move(1, p(100, 0));
    recognizer.up(1, p(100, 0), 501);
    expect(types()).toEqual(['dragstart', 'dragend']);
  });

  it('短い距離で離した場合はスワイプにならない', () => {
    const { recognizer, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.move(1, p(49, 0));
    recognizer.up(1, p(49, 0), 100);
    expect(types()).toEqual(['dragstart', 'dragend']);
  });
});

describe('GestureRecognizer: スワイプ', () => {
  it.each([
    [p(80, 0), 'right'],
    [p(-80, 0), 'left'],
    [p(0, 80), 'down'],
    [p(0, -80), 'up'],
    [p(60, 40), 'right'],
    [p(-30, -70), 'up'],
  ] as const)('(%o) へ速く動かすと %s 方向のスワイプ', (end, direction) => {
    const { recognizer, gestures, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.move(1, end);
    recognizer.up(1, end, 200);
    expect(types()).toEqual(['dragstart', 'dragend', 'swipe']);
    expect(gestures.at(-1)).toEqual({ type: 'swipe', start: p(0, 0), end, direction });
  });

  it('途中の move が届かなくても、離した位置でスワイプを判定する', () => {
    const { recognizer, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.up(1, p(0, 100), 100);
    expect(types()).toEqual(['dragstart', 'dragend', 'swipe']);
  });

  it('swipeDirection は縦横の大きい方で決まる', () => {
    expect(swipeDirection(p(0, 0), p(10, -9))).toBe('right');
    expect(swipeDirection(p(0, 0), p(9, -10))).toBe('up');
  });
});

describe('GestureRecognizer: 複数の指と取り消し', () => {
  it('操作中は2本目以降の指を無視する', () => {
    const { recognizer, gestures } = setup();
    recognizer.down(1, p(100, 100), 0);
    recognizer.down(2, p(300, 300), 10);
    recognizer.move(2, p(400, 400));
    recognizer.up(2, p(400, 400), 50);
    recognizer.up(1, p(100, 100), 100);
    expect(gestures).toEqual([{ type: 'tap', position: p(100, 100) }]);
  });

  it('1本目を離した後なら、次の指を受け付ける', () => {
    const { recognizer, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.up(1, p(0, 0), 50);
    recognizer.down(2, p(0, 0), 100);
    recognizer.up(2, p(0, 0), 150);
    expect(types()).toEqual(['tap', 'tap']);
  });

  it('取り消すと cancel を通知し、その指の離しは無視する', () => {
    const { recognizer, types } = setup();
    recognizer.down(1, p(0, 0), 0);
    recognizer.move(1, p(30, 0));
    recognizer.cancel(1);
    recognizer.up(1, p(100, 0), 100);
    expect(types()).toEqual(['dragstart', 'cancel']);
    expect(recognizer.isActive).toBe(false);
  });

  it('操作していない指の取り消しは何もしない', () => {
    const { recognizer, types } = setup();
    recognizer.cancel();
    recognizer.down(1, p(0, 0), 0);
    recognizer.cancel(2);
    expect(types()).toEqual([]);
    expect(recognizer.isActive).toBe(true);
  });
});
