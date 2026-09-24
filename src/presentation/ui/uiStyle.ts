/**
 * 基本 UI 部品の既定の見た目。部品ごとにオプションで上書きできる。
 */
export const UI_STYLE = {
  fontFamily: 'system-ui, sans-serif',
  button: {
    fontSize: 30,
    textColor: 0xffffff,
    disabledTextColor: 0x8a90a6,
    color: 0x3d5afe,
    pressedColor: 0x2a3eb1,
    disabledColor: 0x3a3f52,
    borderRadius: 16,
  },
  panel: {
    color: 0x262b3d,
    borderColor: 0x4a5070,
    borderWidth: 3,
    borderRadius: 24,
    /** モーダル表示中に背後を暗くする色と濃さ */
    backdropColor: 0x000000,
    backdropAlpha: 0.55,
  },
  progressBar: {
    backColor: 0x333844,
    fillColor: 0xffffff,
    borderRadius: 6,
  },
} as const;
