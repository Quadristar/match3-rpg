/**
 * 敵の行動の決定(仮仕様: 規定ターンごとに、生きている味方の先頭を攻撃する)。
 */
import type { BattleAction, BattleState } from './types';

export interface EnemyDecision {
  readonly actions: BattleAction[];
  /** 行動の後の、次の攻撃までの残りターン数 */
  readonly turnsUntilAttack: number;
}

/**
 * 敵の1ターンぶんの行動を決める。
 * 残りターン数を 1 減らし、0 になったら攻撃して attackInterval に戻す。
 */
export function decideEnemyTurn(state: BattleState): EnemyDecision {
  const enemy = state.enemy;
  const remaining = enemy.turnsUntilAttack - 1;
  if (remaining > 0) {
    return { actions: [], turnsUntilAttack: remaining };
  }
  const target = state.party.find((c) => c.hp > 0);
  return {
    actions: target === undefined ? [] : [{ type: 'enemyAttack', targetId: target.id }],
    turnsUntilAttack: enemy.attackInterval,
  };
}
