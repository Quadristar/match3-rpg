/**
 * 勝利・敗北の表示(仮。リザルト画面は Phase 5)。モーダルで、背後の盤面は操作できない。
 * 「もう一度」「タイトルへ」のボタンを持つ。
 */
import { Text } from 'pixi.js';
import type { Point, Rect } from '../../../services/layout/layoutTypes';
import type { BattleOutcome } from '../../../systems/battle';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { BATTLE_VIEW_CONFIG } from './battleViewConfig';

const R = BATTLE_VIEW_CONFIG.result;
const C = BATTLE_VIEW_CONFIG;

export interface ResultOverlayOptions {
  readonly onRetry: () => void;
  readonly onTitle: () => void;
}

export class ResultOverlay extends Panel {
  private readonly title = new Text({
    text: '',
    style: { fontFamily: C.fontFamily, fontSize: R.titleFontSize, fill: C.textColor },
  });
  private readonly detail = new Text({
    text: '',
    style: { fontFamily: C.fontFamily, fontSize: R.detailFontSize, fill: C.subTextColor },
  });

  constructor(options: ResultOverlayOptions) {
    super({ width: R.width, height: R.height, modal: true });
    this.label = 'ResultOverlay';
    this.title.anchor.set(0.5);
    this.title.y = R.titleY;
    this.detail.anchor.set(0.5);
    this.detail.y = R.detailY;
    const button = (label: string, x: number, onClick: () => void): Button => {
      const b = new Button({ label, width: R.buttonWidth, height: R.buttonHeight, onClick });
      b.position.set(x, R.buttonY);
      return b;
    };
    this.addChild(
      this.title,
      this.detail,
      button('もう一度', -R.buttonGap / 2, options.onRetry),
      button('タイトルへ', R.buttonGap / 2, options.onTitle),
    );
    this.visible = false;
  }

  /** 勝敗を表示する。ongoing なら隠す */
  show(outcome: BattleOutcome, exp: number): void {
    this.visible = outcome !== 'ongoing';
    if (outcome === 'victory') {
      this.title.text = '勝利!';
      this.title.style.fill = R.victoryColor;
      this.detail.text = `経験値 +${exp}`;
    } else if (outcome === 'defeat') {
      this.title.text = '敗北…';
      this.title.style.fill = R.defeatColor;
      this.detail.text = 'もう一度挑戦しよう';
    }
  }

  /** 画面の中央に置き、背後を暗くする範囲を指定する(収まらなければ縮小する) */
  layout(center: Point, visibleArea: Rect, safeArea: Rect): void {
    const scale = Math.min(1, (safeArea.width - C.padding * 2) / R.width, (safeArea.height - C.padding * 2) / R.height);
    this.scale.set(Math.max(0.1, scale));
    this.position.set(center.x, center.y);
    this.setBackdrop(visibleArea);
  }
}
