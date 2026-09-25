import { describe, expect, it } from 'vitest';
import { parseGameUrlOptions, randomSeed } from '../../../src/presentation/game/urlOptions';

describe('parseGameUrlOptions', () => {
  it('seed がなければ null', () => {
    expect(parseGameUrlOptions('').seed).toBeNull();
    expect(parseGameUrlOptions('?debug').seed).toBeNull();
  });

  it('整数の seed を読み取る(?debug がなくても有効)', () => {
    expect(parseGameUrlOptions('?seed=123').seed).toBe(123);
    expect(parseGameUrlOptions('?debug&seed=0').seed).toBe(0);
    expect(parseGameUrlOptions('?seed=4294967295').seed).toBe(4294967295);
  });

  it.each(['?seed=', '?seed=abc', '?seed=1.5', '?seed=-1', '?seed=4294967296'])('不正な値は無視する: %s', (search) => {
    expect(parseGameUrlOptions(search).seed).toBeNull();
  });
});

describe('randomSeed', () => {
  it('0 以上 2^32 未満の整数を返す', () => {
    expect(randomSeed(() => 0)).toBe(0);
    expect(randomSeed(() => 0.999999999999)).toBe(4294967295);
    expect(Number.isInteger(randomSeed())).toBe(true);
  });
});
