/**
 * デモシーンの見た目の設定値。
 */
export const DEMO_STYLE = {
  fontFamily: 'system-ui, sans-serif',
  titleFontSize: 72,
  hintFontSize: 32,
  labelFontSize: 22,
  infoFontSize: 24,
  infoLineHeight: 34,
  /** info 領域の内側の余白 */
  infoPadding: 16,
  textColor: 0xffffff,
  subTextColor: 0xb8c0d8,
  /** 枠線の太さ(論理座標) */
  lineWidth: 3,
  /** 基準点の半径(論理座標) */
  anchorRadius: 8,
  /** ラベルと枠線・点の間隔 */
  labelPadding: 6,
  /** 画像の大きさ(main の短い辺に対する割合) */
  pictureRatio: 0.3,
  sceneA: {
    /** 余白を含む画面全体の色 */
    screenColor: 0x12141d,
    /** 論理解像度の範囲の色 */
    logicalColor: 0x1b1e2b,
    logicalBorderColor: 0x4a5070,
    safeAreaColor: 0x3ddc84,
    regionColor: 0xffc857,
    anchorColor: 0xff6b9a,
    swipeColor: 0x7fd4ff,
  },
  /** デモの設定パネル(論理座標。パネルの中心が原点) */
  settingsPanel: {
    width: 600,
    height: 600,
    /** セーフエリアの端からの余白(収まらなければ縮小する) */
    margin: 24,
    titleY: -240,
    titleFontSize: 36,
    buttonWidth: 160,
    buttonHeight: 72,
    qualityY: -120,
    /** 品質ボタンの横の間隔(中心間) */
    qualityGap: 180,
    volumeLabelY: 0,
    volumeY: 70,
    smallButtonWidth: 80,
    volumeBarWidth: 280,
    volumeBarHeight: 20,
    /** 音量ボタンの中心の、パネル中心からの横の距離 */
    volumeButtonX: 200,
    volumeStep: 0.1,
    closeY: 210,
    openButtonWidth: 280,
    openButtonHeight: 80,
  },
  sceneB: {
    screenColor: 0x0e2a2a,
    logicalColor: 0x164040,
    /** 画像の回転速度(ラジアン/秒) */
    rotationSpeed: 1.5,
  },
} as const;
