/**
 * 画面に表示するエラーの文面のテスト(?debug のときは詳しく、ないときは短い案内だけ)。
 */
import { describe, expect, it } from 'vitest';
import { describeError, ERROR_GUIDE_TEXT, formatErrorReport } from '../../src/app/errorReport';

const DETAILED = { detailed: true, stackLines: 3, userAgent: 'TestUA' };
const SHORT = { detailed: false, stackLines: 3, userAgent: 'TestUA' };

function errorWithStack(stackLines: number): Error {
  const error = new TypeError('boom');
  const frames = Array.from({ length: stackLines }, (_, i) => `    at frame${i} (file.js:${i})`);
  error.stack = ['TypeError: boom', ...frames].join('\n');
  return error;
}

describe('formatErrorReport', () => {
  it('?debug でないときは短い案内だけを返し、エラーの内容や UA は含めない', () => {
    const text = formatErrorReport(errorWithStack(5), 3, SHORT);
    expect(text).toBe(ERROR_GUIDE_TEXT);
    expect(text).not.toContain('boom');
    expect(text).not.toContain('TestUA');
  });

  it('?debug のときは名前・メッセージ・スタック・UA を含める', () => {
    const text = formatErrorReport(errorWithStack(2), 1, DETAILED);
    expect(text).toContain('TypeError: boom');
    expect(text).toContain('at frame0');
    expect(text).toContain('at frame1');
    expect(text).toContain('UA: TestUA');
    expect(text).not.toContain('件目');
  });

  it('2件目以降は件数を表示する', () => {
    expect(formatErrorReport(new Error('x'), 2, DETAILED)).toContain('2 件目');
  });
});

describe('describeError', () => {
  it('スタックは上限の行数まで出し、残りの行数を添える。1行目の重複は除く', () => {
    const lines = describeError(errorWithStack(5), 3).split('\n');
    expect(lines).toEqual([
      'TypeError: boom',
      '    at frame0 (file.js:0)',
      '    at frame1 (file.js:1)',
      '    at frame2 (file.js:2)',
      '… (残り 2 行)',
    ]);
  });

  it('スタックがないエラーは名前とメッセージだけ', () => {
    const error = new RangeError('out');
    delete error.stack;
    expect(describeError(error, 3)).toBe('RangeError: out');
  });

  it('Error 以外の値も文字列にする', () => {
    expect(describeError('text', 3)).toBe('text');
    expect(describeError({ code: 1 }, 3)).toBe('{"code":1}');
    expect(describeError(undefined, 3)).toBe('undefined');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular, 3)).toBe('[object Object]');
  });
});
