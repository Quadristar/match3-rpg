/**
 * パネル1つの表示(仮: 色付きの図形)。原点は中央。
 * BoardView が ObjectPool で再利用する。
 */
import { Container, Graphics } from 'pixi.js';
import type { TileKind } from '../../../systems/puzzle';
import { BOARD_VIEW_CONFIG, type TileShape } from './boardViewConfig';

export class TileView extends Container {
  private readonly shape = new Graphics();
  private drawnKind: TileKind | null = null;
  private drawnSize = 0;

  constructor() {
    super({ label: 'TileView' });
    this.addChild(this.shape);
  }

  /** 種類と大きさ(図形の外接する正方形の一辺)を設定する。同じなら描き直さない */
  setKind(kind: TileKind, size: number): void {
    if (kind === this.drawnKind && size === this.drawnSize) {
      return;
    }
    this.drawnKind = kind;
    this.drawnSize = size;
    const styles = BOARD_VIEW_CONFIG.tileStyles;
    const style = styles[Math.min(kind, styles.length - 1)] ?? styles[0];
    drawShape(this.shape.clear(), style.shape, size / 2);
    this.shape.fill(style.color);
  }

  /** プールに戻すときの初期化 */
  resetForPool(): void {
    this.alpha = 1;
    this.scale.set(1);
    this.rotation = 0;
    this.visible = true;
    this.removeFromParent();
  }
}

/** 半径 r の図形の輪郭を描く(塗りは呼び出し側) */
function drawShape(g: Graphics, shape: TileShape, r: number): void {
  switch (shape) {
    case 'circle':
      g.circle(0, 0, r);
      return;
    case 'square':
      g.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25);
      return;
    case 'triangle':
      g.regularPoly(0, r * 0.12, r, 3, 0);
      return;
    case 'diamond':
      g.poly([0, -r, r * 0.8, 0, 0, r, -r * 0.8, 0]);
      return;
    case 'hexagon':
      g.regularPoly(0, 0, r * 0.95, 6, 0);
      return;
  }
}
