/**
 * ターンの進行(状態機械)。docs/GAME_DESIGN.md §4:
 *
 *   入力待ち → パズル解決 → 味方行動 → 勝敗判定 → 敵行動 → 勝敗判定 → 入力待ち
 *                                          └→ 勝利             └→ 敗北
 *
 * 1回の入れ替えの結果(MoveResult)を受け取り、状態を入力待ち(または勝敗)まで進め、
 * 新しい状態・描画用の出来事・通った段階を返す。アニメーションの完了は待たない。
 *
 * 仮仕様:
 * - 有効な入れ替え1回を1ターンとする。揃わない入れ替え・戦闘の終了後は何もしない(ターンを消費しない)
 * - 再配置(reshuffled)はターンの数に影響しない(有効な入れ替えに付随するだけ)
 */
import { TILE_EFFECTS, type TileEffectTable } from '../../data/tileEffects';
import type { MoveResult } from '../puzzle';
import { resolveAttacks } from './AttackResolver';
import { type ApplyOptions, applyActions } from './BattleState';
import { decideEnemyTurn } from './EnemyAI';
import type { BattleAction, BattleEvent, BattleState } from './types';

/** ターンの段階 */
export type TurnPhase =
  | 'awaitingInput'
  | 'resolvingPuzzle'
  | 'partyAction'
  | 'checkAfterParty'
  | 'enemyAction'
  | 'checkAfterEnemy'
  | 'victory'
  | 'defeat';

/**
 * 状態機械の遷移: 今の段階と状態から、次の段階を決める。
 * 勝利・敗北は終わりの段階(次はない)。
 */
export function nextPhase(phase: TurnPhase, state: BattleState): TurnPhase | null {
  switch (phase) {
    case 'awaitingInput':
      return 'resolvingPuzzle';
    case 'resolvingPuzzle':
      return 'partyAction';
    case 'partyAction':
      return 'checkAfterParty';
    case 'checkAfterParty':
      return state.enemy.hp <= 0 ? 'victory' : 'enemyAction';
    case 'enemyAction':
      return 'checkAfterEnemy';
    case 'checkAfterEnemy':
      return state.party.every((c) => c.hp <= 0) ? 'defeat' : 'awaitingInput';
    case 'victory':
    case 'defeat':
      return null;
  }
}

export interface TurnOptions extends ApplyOptions {
  readonly tileEffects?: TileEffectTable;
}

export interface TurnResult {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
  /** 通った段階(最初の入力待ちから、最後の入力待ち・勝利・敗北まで) */
  readonly phases: readonly TurnPhase[];
  /** ターンを消費したか */
  readonly consumedTurn: boolean;
}

/** 1回の入れ替えの結果で、ターンを進める */
export function playTurn(state: BattleState, move: MoveResult, options: TurnOptions = {}): TurnResult {
  if (state.outcome !== 'ongoing' || !move.valid) {
    return { state, events: [], phases: [], consumedTurn: false };
  }
  const leader = state.party[0];
  if (leader === undefined) {
    throw new Error('味方がいません');
  }
  let current = state;
  let actions: BattleAction[] = [];
  const phases: TurnPhase[] = ['awaitingInput'];
  const events: BattleEvent[] = [];

  let phase = nextPhase('awaitingInput', current);
  while (phase !== null) {
    phases.push(phase);
    switch (phase) {
      case 'resolvingPuzzle':
        current = { ...current, turn: current.turn + 1 };
        events.push({ type: 'turnStart', turn: current.turn });
        actions = resolveAttacks(move, leader.id, options.tileEffects ?? TILE_EFFECTS);
        break;
      case 'partyAction': {
        const applied = applyActions(current, actions, options);
        current = applied.state;
        events.push(...applied.events);
        break;
      }
      case 'enemyAction': {
        const decision = decideEnemyTurn(current);
        const applied = applyActions(current, decision.actions, options);
        current = { ...applied.state, enemy: { ...applied.state.enemy, turnsUntilAttack: decision.turnsUntilAttack } };
        events.push(...applied.events, {
          type: 'enemyCountdown',
          enemyId: current.enemy.id,
          turnsUntilAttack: decision.turnsUntilAttack,
        });
        break;
      }
      case 'victory':
        current = { ...current, outcome: 'victory' };
        events.push({ type: 'victory', enemyId: current.enemy.id, exp: current.enemy.exp });
        break;
      case 'defeat':
        current = { ...current, outcome: 'defeat' };
        events.push({ type: 'defeat' });
        break;
      case 'awaitingInput':
        // 1ターンが終わり、次の入力を待つ
        return { state: current, events, phases, consumedTurn: true };
      case 'checkAfterParty':
      case 'checkAfterEnemy':
        // 判定は nextPhase で行う
        break;
    }
    phase = nextPhase(phase, current);
  }
  return { state: current, events, phases, consumedTurn: true };
}
