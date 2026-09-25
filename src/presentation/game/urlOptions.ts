/**
 * ゲーム用の URL パラメータを読み取る。
 *
 * - `seed=数値` … 盤面の乱数のシードを固定する(不具合の再現用)。
 *   仮仕様: `?debug` がなくても有効。0 以上 2^32 未満の整数だけを受け付け、それ以外は無視する
 */

/** シードの上限(この値未満) */
const SEED_LIMIT = 0x1_0000_0000;

export interface GameUrlOptions {
  /** 固定するシード(指定がなければ null) */
  readonly seed: number | null;
}

/** URL の検索文字列(location.search)からゲーム用の設定を読み取る */
export function parseGameUrlOptions(search: string): GameUrlOptions {
  const params = new URLSearchParams(search);
  return { seed: parseSeed(params.get('seed')) };
}

function parseSeed(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < SEED_LIMIT ? n : null;
}

/** シードの指定がないときに使う、ランダムなシード(表示用の関数を受け取れるように分けておく) */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * SEED_LIMIT);
}
