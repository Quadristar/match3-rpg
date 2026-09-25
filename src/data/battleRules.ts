/**
 * バトルの計算規則の数値(すべて仮仕様。docs/GAME_DESIGN.md §9)。
 */
export interface BattleRules {
  /** 連鎖の段ごとに増える倍率。段の倍率 = 1 + comboBonusPerStep × (段 − 1) */
  readonly comboBonusPerStep: number;
  /** 最終ダメージの最低値 */
  readonly minDamage: number;
}

export const BATTLE_RULES = {
  comboBonusPerStep: 0.25,
  minDamage: 1,
} as const satisfies BattleRules;
