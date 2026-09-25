import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../../src/app/gameConfig';
import { type GameAnchor, gameLayout, type GameRegion } from '../../../src/presentation/game/gameLayout';
import type { LayoutContext, LayoutSpec, Orientation, Rect } from '../../../src/services/layout/layoutTypes';

function resolve(orientation: Orientation, safeArea?: Rect): LayoutSpec<GameRegion, GameAnchor> {
  const logical = GAME_CONFIG.logicalSizes[orientation];
  const context: LayoutContext = {
    orientation,
    logical,
    safeArea: safeArea ?? { x: 0, y: 0, width: logical.width, height: logical.height },
  };
  const source = gameLayout[orientation];
  return typeof source === 'function' ? source(context) : source;
}

const EPS = 1e-6;

function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.width <= outer.x + outer.width + EPS &&
    inner.y + inner.height <= outer.y + outer.height + EPS
  );
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
}

const GAME_REGIONS = ['board', 'enemy', 'portrait', 'info'] as const;

describe.each([
  ['portrait', undefined],
  ['landscape', undefined],
  ['portrait', { x: 0, y: 60, width: 720, height: 1180 }],
  ['landscape', { x: 50, y: 0, width: 1180, height: 700 }],
] as const)('gameLayout(%s, セーフエリア %o)', (orientation, safeArea) => {
  const spec = resolve(orientation, safeArea);
  const safe = spec.regions.main;

  it('main はセーフエリア全体', () => {
    const logical = GAME_CONFIG.logicalSizes[orientation];
    expect(safe).toEqual(safeArea ?? { x: 0, y: 0, width: logical.width, height: logical.height });
  });

  it('各領域はセーフエリアの内側にあり、互いに重ならない', () => {
    for (const name of GAME_REGIONS) {
      const region = spec.regions[name];
      expect(inside(region, safe), name).toBe(true);
      expect(region.width, name).toBeGreaterThan(0);
      expect(region.height, name).toBeGreaterThan(0);
    }
    for (const a of GAME_REGIONS) {
      for (const b of GAME_REGIONS) {
        if (a < b) expect(overlaps(spec.regions[a], spec.regions[b]), `${a} と ${b}`).toBe(false);
      }
    }
  });

  it('盤面は正方形で、十分な大きさがある', () => {
    const board = spec.regions.board;
    expect(board.width).toBeCloseTo(board.height);
    expect(board.width).toBeGreaterThan(500);
  });

  it('基準点は対応する領域の中にある', () => {
    const inRect = (p: { x: number; y: number }, r: Rect) =>
      p.x >= r.x - EPS && p.x <= r.x + r.width + EPS && p.y >= r.y - EPS && p.y <= r.y + r.height + EPS;
    expect(inRect(spec.anchors.boardCenter, spec.regions.board)).toBe(true);
    expect(inRect(spec.anchors.comboText, spec.regions.info)).toBe(true);
    expect(inRect(spec.anchors.backButton, spec.regions.info)).toBe(true);
  });
});

describe('gameLayout の配置の向き', () => {
  it('縦: 上から 立ち絵・敵 → 情報 → 盤面', () => {
    const { regions } = resolve('portrait');
    expect(regions.portrait.y + regions.portrait.height).toBeLessThanOrEqual(regions.info.y);
    expect(regions.enemy.x).toBeGreaterThan(regions.portrait.x);
    expect(regions.info.y + regions.info.height).toBeLessThanOrEqual(regions.board.y);
  });

  it('横: 左から 立ち絵 → 盤面 → 敵・情報', () => {
    const { regions } = resolve('landscape');
    expect(regions.portrait.x + regions.portrait.width).toBeLessThanOrEqual(regions.board.x);
    expect(regions.board.x + regions.board.width).toBeLessThanOrEqual(regions.enemy.x);
    expect(regions.enemy.y + regions.enemy.height).toBeLessThanOrEqual(regions.info.y);
  });
});
