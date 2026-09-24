import { describe, expect, it } from 'vitest';
import { computeLayout, detectOrientation, fitToScreen } from '../../../src/services/layout/computeLayout';
import type { Insets, LayoutDefinition, LogicalSizes } from '../../../src/services/layout/layoutTypes';

const SIZES: LogicalSizes = {
  portrait: { width: 720, height: 1280 },
  landscape: { width: 1280, height: 720 },
};

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function fit(width: number, height: number, safeAreaInsets: Insets = NO_INSETS) {
  return fitToScreen({ width, height, safeAreaInsets }, SIZES);
}

/** 論理座標の点を画面座標に変換する(検証用) */
function toScreen(result: ReturnType<typeof fit>, x: number, y: number) {
  return { x: x * result.scale + result.offset.x, y: y * result.scale + result.offset.y };
}

describe('detectOrientation', () => {
  it('縦長は portrait、横長は landscape、正方形は portrait', () => {
    expect(detectOrientation(390, 844)).toBe('portrait');
    expect(detectOrientation(844, 390)).toBe('landscape');
    expect(detectOrientation(500, 500)).toBe('portrait');
  });
});

describe('fitToScreen', () => {
  it('縦画面: 論理解像度と同じ比率ならちょうど収まり、余白がない', () => {
    const r = fit(360, 640);
    expect(r.orientation).toBe('portrait');
    expect(r.logical).toEqual({ width: 720, height: 1280 });
    expect(r.scale).toBeCloseTo(0.5);
    expect(r.offset).toEqual({ x: 0, y: 0 });
    expect(r.visibleArea).toEqual({ x: 0, y: 0, width: 720, height: 1280 });
    expect(r.safeArea).toEqual({ x: 0, y: 0, width: 720, height: 1280 });
  });

  it('横画面: 論理解像度 1280×720 を使い、ちょうど収まる', () => {
    const r = fit(1920, 1080);
    expect(r.orientation).toBe('landscape');
    expect(r.logical).toEqual({ width: 1280, height: 720 });
    expect(r.scale).toBeCloseTo(1.5);
    expect(r.offset).toEqual({ x: 0, y: 0 });
  });

  it('縦長のスマホ(390×844): 幅に合わせて縮小し、上下に同じ大きさの余白ができる', () => {
    const r = fit(390, 844);
    expect(r.scale).toBeCloseTo(390 / 720);
    expect(r.offset.x).toBeCloseTo(0);
    expect(r.offset.y).toBeCloseTo((844 - 1280 * (390 / 720)) / 2);
    // 論理解像度の四隅が画面の中に収まり、上下対称になる
    const topLeft = toScreen(r, 0, 0);
    const bottomRight = toScreen(r, 720, 1280);
    expect(topLeft.y).toBeCloseTo(844 - bottomRight.y);
    expect(bottomRight.x).toBeCloseTo(390);
    // 画面全体を論理座標で表すと、上下にはみ出す
    expect(r.visibleArea.x).toBeCloseTo(0);
    expect(r.visibleArea.y).toBeLessThan(0);
    expect(r.visibleArea.height).toBeCloseTo(844 / r.scale);
  });

  it('横長のスマホ(844×390): 高さに合わせて縮小し、左右に余白ができる', () => {
    const r = fit(844, 390);
    expect(r.orientation).toBe('landscape');
    expect(r.scale).toBeCloseTo(390 / 720);
    expect(r.offset.y).toBeCloseTo(0);
    expect(r.offset.x).toBeCloseTo((844 - 1280 * (390 / 720)) / 2);
    expect(r.visibleArea.x).toBeLessThan(0);
    expect(r.visibleArea.width).toBeCloseTo(844 / r.scale);
  });

  it('極端な縦長(100×2000)でも論理解像度全体が画面に収まる', () => {
    const r = fit(100, 2000);
    expect(r.orientation).toBe('portrait');
    expect(r.scale).toBeCloseTo(100 / 720);
    const bottomRight = toScreen(r, 720, 1280);
    expect(bottomRight.x).toBeLessThanOrEqual(100 + 1e-9);
    expect(bottomRight.y).toBeLessThanOrEqual(2000 + 1e-9);
    expect(r.offset.y).toBeGreaterThan(0);
  });

  it('極端な横長(3000×100)でも論理解像度全体が画面に収まる', () => {
    const r = fit(3000, 100);
    expect(r.orientation).toBe('landscape');
    expect(r.scale).toBeCloseTo(100 / 720);
    const bottomRight = toScreen(r, 1280, 720);
    expect(bottomRight.x).toBeLessThanOrEqual(3000 + 1e-9);
    expect(bottomRight.y).toBeCloseTo(100);
    expect(r.offset.x).toBeGreaterThan(0);
  });

  it('横長だが論理解像度より縦長寄り(1000×720)の横画面では上下に余白ができる', () => {
    const r = fit(1000, 720);
    expect(r.orientation).toBe('landscape');
    expect(r.scale).toBeCloseTo(1000 / 1280);
    expect(r.offset.x).toBeCloseTo(0);
    expect(r.offset.y).toBeGreaterThan(0);
  });

  it('セーフエリア: 論理解像度の内側に食い込む分だけ safeArea が狭くなる(縦)', () => {
    // 360×640 は拡大率 0.5 で余白なし。上 20px・下 10px は論理座標で 40・20
    const r = fit(360, 640, { top: 20, right: 0, bottom: 10, left: 0 });
    expect(r.safeArea).toEqual({ x: 0, y: 40, width: 720, height: 1280 - 40 - 20 });
  });

  it('セーフエリア: 横画面の左右の切り欠き', () => {
    // 1280×720 は拡大率 1。左 44px・右 30px
    const r = fit(1280, 720, { top: 0, right: 30, bottom: 21, left: 44 });
    expect(r.safeArea).toEqual({ x: 44, y: 0, width: 1280 - 44 - 30, height: 720 - 21 });
  });

  it('セーフエリア: 切り欠きが余白に収まる場合は safeArea に影響しない', () => {
    // 390×844 は上下に約 75px の余白がある。上 47px・下 34px は余白の中
    const r = fit(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    expect(r.safeArea.x).toBeCloseTo(0);
    expect(r.safeArea.y).toBeCloseTo(0);
    expect(r.safeArea.width).toBeCloseTo(720);
    expect(r.safeArea.height).toBeCloseTo(1280);
  });

  it('セーフエリア: 切り欠きが余白を越えると、越えた分だけ狭くなる', () => {
    // 390×844 の上の余白(画面座標)は offset.y。そこから 20px 余分に食い込ませる
    const base = fit(390, 844);
    const r = fit(390, 844, { top: base.offset.y + 20, right: 0, bottom: 0, left: 0 });
    expect(r.safeArea.y).toBeCloseTo(20 / r.scale);
    expect(r.safeArea.height).toBeCloseTo(1280 - 20 / r.scale);
  });

  it('不正な値: 負・NaN のセーフエリアは 0、画面より大きいセーフエリアは幅 0', () => {
    const r1 = fit(360, 640, { top: -10, right: Number.NaN, bottom: 0, left: 0 });
    expect(r1.safeArea).toEqual({ x: 0, y: 0, width: 720, height: 1280 });
    const r2 = fit(360, 640, { top: 0, right: 300, bottom: 0, left: 300 });
    expect(r2.safeArea.width).toBe(0);
  });

  it('不正な値: 大きさ 0 や NaN の画面でも例外にならず、有限の値を返す', () => {
    for (const r of [fit(0, 0), fit(Number.NaN, 500)]) {
      expect(Number.isFinite(r.scale)).toBe(true);
      expect(r.scale).toBeGreaterThan(0);
      expect(Number.isFinite(r.offset.x) && Number.isFinite(r.offset.y)).toBe(true);
    }
  });
});

describe('computeLayout', () => {
  const definition: LayoutDefinition<'main', 'center'> = {
    portrait: {
      regions: { main: { x: 0, y: 0, width: 720, height: 1280 } },
      anchors: { center: { x: 360, y: 640 } },
    },
    landscape: ({ safeArea }) => ({
      regions: { main: safeArea },
      anchors: { center: { x: safeArea.x + safeArea.width / 2, y: safeArea.y + safeArea.height / 2 } },
    }),
  };

  it('向きに応じた定義を使う(固定値の定義)', () => {
    const layout = computeLayout({ width: 360, height: 640, safeAreaInsets: NO_INSETS }, SIZES, definition);
    expect(layout.orientation).toBe('portrait');
    expect(layout.anchors.center).toEqual({ x: 360, y: 640 });
  });

  it('関数で書いた定義には、論理座標のセーフエリアが渡される', () => {
    const layout = computeLayout(
      { width: 1280, height: 720, safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 80 } },
      SIZES,
      definition,
    );
    expect(layout.orientation).toBe('landscape');
    expect(layout.regions.main).toEqual({ x: 80, y: 0, width: 1200, height: 720 });
    expect(layout.anchors.center).toEqual({ x: 680, y: 360 });
  });
});
