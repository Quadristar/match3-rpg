import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { PUZZLE_CONFIG } from '../../../src/data/puzzleConfig';
import { CascadeLimitError } from '../../../src/systems/puzzle/CascadeResolver';
import { resolveMove } from '../../../src/systems/puzzle/resolveMove';
import type { MoveResult } from '../../../src/systems/puzzle/types';
import { at, boardToText, cell, cellKeys, parseBoard } from './boardText';
import { replay } from './replay';

/** 有効な結果であることを確かめて取り出す */
function expectValid(result: MoveResult): Extract<MoveResult, { valid: true }> {
  expect(result.valid).toBe(true);
  if (!result.valid) throw new Error('unreachable');
  return result;
}

/** 下の行を揃えると、落ちてきたパネルで2段目の連鎖が起きる盤面 */
const TWO_STEP_BOARD = `
  BCBC
  CBCB
  CDDB
  AAED
  EBAC
`;

describe('resolveMove: 入れ替えられない場合', () => {
  const board = parseBoard(`
    ABCD
    BCDA
    CDAB
  `);

  it.each([
    ['盤面の外', cell(0, 0), cell(-1, 0), 'out-of-board'],
    ['盤面の外(右端の先)', cell(0, 3), cell(0, 4), 'out-of-board'],
    ['同じマス', cell(1, 1), cell(1, 1), 'not-adjacent'],
    ['斜め', cell(0, 0), cell(1, 1), 'not-adjacent'],
    ['2マス離れている', cell(0, 0), cell(0, 2), 'not-adjacent'],
    ['隣だが揃わない', cell(0, 0), cell(0, 1), 'no-match'],
  ] as const)('%s → valid: false', (_, a, b, reason) => {
    const rng = new SeededRng(1);
    const before = rng.getState();
    const result = resolveMove(board, a, b, rng);
    expect(result.valid).toBe(false);
    expect(result.valid ? null : result.reason).toBe(reason);
    expect(result.steps).toEqual([]);
    // 盤面は変えず、乱数も使わない
    expect(result.finalBoard).toBe(board);
    expect(rng.getState()).toEqual(before);
  });
});

describe('resolveMove: 消去・落下・補充', () => {
  const board = parseBoard(`
    BCDEB
    CDEBC
    DEACD
    AACEB
  `);

  it('揃ったマスを消し、上のパネルを落とし、空いた上端に補充する', () => {
    // (2,2) の A と (3,2) の C を入れ替えると、下の行に A が3個並ぶ
    const result = expectValid(resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(5)));
    const first = at(result.steps, 0);

    expect(first.matches).toHaveLength(1);
    expect(at(first.matches, 0).shape).toBe('line3');
    expect(at(first.matches, 0).kind).toBe(0);
    expect(cellKeys(first.removed)).toEqual(['3,0', '3,1', '3,2']);

    // 列ごとに、下のパネルから順に1マスずつ落ちる
    expect(first.falls.map((f) => `${f.from.row},${f.from.col}->${f.to.row},${f.to.col}`)).toEqual([
      '2,0->3,0',
      '1,0->2,0',
      '0,0->1,0',
      '2,1->3,1',
      '1,1->2,1',
      '0,1->1,1',
      '2,2->3,2',
      '1,2->2,2',
      '0,2->1,2',
    ]);
    // 空いた上端に補充する
    expect(cellKeys(first.spawns.map((s) => s.cell))).toEqual(['0,0', '0,1', '0,2']);
    for (const spawn of first.spawns) {
      expect(spawn.tile.modifiers).toEqual([]);
    }
  });

  it('落下の後の盤面が正しい(1段目だけで終わるシード)', () => {
    // 補充で揃わないシードを探し、1段で終わる場合の盤面全体を確かめる
    for (let seed = 0; seed < 50; seed++) {
      const result = expectValid(resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(seed)));
      if (result.steps.length !== 1 || result.reshuffled !== undefined) continue;
      const spawned = at(result.steps, 0).spawns.map((s) => String.fromCharCode(65 + s.tile.kind)).join('');
      expect(boardToText(result.finalBoard)).toEqual([`${spawned}EB`, 'BCDBC', 'CDECD', 'DECEB']);
      return;
    }
    throw new Error('1段で終わるシードが見つからない');
  });

  it('元の盤面は変更しない', () => {
    const before = boardToText(board);
    resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(5));
    expect(boardToText(board)).toEqual(before);
  });

  it('a と b の順番を逆にしても同じ結果になる(move は指定の順のまま)', () => {
    const forward = expectValid(resolveMove(board, cell(2, 2), cell(3, 2), new SeededRng(9)));
    const backward = expectValid(resolveMove(board, cell(3, 2), cell(2, 2), new SeededRng(9)));
    expect(backward.steps).toEqual(forward.steps);
    expect(backward.finalBoard).toEqual(forward.finalBoard);
    expect(backward.move).toEqual({ a: cell(3, 2), b: cell(2, 2) });
  });
});

describe('resolveMove: 連鎖', () => {
  it('落ちてきたパネルで揃うと、2段目として記録する', () => {
    const board = parseBoard(TWO_STEP_BOARD);
    const result = expectValid(resolveMove(board, cell(3, 2), cell(4, 2), new SeededRng(11)));

    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    const first = at(result.steps, 0);
    const second = at(result.steps, 1);
    expect(first.matches.map((m) => [m.kind, cellKeys(m.cells)])).toEqual([[0, ['3,0', '3,1', '3,2']]]);
    // 1段目の落下で (3,1) (3,2) に D が落ち、動かない (3,3) の D と揃う
    expect(second.matches.map((m) => [m.kind, m.shape, cellKeys(m.cells)])).toContainEqual([
      3,
      'line3',
      ['3,1', '3,2', '3,3'],
    ]);
    expect(replay(board, result)).toEqual(result.finalBoard);
  });

  it('連鎖が上限の段数を超えたらエラーにする', () => {
    const board = parseBoard(TWO_STEP_BOARD);
    expect(() =>
      resolveMove(board, cell(3, 2), cell(4, 2), new SeededRng(11), { ...PUZZLE_CONFIG, maxCascadeSteps: 1 }),
    ).toThrow(CascadeLimitError);
  });

  it('同じシードなら同じ結果になる', () => {
    const board = parseBoard(TWO_STEP_BOARD);
    const a = resolveMove(board, cell(3, 2), cell(4, 2), new SeededRng(123));
    const b = resolveMove(board, cell(3, 2), cell(4, 2), new SeededRng(123));
    expect(a).toEqual(b);
  });
});
