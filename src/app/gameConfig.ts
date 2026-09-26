/**
 * ゲーム全体の設定値。ゲームごとに調整する。
 */
import type { GestureThresholds } from '../services/input/inputTypes';
import type { LogicalSizes } from '../services/layout/layoutTypes';
import type { SettingsData } from '../services/settings/settingsTypes';

export const GAME_CONFIG = {
  /**
   * ゲーム ID。セーブデータの保存キーの前に付く。
   * GitHub Pages では同じドメインの全ゲームが localStorage を共有するため、
   * 雛形から作ったゲームでは必ずこの値を変えること(この1か所だけ変えればよい)
   */
  gameId: 'match3-rpg',
  /** 向きごとの論理解像度(仮仕様: 縦 720×1280、横 1280×720) */
  logicalSizes: {
    portrait: { width: 720, height: 1280 },
    landscape: { width: 1280, height: 720 },
  } satisfies LogicalSizes,
  /** シーン切り替えのフェードアウト・フェードインそれぞれの時間(ミリ秒、仮仕様) */
  fadeDurationMs: 250,
  /** フェードの色 */
  fadeColor: 0x000000,
  /** シーンの読み込みがこの時間を超えたら読み込み中表示を出す(ミリ秒、仮仕様) */
  loadingDelayMs: 300,
  assets: {
    /** 起動時に読み込むバンドル。読み込めなければ起動エラーにする */
    bootBundle: 'boot',
    /** 読み込み失敗時の再試行の回数(初回を除く、仮仕様) */
    retryCount: 2,
    /** 再試行までの待ち時間(ミリ秒、仮仕様) */
    retryDelayMs: 500,
  },
  input: {
    /** 判定のしきい値(距離は画面座標の CSS ピクセル、時間はミリ秒。仮仕様) */
    thresholds: {
      dragStartDistance: 10,
      tapMaxDurationMs: 300,
      swipeMinDistance: 50,
      swipeMaxDurationMs: 500,
    } satisfies GestureThresholds,
  },
  settings: {
    /** 設定の初期値(仮仕様) */
    defaults: {
      volume: { master: 1, bgm: 0.8, se: 0.8, voice: 1 },
      muted: false,
      quality: 'medium',
    } satisfies SettingsData,
    /** 音量の変更を保存するまでの待ち時間(ミリ秒、仮仕様) */
    saveDelayMs: 500,
  },
  debug: {
    /** デバッグ表示の更新間隔(ミリ秒)。毎フレームは更新しない */
    updateIntervalMs: 250,
  },
  errors: {
    /** ?debug のエラー表示で出すスタックの行数の上限(仮仕様) */
    stackLines: 12,
  },
} as const;
