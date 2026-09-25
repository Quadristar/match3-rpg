/**
 * シードを固定したランダムな操作(本物のパズルロジック)で戦闘を最後まで進め、
 * 必ず勝利か敗北で終わること、途中の状態が常に正しいことを確かめる。
 */
import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/core/SeededRng';
import { BATTLE_RULES } from '../../../src/data/battleRules';
import { ENEMIES } from '../../../src/data/enemies';
import { type BattleData, createBattleState, DEFAULT_BATTLE_DATA } from '../../../src/systems/battle/BattleState';
import { playTurn } from '../../../src/systems/battle/TurnFlow';
import type { BattleState } from '../../../src/systems/battle/types';
import { type BoardState, findMoves, generateBoard, nextBoard, resolveMove } from '../../../src/systems/puzzle';

/** 戦闘が終わるまでに許す入れ替えの回数(無限ループ防止) */
const MAX_MOVES = 1000;

interface BattleLog {
  readonly final: BattleState;
  readonly validMoves: number;
  readonly invalidMoves: number;
}

/** シードごとに、手を選んで(ときどき揃わない入れ替えも混ぜて)戦闘を最後まで進める */
function runBattle(seed: number, data: BattleData, stageId: string): BattleLog {
  const rng = new SeededRng(seed);
  const chooser = new SeededRng(seed + 7_777);
  let board: BoardState = generateBoard(rng);
  let state = createBattleState(stageId, data);
  let validMoves = 0;
  let invalidMoves = 0;
  for (let i = 0; i < MAX_MOVES && state.outcome === 'ongoing'; i++) {
    const label = `seed ${seed} move ${i}`;
    const before = state;
    let a;
    let b;
    if (chooser.chance(0.2)) {
      a = { row: chooser.nextInt(0, board.rows - 1), col: chooser.nextInt(0, board.cols - 1) };
      b = { row: a.row, col: a.col + 1 };
    } else {
      ({ a, b } = chooser.pick(findMoves(board)));
    }
    const move = resolveMove(board, a, b, rng);
    const result = playTurn(state, move, { rules: data.rules });
    state = result.state;
    board = nextBoard(move);

    if (move.valid) {
      validMoves++;
      expect(result.consumedTurn, label).toBe(true);
      expect(state.turn, label).toBe(before.turn + 1);
      expect(result.events[0], label).toEqual({ type: 'turnStart', turn: state.turn });
    } else {
      invalidMoves++;
      expect(result.consumedTurn, label).toBe(false);
      expect(state, label).toBe(before);
    }
    // HP は 0 以上・最大以下で、減るだけ(回復はまだない)
    expect(state.enemy.hp >= 0 && state.enemy.hp <= before.enemy.hp, label).toBe(true);
    for (const [index, member] of state.party.entries()) {
      expect(member.hp >= 0 && member.hp <= (before.party[index]?.hp ?? 0), label).toBe(true);
    }
    // 勝敗の出来事は、戦闘の終わりの最後の出来事としてだけ出る
    const last = result.events.at(-1);
    if (state.outcome === 'victory') expect(last?.type, label).toBe('victory');
    if (state.outcome === 'defeat') expect(last?.type, label).toBe('defeat');
    if (state.outcome === 'ongoing') expect(result.events.some((e) => e.type === 'victory' || e.type === 'defeat'), label).toBe(false);
  }
  return { final: state, validMoves, invalidMoves };
}

describe('ランダムな操作での戦闘', () => {
  it('プロトタイプのステージ: 200 シードで、必ず勝利か敗北で終わる', () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const log = runBattle(seed, DEFAULT_BATTLE_DATA, 'prototype');
      expect(log.final.outcome, `seed ${seed}`).not.toBe('ongoing');
      outcomes.add(log.final.outcome);
      if (log.final.outcome === 'victory') expect(log.final.enemy.hp, `seed ${seed}`).toBe(0);
    }
    // 仮仕様の数値では、最低 30 ダメージ/ターン × 10 ターンで敵(HP 300)を倒せ、
    // 敵は 15 ターン目まで味方(HP 100)を倒せないため、必ず勝利する
    expect([...outcomes]).toEqual(['victory']);
  });

  it('倒せない敵: 必ず敗北で終わる(HP 100 の味方に 3 ターンごとに 20 → 15 ターン目に敗北)', () => {
    const data: BattleData = {
      ...DEFAULT_BATTLE_DATA,
      enemies: [{ ...ENEMIES[0], maxHp: 1_000_000 }],
    };
    for (let seed = 0; seed < 50; seed++) {
      const log = runBattle(seed, data, 'prototype');
      expect(log.final.outcome, `seed ${seed}`).toBe('defeat');
      expect(log.final.turn, `seed ${seed}`).toBe(15);
      expect(log.final.party[0]?.hp, `seed ${seed}`).toBe(0);
    }
  });

  it('揃わない入れ替えも実際に混ざっている(ターンの消費の検査が働いている)', () => {
    let invalid = 0;
    for (let seed = 0; seed < 20; seed++) invalid += runBattle(seed, DEFAULT_BATTLE_DATA, 'prototype').invalidMoves;
    expect(invalid).toBeGreaterThan(0);
  });

  it('同じシードなら同じ戦闘になる', () => {
    expect(runBattle(42, DEFAULT_BATTLE_DATA, 'prototype')).toEqual(runBattle(42, DEFAULT_BATTLE_DATA, 'prototype'));
  });

  it('規則を差し替えても最後まで進む(段の倍率を大きく)', () => {
    const data: BattleData = { ...DEFAULT_BATTLE_DATA, rules: { ...BATTLE_RULES, comboBonusPerStep: 1 } };
    for (let seed = 0; seed < 20; seed++) {
      expect(runBattle(seed, data, 'prototype').final.outcome, `seed ${seed}`).not.toBe('ongoing');
    }
  });
});
