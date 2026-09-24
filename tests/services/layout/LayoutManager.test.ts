import { describe, expect, it, vi } from 'vitest';
import { LayoutManager } from '../../../src/services/layout/LayoutManager';
import type { LayoutDefinition, LogicalSizes, ScreenInput } from '../../../src/services/layout/layoutTypes';

const SIZES: LogicalSizes = {
  portrait: { width: 720, height: 1280 },
  landscape: { width: 1280, height: 720 },
};

const DEFINITION: LayoutDefinition<'all', 'center'> = {
  portrait: { regions: { all: { x: 0, y: 0, width: 720, height: 1280 } }, anchors: { center: { x: 360, y: 640 } } },
  landscape: { regions: { all: { x: 0, y: 0, width: 1280, height: 720 } }, anchors: { center: { x: 640, y: 360 } } },
};

function input(width: number, height: number, top = 0): ScreenInput {
  return { width, height, safeAreaInsets: { top, right: 0, bottom: 0, left: 0 } };
}

describe('LayoutManager', () => {
  it('初期入力からレイアウトを計算する', () => {
    const manager = new LayoutManager(SIZES, DEFINITION, input(390, 844));
    expect(manager.current.orientation).toBe('portrait');
    expect(manager.current.anchors.center).toEqual({ x: 360, y: 640 });
  });

  it('回転すると向きが変わり、登録された側に新しいレイアウトが通知される', () => {
    const manager = new LayoutManager(SIZES, DEFINITION, input(390, 844));
    const listener = vi.fn();
    manager.onChange(listener);

    expect(manager.update(input(844, 390))).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].orientation).toBe('landscape');
    expect(manager.current.anchors.center).toEqual({ x: 640, y: 360 });
  });

  it('向きが同じでもサイズやセーフエリアが変われば通知する', () => {
    const manager = new LayoutManager(SIZES, DEFINITION, input(390, 844));
    const listener = vi.fn();
    manager.onChange(listener);
    manager.update(input(390, 700));
    manager.update(input(390, 700, 24));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('入力が変わらなければ通知しない', () => {
    const manager = new LayoutManager(SIZES, DEFINITION, input(390, 844));
    const listener = vi.fn();
    manager.onChange(listener);
    expect(manager.update(input(390, 844))).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('登録を解除すると通知されない', () => {
    const manager = new LayoutManager(SIZES, DEFINITION, input(390, 844));
    const listener = vi.fn();
    const unsubscribe = manager.onChange(listener);
    unsubscribe();
    manager.update(input(844, 390));
    expect(listener).not.toHaveBeenCalled();
  });
});
