import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { ENEMIES } from '../../../src/data/enemies';
import { PUZZLE_CONFIG } from '../../../src/data/puzzleConfig';
import { DEFAULT_BATTLE_DATA } from '../../../src/systems/battle';
import { findMoves, resolveMove } from '../../../src/systems/puzzle';
import { BattleSession, toClearedTiles } from '../../../src/systems/session';
import { cell, parseBoard } from '../puzzle/boardText';

describe('toClearedTiles', () => {
  it('段ごとに、消えたまとまりの種類と個数にする', () => {
    const board = parseBoard(`
      BCBC
      CBCB
      CDDB
      AAED
      EBAC
    `);
    const move = resolveMove(board, cell(3, 2), cell(4, 2), new SeededRng(11));
    const result = toClearedTiles(move);
    expect(move.valid && result.steps.length).toBe(move.steps.length);
    expect(result.steps[0]).toEqual([{ kind: 0, count: 3 }]);
    expect(result.steps[1]).toContainEqual({ kind: 3, count: 3 });
  });

  it('揃わない入れ替えは空', () => {
    const board = parseBoard('ABC\nCAB\nBCA');
    expect(toClearedTiles(resolveMove(board, cell(0, 0), cell(0, 1), new SeededRng(1)))).toEqual({ steps: [] });
  });
});

describe('BattleSession', () => {
  it('シードから盤面とバトルを始める(同じシードなら同じ盤面)', () => {
    const a = new BattleSession({ seed: 5 });
    const b = new BattleSession({ seed: 5 });
    expect(a.board).toEqual(b.board);
    expect(a.battle.turn).toBe(0);
    expect(a.battle.enemy.hp).toBe(300);
    expect(a.isOver).toBe(false);
    expect(a.seed).toBe(5);
  });

  it('有効な入れ替え: 盤面の結果とバトルの出来事をまとめて返し、状態を進める', () => {
    const session = new BattleSession({ seed: 3 });
    const before = session.board;
    const move = findMoves(before)[0];
    if (move === undefined) throw new Error('手がない');
    const result = session.swap(move.a, move.b);
    if (result === null) throw new Error('null のはず無い');
    expect(result.boardBefore).toBe(before);
    expect(result.move.valid).toBe(true);
    expect(result.turn.consumedTurn).toBe(true);
    expect(result.turn.events[0]).toEqual({ type: 'turnStart', turn: 1 });
    expect(session.battle.turn).toBe(1);
    expect(session.battle.enemy.hp).toBeLessThan(300);
    expect(session.board).not.toBe(before);
  });

  it('揃わない入れ替え: 盤面もバトルも変わらず、ターンを消費しない', () => {
    const session = new BattleSession({ seed: 3 });
    const before = session.board;
    // 隣でない2マスは必ず無効
    const result = session.swap({ row: 0, col: 0 }, { row: 2, col: 2 });
    expect(result?.move.valid).toBe(false);
    expect(result?.turn.consumedTurn).toBe(false);
    expect(result?.turn.events).toEqual([]);
    expect(session.board).toBe(before);
    expect(session.battle.turn).toBe(0);
  });

  it('再配置が起きても、消費するのは1ターンだけで、次の盤面は再配置後の盤面', () => {
    const puzzleConfig = { ...PUZZLE_CONFIG, rows: 4, cols: 4, kindCount: 5 };
    for (let seed = 0; seed < 300; seed++) {
      const session = new BattleSession({ seed, puzzleConfig });
      const move = findMoves(session.board)[0];
      if (move === undefined) continue;
      const result = session.swap(move.a, move.b);
      if (result === null || !result.move.valid || result.move.reshuffled === undefined) continue;
      expect(session.battle.turn).toBe(1);
      expect(result.turn.events.filter((e) => e.type === 'turnStart')).toHaveLength(1);
      expect(session.board).toBe(result.move.reshuffled);
      return;
    }
    throw new Error('再配置の起きる操作が見つからない');
  });

  it('戦闘が終わったら null を返し、何も変えない', () => {
    const battleData = { ...DEFAULT_BATTLE_DATA, enemies: [{ ...ENEMIES[0], maxHp: 1 }] };
    const session = new BattleSession({ seed: 1, battleData });
    const first = findMoves(session.board)[0];
    if (first === undefined) throw new Error('手がない');
    session.swap(first.a, first.b);
    expect(session.isOver).toBe(true);
    expect(session.battle.outcome).toBe('victory');
    const board = session.board;
    const next = findMoves(board)[0];
    expect(next === undefined ? null : session.swap(next.a, next.b)).toBeNull();
    expect(session.board).toBe(board);
  });
});
