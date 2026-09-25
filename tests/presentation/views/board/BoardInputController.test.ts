import { describe, expect, it } from 'vitest';
import { BoardGeometry } from '../../../../src/presentation/views/board/BoardGeometry';
import { BoardInputController } from '../../../../src/presentation/views/board/BoardInputController';
import type { InputEvent } from '../../../../src/services/input/inputTypes';

// マスの大きさ 100、盤面の左上 (0, 0) の 7×7。しきい値はパネル幅の 40% = 40
const geometry = new BoardGeometry({ x: 0, y: 0, width: 700, height: 700 }, 7, 7);

/** マス (row, col) の中心の論理座標 */
function at(row: number, col: number) {
  return { x: col * 100 + 50, y: row * 100 + 50 };
}

function tap(row: number, col: number): InputEvent {
  return { type: 'tap', position: at(row, col) };
}

describe('BoardInputController: 2回タップ', () => {
  it('1回目で選択、隣をタップで入れ替え(選択は解除)', () => {
    const c = new BoardInputController(0.4);
    expect(c.handle(tap(2, 2), geometry)).toEqual([{ type: 'select', cell: { row: 2, col: 2 } }]);
    expect(c.selected).toEqual({ row: 2, col: 2 });
    expect(c.handle(tap(2, 3), geometry)).toEqual([
      { type: 'deselect' },
      { type: 'swap', a: { row: 2, col: 2 }, b: { row: 2, col: 3 } },
    ]);
    expect(c.selected).toBeNull();
  });

  it('選択中のパネルをもう一度タップすると解除', () => {
    const c = new BoardInputController(0.4);
    c.handle(tap(1, 1), geometry);
    expect(c.handle(tap(1, 1), geometry)).toEqual([{ type: 'deselect' }]);
    expect(c.selected).toBeNull();
  });

  it('隣でないパネル(斜め・離れている)をタップすると、そちらを新しく選択', () => {
    const c = new BoardInputController(0.4);
    c.handle(tap(1, 1), geometry);
    expect(c.handle(tap(2, 2), geometry)).toEqual([{ type: 'select', cell: { row: 2, col: 2 } }]);
    expect(c.handle(tap(2, 5), geometry)).toEqual([{ type: 'select', cell: { row: 2, col: 5 } }]);
    expect(c.selected).toEqual({ row: 2, col: 5 });
  });

  it('盤面の外をタップすると解除。選択がなければ何も起きない', () => {
    const c = new BoardInputController(0.4);
    expect(c.handle({ type: 'tap', position: { x: 800, y: 50 } }, geometry)).toEqual([]);
    c.handle(tap(0, 0), geometry);
    expect(c.handle({ type: 'tap', position: { x: -10, y: 50 } }, geometry)).toEqual([{ type: 'deselect' }]);
  });
});

describe('BoardInputController: ドラッグ', () => {
  const start = at(3, 3);

  function drag(c: BoardInputController, dx: number, dy: number) {
    const intents = c.handle({ type: 'dragstart', start, position: { x: start.x + 5, y: start.y } }, geometry);
    return [...intents, ...c.handle({ type: 'dragmove', start, position: { x: start.x + dx, y: start.y + dy }, delta: { x: 0, y: 0 } }, geometry)];
  }

  it.each([
    ['右', 40, 0, { row: 3, col: 4 }],
    ['左', -45, 10, { row: 3, col: 2 }],
    ['下', 5, 60, { row: 4, col: 3 }],
    ['上', -20, -41, { row: 2, col: 3 }],
  ] as const)('%s にしきい値以上動かすと、指を離す前に入れ替えを要求する', (_, dx, dy, target) => {
    const c = new BoardInputController(0.4);
    expect(drag(c, dx, dy)).toEqual([{ type: 'swap', a: { row: 3, col: 3 }, b: target }]);
  });

  it('しきい値未満では要求しない(ゆっくり動かしても、しきい値を超えた時点で要求する)', () => {
    const c = new BoardInputController(0.4);
    expect(drag(c, 39, 0)).toEqual([]);
    const move = (x: number) => c.handle({ type: 'dragmove', start, position: { x: start.x + x, y: start.y }, delta: { x: 1, y: 0 } }, geometry);
    expect(move(39.9)).toEqual([]);
    expect(move(40)).toHaveLength(1);
  });

  it('1回のドラッグで要求するのは1回だけ。離したら次のドラッグで再び要求できる', () => {
    const c = new BoardInputController(0.4);
    expect(drag(c, 50, 0)).toHaveLength(1);
    expect(c.handle({ type: 'dragmove', start, position: { x: start.x + 150, y: start.y }, delta: { x: 0, y: 0 } }, geometry)).toEqual([]);
    c.handle({ type: 'dragend', start, position: start }, geometry);
    expect(drag(c, 0, 50)).toHaveLength(1);
  });

  it('盤面の外へ向かうドラッグは要求しない', () => {
    const c = new BoardInputController(0.4);
    const edge = at(0, 6);
    c.handle({ type: 'dragstart', start: edge, position: edge }, geometry);
    expect(c.handle({ type: 'dragmove', start: edge, position: { x: edge.x + 60, y: edge.y }, delta: { x: 0, y: 0 } }, geometry)).toEqual([]);
    expect(c.handle({ type: 'dragmove', start: edge, position: { x: edge.x, y: edge.y - 60 }, delta: { x: 0, y: 0 } }, geometry)).toEqual([]);
  });

  it('盤面の外から始めたドラッグは無視する', () => {
    const c = new BoardInputController(0.4);
    const outside = { x: 50, y: -30 };
    c.handle({ type: 'dragstart', start: outside, position: outside }, geometry);
    expect(c.handle({ type: 'dragmove', start: outside, position: { x: 50, y: 60 }, delta: { x: 0, y: 0 } }, geometry)).toEqual([]);
  });

  it('ドラッグを始めると選択は解除する', () => {
    const c = new BoardInputController(0.4);
    c.handle(tap(0, 0), geometry);
    expect(c.handle({ type: 'dragstart', start, position: start }, geometry)).toEqual([{ type: 'deselect' }]);
    expect(c.selected).toBeNull();
  });

  it('取り消し(cancel)でドラッグをやめる', () => {
    const c = new BoardInputController(0.4);
    c.handle({ type: 'dragstart', start, position: start }, geometry);
    c.handle({ type: 'cancel' }, geometry);
    expect(c.handle({ type: 'dragmove', start, position: { x: start.x + 90, y: start.y }, delta: { x: 0, y: 0 } }, geometry)).toEqual([]);
  });

  it('スワイプは使わない', () => {
    const c = new BoardInputController(0.4);
    expect(c.handle({ type: 'swipe', start, end: { x: start.x + 90, y: start.y }, direction: 'right' }, geometry)).toEqual([]);
  });

  it('reset で選択とドラッグを取り消す', () => {
    const c = new BoardInputController(0.4);
    c.handle(tap(1, 1), geometry);
    expect(c.reset()).toEqual([{ type: 'deselect' }]);
    expect(c.reset()).toEqual([]);
  });
});
