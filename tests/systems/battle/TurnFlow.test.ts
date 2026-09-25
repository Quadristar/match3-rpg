import { describe, expect, it } from 'vitest';
import { BATTLE_RULES } from '../../../src/data/battleRules';
import { type BattleData, createBattleState } from '../../../src/systems/battle/BattleState';
import { playTurn } from '../../../src/systems/battle/TurnFlow';
import type { BattleState } from '../../../src/systems/battle/types';
import { cleared, NOTHING_CLEARED, SMALL_CLEAR } from './cleared';

/** テスト用のデータ(敵と味方の数値だけ変えられる) */
function testData(enemy: { maxHp?: number; attack?: number; attackInterval?: number }, hero: { maxHp?: number } = {}): BattleData {
  return {
    characters: [{ id: 'hero', name: 'h', maxHp: hero.maxHp ?? 100, attack: 10, defense: 0 }],
    enemies: [
      {
        id: 'foe',
        name: 'f',
        maxHp: enemy.maxHp ?? 300,
        attack: enemy.attack ?? 20,
        defense: 0,
        attackInterval: enemy.attackInterval ?? 3,
        rewards: { exp: 50 },
      },
    ],
    stages: [{ id: 's', enemyId: 'foe', partyIds: ['hero'] }],
    rules: BATTLE_RULES,
  };
}

/** 小さい入れ替えを n 回行う */
function playSmall(state: BattleState, n: number): BattleState {
  let s = state;
  for (let i = 0; i < n; i++) s = playTurn(s, SMALL_CLEAR).state;
  return s;
}

describe('createBattleState', () => {
  it('既定のステージ(仮仕様の数値)で始まる', () => {
    const state = createBattleState('prototype');
    expect(state.turn).toBe(0);
    expect(state.outcome).toBe('ongoing');
    expect(state.party).toEqual([{ id: 'hero', hp: 100, maxHp: 100, attack: 10, defense: 0 }]);
    expect(state.enemy).toMatchObject({ id: 'prototype-enemy', hp: 300, maxHp: 300, attack: 20, turnsUntilAttack: 3 });
  });

  it('存在しないステージ・参照先はエラー', () => {
    expect(() => createBattleState('none')).toThrow(/ステージ/);
    const data = testData({});
    expect(() => createBattleState('s', { ...data, enemies: [] })).toThrow(/敵/);
    expect(() => createBattleState('s', { ...data, characters: [] })).toThrow(/キャラクター/);
  });
});

describe('playTurn: ターンの消費', () => {
  it('有効な入れ替え1回で1ターン進む', () => {
    const result = playTurn(createBattleState('prototype'), SMALL_CLEAR);
    expect(result.consumedTurn).toBe(true);
    expect(result.state.turn).toBe(1);
  });

  it('何も消えなかった(揃わない入れ替え)ならターンを消費せず、状態も出来事も変わらない', () => {
    const state = createBattleState('prototype');
    const result = playTurn(state, NOTHING_CLEARED);
    expect(result.consumedTurn).toBe(false);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.phases).toEqual([]);
  });

  it('段階は 入力待ち → パズル解決 → 味方行動 → 勝敗判定 → 敵行動 → 勝敗判定 → 入力待ち', () => {
    expect(playTurn(createBattleState('prototype'), SMALL_CLEAR).phases).toEqual([
      'awaitingInput',
      'resolvingPuzzle',
      'partyAction',
      'checkAfterParty',
      'enemyAction',
      'checkAfterEnemy',
      'awaitingInput',
    ]);
  });
});

describe('playTurn: 味方の攻撃', () => {
  it('段ごとの内訳と最終ダメージ、HP の前後を出来事に入れる', () => {
    const move = cleared([[{ kind: 0, count: 3 }], [{ kind: 1, count: 4 }], [{ kind: 2, count: 3 }]]);
    const result = playTurn(createBattleState('prototype'), move);
    const attack = result.events.find((e) => e.type === 'partyAttack');
    expect(attack).toEqual({
      type: 'partyAttack',
      actorId: 'hero',
      targetId: 'prototype-enemy',
      hits: [
        { combo: 1, tileCount: 3, multiplier: 1, raw: 30 },
        { combo: 2, tileCount: 4, multiplier: 1.25, raw: 50 },
        { combo: 3, tileCount: 3, multiplier: 1.5, raw: 45 },
      ],
      rawTotal: 125,
      damage: 125,
      hpBefore: 300,
      hpAfter: 175,
    });
    expect(result.state.enemy.hp).toBe(175);
  });
});

describe('playTurn: 敵の攻撃の間隔', () => {
  it('3ターンごとに攻撃し、残りターン数は 2 → 1 → (攻撃) 3 → 2 → 1 → (攻撃) 3', () => {
    let state = createBattleState('prototype');
    const countdowns: number[] = [];
    const attackTurns: number[] = [];
    const heroHp: number[] = [];
    for (let i = 0; i < 6; i++) {
      const result = playTurn(state, SMALL_CLEAR);
      state = result.state;
      for (const e of result.events) {
        if (e.type === 'enemyCountdown') countdowns.push(e.turnsUntilAttack);
        if (e.type === 'enemyAttack') attackTurns.push(state.turn);
      }
      heroHp.push(state.party[0]?.hp ?? -1);
      expect(state.enemy.turnsUntilAttack).toBe(countdowns.at(-1));
    }
    expect(countdowns).toEqual([2, 1, 3, 2, 1, 3]);
    expect(attackTurns).toEqual([3, 6]);
    expect(heroHp).toEqual([100, 100, 80, 80, 80, 60]);
  });

  it('攻撃の出来事は、味方の HP の前後とダメージ(攻撃力 − 防御)を持つ', () => {
    const result = playTurn(playSmall(createBattleState('prototype'), 2), SMALL_CLEAR);
    expect(result.events.map((e) => e.type)).toEqual(['turnStart', 'partyAttack', 'enemyAttack', 'enemyCountdown']);
    expect(result.events[2]).toEqual({
      type: 'enemyAttack',
      actorId: 'prototype-enemy',
      targetId: 'hero',
      damage: 20,
      hpBefore: 100,
      hpAfter: 80,
    });
  });

  it('毎ターン攻撃する敵(間隔 1)', () => {
    const state = createBattleState('s', testData({ attackInterval: 1 }));
    const result = playTurn(state, SMALL_CLEAR);
    expect(result.events.some((e) => e.type === 'enemyAttack')).toBe(true);
    expect(result.state.enemy.turnsUntilAttack).toBe(1);
  });
});

describe('playTurn: 勝敗', () => {
  it('敵の HP が 0 になったら、敵が行動する前に勝利する(経験値を出来事に入れる)', () => {
    // 敵は毎ターン攻撃するが、倒されたので行動しない
    const state = createBattleState('s', testData({ maxHp: 30, attackInterval: 1 }));
    const result = playTurn(state, SMALL_CLEAR);
    expect(result.state.outcome).toBe('victory');
    expect(result.state.enemy.hp).toBe(0);
    expect(result.phases).toEqual(['awaitingInput', 'resolvingPuzzle', 'partyAction', 'checkAfterParty', 'victory']);
    expect(result.events.map((e) => e.type)).toEqual(['turnStart', 'partyAttack', 'victory']);
    expect(result.events.at(-1)).toEqual({ type: 'victory', enemyId: 'foe', exp: 50 });
    expect(result.state.party[0]?.hp).toBe(100);
  });

  it('攻撃ターンに敵を倒した場合も、敵は攻撃しない', () => {
    // 3ターン目(敵の攻撃ターン)でちょうど倒れる HP
    const state = playSmall(createBattleState('s', testData({ maxHp: 90 })), 2);
    const result = playTurn(state, SMALL_CLEAR);
    expect(result.state.outcome).toBe('victory');
    expect(result.events.some((e) => e.type === 'enemyAttack')).toBe(false);
  });

  it('HP を超えるダメージでも HP は 0 で止まる', () => {
    const state = createBattleState('s', testData({ maxHp: 10 }));
    const attack = playTurn(state, SMALL_CLEAR).events.find((e) => e.type === 'partyAttack');
    expect(attack).toMatchObject({ damage: 30, hpBefore: 10, hpAfter: 0 });
  });

  it('敵の攻撃で味方の HP が 0 になったら敗北する', () => {
    const state = createBattleState('s', testData({ maxHp: 9999, attack: 100, attackInterval: 1 }));
    const result = playTurn(state, SMALL_CLEAR);
    expect(result.state.outcome).toBe('defeat');
    expect(result.state.party[0]?.hp).toBe(0);
    expect(result.phases.slice(-3)).toEqual(['enemyAction', 'checkAfterEnemy', 'defeat']);
    expect(result.events.map((e) => e.type)).toEqual(['turnStart', 'partyAttack', 'enemyAttack', 'enemyCountdown', 'defeat']);
  });

  it('戦闘が終わった後は、入れ替えてもターンを消費せず何も起きない', () => {
    const won = playTurn(createBattleState('s', testData({ maxHp: 30 })), SMALL_CLEAR).state;
    const after = playTurn(won, SMALL_CLEAR);
    expect(after.consumedTurn).toBe(false);
    expect(after.state).toBe(won);
    expect(after.events).toEqual([]);
  });

  it('同じ入力なら同じ結果になる', () => {
    const run = () => playSmall(createBattleState('prototype'), 7);
    expect(run()).toEqual(run());
  });
});
