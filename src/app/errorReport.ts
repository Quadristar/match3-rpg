/**
 * 画面に表示するエラーの文面を組み立てる(DOM に依存しない部分。テストで確認する)。
 *
 * スマホでは開発者ツールが使えないため、エラーは画面に出す。
 * - 詳細表示(?debug のとき): エラーの名前・メッセージ・スタックの先頭・件数・UA
 * - 通常表示: 短い案内だけ(仮仕様の文面)
 */

export interface ErrorReportOptions {
  /** 詳しい内容を出すか(?debug のとき true) */
  readonly detailed: boolean;
  /** 詳細表示で出すスタックの行数の上限 */
  readonly stackLines: number;
  /** 詳細表示に添える端末の情報 */
  readonly userAgent: string;
}

/** 通常表示の案内(仮仕様) */
export const ERROR_GUIDE_TEXT =
  'エラーが発生しました。\nページを再読み込みしてください。\n(URL に ?debug を付けて開くと、詳しい内容を表示します)';

/**
 * 表示する文面を返す。
 * @param error 最後に起きたエラー
 * @param count これまでに起きたエラーの件数(1以上)
 */
export function formatErrorReport(error: unknown, count: number, options: ErrorReportOptions): string {
  if (!options.detailed) {
    return ERROR_GUIDE_TEXT;
  }
  const header = count > 1 ? `エラーが発生しました(${count} 件目)` : 'エラーが発生しました';
  return `${header}\n\n${describeError(error, options.stackLines)}\n\nUA: ${options.userAgent}`;
}

/** エラーの内容を文字列にする。スタックがあれば先頭の stackLines 行を付ける */
export function describeError(error: unknown, stackLines: number): string {
  if (error instanceof Error) {
    const summary = `${error.name}: ${error.message}`;
    const stack = (error.stack ?? '')
      .split('\n')
      .map((line) => line.trimEnd())
      // Chrome などはスタックの1行目に名前とメッセージを入れるため、重複を除く
      .filter((line) => line !== '' && line !== summary);
    const shown = stack.slice(0, stackLines);
    const omitted = stack.length - shown.length;
    return [summary, ...shown, ...(omitted > 0 ? [`… (残り ${omitted} 行)`] : [])].join('\n');
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}
