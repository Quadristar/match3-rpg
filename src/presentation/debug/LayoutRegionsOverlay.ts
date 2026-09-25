/**
 * レイアウト定義の領域を、枠と名前で表示する(?debug のときの確認用)。
 * シーンの root(論理座標)に追加して使う。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { Layout } from '../../services/layout/layoutTypes';

/** 見た目の設定値 */
const STYLE = {
  color: 0xffc857,
  lineWidth: 2,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 20,
  /** 名前と枠の間隔 */
  padding: 6,
} as const;

export class LayoutRegionsOverlay extends Container {
  private readonly frames = new Graphics();
  private readonly labels = new Container();

  /**
   * @param exclude 表示しない領域の名前(画面全体を表す main など)
   */
  constructor(private readonly exclude: readonly string[] = []) {
    super({ label: 'LayoutRegionsOverlay' });
    this.addChild(this.frames, this.labels);
  }

  /** 領域を描き直す */
  draw(layout: Layout): void {
    const g = this.frames.clear();
    for (const old of this.labels.removeChildren()) {
      old.destroy();
    }
    for (const [name, region] of Object.entries(layout.regions)) {
      if (this.exclude.includes(name)) continue;
      g.rect(region.x, region.y, region.width, region.height).stroke({ width: STYLE.lineWidth, color: STYLE.color });
      const label = new Text({
        text: name,
        style: { fontFamily: STYLE.fontFamily, fontSize: STYLE.fontSize, fill: STYLE.color },
      });
      label.position.set(region.x + STYLE.padding, region.y + STYLE.padding);
      this.labels.addChild(label);
    }
  }
}
