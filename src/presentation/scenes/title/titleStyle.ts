/**
 * タイトル画面の見た目の設定値(仮仕様: 図形と文字のみ)。
 */
export const TITLE_STYLE = {
  text: '(仮)タイトル',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 72,
  textColor: 0xffffff,
  /** 余白を含む画面全体の色 */
  screenColor: 0x1b1e2b,
  /** 文字の幅の上限(main 領域の幅に対する割合)。超えたら縮小する */
  maxWidthRatio: 0.9,
} as const;
