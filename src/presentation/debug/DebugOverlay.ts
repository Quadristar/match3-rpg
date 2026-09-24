/**
 * デバッグ表示(URL に ?debug を付けたときだけ、app/Game が生成する)。
 *
 * 画面座標で、セーフエリアの右上に重ねて表示する。
 * 更新は毎フレームではなく updateIntervalMs ごとに行う。
 * 表示する値は外から渡す collect() で集めるため、ゲームやデモに依存しない。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { Layout } from '../../services/layout/layoutTypes';
import { type DebugStats, formatDebugStats, FrameRateMeter } from './debugStats';

/** 見た目の設定値(画面座標) */
const STYLE = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  lineHeight: 16,
  textColor: 0xffffff,
  backgroundColor: 0x000000,
  backgroundAlpha: 0.6,
  padding: 6,
  /** セーフエリアの端からの余白 */
  margin: 4,
} as const;

export interface DebugOverlayOptions {
  /** 表示する値を集める(FPS は DebugOverlay が計測する) */
  readonly collect: () => Omit<DebugStats, 'fps'>;
  /** 表示の更新間隔(ミリ秒) */
  readonly updateIntervalMs: number;
}

export class DebugOverlay extends Container {
  private readonly background = new Graphics();
  private readonly text = new Text({
    text: '',
    style: {
      fontFamily: STYLE.fontFamily,
      fontSize: STYLE.fontSize,
      lineHeight: STYLE.lineHeight,
      fill: STYLE.textColor,
    },
  });
  private readonly meter: FrameRateMeter;

  constructor(private readonly options: DebugOverlayOptions) {
    super({ label: 'DebugOverlay' });
    this.meter = new FrameRateMeter(options.updateIntervalMs);
    this.text.anchor.set(1, 0);
    this.text.position.set(-STYLE.padding, STYLE.padding);
    this.addChild(this.background, this.text);
  }

  /** 毎フレーム呼ぶ。更新間隔に達したときだけ表示を作り直す */
  update(deltaMs: number): void {
    if (this.meter.update(deltaMs)) {
      this.refresh();
    }
  }

  /** セーフエリアの右上に配置する */
  layout(layout: Layout): void {
    const { safeArea, scale, offset } = layout;
    this.position.set(
      offset.x + (safeArea.x + safeArea.width) * scale - STYLE.margin,
      offset.y + safeArea.y * scale + STYLE.margin,
    );
  }

  private refresh(): void {
    this.text.text = formatDebugStats({ ...this.options.collect(), fps: this.meter.fps });
    const width = this.text.width + STYLE.padding * 2;
    const height = this.text.height + STYLE.padding * 2;
    this.background.clear().rect(-width, 0, width, height).fill({ color: STYLE.backgroundColor, alpha: STYLE.backgroundAlpha });
  }
}
