/**
 * パズル盤面の設定値(すべて仮仕様。docs/GAME_DESIGN.md §9「最初のプロトタイプ仕様」)。
 */

/** パズルの設定 */
export interface PuzzleConfig {
  /** 盤面の行数 */
  readonly rows: number;
  /** 盤面の列数 */
  readonly cols: number;
  /** パネルの種類数(3 以上。種類は 0 〜 kindCount-1 の番号で表す) */
  readonly kindCount: number;
  /** 1回の入れ替えで処理する連鎖の段数の上限。超えたらエラーにする(無限ループ防止) */
  readonly maxCascadeSteps: number;
  /** 盤面の生成をやり直す回数の上限。超えたらエラーにする */
  readonly maxGenerateAttempts: number;
  /** 詰み時の並べ替えをやり直す回数の上限。超えたら新しい盤面を生成する */
  readonly maxReshuffleAttempts: number;
}

export const PUZZLE_CONFIG = {
  rows: 7,
  cols: 7,
  kindCount: 5,
  maxCascadeSteps: 100,
  maxGenerateAttempts: 100,
  maxReshuffleAttempts: 50,
} as const satisfies PuzzleConfig;
