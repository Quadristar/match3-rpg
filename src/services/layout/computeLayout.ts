/**
 * 画面サイズとセーフエリアから配置結果を計算する純粋な関数。
 * DOM や Pixi に依存しないため、Vitest で直接テストできる。
 */
import type {
  FitResult,
  Insets,
  Point,
  Layout,
  LayoutDefinition,
  LogicalSizes,
  Orientation,
  Rect,
  ScreenInput,
} from './layoutTypes';

/** 画面の縦横比から向きを判定する。正方形は縦として扱う(仮仕様) */
export function detectOrientation(width: number, height: number): Orientation {
  return height >= width ? 'portrait' : 'landscape';
}

/** 0 以上の有限の数に正規化する(NaN や負の値は 0) */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** 画面の大きさとして使える値に正規化する(0 以下や NaN は 1) */
function positiveSize(value: number): number {
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

function normalizeInsets(insets: Insets): Insets {
  return {
    top: nonNegative(insets.top),
    right: nonNegative(insets.right),
    bottom: nonNegative(insets.bottom),
    left: nonNegative(insets.left),
  };
}

/** 2つの矩形の重なりを返す。重ならない場合は大きさ 0 の矩形 */
function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/**
 * 向きに応じた論理解像度を、アスペクト比を保って画面に収める。
 * 画面の縦横比が論理解像度と異なる場合は、上下または左右に余白ができる。
 */
export function fitToScreen(input: ScreenInput, logicalSizes: LogicalSizes): FitResult {
  const screen = { width: positiveSize(input.width), height: positiveSize(input.height) };
  const orientation = detectOrientation(screen.width, screen.height);
  const logical = logicalSizes[orientation];

  const scale = Math.min(screen.width / logical.width, screen.height / logical.height);
  const offset = {
    x: (screen.width - logical.width * scale) / 2,
    y: (screen.height - logical.height * scale) / 2,
  };

  // 画面座標の矩形を論理座標に変換する
  const toLogical = (rect: Rect): Rect => ({
    x: (rect.x - offset.x) / scale,
    y: (rect.y - offset.y) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  });

  const visibleArea = toLogical({ x: 0, y: 0, ...screen });

  const insets = normalizeInsets(input.safeAreaInsets);
  const safeScreen: Rect = {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, screen.width - insets.left - insets.right),
    height: Math.max(0, screen.height - insets.top - insets.bottom),
  };
  const safeArea = intersect(toLogical(safeScreen), { x: 0, y: 0, ...logical });

  return { orientation, screen, logical, scale, offset, visibleArea, safeArea };
}

/** 収めた結果にレイアウト定義を適用し、領域と基準点を解決する */
export function computeLayout<R extends string, A extends string>(
  input: ScreenInput,
  logicalSizes: LogicalSizes,
  definition: LayoutDefinition<R, A>,
): Layout<R, A> {
  const fit = fitToScreen(input, logicalSizes);
  const source = definition[fit.orientation];
  const spec =
    typeof source === 'function'
      ? source({ orientation: fit.orientation, logical: fit.logical, safeArea: fit.safeArea })
      : source;
  return { ...fit, regions: spec.regions, anchors: spec.anchors };
}

/** 画面座標(CSS ピクセル)の点を論理座標に変換する */
export function screenToLogical(fit: Pick<FitResult, 'scale' | 'offset'>, point: Point): Point {
  return { x: (point.x - fit.offset.x) / fit.scale, y: (point.y - fit.offset.y) / fit.scale };
}
