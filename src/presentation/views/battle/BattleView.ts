/**
 * バトルの表示と、再生の手順(BattlePlayback)の再生。
 *
 * - 再生は GSAP のタイムラインで行う。全体の速さは盤面と同じ PLAYBACK_CONFIG.speed(setPlaybackSpeed で変更可)
 * - 味方の攻撃: 敵が光り、ダメージの数字がふわっと出て消え、敵の HP バーが減る
 * - 敵の攻撃: 画面(shakeTarget)が少し揺れ、味方にダメージの数字が出て、味方の HP バーが減る
 * - finishNow() で再生を即座に終え、最新の状態(play に渡した state)から描き直す(回転時など)
 */
import { gsap } from 'gsap';
import { Container, type DestroyOptions, Text } from 'pixi.js';
import type { Point, Rect } from '../../../services/layout/layoutTypes';
import type { BattleState } from '../../../systems/battle';
import { PLAYBACK_CONFIG } from '../playbackConfig';
import type { BattleCue, BattlePlayback } from './battlePlaybackPlan';
import { BATTLE_VIEW_CONFIG } from './battleViewConfig';
import { EnemyPanel } from './EnemyPanel';
import { PartyPanel } from './PartyPanel';

const C = BATTLE_VIEW_CONFIG;

export interface BattleViewOptions {
  readonly enemyName: string;
  readonly partyName: string;
  /** 敵の攻撃で揺らす表示物(シーンの root など)。揺れの後は位置 (0, 0) に戻す */
  readonly shakeTarget: Container;
}

export interface BattlePlaybackCallbacks {
  /** 再生が終わったとき(finishNow で即座に終えた場合も呼ぶ) */
  readonly onComplete?: () => void;
}

export class BattleView extends Container {
  private readonly enemyPanel: EnemyPanel;
  private readonly partyPanel: PartyPanel;
  private readonly damageLayer = new Container({ label: 'BattleView.damage' });
  private readonly damageTexts = new Set<Text>();
  private timeline: gsap.core.Timeline | null = null;
  private playing: { readonly state: BattleState; readonly callbacks: BattlePlaybackCallbacks } | null = null;
  private state: BattleState | null = null;
  private speed: number = PLAYBACK_CONFIG.speed;

  constructor(private readonly options: BattleViewOptions) {
    super({ label: 'BattleView' });
    this.enemyPanel = new EnemyPanel(options.enemyName);
    this.partyPanel = new PartyPanel(options.partyName);
    this.addChild(this.enemyPanel, this.partyPanel, this.damageLayer);
  }

  get isPlaying(): boolean {
    return this.playing !== null;
  }

  /** 配置を変える。再生中なら即座に終えてから描き直す */
  layout(enemyRegion: Rect, partyRegion: Rect): void {
    this.finishNow();
    this.enemyPanel.layout(enemyRegion);
    this.partyPanel.layout(partyRegion);
    if (this.state !== null) {
      this.sync(this.state);
    }
  }

  /** 状態を即座に表示する(再生中なら止める) */
  sync(state: BattleState): void {
    this.state = state;
    this.enemyPanel.hpBar.setHp(state.enemy.hp, state.enemy.maxHp);
    this.enemyPanel.setCountdown(state.enemy.turnsUntilAttack);
    const leader = state.party[0];
    if (leader !== undefined) {
      this.partyPanel.hpBar.setHp(leader.hp, leader.maxHp);
    }
  }

  /** 再生全体の速さを変える(1 が標準)。再生中にも反映する */
  setPlaybackSpeed(speed: number): void {
    this.speed = speed;
    this.timeline?.timeScale(speed);
  }

  /** 再生を始める。state は再生が終わった後の状態(即座に終えるときもこの状態を描く) */
  play(playback: BattlePlayback, state: BattleState, callbacks: BattlePlaybackCallbacks = {}): void {
    this.finishNow();
    if (playback.cues.length === 0) {
      this.sync(state);
      callbacks.onComplete?.();
      return;
    }
    this.playing = { state, callbacks };
    const timeline = gsap.timeline({ onComplete: () => this.complete() });
    timeline.timeScale(this.speed);
    let enemyHp = this.enemyPanel.hpBar.hp;
    let partyHp = this.partyPanel.hpBar.hp;
    for (const cue of playback.cues) {
      const at = cue.at / 1000;
      const duration = cue.durationMs / 1000;
      switch (cue.type) {
        case 'enemyDamaged':
          this.flashEnemy(timeline, at, duration);
          this.damageNumber(timeline, cue, this.enemyPanel.center, C.damageNumber.enemyColor, at, duration);
          this.tweenHp(timeline, this.enemyPanel, enemyHp, cue.hpAfter, at, duration);
          enemyHp = cue.hpAfter;
          break;
        case 'partyDamaged':
          this.shake(timeline, at, duration);
          this.damageNumber(timeline, cue, this.partyPanel.damagePoint, C.damageNumber.partyColor, at, duration);
          this.tweenHp(timeline, this.partyPanel, partyHp, cue.hpAfter, at, duration);
          partyHp = cue.hpAfter;
          break;
        case 'countdown': {
          const turns = cue.turnsUntilAttack;
          timeline.call(() => this.enemyPanel.setCountdown(turns), undefined, at);
          break;
        }
        case 'outcome':
          // 間を置くだけ(勝敗の表示は再生の完了後にシーンが行う)
          timeline.to({}, { duration }, at);
          break;
      }
    }
    this.timeline = timeline;
  }

  /** 再生中なら即座に終え、最新の状態から描き直す */
  finishNow(): void {
    if (this.playing !== null) {
      this.complete();
    }
  }

  /** 再生を止める(描き直さない。シーンの終了時用) */
  stop(): void {
    this.halt();
    // 揺れの対象(シーンの root)は、シーンの終了時には先に破棄されていることがある
    const target = this.options.shakeTarget;
    if (!target.destroyed) {
      target.position.set(0, 0);
    }
    this.enemyPanel.body.alpha = 1;
  }

  /**
   * 破棄する。揺れの対象には触らない(シーンの root の破棄の途中で呼ばれ、root の位置はもう使えないため)
   */
  override destroy(options?: DestroyOptions): void {
    this.halt();
    super.destroy(options);
  }

  /** タイムラインとダメージの数字だけを止める */
  private halt(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.playing = null;
    this.clearDamageTexts();
  }

  private complete(): void {
    const playing = this.playing;
    this.stop();
    if (playing === null) {
      return;
    }
    this.sync(playing.state);
    playing.callbacks.onComplete?.();
  }

  private flashEnemy(timeline: gsap.core.Timeline, at: number, duration: number): void {
    const body = this.enemyPanel.body;
    timeline.to(body, { alpha: 0.3, duration: duration / 6, yoyo: true, repeat: 1 }, at);
  }

  private shake(timeline: gsap.core.Timeline, at: number, duration: number): void {
    const target = this.options.shakeTarget;
    const { amplitude, count } = C.shake;
    const step = duration / 2 / count;
    for (let i = 0; i < count; i++) {
      const direction = i % 2 === 0 ? 1 : -1;
      const fade = 1 - i / count;
      timeline.to(target, { x: amplitude * direction * fade, duration: step }, at + step * i);
    }
    timeline.to(target, { x: 0, duration: step }, at + step * count);
  }

  private tweenHp(
    timeline: gsap.core.Timeline,
    panel: EnemyPanel | PartyPanel,
    from: number,
    to: number,
    at: number,
    duration: number,
  ): void {
    const proxy = { hp: from };
    timeline.to(
      proxy,
      { hp: to, duration: duration / 2, ease: 'power1.out', onUpdate: () => panel.hpBar.setHp(proxy.hp) },
      at + duration / 4,
    );
  }

  private damageNumber(
    timeline: gsap.core.Timeline,
    cue: Extract<BattleCue, { damage: number }>,
    point: Point,
    color: number,
    at: number,
    duration: number,
  ): void {
    const text = new Text({
      text: String(cue.damage),
      style: { fontFamily: C.fontFamily, fontSize: C.damageNumber.fontSize, fill: color, fontWeight: 'bold' },
    });
    text.anchor.set(0.5);
    text.position.set(point.x, point.y);
    text.alpha = 0;
    this.damageLayer.addChild(text);
    this.damageTexts.add(text);
    timeline.to(text, { alpha: 1, duration: duration / 6 }, at);
    timeline.to(text, { y: point.y - C.damageNumber.rise, duration, ease: 'power1.out' }, at);
    timeline.to(text, { alpha: 0, duration: duration / 3 }, at + (duration * 2) / 3);
    timeline.call(() => this.removeDamageText(text), undefined, at + duration);
  }

  private removeDamageText(text: Text): void {
    if (this.damageTexts.delete(text)) {
      gsap.killTweensOf(text);
      text.destroy();
    }
  }

  private clearDamageTexts(): void {
    for (const text of [...this.damageTexts]) {
      this.removeDamageText(text);
    }
  }
}
