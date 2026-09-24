/**
 * デモの設定パネル(モーダル): 品質プリセットの切り替えと、マスター音量の調整。
 *
 * - 現在の品質のボタンは無効にする(無効なボタンの見た目の確認用)
 * - 画面に収まらないときは縮小する(拡大縮小された親の中でも、表示どおりに押せることの確認用)
 * - 表示中は背後のボタンやゲーム側(タップでのシーン切り替え)に入力を渡さない
 */
import { Text } from 'pixi.js';
import type { Settings } from '../../../services/settings/Settings';
import { QUALITY_PRESETS, type QualityPreset } from '../../../services/settings/settingsTypes';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { ProgressBar } from '../../ui/ProgressBar';
import type { DemoLayout } from './demoLayout';
import { DEMO_STYLE } from './demoStyle';

const S = DEMO_STYLE.settingsPanel;
const QUALITY_LABEL: Record<QualityPreset, string> = { low: '低', medium: '中', high: '高' };

export class DemoSettingsPanel extends Panel {
  private readonly qualityButtons = new Map<QualityPreset, Button>();
  private readonly volumeBar = new ProgressBar({ width: S.volumeBarWidth, height: S.volumeBarHeight });
  private readonly volumeLabel = new Text({
    text: '',
    style: { fontFamily: DEMO_STYLE.fontFamily, fontSize: DEMO_STYLE.hintFontSize, fill: DEMO_STYLE.textColor },
  });
  private readonly unsubscribe: () => void;

  constructor(private readonly settings: Settings) {
    super({ width: S.width, height: S.height, modal: true });
    this.visible = false;

    const title = new Text({
      text: '設定(モーダル)',
      style: { fontFamily: DEMO_STYLE.fontFamily, fontSize: S.titleFontSize, fill: DEMO_STYLE.textColor },
    });
    title.anchor.set(0.5);
    title.y = S.titleY;
    this.addChild(title);

    QUALITY_PRESETS.forEach((quality, index) => {
      const button = new Button({
        label: `品質 ${QUALITY_LABEL[quality]}`,
        width: S.buttonWidth,
        height: S.buttonHeight,
        onClick: () => settings.setQuality(quality),
      });
      button.position.set((index - 1) * S.qualityGap, S.qualityY);
      this.qualityButtons.set(quality, button);
      this.addChild(button);
    });

    this.volumeLabel.anchor.set(0.5);
    this.volumeLabel.y = S.volumeLabelY;
    this.volumeBar.position.set(-S.volumeBarWidth / 2, S.volumeY - S.volumeBarHeight / 2);
    const down = this.volumeButton('−', -S.volumeButtonX, -S.volumeStep);
    const up = this.volumeButton('+', S.volumeButtonX, S.volumeStep);
    const close = new Button({ label: '閉じる', width: S.buttonWidth, height: S.buttonHeight, onClick: () => this.close() });
    close.y = S.closeY;
    this.addChild(this.volumeLabel, this.volumeBar, down, up, close);

    this.unsubscribe = settings.onChange(() => this.refresh());
    this.refresh();
  }

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }

  /** セーフエリアの中央に置き、収まらなければ縮小する。背後は画面全体を暗くする */
  layoutIn(layout: DemoLayout): void {
    const safe = layout.safeArea;
    const scale = Math.min(1, (safe.width - S.margin * 2) / S.width, (safe.height - S.margin * 2) / S.height);
    this.scale.set(Math.max(scale, 0.1));
    this.position.set(safe.x + safe.width / 2, safe.y + safe.height / 2);
    this.setBackdrop(layout.visibleArea);
  }

  override destroy(options?: Parameters<Panel['destroy']>[0]): void {
    this.unsubscribe();
    super.destroy(options);
  }

  private volumeButton(label: string, x: number, step: number): Button {
    const button = new Button({
      label,
      width: S.smallButtonWidth,
      height: S.buttonHeight,
      onClick: () => this.settings.setVolume('master', this.settings.volume('master') + step),
    });
    button.position.set(x, S.volumeY);
    return button;
  }

  private refresh(): void {
    for (const [quality, button] of this.qualityButtons) {
      button.enabled = quality !== this.settings.quality;
    }
    const volume = this.settings.volume('master');
    this.volumeBar.progress = volume;
    this.volumeLabel.text = `マスター音量 ${Math.round(volume * 100)}%`;
  }
}
