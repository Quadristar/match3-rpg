import { describe, expect, it } from 'vitest';
import { findMatches } from '../../../src/systems/puzzle/MatchFinder';
import { at, cellKeys, parseBoard } from './boardText';

/** 1つだけのマッチを取り出す */
function onlyMatch(text: string) {
  const matches = findMatches(parseBoard(text));
  expect(matches).toHaveLength(1);
  return at(matches, 0);
}

describe('findMatches', () => {
  it('揃っていなければ空', () => {
    expect(
      findMatches(
        parseBoard(`
          ABAB
          BABA
          ABAB
        `),
      ),
    ).toEqual([]);
  });

  it('横に3個: line3', () => {
    const match = onlyMatch(`
      BCDB
      AAAC
      BCDB
    `);
    expect(match.shape).toBe('line3');
    expect(match.kind).toBe(0);
    expect(cellKeys(match.cells)).toEqual(['1,0', '1,1', '1,2']);
  });

  it('縦に3個: line3', () => {
    const match = onlyMatch(`
      BAC
      CAB
      BAC
      CBB
    `);
    expect(match.shape).toBe('line3');
    expect(cellKeys(match.cells)).toEqual(['0,1', '1,1', '2,1']);
  });

  it('4個: line4', () => {
    const match = onlyMatch(`
      BCBCB
      CAAAA
      BCBCB
    `);
    expect(match.shape).toBe('line4');
    expect(match.cells).toHaveLength(4);
  });

  it('5個: line5', () => {
    const match = onlyMatch(`
      BCBCB
      AAAAA
      BCBCB
    `);
    expect(match.shape).toBe('line5');
    expect(match.cells).toHaveLength(5);
  });

  it('6個以上も line5(仮仕様)', () => {
    const match = onlyMatch(`
      BCBCBC
      AAAAAA
      BCBCBC
    `);
    expect(match.shape).toBe('line5');
    expect(match.cells).toHaveLength(6);
  });

  it.each([
    [
      '左上の角',
      `
        AAAB
        ACBC
        ABCB
      `,
    ],
    [
      '右上の角',
      `
        BAAA
        CBCA
        BCBA
      `,
    ],
    [
      '左下の角',
      `
        ACBC
        ABCB
        AAAC
      `,
    ],
    [
      '右下の角',
      `
        CBCA
        BCBA
        CAAA
      `,
    ],
  ])('L字(%s)は1つのまとまりで L', (_, text) => {
    const match = onlyMatch(text);
    expect(match.shape).toBe('L');
    expect(match.cells).toHaveLength(5);
  });

  it('T字(横の中央から縦に伸びる)は T', () => {
    const match = onlyMatch(`
      AAAB
      CACB
      BACC
    `);
    expect(match.shape).toBe('T');
    expect(cellKeys(match.cells)).toEqual(['0,0', '0,1', '0,2', '1,1', '2,1']);
  });

  it('T字(縦の中央から横に伸びる)は T', () => {
    const match = onlyMatch(`
      ABC
      AAA
      ACB
    `);
    expect(match.shape).toBe('T');
    expect(match.cells).toHaveLength(5);
  });

  it('十字は T(仮仕様)', () => {
    const match = onlyMatch(`
      BAB
      AAA
      BAB
    `);
    expect(match.shape).toBe('T');
    expect(match.cells).toHaveLength(5);
  });

  it('5個の列を含む L字は line5 を優先する(仮仕様)', () => {
    const match = onlyMatch(`
      AAAAA
      ABCBC
      ACBCB
    `);
    expect(match.shape).toBe('line5');
    expect(match.cells).toHaveLength(7);
  });

  it('4個の列を含む L字は L', () => {
    const match = onlyMatch(`
      AAAA
      ABCB
      ACBC
    `);
    expect(match.shape).toBe('L');
    expect(match.cells).toHaveLength(6);
  });

  it('マスを共有しない列は別のまとまり(隣り合う平行な列も別)', () => {
    const matches = findMatches(
      parseBoard(`
        AAAB
        AAAC
        BCBB
        DDDC
      `),
    );
    expect(matches.map((m) => [m.kind, m.shape, m.cells.length])).toEqual([
      [0, 'line3', 3],
      [0, 'line3', 3],
      [3, 'line3', 3],
    ]);
  });

  it('縦と横が同時に揃い、種類が違えば別のまとまり', () => {
    const matches = findMatches(
      parseBoard(`
        AAAB
        CDCB
        DCDB
      `),
    );
    expect(matches.map((m) => [m.kind, cellKeys(m.cells)])).toEqual([
      [0, ['0,0', '0,1', '0,2']],
      [1, ['0,3', '1,3', '2,3']],
    ]);
  });
});
