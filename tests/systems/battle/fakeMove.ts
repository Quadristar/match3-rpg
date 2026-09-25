/**
 * テスト用: 連鎖の段ごとに「どの種類のパネルが何個消えたか」を指定して MoveResult を作る。
 * バトルロジックは matches の種類と個数だけを見るため、盤面や落下・補充は形だけ埋める。
 */
import { SeededRng } from '../../../src/core/SeededRng';
import { type BoardState, type Cell, generateBoard, type MatchGroup, type MoveResult } from '../../../src/systems/puzzle';

const BOARD: BoardState = generateBoard(new SeededRng(0));

/** 種類 kind のパネルが count 個消えたまとまり */
export interface FakeGroup {
  readonly kind: number;
  readonly count: number;
}

/** steps[i] が i+1 段目に消えたまとまりの一覧 */
export function fakeMove(steps: readonly (readonly FakeGroup[])[]): MoveResult {
  let serial = 0;
  const cellsOf = (count: number): Cell[] => Array.from({ length: count }, () => ({ row: 0, col: serial++ }));
  return {
    valid: true,
    move: { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } },
    steps: steps.map((groups) => {
      const matches: MatchGroup[] = groups.map((g) => ({
        kind: g.kind,
        shape: g.count >= 5 ? 'line5' : g.count === 4 ? 'line4' : 'line3',
        cells: cellsOf(g.count),
      }));
      return { matches, removed: matches.flatMap((m) => m.cells), falls: [], spawns: [] };
    }),
    finalBoard: BOARD,
  };
}

/** 揃わない入れ替えの結果 */
export const INVALID_MOVE: MoveResult = {
  valid: false,
  move: { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } },
  reason: 'no-match',
  steps: [],
  finalBoard: BOARD,
};

/** 3個のパネルが1段だけ消える、いちばん小さい有効な入れ替え(攻撃力 10 なら 30 ダメージ) */
export const SMALL_MOVE = fakeMove([[{ kind: 0, count: 3 }]]);
