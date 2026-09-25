/**
 * バトルロジック(systems/battle)の公開する入口。
 * 描画に依存しない純粋な TypeScript。流れは docs/GAME_DESIGN.md §4:
 *   MoveResult → AttackResolver → BattleAction[] → BattleState(applyActions) → BattleEvent[]
 */
export { effectOf, resolveAttacks } from './AttackResolver';
export { applyAction, applyActions, type BattleData, createBattleState, DEFAULT_BATTLE_DATA } from './BattleState';
export { calculateDamage, calculateHits, comboMultiplier } from './DamageCalculator';
export { decideEnemyTurn } from './EnemyAI';
export { nextPhase, playTurn, type TurnPhase, type TurnResult } from './TurnFlow';
export type * from './types';
