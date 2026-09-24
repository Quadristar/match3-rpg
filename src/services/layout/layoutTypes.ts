/**
 * レイアウトで使う型の定義。
 * DOM や Pixi に依存しない純粋な型だけを置く。
 */

/** 画面の向き */
export type Orientation = 'portrait' | 'landscape';

/** 大きさ */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** 点 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 矩形(左上の座標と大きさ) */
export interface Rect extends Point, Size {}

/** 上下左右の余白(セーフエリアの内側への食い込み量など) */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** 向きごとの論理解像度 */
export type LogicalSizes = Readonly<Record<Orientation, Size>>;

/** 配置計算の入力(画面の実寸。単位は CSS ピクセル) */
export interface ScreenInput {
  readonly width: number;
  readonly height: number;
  /** セーフエリア(切り欠き・ナビゲーションバーなど)の食い込み量 */
  readonly safeAreaInsets: Insets;
}

/**
 * 論理解像度を画面に収めた結果。
 *
 * 座標系は2つある。
 * - 画面座標: 画面の左上が原点、単位は CSS ピクセル
 * - 論理座標: 論理解像度の左上が原点。ゲームの表示はすべてこちらで配置する
 *
 * 画面座標 = 論理座標 × scale + offset
 */
export interface FitResult {
  readonly orientation: Orientation;
  /** 画面の大きさ(画面座標) */
  readonly screen: Size;
  /** 論理解像度 */
  readonly logical: Size;
  /** 論理座標から画面座標への拡大率 */
  readonly scale: number;
  /** 論理座標の原点が置かれる画面座標(上下または左右の余白の大きさ) */
  readonly offset: Point;
  /** 画面全体を論理座標で表した矩形(余白を含む。背景を画面いっぱいに描く場合などに使う) */
  readonly visibleArea: Rect;
  /** セーフエリアを論理座標で表した矩形(論理解像度の範囲内に切り詰める) */
  readonly safeArea: Rect;
}

/** レイアウト定義を解決するときに渡す情報 */
export interface LayoutContext {
  readonly orientation: Orientation;
  /** 論理解像度 */
  readonly logical: Size;
  /** セーフエリア(論理座標) */
  readonly safeArea: Rect;
}

/** 1つの向きの配置: 名前付きの領域と基準点(いずれも論理座標) */
export interface LayoutSpec<R extends string, A extends string> {
  readonly regions: Readonly<Record<R, Rect>>;
  readonly anchors: Readonly<Record<A, Point>>;
}

/**
 * 1つの向きの配置の定義。
 * 固定値で書くか、セーフエリアなどに合わせて計算する関数で書く。
 */
export type LayoutSpecSource<R extends string, A extends string> =
  | LayoutSpec<R, A>
  | ((context: LayoutContext) => LayoutSpec<R, A>);

/**
 * レイアウト定義。向きごとに、同じ名前の領域と基準点を持つ。
 * 中身はゲームごとに差し替える(雛形にはデモ用の定義だけがある)。
 */
export type LayoutDefinition<R extends string, A extends string> = Readonly<
  Record<Orientation, LayoutSpecSource<R, A>>
>;

/** 現在のレイアウト: 収めた結果と、解決済みの領域・基準点 */
export interface Layout<R extends string = string, A extends string = string>
  extends FitResult, LayoutSpec<R, A> {}
