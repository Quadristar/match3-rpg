/**
 * 読み込み中表示: 「読み込み中」の文字と進捗バー。
 * 論理座標で、論理解像度の中央に置く(app/Game がゲーム用ルートと同じ拡大縮小をかける)。
 */
import { Container, Text } from 'pixi.js';
import type { Layout } from '../../services/layout/layoutTypes';
import { ProgressBar } from '../ui/ProgressBar';

/** 見た目の設定値(論理座標) */
const STYLE = {
  text: '読み込み中',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 32,
  textColor: 0xffffff,
  barWidth: 360,
  barHeight: 12,
  /** 文字と進捗バーの間隔 */
  gap: 24,
  barBackColor: 0x333844,
  barFillColor: 0xffffff,
} as const;

export class LoadingView extends Container {
  private readonly message = new Text({
    text: STYLE.text,
    style: { fontFamily: STYLE.fontFamily, fontSize: STYLE.fontSize, fill: STYLE.textColor },
  });
  private readonly bar = new ProgressBar({
    width: STYLE.barWidth,
    height: STYLE.barHeight,
    backColor: STYLE.barBackColor,
    fillColor: STYLE.barFillColor,
  });

  constructor() {
    super({ label: 'LoadingView' });
    this.message.anchor.set(0.5, 1);
    this.message.position.set(0, -STYLE.gap / 2);
    this.bar.position.set(-STYLE.barWidth / 2, STYLE.gap / 2);
    this.addChild(this.message, this.bar);
    this.visible = false;
  }

  /** 表示し、進捗(0〜1)を反映する */
  show(progress: number): void {
    this.bar.progress = progress;
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  /** 論理解像度の中央に置く */
  layout(layout: Layout): void {
    this.position.set(layout.logical.width / 2, layout.logical.height / 2);
  }
}
