/**
 * レイアウト定義(仮仕様。docs/GAME_DESIGN.md §7「画面構成」)。
 *
 * - 縦: 上に立ち絵(左)と敵(右)、その下に情報、いちばん下に盤面
 * - 横: 左に立ち絵、中央に盤面、右に敵(上)と情報(下)
 * - main はセーフエリア全体(タイトル画面などで使う)
 * いずれもセーフエリアの内側に配置する。盤面は正方形。
 */
import type { Layout, LayoutContext, LayoutDefinition, LayoutSpec, Point, Rect } from '../../services/layout/layoutTypes';

export type GameRegion = 'main' | 'board' | 'enemy' | 'portrait' | 'info';
export type GameAnchor = 'center' | 'boardCenter' | 'comboText' | 'backButton';
export type GameLayout = Layout<GameRegion, GameAnchor>;

/** 配置の数値(論理座標。仮仕様) */
export const GAME_LAYOUT_SPACING = {
  /** セーフエリアの端からの余白 */
  margin: 16,
  /** 領域どうしの間隔 */
  gap: 12,
  /** 縦画面: 盤面の一辺の上限(余白を除いた高さに対する割合) */
  portraitBoardMaxHeightRatio: 0.56,
  /** 縦画面: 情報の高さ */
  portraitInfoHeight: 120,
  /** 縦画面: 上段のうち立ち絵が占める幅の割合(残りが敵) */
  portraitPortraitWidthRatio: 0.4,
  /** 横画面: 盤面の一辺の上限(余白を除いた幅に対する割合) */
  landscapeBoardMaxWidthRatio: 0.54,
  /** 横画面: 右の列のうち敵が占める高さの割合(残りが情報) */
  landscapeEnemyHeightRatio: 0.6,
  /** 情報の中の文字・ボタンの位置(情報の端からの距離) */
  infoPadding: 24,
  /** 「タイトルへ」ボタンの中心の、情報の右端からの距離(縦画面) */
  backButtonInsetX: 120,
} as const;

const S = GAME_LAYOUT_SPACING;

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

function inset(r: Rect, amount: number): Rect {
  return rect(r.x + amount, r.y + amount, r.width - amount * 2, r.height - amount * 2);
}

function centerOf(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

const portrait = ({ safeArea }: LayoutContext): LayoutSpec<GameRegion, GameAnchor> => {
  const inner = inset(safeArea, S.margin);
  const boardSize = Math.max(0, Math.min(inner.width, inner.height * S.portraitBoardMaxHeightRatio));
  const board = rect(inner.x + (inner.width - boardSize) / 2, inner.y + inner.height - boardSize, boardSize, boardSize);
  const infoHeight = Math.min(S.portraitInfoHeight, Math.max(0, board.y - inner.y - S.gap));
  const info = rect(inner.x, board.y - S.gap - infoHeight, inner.width, infoHeight);
  const topHeight = info.y - S.gap - inner.y;
  const portraitWidth = (inner.width - S.gap) * S.portraitPortraitWidthRatio;
  const portraitRegion = rect(inner.x, inner.y, portraitWidth, topHeight);
  const enemy = rect(portraitRegion.x + portraitWidth + S.gap, inner.y, inner.width - portraitWidth - S.gap, topHeight);
  return {
    regions: { main: safeArea, board, enemy, portrait: portraitRegion, info },
    anchors: {
      center: centerOf(safeArea),
      boardCenter: centerOf(board),
      comboText: { x: info.x + S.infoPadding, y: info.y + info.height / 2 },
      backButton: { x: info.x + info.width - S.backButtonInsetX, y: info.y + info.height / 2 },
    },
  };
};

const landscape = ({ safeArea }: LayoutContext): LayoutSpec<GameRegion, GameAnchor> => {
  const inner = inset(safeArea, S.margin);
  const boardSize = Math.max(0, Math.min(inner.height, inner.width * S.landscapeBoardMaxWidthRatio));
  const board = rect(inner.x + (inner.width - boardSize) / 2, inner.y + (inner.height - boardSize) / 2, boardSize, boardSize);
  const sideWidth = board.x - S.gap - inner.x;
  const portraitRegion = rect(inner.x, inner.y, sideWidth, inner.height);
  const rightX = board.x + board.width + S.gap;
  const enemyHeight = (inner.height - S.gap) * S.landscapeEnemyHeightRatio;
  const enemy = rect(rightX, inner.y, sideWidth, enemyHeight);
  const info = rect(rightX, enemy.y + enemyHeight + S.gap, sideWidth, inner.height - enemyHeight - S.gap);
  return {
    regions: { main: safeArea, board, enemy, portrait: portraitRegion, info },
    anchors: {
      center: centerOf(safeArea),
      boardCenter: centerOf(board),
      comboText: { x: info.x + S.infoPadding, y: info.y + S.infoPadding * 2 },
      backButton: { x: info.x + info.width / 2, y: info.y + info.height - S.infoPadding * 2 },
    },
  };
};

export const gameLayout: LayoutDefinition<GameRegion, GameAnchor> = { portrait, landscape };
