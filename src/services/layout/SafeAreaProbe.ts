/**
 * セーフエリア(画面の切り欠き・ナビゲーションバーなど)の大きさを DOM から読み取る。
 *
 * CSS の env(safe-area-inset-*) を padding に指定した非表示の要素を置き、
 * 計算後のスタイルから値を得る。index.html の viewport に viewport-fit=cover が必要。
 */
import type { Insets } from './layoutTypes';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

export class SafeAreaProbe {
  private readonly element: HTMLDivElement;

  constructor(parent: HTMLElement = document.body) {
    this.element = document.createElement('div');
    const style = this.element.style;
    style.position = 'fixed';
    style.left = '0';
    style.top = '0';
    style.width = '0';
    style.height = '0';
    style.visibility = 'hidden';
    style.pointerEvents = 'none';
    for (const side of SIDES) {
      style.setProperty(`padding-${side}`, `env(safe-area-inset-${side}, 0px)`);
    }
    parent.appendChild(this.element);
  }

  /** 現在のセーフエリアの食い込み量(CSS ピクセル)を返す */
  read(): Insets {
    const computed = getComputedStyle(this.element);
    const px = (side: (typeof SIDES)[number]): number => {
      const value = parseFloat(computed.getPropertyValue(`padding-${side}`));
      return Number.isFinite(value) ? value : 0;
    };
    return { top: px('top'), right: px('right'), bottom: px('bottom'), left: px('left') };
  }

  /** 読み取り用の要素を取り除く */
  dispose(): void {
    this.element.remove();
  }
}
