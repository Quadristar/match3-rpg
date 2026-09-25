/**
 * パズルロジック(systems/puzzle)の公開する入口。
 * 描画・入力に依存しない純粋な TypeScript。乱数は SeededRng を引数で受け取る。
 */
export { boardFromGrid, createTile, isAdjacent, isInside } from './Board';
export { generateBoard } from './BoardGenerator';
export { CascadeLimitError } from './CascadeResolver';
export { findMoves, hasMove } from './DeadlockChecker';
export { findMatches } from './MatchFinder';
export { validateMove } from './MoveValidator';
export { reshuffleBoard } from './Reshuffle';
export { nextBoard, resolveMove } from './resolveMove';
export type * from './types';
