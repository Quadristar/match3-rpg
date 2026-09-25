/**
 * 敵のデータ(すべて仮仕様。docs/GAME_DESIGN.md §9)。
 */

/** 勝利時に得られる報酬 */
export interface RewardData {
  readonly exp: number;
}

/** 敵の定義 */
export interface EnemyData {
  readonly id: string;
  /** 表示名(仮) */
  readonly name: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  /** 何ターンごとに攻撃するか(1 なら毎ターン) */
  readonly attackInterval: number;
  /** 倒したときの報酬 */
  readonly rewards: RewardData;
}

export const ENEMIES = [
  {
    id: 'prototype-enemy',
    name: '敵(仮)',
    maxHp: 300,
    attack: 20,
    defense: 0,
    attackInterval: 3,
    rewards: { exp: 50 },
  },
] as const satisfies readonly EnemyData[];

export type EnemyId = (typeof ENEMIES)[number]['id'];
