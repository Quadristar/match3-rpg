/**
 * パネルが消えたときの効果(パネル → 行動 の変換規則)。docs/GAME_DESIGN.md §4。
 *
 * 規則はコードに書かず、ここに置く。今は「全種類のパネルが攻撃」(仮仕様)。
 * 将来の差し替えの例:
 * - 「パネル色＝属性」型: byKind に種類ごとの属性を書く
 *     byKind: { 0: { action: 'attack', attribute: 'fire' }, 1: { action: 'attack', attribute: 'water' }, … }
 * - 「パネル種類＝行動」型: action の種類を増やし、byKind に書く
 *     byKind: { 0: { action: 'attack' }, 1: { action: 'heal' }, … }
 * 種類の番号は systems/puzzle の TileKind(0 〜 パネルの種類数 - 1)。
 */

/**
 * 行動の種類。今は攻撃だけ。
 * 回復・防御・MP などは、使う段階でここと AttackResolver に足す
 */
export type TileAction = 'attack';

/** 1種類のパネルの効果 */
export interface TileEffect {
  readonly action: TileAction;
  /** 属性(属性型にするときに使う。今は使わない) */
  readonly attribute?: string;
}

/** パネルの効果の規則 */
export interface TileEffectTable {
  /** byKind に書いていない種類の効果 */
  readonly default: TileEffect;
  /** 種類ごとの効果(種類の番号 → 効果) */
  readonly byKind: Readonly<Record<number, TileEffect>>;
}

export const TILE_EFFECTS = {
  default: { action: 'attack' },
  byKind: {},
} as const satisfies TileEffectTable;
