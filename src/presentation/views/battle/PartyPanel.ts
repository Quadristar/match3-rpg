/**
 * 味方の表示(今は HP バーだけ。立ち絵は Phase 6 以降)。
 * layout() で受け取った領域(立ち絵の領域)の下の方に配置する。
 */
import { Container } from 'pixi.js';
import type { Point, Rect } from '../../../services/layout/layoutTypes';
import { BATTLE_VIEW_CONFIG } from './battleViewConfig';
import { HpBar } from './HpBar';

const C = BATTLE_VIEW_CONFIG;

export class PartyPanel extends Container {
  readonly hpBar: HpBar;
  private barCenter: Point = { x: 0, y: 0 };

  constructor(name: string) {
    super({ label: 'PartyPanel' });
    this.hpBar = new HpBar(name, C.hpBar.partyColor);
    this.addChild(this.hpBar);
  }

  /** ダメージの数字を出す位置(このコンテナの親の座標) */
  get damagePoint(): Point {
    return this.barCenter;
  }

  layout(region: Rect): void {
    const barBlock = C.hpBar.fontSize + C.hpBar.labelGap + C.hpBar.height;
    const barWidth = region.width * C.hpBar.widthRatio;
    this.hpBar.setWidth(barWidth);
    this.hpBar.position.set(region.x + (region.width - barWidth) / 2, region.y + region.height - C.padding - barBlock);
    this.barCenter = { x: region.x + region.width / 2, y: this.hpBar.y - C.damageNumber.fontSize / 2 };
  }
}
