/**
 * タイトル画面(仮)。「(仮)タイトル」と表示するだけ。
 * 操作やシーン遷移は、ゲームループを作る段階で追加する
 * (そのときに SceneContext をコンストラクタで受け取る)。
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { GameManifest } from '../../game/gameAssets';
import type { GameLayout } from '../../game/gameLayout';
import type { Scene } from '../Scene';
import { TITLE_STYLE } from './titleStyle';

export class TitleScene implements Scene<GameLayout, GameManifest> {
  readonly root = new Container({ label: 'TitleScene' });
  readonly background = new Graphics({ label: 'TitleScene.background' });
  private readonly title = new Text({
    text: TITLE_STYLE.text,
    style: { fontFamily: TITLE_STYLE.fontFamily, fontSize: TITLE_STYLE.fontSize, fill: TITLE_STYLE.textColor },
  });

  enter(): void {
    this.title.anchor.set(0.5);
    this.root.addChild(this.title);
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
    const naturalWidth = this.title.width / this.title.scale.x;
    this.title.scale.set(Math.min(1, maxWidth / naturalWidth));
    this.title.position.set(layout.anchors.center.x, layout.anchors.center.y);
  }
}
