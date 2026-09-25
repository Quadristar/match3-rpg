/**
 * パズルの結果(MoveResult)を行動(BattleAction)に変換する。
 * 変換規則は data/tileEffects に置く(コードには書かない)。
 *
 * - 連鎖の段ごとに、消えたパネルを効果(行動と属性)ごとに数える
 * - 同じ効果のパネルは、1つの行動にまとめる(段ごとの内訳は hits に残す)
 * - 仮仕様: 行動するのは編成の先頭(リーダー)。属性型にするときは、属性の合うキャラに割り当てる
 */
import { TILE_EFFECTS, type TileEffect, type TileEffectTable } from '../../data/tileEffects';
import type { MoveResult, TileKind } from '../puzzle';
import type { AttackHit, BattleAction } from './types';

/** パネルの種類の効果 */
export function effectOf(kind: TileKind, table: TileEffectTable = TILE_EFFECTS): TileEffect {
  return table.byKind[kind] ?? table.default;
}

/**
 * 入れ替えの結果から、味方の行動を作る。
 * 揃わなかった入れ替え(valid: false)からは行動を作らない。
 */
export function resolveAttacks(
  result: MoveResult,
  leaderId: string,
  table: TileEffectTable = TILE_EFFECTS,
): BattleAction[] {
  if (!result.valid) {
    return [];
  }
  // 効果ごとの段別のパネル数(効果の並びは、最初に現れた順)
  const byEffect = new Map<string, { effect: TileEffect; hits: AttackHit[] }>();
  result.steps.forEach((step, index) => {
    const combo = index + 1;
    for (const group of step.matches) {
      const effect = effectOf(group.kind, table);
      const key = `${effect.action}|${effect.attribute ?? ''}`;
      const entry = byEffect.get(key) ?? { effect, hits: [] };
      byEffect.set(key, entry);
      const last = entry.hits.at(-1);
      if (last !== undefined && last.combo === combo) {
        entry.hits[entry.hits.length - 1] = { combo, tileCount: last.tileCount + group.cells.length };
      } else {
        entry.hits.push({ combo, tileCount: group.cells.length });
      }
    }
  });
  return [...byEffect.values()].map(({ effect, hits }) => ({
    type: 'partyAttack' as const,
    actorId: leaderId,
    hits,
    ...(effect.attribute === undefined ? {} : { attribute: effect.attribute }),
  }));
}
