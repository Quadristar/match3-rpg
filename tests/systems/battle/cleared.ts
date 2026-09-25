/**
 * テスト用: 連鎖の段ごとに「どの種類のパネルが何個消えたか」を指定して ClearedTiles を作る。
 */
import type { ClearedGroup, ClearedTiles } from '../../../src/systems/battle/types';

/** steps[i] が i+1 段目に消えたまとまりの一覧 */
export function cleared(steps: readonly (readonly ClearedGroup[])[]): ClearedTiles {
  return { steps };
}

/** 揃わない入れ替え(何も消えない) */
export const NOTHING_CLEARED: ClearedTiles = { steps: [] };

/** 3個のパネルが1段だけ消える、いちばん小さい有効な入れ替え(攻撃力 10 なら 30 ダメージ) */
export const SMALL_CLEAR: ClearedTiles = cleared([[{ kind: 0, count: 3 }]]);
