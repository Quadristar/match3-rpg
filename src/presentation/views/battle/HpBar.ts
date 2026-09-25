/**
 * HP バー: 名前・数値・横棒。原点は左上。
 */
import { Container, Text } from 'pixi.js';
import { ProgressBar } from '../../ui/ProgressBar';
import { BATTLE_VIEW_CONFIG } from './battleViewConfig';

const C = BATTLE_VIEW_CONFIG;

export class HpBar extends Container {
  private readonly nameText: Text;
  private readonly value: Text;
  private bar: ProgressBar;
  private maxHp = 1;
  private shownHp = 0;

  constructor(
    name: string,
    private readonly fillColor: number,
  ) {
    super({ label: `HpBar(${name})` });
    const style = { fontFamily: C.fontFamily, fontSize: C.hpBar.fontSize, fill: C.textColor };
    this.nameText = new Text({ text: name, style });
    this.value = new Text({ text: '', style });
    this.value.anchor.set(1, 0);
    this.bar = this.createBar(1);
    this.addChild(this.nameText, this.value, this.bar);
  }

  /** 表示中の HP(アニメーション中は途中の値) */
  get hp(): number {
    return this.shownHp;
  }

  /** 幅を変える */
  setWidth(width: number): void {
    this.bar.destroy();
    this.bar = this.createBar(width);
    this.addChild(this.bar);
    this.value.x = width;
    this.bar.y = C.hpBar.fontSize + C.hpBar.labelGap;
    this.redraw();
  }

  /** HP を表示する(小数は切り捨てて表示する) */
  setHp(hp: number, maxHp: number = this.maxHp): void {
    this.shownHp = hp;
    this.maxHp = Math.max(1, maxHp);
    this.redraw();
  }

  private createBar(width: number): ProgressBar {
    return new ProgressBar({ width, height: C.hpBar.height, fillColor: this.fillColor, backColor: C.hpBar.backColor });
  }

  private redraw(): void {
    const hp = Math.max(0, Math.floor(this.shownHp));
    this.value.text = `${hp} / ${this.maxHp}`;
    this.bar.progress = hp / this.maxHp;
  }
}
