/**
 * 味方キャラクターのデータ(すべて仮仕様。docs/GAME_DESIGN.md §9)。
 */

/** 味方キャラクターの定義 */
export interface CharacterData {
  readonly id: string;
  /** 表示名(仮) */
  readonly name: string;
  readonly maxHp: number;
  /** 攻撃力(パズルで消えたパネル1個あたりの基本ダメージ) */
  readonly attack: number;
  readonly defense: number;
}

export const CHARACTERS = [
  { id: 'hero', name: '主人公(仮)', maxHp: 100, attack: 10, defense: 0 },
] as const satisfies readonly CharacterData[];

export type CharacterId = (typeof CHARACTERS)[number]['id'];
