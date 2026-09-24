/**
 * ProgressBar: 進捗や量(0〜1)を横棒で表す。原点は左上。
 */
import { Container, Graphics } from 'pixi.js';
import { UI_STYLE } from './uiStyle';

export interface ProgressBarOptions {
  readonly width: number;
  readonly height: number;
  readonly backColor?: number;
  readonly fillColor?: number;
}

const S = UI_STYLE.progressBar;

export class ProgressBar extends Container {
  private readonly bar = new Graphics();
  private value = 0;

  constructor(private readonly options: ProgressBarOptions) {
    super({ label: 'ProgressBar' });
    this.addChild(this.bar);
    this.redraw();
  }

  /** 現在の値(0〜1) */
  get progress(): number {
    return this.value;
  }

  set progress(value: number) {
    const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    if (clamped !== this.value) {
      this.value = clamped;
      this.redraw();
    }
  }

  private redraw(): void {
    const { width, height } = this.options;
    const radius = Math.min(S.borderRadius, height / 2);
    this.bar.clear().roundRect(0, 0, width, height, radius).fill(this.options.backColor ?? S.backColor);
    if (this.value > 0) {
      this.bar.roundRect(0, 0, width * this.value, height, radius).fill(this.options.fillColor ?? S.fillColor);
    }
  }
}
