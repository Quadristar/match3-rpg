import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../../src/core/SeededRng';
import { PUZZLE_CONFIG } from '../../../../src/data/puzzleConfig';
import { buildPlaybackPlan, type PlaybackPlan } from '../../../../src/presentation/views/board/playbackPlan';
import {
  type BoardState,
  findMoves,
  generateBoard,
  nextBoard,
  resolveMove,
  type Tile,
} from '../../../../src/systems/puzzle';
import { boardToText, cell, parseBoard } from '../../../systems/puzzle/boardText';

const TIMINGS = { swapMs: 100, clearMs: 200, fallMsPerCell: 50, stepPauseMs: 30, reshuffleMs: 400 };

/**
 * 描画側と同じ手順で、再生の手順を盤面に当てはめる(表示物の代わりにパネルを動かす)。
 * 矛盾(空きマスの移動・埋まっているマスへの移動など)があればエラー。
 */
function applyPlan(board: BoardState, plan: PlaybackPlan): BoardState {
  let grid: (Tile | null)[][] = board.tiles.map((row) => row.slice());
  const get = (r: number, c: number) => grid[r]?.[c] ?? null;
  const put = (r: number, c: number, tile: Tile | null) => {
    (grid[r] as (Tile | null)[])[c] = tile;
  };
  for (const action of plan.actions) {
    switch (action.type) {
      case 'swap': {
        const t = get(action.a.row, action.a.col);
        put(action.a.row, action.a.col, get(action.b.row, action.b.col));
        put(action.b.row, action.b.col, t);
        break;
      }
      case 'clear':
        for (const c of action.cells) {
          if (get(c.row, c.col) === null) throw new Error('空きマスを消そうとした');
          put(c.row, c.col, null);
        }
        break;
      case 'fall':
        for (const move of action.moves) {
          const tile = move.spawn ?? get(move.from.row, move.from.col);
          if (tile === null) throw new Error('空きマスを動かそうとした');
          if (get(move.to.row, move.to.col) !== null) throw new Error('埋まっているマスへ動かそうとした');
          if (move.spawn === undefined) put(move.from.row, move.from.col, null);
          if (move.spawn !== undefined && move.from.row >= 0) throw new Error('補充は盤面の上から');
          put(move.to.row, move.to.col, tile);
        }
        break;
      case 'reshuffle':
        grid = action.board.tiles.map((row) => row.slice());
        break;
      case 'wait':
        break;
    }
  }
  return { rows: board.rows, cols: board.cols, tiles: grid.map((row) => row.map((t) => t as Tile)) };
}

describe('buildPlaybackPlan', () => {
  const board = parseBoard(`
    BCDEB
    CDEBC
    DEACD
    AACEB
  `);

  it('揃わない入れ替え: 入れ替えて戻す(盤面は変わらない)', () => {
    const result = resolveMove(board, cell(0, 0), cell(0, 1), new SeededRng(1));
    const plan = buildPlaybackPlan(board, result, TIMINGS);
    expect(plan.actions.map((a) => a.type)).toEqual(['swap', 'swap']);
    expect(plan.finalBoard).toBe(board);
    expect(plan.comboCount).toBe(0);
    expect(plan.totalMs).toBe(200);
    expect(boardToText(applyPlan(board, plan))).toEqual(boardToText(board));
  });

  it('盤面の外・隣でない入れ替えは、動きのない手順', () => {
    const result = resolveMove(board, cell(0, 0), cell(2, 2), new SeededRng(1));
    const plan = buildPlaybackPlan(board, result, TIMINGS);
    expect(plan.actions).toEqual([]);
    expect(plan.totalMs).toBe(0);
    expect(plan.finalBoard).toBe(board);
  });

  it('揃う入れ替え: 入れ替え → 消去 → 落下、の順。補充は盤面の上から落ちる', () => {
    const result = resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(5));
    if (!result.valid) throw new Error('有効な入れ替えのはず');
    const plan = buildPlaybackPlan(board, result, TIMINGS);
    expect(plan.actions.slice(0, 3).map((a) => a.type)).toEqual(['swap', 'clear', 'fall']);
    const fall = plan.actions[2];
    if (fall?.type !== 'fall') throw new Error('fall のはず');
    const spawns = fall.moves.filter((m) => m.spawn !== undefined);
    // 下の行の 3 マスが消えたので、各列に1つずつ、1マス上(row -1)から row 0 へ落ちる
    expect(spawns.map((m) => [m.from, m.to])).toEqual([
      [cell(-1, 0), cell(0, 0)],
      [cell(-1, 1), cell(0, 1)],
      [cell(-1, 2), cell(0, 2)],
    ]);
    expect(fall.durationMs).toBe(50);
    expect(plan.comboCount).toBe(result.steps.length);
    expect(boardToText(applyPlan(board, plan))).toEqual(boardToText(nextBoard(result)));
  });

  it('落下の時間は落ちる距離に比例する', () => {
    // 1列目の縦3つが消えると、上のパネルは3マス落ち、補充は3マス上から落ちる
    const tall = parseBoard(`
      BCD
      ACD
      ADC
      BAB
    `);
    const result = resolveMove(tall, cell(3, 0), cell(3, 1), new SeededRng(2));
    if (!result.valid) throw new Error('有効な入れ替えのはず');
    const plan = buildPlaybackPlan(tall, result, TIMINGS);
    const fall = plan.actions[2];
    if (fall?.type !== 'fall') throw new Error('fall のはず');
    const col0 = fall.moves.filter((m) => m.to.col === 0);
    expect(col0.every((m) => m.to.row - m.from.row === 3)).toBe(true);
    expect(col0.every((m) => m.durationMs === 150)).toBe(true);
    expect(fall.durationMs).toBe(150);
  });

  it('2段以上の連鎖では、段ごとに消去の combo が増え、段の間に待ちが入る', () => {
    const twoStep = parseBoard(`
      BCBC
      CBCB
      CDDB
      AAED
      EBAC
    `);
    const result = resolveMove(twoStep, cell(3, 2), cell(4, 2), new SeededRng(11));
    if (!result.valid) throw new Error('有効な入れ替えのはず');
    const plan = buildPlaybackPlan(twoStep, result, TIMINGS);
    const clears = plan.actions.filter((a) => a.type === 'clear');
    expect(clears.map((a) => a.type === 'clear' && a.combo)).toEqual(result.steps.map((_, i) => i + 1));
    expect(clears.length).toBeGreaterThanOrEqual(2);
    expect(plan.actions.filter((a) => a.type === 'wait')).toHaveLength(result.steps.length - 1);
    expect(boardToText(applyPlan(twoStep, plan))).toEqual(boardToText(nextBoard(result)));
  });

  it('時間の合計は各手順の和', () => {
    const result = resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(5));
    const plan = buildPlaybackPlan(board, result, TIMINGS);
    expect(plan.totalMs).toBe(plan.actions.reduce((s, a) => s + a.durationMs, 0));
  });

  it('再配置があれば最後に reshuffle を入れ、finalBoard は再配置後の盤面', () => {
    const config = { ...PUZZLE_CONFIG, rows: 4, cols: 4, kindCount: 5 };
    for (let seed = 0; seed < 300; seed++) {
      const rng = new SeededRng(seed);
      const start = generateBoard(rng, config);
      const move = findMoves(start)[0];
      if (move === undefined) continue;
      const result = resolveMove(start, move.a, move.b, rng, config);
      if (!result.valid || result.reshuffled === undefined) continue;
      const plan = buildPlaybackPlan(start, result, TIMINGS);
      expect(plan.actions.at(-1)).toEqual({ type: 'reshuffle', board: result.reshuffled, durationMs: 400 });
      expect(plan.finalBoard).toBe(result.reshuffled);
      expect(boardToText(applyPlan(start, plan))).toEqual(boardToText(result.reshuffled));
      return;
    }
    throw new Error('再配置の起きる操作が見つからない');
  });

  it('多数のランダムな操作で、手順を当てはめると常に次の盤面になる', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = new SeededRng(seed);
      let current = generateBoard(rng);
      for (let turn = 0; turn < 10; turn++) {
        const move = rng.pick(findMoves(current));
        const result = resolveMove(current, move.a, move.b, rng);
        const plan = buildPlaybackPlan(current, result, TIMINGS);
        expect(boardToText(applyPlan(current, plan)), `seed ${seed} turn ${turn}`).toEqual(boardToText(plan.finalBoard));
        current = plan.finalBoard;
      }
    }
  });
});
