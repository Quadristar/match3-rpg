/**
 * バトル画面(Phase 4b: 盤面・敵・HP・勝敗の最小限の表示)。
 *
 * - パズルとバトルの計算は BattleSession(systems/session)が行い、この画面は結果を再生するだけ
 * - 再生の順番: 盤面の連鎖(BoardView)→ バトルの出来事(BattleView)→ 勝敗が決まっていれば結果の表示
 * - 盤面の再生からバトルの出来事の再生が終わるまで、入力を受け付けない
 * - 画面の回転などでレイアウトが変わったら、再生を即座に終えて、最新の状態から描き直す
 * - ?seed=数値 で盤面のシードを固定できる(「もう一度」でも同じシードで始める)。
 *   ?debug のときは、各領域の枠と名前・シードを表示する
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { InputEvent } from '../../../services/input/inputTypes';
import type { Cell } from '../../../systems/puzzle';
import { BattleSession } from '../../../systems/session';
import { LayoutRegionsOverlay } from '../../debug/LayoutRegionsOverlay';
import { parseDebugOptions } from '../../debug/debugOptions';
import type { GameManifest } from '../../game/gameAssets';
import type { GameLayout } from '../../game/gameLayout';
import type { GameSave } from '../../game/gameSave';
import type { SceneKey } from '../../game/sceneKeys';
import { parseGameUrlOptions, randomSeed } from '../../game/urlOptions';
import { Button } from '../../ui/Button';
import { buildBattlePlayback } from '../../views/battle/battlePlaybackPlan';
import { BattleView } from '../../views/battle/BattleView';
import { BATTLE_VIEW_CONFIG } from '../../views/battle/battleViewConfig';
import { ResultOverlay } from '../../views/battle/ResultOverlay';
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

  /** ?seed で固定したシード(なければ null。「もう一度」のたびにランダムなシードで始める) */
  private readonly fixedSeed: number | null;
  private session: BattleSession;
  private readonly boardView = new BoardView();
  private readonly battleView: BattleView;
  private readonly controller = new BoardInputController(BOARD_VIEW_CONFIG.dragThresholdRatio);
  private geometry: BoardGeometry | null = null;

  private readonly comboText = new Text({
    text: '',
    style: { fontFamily: S.fontFamily, fontSize: S.comboFontSize, fill: S.textColor },
  });
  private readonly backButton: Button;
  private readonly resultOverlay: ResultOverlay;
  private readonly debugOverlay: LayoutRegionsOverlay | null;
  private readonly debugText: Text | null;

  constructor(private readonly context: SceneContext<SceneKey, GameManifest, GameSave>) {
    const search = window.location.search;
    this.fixedSeed = parseGameUrlOptions(search).seed;
    this.session = new BattleSession({ seed: this.fixedSeed ?? randomSeed() });
    const state = this.session.battle;
    this.battleView = new BattleView({
      enemyName: state.enemy.name,
      partyName: state.party[0]?.name ?? '',
      shakeTarget: this.root,
    });
    this.backButton = new Button({
      label: S.backButton.label,
      width: S.backButton.width,
      height: S.backButton.height,
      fontSize: S.backButton.fontSize,
      onClick: () => this.context.changeScene('title'),
    });
    this.resultOverlay = new ResultOverlay({
      onRetry: () => this.restart(),
      onTitle: () => this.context.changeScene('title'),
    });
    const debug = parseDebugOptions(search).enabled;
    this.debugOverlay = debug ? new LayoutRegionsOverlay(['main']) : null;
    this.debugText = debug
      ? new Text({ text: '', style: { fontFamily: S.fontFamily, fontSize: S.debugFontSize, fill: S.subTextColor } })
      : null;
  }

  enter(): void {
    this.comboText.anchor.set(0, 0.5);
    this.root.addChild(this.battleView, this.boardView, this.comboText, this.backButton);
    if (this.debugOverlay !== null) this.root.addChild(this.debugOverlay);
    if (this.debugText !== null) {
      this.debugText.anchor.set(0, 0.5);
      this.root.addChild(this.debugText);
    }
    // 結果の表示はいちばん手前(モーダルで背後の操作を止める)
    this.root.addChild(this.resultOverlay);
    this.showSession();
    this.context.input.on((event) => this.onInput(event));
  }

  exit(): void {
    // 再生中のアニメーションを止める(表示物の破棄と入力の解除は SceneManager が行う)
    this.boardView.stop();
    this.battleView.stop();
  }

  update(): void {
    // 再生は GSAP が進める
  }

  resize(layout: GameLayout): void {
    this.background.clear().rect(0, 0, layout.screen.width, layout.screen.height).fill(S.screenColor);
    // 回転などで配置が変わったら、再生を即座に終えてから描き直す。
    // 盤面を先に終える(盤面の完了でバトルの再生が始まるため)→ バトルを終える → 結果の表示
    this.geometry = new BoardGeometry(layout.regions.board, this.session.board.rows, this.session.board.cols);
    this.boardView.layout(this.geometry);
    this.battleView.layout(layout.regions.enemy, layout.regions.portrait);
    this.applyIntents(this.controller.reset());

    const { comboText, backButton, center } = layout.anchors;
    this.comboText.position.set(comboText.x, comboText.y);
    this.backButton.position.set(backButton.x, backButton.y);
    this.resultOverlay.layout(center, layout.visibleArea, layout.regions.main);
    this.debugText?.position.set(comboText.x, comboText.y + S.debugTextOffsetY);
    this.debugOverlay?.draw(layout);
  }

  /** 再生中か(盤面・バトルのどちらか) */
  private get busy(): boolean {
    return this.boardView.isPlaying || this.battleView.isPlaying;
  }

  private onInput(event: InputEvent): void {
    if (this.geometry === null || this.busy || this.session.isOver) {
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

  /** 入れ替えを計算し、盤面の連鎖 → バトルの出来事の順に再生する */
  private swap(a: Cell, b: Cell): void {
    const result = this.session.swap(a, b);
    if (result === null) {
      return;
    }
    const plan = buildPlaybackPlan(result.boardBefore, result.move, BOARD_VIEW_CONFIG.timings);
    const battle = buildBattlePlayback(result.turn.events, BATTLE_VIEW_CONFIG.timings);
    const stateAfter = this.session.battle;
    this.boardView.play(plan, {
      onCombo: (combo) => this.showCombo(combo),
      onComplete: () =>
        this.battleView.play(battle, stateAfter, { onComplete: () => this.showOutcome() }),
    });
  }

  /** 戦闘をやり直す(?seed があれば同じシード、なければ新しいシード) */
  private restart(): void {
    this.boardView.stop();
    this.battleView.stop();
    this.session = new BattleSession({ seed: this.fixedSeed ?? randomSeed() });
    this.applyIntents(this.controller.reset());
    this.showSession();
  }

  /** 現在のセッションの状態を、再生なしで表示する */
  private showSession(): void {
    this.boardView.setBoard(this.session.board);
    this.battleView.sync(this.session.battle);
    this.showCombo(null);
    this.showOutcome();
    if (this.debugText !== null) this.debugText.text = `seed: ${this.session.seed}`;
  }

  /** 勝敗が決まっていれば結果を表示する */
  private showOutcome(): void {
    const state = this.session.battle;
    this.resultOverlay.show(state.outcome, state.enemy.exp);
  }

  /** 連鎖の段数を表示する(動作確認用) */
  private showCombo(combo: number | null): void {
    this.comboText.text = combo === null ? '連鎖: -' : `連鎖: ${combo}`;
  }
}
