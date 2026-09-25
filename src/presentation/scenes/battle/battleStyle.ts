/**
 * バトル画面の見た目の設定値(仮仕様: 図形と文字のみ)。
 */
export const BATTLE_STYLE = {
  fontFamily: 'system-ui, sans-serif',
  /** 余白を含む画面全体の色 */
  screenColor: 0x10121c,
  textColor: 0xffffff,
  subTextColor: 0xb8c0d8,
  /** 連鎖の段数の表示 */
  comboFontSize: 32,
  /** ?debug のときのシードの表示 */
  debugFontSize: 18,
  /** シードの表示の、連鎖の表示からの距離 */
  debugTextOffsetY: 34,
  /** 「タイトルへ」ボタン */
  backButton: { label: 'タイトルへ', width: 200, height: 64, fontSize: 26 },
} as const;
