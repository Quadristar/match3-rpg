/**
 * デモシーンA: レイアウト定義の確認用。
 *
 * - 余白を含む画面全体(背景)、論理解像度の範囲、セーフエリアを色分けして表示する
 * - レイアウト定義の領域を枠線と名前で、基準点を点と名前で表示する
 * - レンダラ名・画面サイズ・devicePixelRatio・向きなどを info 領域に表示する
 * - バンドル demoA の画像を表示する(このシーンに入るときに読み込まれ、出るときに解放される)
 * - タップ回数(保存され、再読み込み後も残る)と、最後のスワイプの方向・開始位置を表示する
 * - 画面をタップするとデモシーンBへ切り替える
 * - 「設定パネル」ボタンでモーダルの設定パネルを開く(ボタンやパネルへのタップではシーンを切り替えない)
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { InputEvent, SwipeEvent } from '../../../services/input/inputTypes';
import { Button } from '../../ui/Button';
import type { Scene, SceneContext } from '../Scene';
import type { DemoManifest } from './demoAssets';
import { addTap, type DemoSave } from './demoSave';
import { DemoSettingsPanel } from './DemoSettingsPanel';
import type { DemoLayout } from './demoLayout';
import { fitPicture } from './fitPicture';
import { DEMO_STYLE } from './demoStyle';
import type { DemoSceneKey } from './demoSceneKeys';

const S = DEMO_STYLE;
const COLORS = S.sceneA;

const ORIENTATION_LABEL = { portrait: '縦', landscape: '横' } as const;
const DIRECTION_LABEL = { up: '↑ 上', down: '↓ 下', left: '← 左', right: '→ 右' } as const;

/** 小数を最大2桁で表示する */
function round2(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function label(text: string, color: number, fontSize: number = S.labelFontSize): Text {
  return new Text({ text, style: { fontFamily: S.fontFamily, fontSize, fill: color } });
}

export class DemoSceneA implements Scene<DemoLayout, DemoManifest> {
  readonly bundles = ['demoA'] as const;
  readonly root = new Container({ label: 'DemoSceneA' });
  readonly background = new Graphics({ label: 'DemoSceneA.background' });

  private readonly guides = new Graphics();
  /** 最後のスワイプの軌跡(開始位置の点と、終了位置への線) */
  private readonly swipeMark = new Graphics();
  private readonly labels = new Container();
  private readonly info = new Text({
    text: '',
    style: { fontFamily: S.fontFamily, fontSize: S.infoFontSize, lineHeight: S.infoLineHeight, fill: S.subTextColor },
  });
  private readonly title = label('Demo A', S.textColor, S.titleFontSize);
  private readonly hint = label('タップで Demo B へ', S.textColor, S.hintFontSize);
  private picture: Sprite | null = null;
  private panel: DemoSettingsPanel | null = null;
  private readonly openButton = new Button({
    label: '設定パネル',
    width: S.settingsPanel.openButtonWidth,
    height: S.settingsPanel.openButtonHeight,
    onClick: () => this.panel?.open(),
  });
  private lastSwipe: SwipeEvent | null = null;
  private layout: DemoLayout | null = null;

  constructor(private readonly context: SceneContext<DemoSceneKey, DemoManifest, DemoSave>) {}

  enter(): void {
    this.title.anchor.set(0.5);
    this.hint.anchor.set(0.5);
    // bundles の読み込みは enter の前に完了している
    this.picture = new Sprite(this.context.assets.get('demoA', 'shapes'));
    this.picture.anchor.set(0.5);
    // 名前のラベルは最前面に置く
    this.root.addChild(this.guides, this.picture, this.swipeMark, this.info, this.title, this.hint, this.labels);
    // ボタンとパネルは最前面(パネルはボタンより手前)
    this.panel = new DemoSettingsPanel(this.context.settings);
    this.root.addChild(this.openButton, this.panel);

    // 入力の登録は exit の後に自動で解除されるため、解除の処理は書かなくてよい
    this.context.input.on((event) => this.onInput(event));
  }

  exit(): void {
    // 入力の解除・表示物の破棄は SceneManager が行う
  }

  private onInput(event: InputEvent): void {
    if (event.type === 'tap') {
      addTap(this.context.save);
      this.context.changeScene('demoB');
    } else if (event.type === 'swipe') {
      this.lastSwipe = event;
      this.drawSwipe(event);
      if (this.layout !== null) {
        this.info.text = this.infoText(this.layout);
      }
    }
  }

  private drawSwipe(swipe: SwipeEvent): void {
    this.swipeMark
      .clear()
      .moveTo(swipe.start.x, swipe.start.y)
      .lineTo(swipe.end.x, swipe.end.y)
      .stroke({ width: S.lineWidth * 2, color: COLORS.swipeColor })
      .circle(swipe.start.x, swipe.start.y, S.anchorRadius * 2)
      .fill(COLORS.swipeColor);
  }

  update(): void {
    // 動きのある表示はないため何もしない
  }

  resize(layout: DemoLayout): void {
    this.layout = layout;
    // 向きが変わると論理座標も変わるため、スワイプの軌跡は消す
    this.swipeMark.clear();
    this.background.clear().rect(0, 0, layout.screen.width, layout.screen.height).fill(COLORS.screenColor);
    this.drawGuides(layout);
    this.drawLabels(layout);

    const infoOrigin = layout.anchors.infoTopLeft;
    // 基準点の名前と重ならないよう、ラベル1行分下げる
    this.info.position.set(infoOrigin.x + S.infoPadding, infoOrigin.y + S.infoPadding + S.labelFontSize);
    this.info.text = this.infoText(layout);
    this.title.position.set(layout.anchors.center.x, layout.anchors.center.y);
    this.openButton.position.set(layout.anchors.button.x, layout.anchors.button.y);
    this.panel?.layoutIn(layout);
    if (this.picture !== null) {
      fitPicture(this.picture, layout.anchors.picture, layout.regions.main, S.pictureRatio);
    }
    this.hint.position.set(layout.anchors.hint.x, layout.anchors.hint.y);
  }

  /** 論理解像度の範囲・セーフエリア・領域・基準点を描く */
  private drawGuides(layout: DemoLayout): void {
    const g = this.guides.clear();
    const { width, height } = layout.logical;
    g.rect(0, 0, width, height).fill(COLORS.logicalColor).stroke({ width: S.lineWidth, color: COLORS.logicalBorderColor });

    const safe = layout.safeArea;
    g.rect(safe.x, safe.y, safe.width, safe.height).stroke({ width: S.lineWidth, color: COLORS.safeAreaColor });

    for (const region of Object.values(layout.regions)) {
      g.rect(region.x, region.y, region.width, region.height).stroke({ width: S.lineWidth, color: COLORS.regionColor });
    }
    for (const anchor of Object.values(layout.anchors)) {
      g.circle(anchor.x, anchor.y, S.anchorRadius).fill(COLORS.anchorColor);
    }
  }

  /** 領域・基準点・セーフエリアの名前を置く(毎回作り直し、古いものは破棄する) */
  private drawLabels(layout: DemoLayout): void {
    for (const old of this.labels.removeChildren()) {
      old.destroy();
    }
    const pad = S.labelPadding;

    const safeLabel = label('safeArea', COLORS.safeAreaColor);
    safeLabel.anchor.set(1, 1);
    safeLabel.position.set(layout.safeArea.x + layout.safeArea.width - pad, layout.safeArea.y + layout.safeArea.height - pad);
    this.labels.addChild(safeLabel);

    for (const [name, region] of Object.entries(layout.regions)) {
      const text = label(name, COLORS.regionColor);
      text.anchor.set(1, 0);
      text.position.set(region.x + region.width - pad, region.y + pad);
      this.labels.addChild(text);
    }
    for (const [name, anchor] of Object.entries(layout.anchors)) {
      // 点の右上に置く。画面の上端からはみ出す場合は右下に置く
      const text = label(name, COLORS.anchorColor);
      const above = anchor.y - S.anchorRadius - text.height >= layout.visibleArea.y;
      text.anchor.set(0, above ? 1 : 0);
      text.position.set(anchor.x + S.anchorRadius, above ? anchor.y - S.anchorRadius : anchor.y + S.anchorRadius);
      this.labels.addChild(text);
    }
  }

  private infoText(layout: DemoLayout): string {
    const safe = layout.safeArea;
    return [
      `Renderer: ${this.context.renderer.name}`,
      `Screen: ${Math.round(layout.screen.width)} × ${Math.round(layout.screen.height)}`,
      `DPR: ${round2(window.devicePixelRatio)} (描画解像度 ${round2(this.context.renderer.resolution)})`,
      `Orientation: ${ORIENTATION_LABEL[layout.orientation]}`,
      `Logical: ${layout.logical.width} × ${layout.logical.height} (×${round2(layout.scale)})`,
      `SafeArea: ${Math.round(safe.x)}, ${Math.round(safe.y)}, ${Math.round(safe.width)} × ${Math.round(safe.height)}`,
      `Tap: ${this.context.save.get().tapCount} 回(保存)`,
      `Swipe: ${this.swipeText()}`,
    ].join('\n');
  }

  private swipeText(): string {
    const swipe = this.lastSwipe;
    if (swipe === null) {
      return '(まだありません)';
    }
    return `${DIRECTION_LABEL[swipe.direction]}(開始 ${Math.round(swipe.start.x)}, ${Math.round(swipe.start.y)})`;
  }
}
