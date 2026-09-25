import { describe, expect, it } from 'vitest';
import { effectOf, resolveAttacks } from '../../../src/systems/battle/AttackResolver';
import type { TileEffectTable } from '../../../src/data/tileEffects';
import { fakeMove, INVALID_MOVE } from './fakeMove';

describe('resolveAttacks(パネル → 行動)', () => {
  it('揃わない入れ替えからは行動を作らない', () => {
    expect(resolveAttacks(INVALID_MOVE, 'hero')).toEqual([]);
  });

  it('既定の規則では全種類が攻撃になり、リーダーの1つの攻撃にまとまる(段ごとの内訳を残す)', () => {
    const move = fakeMove([
      [
        { kind: 0, count: 3 },
        { kind: 3, count: 4 },
      ],
      [{ kind: 2, count: 5 }],
      [{ kind: 4, count: 3 }],
    ]);
    expect(resolveAttacks(move, 'hero')).toEqual([
      {
        type: 'partyAttack',
        actorId: 'hero',
        hits: [
          { combo: 1, tileCount: 7 },
          { combo: 2, tileCount: 5 },
          { combo: 3, tileCount: 3 },
        ],
      },
    ]);
  });

  it('属性型の規則に差し替えると、属性ごとの行動に分かれる', () => {
    const table: TileEffectTable = {
      default: { action: 'attack' },
      byKind: { 0: { action: 'attack', attribute: 'fire' }, 1: { action: 'attack', attribute: 'water' } },
    };
    const move = fakeMove([
      [
        { kind: 0, count: 3 },
        { kind: 1, count: 4 },
      ],
      [
        { kind: 0, count: 3 },
        { kind: 2, count: 3 },
      ],
    ]);
    expect(resolveAttacks(move, 'hero', table)).toEqual([
      {
        type: 'partyAttack',
        actorId: 'hero',
        attribute: 'fire',
        hits: [
          { combo: 1, tileCount: 3 },
          { combo: 2, tileCount: 3 },
        ],
      },
      { type: 'partyAttack', actorId: 'hero', attribute: 'water', hits: [{ combo: 1, tileCount: 4 }] },
      { type: 'partyAttack', actorId: 'hero', hits: [{ combo: 2, tileCount: 3 }] },
    ]);
  });

  it('effectOf: byKind になければ default', () => {
    const table: TileEffectTable = { default: { action: 'attack' }, byKind: { 1: { action: 'attack', attribute: 'x' } } };
    expect(effectOf(1, table)).toEqual({ action: 'attack', attribute: 'x' });
    expect(effectOf(4, table)).toEqual({ action: 'attack' });
  });
});
