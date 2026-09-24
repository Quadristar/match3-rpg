import { describe, expect, it } from 'vitest';
import { readSaveRecord, writeSaveRecord } from '../../../src/services/save/readSaveRecord';
import type { SaveSchema } from '../../../src/services/save/saveTypes';

/** v1: { score } → v2: { score, coins } → v3: { best, coins, stage } */
interface V3 {
  best: number;
  coins: number;
  stage: number;
}

function isV3(data: unknown): data is V3 {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as V3).best === 'number' &&
    typeof (data as V3).coins === 'number' &&
    typeof (data as V3).stage === 'number'
  );
}

const SCHEMA: SaveSchema<V3> = {
  key: 'progress',
  version: 3,
  createDefault: () => ({ best: 0, coins: 0, stage: 1 }),
  migrations: {
    1: (v1) => ({ ...(v1 as { score: number }), coins: 0 }),
    2: (v2) => {
      const { score, coins } = v2 as { score: number; coins: number };
      return { best: score, coins, stage: 1 };
    },
  },
  validate: isV3,
};

const record = (version: unknown, data: unknown) => JSON.stringify({ version, data });

describe('readSaveRecord: 移行', () => {
  it('最新バージョンのデータはそのまま読む', () => {
    expect(readSaveRecord(record(3, { best: 5, coins: 2, stage: 4 }), SCHEMA)).toEqual({
      kind: 'ok',
      data: { best: 5, coins: 2, stage: 4 },
      migratedFrom: null,
    });
  });

  it('v1 から v3 まで、移行処理を順に適用する', () => {
    expect(readSaveRecord(record(1, { score: 120 }), SCHEMA)).toEqual({
      kind: 'ok',
      data: { best: 120, coins: 0, stage: 1 },
      migratedFrom: 1,
    });
  });

  it('v2 からは v2→v3 だけを適用する', () => {
    expect(readSaveRecord(record(2, { score: 7, coins: 30 }), SCHEMA)).toEqual({
      kind: 'ok',
      data: { best: 7, coins: 30, stage: 1 },
      migratedFrom: 2,
    });
  });

  it('writeSaveRecord で書いたものを読み戻せる', () => {
    const data = { best: 1, coins: 2, stage: 3 };
    expect(readSaveRecord(writeSaveRecord(SCHEMA, data), SCHEMA)).toMatchObject({ kind: 'ok', data });
  });
});

describe('readSaveRecord: 読めないデータ', () => {
  it.each([
    ['JSON でない', '{broken'],
    ['version がない', JSON.stringify({ data: {} })],
    ['data がない', JSON.stringify({ version: 3 })],
    ['version が数値でない', record('3', {})],
    ['version が 0', record(0, {})],
    ['新しいバージョン', record(4, {})],
    ['形が正しくない', record(3, { best: 'x', coins: 0, stage: 1 })],
    ['null', 'null'],
  ])('%s → invalid', (_, raw) => {
    expect(readSaveRecord(raw, SCHEMA).kind).toBe('invalid');
  });

  it('移行処理が足りない場合は invalid', () => {
    const schema = { ...SCHEMA, migrations: { 2: SCHEMA.migrations?.[2] ?? ((d: unknown) => d) } };
    expect(readSaveRecord(record(1, { score: 1 }), schema)).toMatchObject({ kind: 'invalid' });
  });

  it('移行処理が例外を投げた場合は invalid', () => {
    const schema: SaveSchema<V3> = {
      ...SCHEMA,
      migrations: {
        ...SCHEMA.migrations,
        1: () => {
          throw new Error('bad');
        },
      },
    };
    expect(readSaveRecord(record(1, { score: 1 }), schema)).toMatchObject({ kind: 'invalid' });
  });
});
