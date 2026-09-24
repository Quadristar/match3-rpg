/**
 * Button: 文字付きのボタン。原点は中央。
 * 入力は UIInputRouter が扱う(Pixi のイベントは使わない)。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { Point } from '../../services/layout/layoutTypes';
import type { PressableTarget } from './uiTargets';
import { UI_STYLE } from './uiStyle';

export interface ButtonOptions {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** ボタンの上で指を離したときに呼ぶ */
  readonly onClick: () => void;
  readonly enabled?: boolean;
  readonly fontSize?: number;
  readonly color?: number;
  readonly pressedColor?: number;
}

const S = UI_STYLE.button;

export class Button extends Container implements PressableTarget {
  readonly uiRole = 'pressable' as const;
  private readonly background = new Graphics();
  private readonly text: Text;
  private isEnabled: boolean;
  private isPressed = false;

  constructor(private readonly options: ButtonOptions) {
    super({ label: `Button(${options.label})` });
    this.isEnabled = options.enabled ?? true;
    this.text = new Text({
      text: options.label,
      style: { fontFamily: UI_STYLE.fontFamily, fontSize: options.fontSize ?? S.fontSize, fill: S.textColor },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.background, this.text);
    this.redraw();
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  set enabled(value: boolean) {
    this.isEnabled = value;
    if (!value) {
      this.isPressed = false;
    }
    this.redraw();
  }

  /** 表示する文字を変える */
  setLabel(label: string): void {
    this.text.text = label;
  }

  hitTest(global: Point): boolean {
    const local = this.toLocal(global);
    return Math.abs(local.x) <= this.options.width / 2 && Math.abs(local.y) <= this.options.height / 2;
  }

  setPressed(pressed: boolean): void {
    if (this.isPressed !== pressed) {
      this.isPressed = pressed;
      this.redraw();
    }
  }

  activate(): void {
    this.options.onClick();
  }

  private redraw(): void {
    const { width, height } = this.options;
    const color = !this.isEnabled
      ? S.disabledColor
      : this.isPressed
        ? (this.options.pressedColor ?? S.pressedColor)
        : (this.options.color ?? S.color);
    this.background.clear().roundRect(-width / 2, -height / 2, width, height, S.borderRadius).fill(color);
    this.text.style.fill = this.isEnabled ? S.textColor : S.disabledTextColor;
  }
}
