/**
 * 敵の表示(仮の図形・名前・HP バー・次の攻撃までの残りターン数)。
 * layout() で受け取った領域(敵の領域)の中に配置する。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { Point, Rect } from '../../../services/layout/layoutTypes';
import { BATTLE_VIEW_CONFIG } from './battleViewConfig';
import { HpBar } from './HpBar';

const C = BATTLE_VIEW_CONFIG;

export class EnemyPanel extends Container {
  /** 敵の図形(攻撃を受けたときに光らせるため公開する) */
  readonly body = new Graphics({ label: 'EnemyPanel.body' });
  readonly hpBar: HpBar;
  private readonly countdown = new Text({
    text: '',
    style: { fontFamily: C.fontFamily, fontSize: C.countdownFontSize, fill: C.subTextColor },
  });
  private bodyCenter: Point = { x: 0, y: 0 };

  constructor(name: string) {
    super({ label: 'EnemyPanel' });
    this.hpBar = new HpBar(name, C.hpBar.enemyColor);
    this.countdown.anchor.set(0.5, 0);
    this.addChild(this.body, this.hpBar, this.countdown);
  }

  /** 敵の図形の中心(このコンテナの親の座標) */
  get center(): Point {
    return { x: this.x + this.bodyCenter.x, y: this.y + this.bodyCenter.y };
  }

  /** 領域の中に配置する */
  layout(region: Rect): void {
    const pad = C.padding;
    const barBlock = C.hpBar.fontSize + C.hpBar.labelGap + C.hpBar.height;
    const barWidth = region.width * C.hpBar.widthRatio;
    this.hpBar.setWidth(barWidth);
    this.hpBar.position.set(region.x + (region.width - barWidth) / 2, region.y + region.height - pad - barBlock);
    this.countdown.position.set(region.x + region.width / 2, region.y + pad);

    const top = region.y + pad + C.countdownFontSize;
    const bottom = this.hpBar.y - pad;
    const size = Math.max(0, Math.min(region.width, bottom - top) * C.enemy.sizeRatio * 2);
    this.bodyCenter = { x: region.x + region.width / 2, y: (top + bottom) / 2 };
    const r = size / 2;
    this.body
      .clear()
      .regularPoly(0, 0, r, 6, 0)
      .fill(C.enemy.color)
      .circle(-r * 0.3, -r * 0.15, r * 0.12)
      .circle(r * 0.3, -r * 0.15, r * 0.12)
      .fill(0x10121c);
    this.body.position.set(this.bodyCenter.x, this.bodyCenter.y);
  }

  /** 次の攻撃までの残りターン数を表示する */
  setCountdown(turnsUntilAttack: number): void {
    this.countdown.text = turnsUntilAttack <= 1 ? '次のターンに攻撃!' : `攻撃まで あと ${turnsUntilAttack} ターン`;
  }
}
