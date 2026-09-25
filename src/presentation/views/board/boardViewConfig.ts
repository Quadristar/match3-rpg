/**
 * 盤面の表示・再生・操作の設定値(すべて仮仕様)。
 */
export const BOARD_VIEW_CONFIG = {
  /** 再生の各段階の時間(ミリ秒。再生全体の速さ(PLAYBACK_CONFIG.speed)が 1 のとき) */
  timings: {
    /** 入れ替え(揃わないときは、戻す動きにも同じ時間を使う) */
    swapMs: 160,
    /** 消去 */
    clearMs: 220,
    /** 落下: 1マスあたりの時間(落ちる距離に比例させる) */
    fallMsPerCell: 70,
    /** 連鎖の1段ごとの間 */
    stepPauseMs: 60,
    /** 再配置(消えて現れる全体の時間) */
    reshuffleMs: 600,
  },
  /** ドラッグで入れ替える方向を確定する距離(パネルの幅に対する割合。docs/decisions/001) */
  dragThresholdRatio: 0.4,
  /** パネルの図形の大きさ(マスの大きさに対する割合) */
  tileSizeRatio: 0.8,
  /** 盤面の背景 */
  boardColor: 0x151826,
  /** マスの背景(市松模様の2色) */
  cellColors: [0x1f2335, 0x252a3f],
  /** 選択中のパネルの枠 */
  selection: { color: 0xffffff, lineWidth: 4 },
  /** パネルの種類ごとの色と形(種類の番号の順。足りない種類は最後の要素を使う) */
  tileStyles: [
    { color: 0xff5c5c, shape: 'circle' },
    { color: 0x4fb3ff, shape: 'square' },
    { color: 0x6ee06e, shape: 'triangle' },
    { color: 0xffd23f, shape: 'diamond' },
    { color: 0xc77dff, shape: 'hexagon' },
  ],
} as const;

export type TileShape = (typeof BOARD_VIEW_CONFIG.tileStyles)[number]['shape'];

export type PlaybackTimings = { readonly [K in keyof typeof BOARD_VIEW_CONFIG.timings]: number };
