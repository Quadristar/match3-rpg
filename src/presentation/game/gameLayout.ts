/**
 * レイアウト定義。領域と基準点は、ゲームの画面構成に合わせて増やす。
 */
import type { Layout, LayoutDefinition } from '../../services/layout/layoutTypes';

export type GameRegion = 'main';
export type GameAnchor = 'center';
export type GameLayout = Layout<GameRegion, GameAnchor>;

/** 縦横どちらも、セーフエリア全体を main とする */
const spec: LayoutDefinition<GameRegion, GameAnchor>['portrait'] = ({ safeArea }) => ({
  regions: { main: safeArea },
  anchors: { center: { x: safeArea.x + safeArea.width / 2, y: safeArea.y + safeArea.height / 2 } },
});

export const gameLayout: LayoutDefinition<GameRegion, GameAnchor> = { portrait: spec, landscape: spec };
