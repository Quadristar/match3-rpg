/**
 * 保存された文字列を読み取り、必要なら移行処理を順に適用する(純粋な関数)。
 *
 * 保存形式: {"version": 数値, "data": ゲームが決めた中身}
 */
import type { SaveSchema } from './saveTypes';

export type ReadResult<D> =
  | { readonly kind: 'ok'; readonly data: D; readonly migratedFrom: number | null }
  | { readonly kind: 'invalid'; readonly reason: string; readonly error?: unknown };

/** 保存する文字列を作る */
export function writeSaveRecord<D>(schema: SaveSchema<D>, data: D): string {
  return JSON.stringify({ version: schema.version, data });
}

export function readSaveRecord<D>(raw: string, schema: SaveSchema<D>): ReadResult<D> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { kind: 'invalid', reason: 'JSON として読めません', error };
  }
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || !('data' in parsed)) {
    return { kind: 'invalid', reason: 'version と data がありません' };
  }
  const version = parsed.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { kind: 'invalid', reason: `バージョンが不正です: ${String(version)}` };
  }
  if (version > schema.version) {
    return { kind: 'invalid', reason: `このゲームより新しいバージョンのデータです: ${version} > ${schema.version}` };
  }

  let data: unknown = parsed.data;
  for (let v = version; v < schema.version; v++) {
    const migrate = schema.migrations?.[v];
    if (migrate === undefined) {
      return { kind: 'invalid', reason: `バージョン ${v} から ${v + 1} への移行処理がありません` };
    }
    try {
      data = migrate(data);
    } catch (error) {
      return { kind: 'invalid', reason: `バージョン ${v} から ${v + 1} への移行に失敗しました`, error };
    }
  }

  if (schema.validate !== undefined && !schema.validate(data)) {
    return { kind: 'invalid', reason: 'データの形が正しくありません' };
  }
  // validate を省略した場合は、定義どおりの形であるとみなす
  return { kind: 'ok', data: data as D, migratedFrom: version === schema.version ? null : version };
}
