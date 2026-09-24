/**
 * Panel: 角丸の板。原点は中央。上に置いたものの背後への入力を遮る。
 *
 * modal を true にすると、表示中は Panel の外をタップしても背後のボタンやゲーム側に入力を渡さない。
 * setBackdrop() で背後を暗くする範囲(親の座標)を指定できる(画面全体を覆うには layout.visibleArea を渡す)。
 * 背後を暗くする範囲は見た目だけで、入力を遮る範囲には関係しない(モーダルなら常に全体を遮る)。
 * Panel の上に置くボタンなどは、Panel の子として addChild する。
 */
import { Container, Graphics } from 'pixi.js';
import type { Point, Rect } from '../../services/layout/layoutTypes';
import type { BlockerTarget } from './uiTargets';
import { UI_STYLE } from './uiStyle';

export interface PanelOptions {
  readonly width: number;
  readonly height: number;
  /** 背後の操作を受け付けないか */
  readonly modal?: boolean;
}

const S = UI_STYLE.panel;

export class Panel extends Container implements BlockerTarget {
  readonly uiRole = 'blocker' as const;
  readonly modal: boolean;
  private readonly backdrop = new Graphics();
  private readonly board = new Graphics();
  private panelWidth: number;
  private panelHeight: number;

  constructor(options: PanelOptions) {
    super({ label: options.modal === true ? 'Panel(modal)' : 'Panel' });
    this.modal = options.modal ?? false;
    this.panelWidth = options.width;
    this.panelHeight = options.height;
    this.addChild(this.backdrop, this.board);
    this.redraw();
  }

  get panelSize(): { readonly width: number; readonly height: number } {
    return { width: this.panelWidth, height: this.panelHeight };
  }

  /** 大きさを変える */
  setPanelSize(width: number, height: number): void {
    this.panelWidth = width;
    this.panelHeight = height;
    this.redraw();
  }

  /**
   * 背後を暗くする範囲を指定する(親の座標)。null なら暗くしない。
   * Panel を動かした後にも呼び直すこと。
   */
  setBackdrop(area: Rect | null): void {
    this.backdrop.clear();
    if (area !== null) {
      // 親の座標を Panel の座標に直す(Panel の拡大縮小・移動を打ち消す。回転は考慮しない)
      const sx = this.scale.x || 1;
      const sy = this.scale.y || 1;
      this.backdrop
        .rect((area.x - this.x) / sx, (area.y - this.y) / sy, area.width / sx, area.height / sy)
        .fill({ color: S.backdropColor, alpha: S.backdropAlpha });
    }
  }

  hitTest(global: Point): boolean {
    const local = this.toLocal(global);
    return Math.abs(local.x) <= this.panelWidth / 2 && Math.abs(local.y) <= this.panelHeight / 2;
  }

  private redraw(): void {
    const w = this.panelWidth;
    const h = this.panelHeight;
    this.board
      .clear()
      .roundRect(-w / 2, -h / 2, w, h, S.borderRadius)
      .fill(S.color)
      .stroke({ width: S.borderWidth, color: S.borderColor });
  }
}
