/**
 * 補充: 空きマスに新しいパネルを入れる。
 */
import type { SeededRng } from '../../core/SeededRng';
import { type Grid, randomTile } from './Board';
import type { Spawn } from './types';

/**
 * 空きマスに、ランダムな種類のパネルを入れる(Grid を書き換える)。
 * 仮仕様: 種類は等確率で、補充したパネルで揃ってもよい(揃えば次の連鎖になる)。
 * 乱数は上の行から、同じ行は左から順に使う。
 */
export function refill(grid: Grid, rng: SeededRng, kindCount: number): Spawn[] {
  const spawns: Spawn[] = [];
  grid.forEach((line, row) => {
    line.forEach((tile, col) => {
      if (tile === null) {
        const spawned = randomTile(rng, kindCount);
        line[col] = spawned;
        spawns.push({ cell: { row, col }, tile: spawned });
      }
    });
  });
  return spawns;
}
