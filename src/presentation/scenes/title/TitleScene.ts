/**
 * タイトル画面(仮)。「(仮)タイトル」を表示し、タップでバトル画面へ移る。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { GameManifest } from '../../game/gameAssets';
import type { GameLayout } from '../../game/gameLayout';
import type { GameSave } from '../../game/gameSave';
import type { SceneKey } from '../../game/sceneKeys';
import type { Scene, SceneContext } from '../Scene';
import { TITLE_STYLE } from './titleStyle';

export class TitleScene implements Scene<GameLayout, GameManifest> {
  readonly root = new Container({ label: 'TitleScene' });
  readonly background = new Graphics({ label: 'TitleScene.background' });
  private readonly title = new Text({
    text: TITLE_STYLE.text,
    style: { fontFamily: TITLE_STYLE.fontFamily, fontSize: TITLE_STYLE.fontSize, fill: TITLE_STYLE.textColor },
  });
  private readonly hint = new Text({
    text: TITLE_STYLE.hint,
    style: { fontFamily: TITLE_STYLE.fontFamily, fontSize: TITLE_STYLE.hintFontSize, fill: TITLE_STYLE.hintColor },
  });

  constructor(private readonly context: SceneContext<SceneKey, GameManifest, GameSave>) {}

  enter(): void {
    this.title.anchor.set(0.5);
    this.hint.anchor.set(0.5);
    this.root.addChild(this.title, this.hint);
    this.context.input.on((event) => {
      if (event.type === 'tap') {
        this.context.changeScene('battle');
      }
    });
  }

  exit(): void {
    // 入力の解除・表示物の破棄は SceneManager が行う
  }

  update(): void {
    // 毎フレームの処理はまだない
  }

  resize(layout: GameLayout): void {
    this.background.clear().rect(0, 0, layout.screen.width, layout.screen.height).fill(TITLE_STYLE.screenColor);

    // 幅が main 領域に収まらない場合だけ縮小する(拡大はしない)
    const maxWidth = layout.regions.main.width * TITLE_STYLE.maxWidthRatio;
    for (const text of [this.title, this.hint]) {
      const naturalWidth = text.width / text.scale.x;
      text.scale.set(Math.min(1, maxWidth / naturalWidth));
    }
    const { x, y } = layout.anchors.center;
    this.title.position.set(x, y);
    this.hint.position.set(x, y + TITLE_STYLE.hintOffsetY);
  }
}
