/**
 * パズルの設定値の検査。
 */
import type { PuzzleConfig } from '../../data/puzzleConfig';

/** 設定値が使えるか調べ、使えなければエラーにする */
export function assertValidPuzzleConfig(config: PuzzleConfig): void {
  const positiveInt = (value: number): boolean => Number.isInteger(value) && value >= 1;
  if (!positiveInt(config.rows) || !positiveInt(config.cols)) {
    throw new RangeError(`盤面の大きさが不正です (${config.rows}×${config.cols})`);
  }
  if (Math.max(config.rows, config.cols) < 3) {
    throw new RangeError('盤面は縦か横のどちらかを 3 マス以上にしてください');
  }
  // 2種類以下では、揃っていない盤面を必ず作れるとは限らない
  if (!Number.isInteger(config.kindCount) || config.kindCount < 3) {
    throw new RangeError(`パネルの種類数は 3 以上にしてください (${config.kindCount})`);
  }
  for (const key of ['maxCascadeSteps', 'maxGenerateAttempts', 'maxReshuffleAttempts'] as const) {
    if (!positiveInt(config[key])) {
      throw new RangeError(`${key} は 1 以上の整数にしてください (${config[key]})`);
    }
  }
}
