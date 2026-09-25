import { describe, expect, it } from 'vitest';
import { calculateDamage, calculateHits, comboMultiplier } from '../../../src/systems/battle/DamageCalculator';

describe('comboMultiplier(段の倍率)', () => {
  it('1段目 1.0、2段目 1.25、3段目 1.5 …', () => {
    expect([1, 2, 3, 4, 5].map((c) => comboMultiplier(c))).toEqual([1, 1.25, 1.5, 1.75, 2]);
  });

  it('段は 1 以上の整数', () => {
    expect(() => comboMultiplier(0)).toThrow(RangeError);
    expect(() => comboMultiplier(1.5)).toThrow(RangeError);
  });

  it('規則の数値を差し替えられる', () => {
    expect(comboMultiplier(3, { comboBonusPerStep: 0.5, minDamage: 1 })).toBe(2);
  });
});

describe('calculateHits(段ごとの基本ダメージ)', () => {
  it('パネル数 × 攻撃力 × 段の倍率', () => {
    const hits = calculateHits(10, [
      { combo: 1, tileCount: 3 },
      { combo: 2, tileCount: 4 },
      { combo: 3, tileCount: 5 },
    ]);
    expect(hits.map((h) => [h.combo, h.multiplier, h.raw])).toEqual([
      [1, 1, 30],
      [2, 1.25, 50],
      [3, 1.5, 75],
    ]);
  });

  it('基本ダメージは切り捨てない(切り捨ては最終ダメージで行う)', () => {
    expect(calculateHits(11, [{ combo: 2, tileCount: 3 }])[0]?.raw).toBe(41.25);
  });
});

describe('calculateDamage(最終ダメージ)', () => {
  it('合計 − 防御', () => {
    expect(calculateDamage(80, 0)).toBe(80);
    expect(calculateDamage(80, 30)).toBe(50);
  });

  it('小数は切り捨て(防御を引いた後)', () => {
    expect(calculateDamage(41.25, 0)).toBe(41);
    expect(calculateDamage(41.25 + 37.5, 0)).toBe(78); // 78.75 → 78
    expect(calculateDamage(41.25, 0.5)).toBe(40); // 40.75 → 40
  });

  it('最低 1', () => {
    expect(calculateDamage(30, 30)).toBe(1);
    expect(calculateDamage(30, 999)).toBe(1);
    expect(calculateDamage(0.5, 0)).toBe(1);
  });

  it('修飾子(バフ・デバフ)を順に適用する: 合計への倍率 → 防御への倍率 → 最終の倍率', () => {
    expect(calculateDamage(100, 20, [{ kind: 'rawRate', value: 1.5 }])).toBe(130); // 150 − 20
    expect(calculateDamage(100, 20, [{ kind: 'defenseRate', value: 0.5 }])).toBe(90); // 100 − 10
    expect(calculateDamage(100, 20, [{ kind: 'finalRate', value: 0.5 }])).toBe(40); // (100 − 20) × 0.5
    expect(
      calculateDamage(100, 20, [
        { kind: 'rawRate', value: 2, source: '攻撃アップ' },
        { kind: 'rawRate', value: 0.5, source: '攻撃ダウン' },
        { kind: 'finalRate', value: 1.1 },
      ]),
    ).toBe(88); // (100 × 2 × 0.5 − 20) × 1.1 = 88
  });

  it('修飾子で下がっても最低 1', () => {
    expect(calculateDamage(10, 0, [{ kind: 'finalRate', value: 0 }])).toBe(1);
  });
});
