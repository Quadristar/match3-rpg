/**
 * バトル画面(Phase 3b の時点では、中身は盤面だけ)。
 *
 * - 盤面の生成と入れ替えは systems/puzzle が行い、この画面は結果を再生するだけ
 * - 入れ替えの操作は BoardInputController(ドラッグ・2回タップ)。再生中の操作は受け付けない
 * - 画面の回転などでレイアウトが変わったら、再生を即座に終えて描き直す
 * - ?seed=数値 で盤面のシードを固定できる。?debug のときは、各領域の枠と名前・シードを表示する
 * - 仮の「タイトルへ」ボタンでタイトル画面に戻る
 */
import { Container, Graphics, Text } from 'pixi.js';
import { SeededRng } from '../../../core/SeededRng';
import type { InputEvent } from '../../../services/input/inputTypes';
import { type BoardState, generateBoard, resolveMove } from '../../../systems/puzzle';
import { LayoutRegionsOverlay } from '../../debug/LayoutRegionsOverlay';
import { parseDebugOptions } from '../../debug/debugOptions';
import type { GameManifest } from '../../game/gameAssets';
import type { GameLayout } from '../../game/gameLayout';
import type { GameSave } from '../../game/gameSave';
import type { SceneKey } from '../../game/sceneKeys';
import { parseGameUrlOptions, randomSeed } from '../../game/urlOptions';
import { Button } from '../../ui/Button';
import { BoardGeometry } from '../../views/board/BoardGeometry';
import { type BoardIntent, BoardInputController } from '../../views/board/BoardInputController';
import { BoardView } from '../../views/board/BoardView';
import { BOARD_VIEW_CONFIG } from '../../views/board/boardViewConfig';
import { buildPlaybackPlan } from '../../views/board/playbackPlan';
import type { Scene, SceneContext } from '../Scene';
import { BATTLE_STYLE as S } from './battleStyle';

export class BattleScene implements Scene<GameLayout, GameManifest> {
  readonly root = new Container({ label: 'BattleScene' });
  readonly background = new Graphics({ label: 'BattleScene.background' });

  private readonly seed: number;
  private readonly rng: SeededRng;
  /** 盤面の状態(ロジック側)。再生中も、再生後の盤面を持つ */
  private board: BoardState;
  private readonly boardView = new BoardView();
  private readonly controller = new BoardInputController(BOARD_VIEW_CONFIG.dragThresholdRatio);
  private geometry: BoardGeometry | null = null;

  private readonly comboText = new Text({
    text: '',
    style: { fontFamily: S.fontFamily, fontSize: S.comboFontSize, fill: S.textColor },
  });
  private readonly backButton: Button;
  private readonly debugOverlay: LayoutRegionsOverlay | null;
  private readonly debugText: Text | null;

  constructor(private readonly context: SceneContext<SceneKey, GameManifest, GameSave>) {
    const search = window.location.search;
    this.seed = parseGameUrlOptions(search).seed ?? randomSeed();
    this.rng = new SeededRng(this.seed);
    this.board = generateBoard(this.rng);

    this.backButton = new Button({
      label: S.backButton.label,
      width: S.backButton.width,
      height: S.backButton.height,
      fontSize: S.backButton.fontSize,
      onClick: () => this.context.changeScene('title'),
    });
    const debug = parseDebugOptions(search).enabled;
    this.debugOverlay = debug ? new LayoutRegionsOverlay(['main']) : null;
    this.debugText = debug
      ? new Text({
          text: `seed: ${this.seed}`,
          style: { fontFamily: S.fontFamily, fontSize: S.debugFontSize, fill: S.subTextColor },
        })
      : null;
  }

  enter(): void {
    this.comboText.anchor.set(0, 0.5);
    this.showCombo(null);
    this.root.addChild(this.boardView, this.comboText, this.backButton);
    if (this.debugOverlay !== null) this.root.addChild(this.debugOverlay);
    if (this.debugText !== null) {
      this.debugText.anchor.set(0, 0.5);
      this.root.addChild(this.debugText);
    }
    this.boardView.setBoard(this.board);
    this.context.input.on((event) => this.onInput(event));
  }

  exit(): void {
    // 再生中のアニメーションを止める(表示物の破棄と入力の解除は SceneManager が行う)
    this.boardView.stop();
  }

  update(): void {
    // 再生は GSAP が進める
  }

  resize(layout: GameLayout): void {
    this.background.clear().rect(0, 0, layout.screen.width, layout.screen.height).fill(S.screenColor);
    // 回転などで配置が変わったら、再生を即座に終えてから描き直す(layout の中で行う)
    this.geometry = new BoardGeometry(layout.regions.board, this.board.rows, this.board.cols);
    this.boardView.layout(this.geometry);
    this.applyIntents(this.controller.reset());

    const { comboText, backButton } = layout.anchors;
    this.comboText.position.set(comboText.x, comboText.y);
    this.backButton.position.set(backButton.x, backButton.y);
    this.debugText?.position.set(comboText.x, comboText.y + S.debugTextOffsetY);
    this.debugOverlay?.draw(layout);
  }

  private onInput(event: InputEvent): void {
    if (this.geometry === null || this.boardView.isPlaying) {
      return;
    }
    this.applyIntents(this.controller.handle(event, this.geometry));
  }

  private applyIntents(intents: readonly BoardIntent[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'select':
          this.boardView.setSelected(intent.cell);
          break;
        case 'deselect':
          this.boardView.setSelected(null);
          break;
        case 'swap':
          this.swap(intent.a, intent.b);
          break;
      }
    }
  }

  /** 入れ替えを計算し、結果を再生する */
  private swap(a: { row: number; col: number }, b: { row: number; col: number }): void {
    const before = this.board;
    const result = resolveMove(before, a, b, this.rng);
    const plan = buildPlaybackPlan(before, result, BOARD_VIEW_CONFIG.timings);
    this.board = plan.finalBoard;
    this.boardView.play(plan, { onCombo: (combo) => this.showCombo(combo) });
  }

  /** 連鎖の段数を表示する(動作確認用) */
  private showCombo(combo: number | null): void {
    this.comboText.text = combo === null ? '連鎖: -' : `連鎖: ${combo}`;
  }
}
