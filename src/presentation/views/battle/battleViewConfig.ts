/**
 * バトルの表示・再生の設定値(すべて仮仕様。見た目の作り込みは Phase 6)。
 */
export const BATTLE_VIEW_CONFIG = {
  /** 再生の各段階の時間(ミリ秒。再生全体の速さ(PLAYBACK_CONFIG.speed)が 1 のとき) */
  timings: {
    /** 味方の攻撃: ダメージの数字が出て、敵の HP が減る */
    partyAttackMs: 600,
    /** 敵の攻撃: 画面が揺れ、味方の HP が減る */
    enemyAttackMs: 600,
    /** 次の攻撃までの残りターン数の表示の更新 */
    countdownMs: 150,
    /** 勝敗が決まってから、結果を表示するまでの間 */
    outcomeDelayMs: 400,
  },
  fontFamily: 'system-ui, sans-serif',
  textColor: 0xffffff,
  subTextColor: 0xb8c0d8,
  /** 敵(仮の図形) */
  enemy: {
    color: 0xd9534f,
    /** 図形の大きさ(敵の領域の短い辺に対する割合) */
    sizeRatio: 0.45,
    /** 攻撃を受けたときに光る色と時間の割合(味方の攻撃の時間に対する割合) */
    hitColor: 0xffffff,
    nameFontSize: 24,
  },
  /** HP バー */
  hpBar: {
    height: 22,
    /** 領域の幅に対する割合 */
    widthRatio: 0.8,
    enemyColor: 0xff6b6b,
    partyColor: 0x3ddc84,
    backColor: 0x333844,
    fontSize: 20,
    /** 文字とバーの間 */
    labelGap: 6,
  },
  /** 領域の端からの余白 */
  padding: 16,
  /** 次の攻撃までの残りターン数 */
  countdownFontSize: 24,
  /** ダメージの数字 */
  damageNumber: {
    fontSize: 48,
    enemyColor: 0xffffff,
    partyColor: 0xff8080,
    /** 上に浮かぶ距離 */
    rise: 60,
  },
  /** 敵の攻撃で画面が揺れる幅(論理座標)と回数 */
  shake: { amplitude: 12, count: 6 },
  /** 勝敗の表示 */
  result: {
    width: 520,
    height: 360,
    titleFontSize: 56,
    detailFontSize: 28,
    titleY: -100,
    detailY: -20,
    buttonY: 90,
    buttonGap: 240,
    buttonWidth: 200,
    buttonHeight: 72,
    victoryColor: 0xffd23f,
    defeatColor: 0x8a90a6,
  },
} as const;

export type BattlePlaybackTimings = { readonly [K in keyof typeof BATTLE_VIEW_CONFIG.timings]: number };
