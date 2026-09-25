/**
 * 落下: 空きマスの上にあるパネルを下へ詰める。
 */
import type { Grid } from './Board';
import type { Fall } from './types';

/**
 * Grid のパネルを列ごとに下へ詰める(Grid を書き換える)。
 * 動いたパネルの移動を、列ごと(左の列から)に、下のパネルから順に返す。
 */
export function applyGravity(grid: Grid): Fall[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const falls: Fall[] = [];
  for (let col = 0; col < cols; col++) {
    let target = rows - 1;
    for (let row = rows - 1; row >= 0; row--) {
      const line = grid[row] as (typeof grid)[number];
      const tile = line[col] ?? null;
      if (tile === null) {
        continue;
      }
      if (row !== target) {
        (grid[target] as (typeof grid)[number])[col] = tile;
        line[col] = null;
        falls.push({ from: { row, col }, to: { row: target, col } });
      }
      target--;
    }
  }
  return falls;
}
