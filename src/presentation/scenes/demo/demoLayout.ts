/**
 * デモ用のレイアウト定義。
 * ゲームを作るときは、このファイルごと削除し、ゲーム用の定義に差し替える。
 *
 * - 縦: 上に情報(info)、中央にメイン(main)、下に案内(hint)
 * - 横: 左に情報(info)、右にメイン(main)、その下に案内(hint)
 * いずれもセーフエリアの内側に配置する。
 */
import type { Layout, LayoutDefinition, Rect } from '../../../services/layout/layoutTypes';

export type DemoRegion = 'info' | 'main' | 'hint';
export type DemoAnchor = 'center' | 'picture' | 'button' | 'infoTopLeft' | 'hint';
export type DemoLayout = Layout<DemoRegion, DemoAnchor>;

/** 配置の数値(論理座標) */
const SPACING = {
  /** セーフエリアの端からの余白 */
  margin: 24,
  /** 領域どうしの間隔 */
  gap: 16,
  /** 縦画面の info の高さ */
  portraitInfoHeight: 330,
  /** 横画面の info の幅 */
  landscapeInfoWidth: 380,
  /** hint の高さ */
  hintHeight: 120,
  /** picture の基準点の、main の上端からの位置(main の高さに対する割合) */
  pictureRatioY: 0.25,
  /** button の基準点の、main の上端からの位置(main の高さに対する割合) */
  buttonRatioY: 0.82,
} as const;

/** 矩形を内側に縮める */
function inset(rect: Rect, amount: number): Rect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(0, rect.width - amount * 2),
    height: Math.max(0, rect.height - amount * 2),
  };
}

function centerOf(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** main の中で、ボタンを置く基準点 */
function buttonOf(main: Rect): { x: number; y: number } {
  return { x: main.x + main.width / 2, y: main.y + main.height * SPACING.buttonRatioY };
}

/** main の中で、画像を置く基準点 */
function pictureOf(main: Rect): { x: number; y: number } {
  return { x: main.x + main.width / 2, y: main.y + main.height * SPACING.pictureRatioY };
}

export const demoLayout: LayoutDefinition<DemoRegion, DemoAnchor> = {
  portrait: ({ safeArea }) => {
    const area = inset(safeArea, SPACING.margin);
    const info: Rect = { x: area.x, y: area.y, width: area.width, height: SPACING.portraitInfoHeight };
    const hint: Rect = {
      x: area.x,
      y: area.y + area.height - SPACING.hintHeight,
      width: area.width,
      height: SPACING.hintHeight,
    };
    const mainTop = info.y + info.height + SPACING.gap;
    const main: Rect = { x: area.x, y: mainTop, width: area.width, height: Math.max(0, hint.y - SPACING.gap - mainTop) };
    return {
      regions: { info, main, hint },
      anchors: { center: centerOf(main), picture: pictureOf(main), button: buttonOf(main), infoTopLeft: { x: info.x, y: info.y }, hint: centerOf(hint) },
    };
  },
  landscape: ({ safeArea }) => {
    const area = inset(safeArea, SPACING.margin);
    const info: Rect = { x: area.x, y: area.y, width: SPACING.landscapeInfoWidth, height: area.height };
    const rightX = info.x + info.width + SPACING.gap;
    const rightWidth = Math.max(0, area.x + area.width - rightX);
    const hint: Rect = {
      x: rightX,
      y: area.y + area.height - SPACING.hintHeight,
      width: rightWidth,
      height: SPACING.hintHeight,
    };
    const main: Rect = { x: rightX, y: area.y, width: rightWidth, height: Math.max(0, hint.y - SPACING.gap - area.y) };
    return {
      regions: { info, main, hint },
      anchors: { center: centerOf(main), picture: pictureOf(main), button: buttonOf(main), infoTopLeft: { x: info.x, y: info.y }, hint: centerOf(hint) },
    };
  },
};
