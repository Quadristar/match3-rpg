/**
 * 戦闘の状態の作成と、行動の適用(BattleState.apply)。
 * 状態は書き換えず、新しい状態と、描画用の出来事(BattleEvent)を返す。
 */
import { BATTLE_RULES, type BattleRules } from '../../data/battleRules';
import { CHARACTERS, type CharacterData } from '../../data/characters';
import { ENEMIES, type EnemyData } from '../../data/enemies';
import { STAGES, type StageData } from '../../data/stages';
import { calculateDamage, calculateHits } from './DamageCalculator';
import type { BattleAction, BattleEvent, BattleState, Combatant, DamageModifier } from './types';

/** 戦闘に使うデータ一式(テストでは差し替えられる) */
export interface BattleData {
  readonly characters: readonly CharacterData[];
  readonly enemies: readonly EnemyData[];
  readonly stages: readonly StageData[];
  readonly rules: BattleRules;
}

export const DEFAULT_BATTLE_DATA: BattleData = {
  characters: CHARACTERS,
  enemies: ENEMIES,
  stages: STAGES,
  rules: BATTLE_RULES,
};

/** ステージの戦闘を始めた状態を作る */
export function createBattleState(stageId: string, data: BattleData = DEFAULT_BATTLE_DATA): BattleState {
  const stage = data.stages.find((s) => s.id === stageId);
  if (stage === undefined) {
    throw new Error(`ステージ "${stageId}" がありません`);
  }
  const enemy = data.enemies.find((e) => e.id === stage.enemyId);
  if (enemy === undefined) {
    throw new Error(`敵 "${stage.enemyId}" がありません(ステージ "${stageId}")`);
  }
  const party = stage.partyIds.map((id): Combatant => {
    const c = data.characters.find((ch) => ch.id === id);
    if (c === undefined) {
      throw new Error(`キャラクター "${id}" がありません(ステージ "${stageId}")`);
    }
    return { id: c.id, name: c.name, hp: c.maxHp, maxHp: c.maxHp, attack: c.attack, defense: c.defense };
  });
  if (party.length === 0) {
    throw new Error(`ステージ "${stageId}" の編成が空です`);
  }
  return {
    turn: 0,
    party,
    enemy: {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      attack: enemy.attack,
      defense: enemy.defense,
      attackInterval: enemy.attackInterval,
      turnsUntilAttack: enemy.attackInterval,
      exp: enemy.rewards.exp,
    },
    outcome: 'ongoing',
  };
}

/** 行動の適用で使う修飾子(バフ・デバフ。今は常に空) */
export interface ApplyOptions {
  readonly partyModifiers?: readonly DamageModifier[];
  readonly enemyModifiers?: readonly DamageModifier[];
  readonly rules?: BattleRules;
}

/** 行動を1つ適用する。HP は 0 未満にならない */
export function applyAction(
  state: BattleState,
  action: BattleAction,
  options: ApplyOptions = {},
): { state: BattleState; events: BattleEvent[] } {
  const rules = options.rules ?? BATTLE_RULES;
  switch (action.type) {
    case 'partyAttack': {
      const actor = state.party.find((c) => c.id === action.actorId);
      if (actor === undefined) {
        throw new Error(`味方 "${action.actorId}" がいません`);
      }
      const hits = calculateHits(actor.attack, action.hits, rules);
      const rawTotal = hits.reduce((sum, h) => sum + h.raw, 0);
      const damage = calculateDamage(rawTotal, state.enemy.defense, options.partyModifiers, rules);
      const hpBefore = state.enemy.hp;
      const hpAfter = Math.max(0, hpBefore - damage);
      return {
        state: { ...state, enemy: { ...state.enemy, hp: hpAfter } },
        events: [
          { type: 'partyAttack', actorId: actor.id, targetId: state.enemy.id, hits, rawTotal, damage, hpBefore, hpAfter },
        ],
      };
    }
    case 'enemyAttack': {
      const index = state.party.findIndex((c) => c.id === action.targetId);
      const target = state.party[index];
      if (target === undefined) {
        throw new Error(`味方 "${action.targetId}" がいません`);
      }
      const damage = calculateDamage(state.enemy.attack, target.defense, options.enemyModifiers, rules);
      const hpBefore = target.hp;
      const hpAfter = Math.max(0, hpBefore - damage);
      const party = state.party.map((c, i) => (i === index ? { ...c, hp: hpAfter } : c));
      return {
        state: { ...state, party },
        events: [{ type: 'enemyAttack', actorId: state.enemy.id, targetId: target.id, damage, hpBefore, hpAfter }],
      };
    }
  }
}

/** 行動を順に適用する */
export function applyActions(
  state: BattleState,
  actions: readonly BattleAction[],
  options: ApplyOptions = {},
): { state: BattleState; events: BattleEvent[] } {
  let current = state;
  const events: BattleEvent[] = [];
  for (const action of actions) {
    const result = applyAction(current, action, options);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}
