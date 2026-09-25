/**
 * ダメージ計算(純粋関数)。
 *
 * 仮仕様(docs/GAME_DESIGN.md §9):
 * - 連鎖の段ごとに「パネル数 × 攻撃力 × 段の倍率」を合計する(段の倍率 = 1 + 0.25 × (段 − 1))
 * - 最終ダメージ = 合計 − 防御。小数は切り捨て、最低 1
 * - 修飾子(バフ・デバフ)は DamageModifier の順に適用する
 */
import { BATTLE_RULES, type BattleRules } from '../../data/battleRules';
import type { AttackHit, DamageModifier, HitResult } from './types';

/** 連鎖の段の倍率 */
export function comboMultiplier(combo: number, rules: BattleRules = BATTLE_RULES): number {
  if (!Number.isInteger(combo) || combo < 1) {
    throw new RangeError(`連鎖の段は 1 以上の整数にしてください (${combo})`);
  }
  return 1 + rules.comboBonusPerStep * (combo - 1);
}

/** 段ごとの基本ダメージ(切り捨て・防御の前) */
export function calculateHits(attack: number, hits: readonly AttackHit[], rules: BattleRules = BATTLE_RULES): HitResult[] {
  return hits.map((hit) => {
    const multiplier = comboMultiplier(hit.combo, rules);
    return { ...hit, multiplier, raw: hit.tileCount * attack * multiplier };
  });
}

/** 基本ダメージの合計・防御・修飾子から、最終ダメージを求める */
export function calculateDamage(
  raw: number,
  defense: number,
  modifiers: readonly DamageModifier[] = [],
  rules: BattleRules = BATTLE_RULES,
): number {
  const product = (kind: DamageModifier['kind']): number =>
    modifiers.filter((m) => m.kind === kind).reduce((acc, m) => acc * m.value, 1);
  const boostedRaw = raw * product('rawRate');
  const effectiveDefense = defense * product('defenseRate');
  const damage = (boostedRaw - effectiveDefense) * product('finalRate');
  return Math.max(rules.minDamage, Math.floor(damage));
}
