/**
 * 再生全体の設定(盤面とバトルの表示で共通。仮仕様)。
 */
export const PLAYBACK_CONFIG = {
  /**
   * 再生全体の速さ(1 が標準、2 なら2倍速)。盤面(BoardView)とバトル(BattleView)の両方に効く。
   * 将来の倍速・スキップは、この値(または各ビューの setPlaybackSpeed)で切り替える
   */
  speed: 1,
} as const;
