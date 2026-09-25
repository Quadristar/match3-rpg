/**
 * ステージ(戦闘の組み合わせ)のデータ(仮仕様)。
 *
 * 仮仕様: 味方の編成もステージで決める(パーティの編成画面ができたら、セーブデータ側に移す)。
 */

export interface StageData {
  readonly id: string;
  /** 戦う敵(characters・enemies の ID で参照する) */
  readonly enemyId: string;
  /** 味方の編成(先頭がリーダー。今は1人だけ) */
  readonly partyIds: readonly string[];
}

export const STAGES = [
  { id: 'prototype', enemyId: 'prototype-enemy', partyIds: ['hero'] },
] as const satisfies readonly StageData[];

export type StageId = (typeof STAGES)[number]['id'];
