/**
 * BattleEvent[] を「再生の手順」(時刻付きの合図の列)に変える。Pixi・GSAP に依存しない。
 *
 * 描画側(BattleView)は、各合図を at(ミリ秒)の時刻に、durationMs の時間で再生する。
 * 時間はすべて再生全体の速さが 1 のときの値。
 */
import type { BattleEvent, BattleOutcome } from '../../../systems/battle';
import type { BattlePlaybackTimings } from './battleViewConfig';

export type BattleCue =
  /** 味方の攻撃: 敵にダメージの数字を出し、敵の HP を hpAfter まで減らす */
  | {
      readonly type: 'enemyDamaged';
      readonly damage: number;
      readonly hpAfter: number;
      readonly at: number;
      readonly durationMs: number;
    }
  /** 敵の攻撃: 画面を揺らし、味方にダメージの数字を出し、味方の HP を hpAfter まで減らす */
  | {
      readonly type: 'partyDamaged';
      readonly targetId: string;
      readonly damage: number;
      readonly hpAfter: number;
      readonly at: number;
      readonly durationMs: number;
    }
  /** 次の攻撃までの残りターン数を更新する */
  | { readonly type: 'countdown'; readonly turnsUntilAttack: number; readonly at: number; readonly durationMs: number }
  /** 勝敗が決まった(再生の最後に、少し間を置く) */
  | { readonly type: 'outcome'; readonly outcome: Exclude<BattleOutcome, 'ongoing'>; readonly at: number; readonly durationMs: number };

export interface BattlePlayback {
  readonly cues: readonly BattleCue[];
  readonly totalMs: number;
}

/** 出来事を先頭から順に、重ならないように並べる */
export function buildBattlePlayback(events: readonly BattleEvent[], timings: BattlePlaybackTimings): BattlePlayback {
  const cues: BattleCue[] = [];
  let at = 0;
  const push = (cue: BattleCue): void => {
    cues.push(cue);
    at += cue.durationMs;
  };
  for (const event of events) {
    switch (event.type) {
      case 'partyAttack':
        push({ type: 'enemyDamaged', damage: event.damage, hpAfter: event.hpAfter, at, durationMs: timings.partyAttackMs });
        break;
      case 'enemyAttack':
        push({
          type: 'partyDamaged',
          targetId: event.targetId,
          damage: event.damage,
          hpAfter: event.hpAfter,
          at,
          durationMs: timings.enemyAttackMs,
        });
        break;
      case 'enemyCountdown':
        push({ type: 'countdown', turnsUntilAttack: event.turnsUntilAttack, at, durationMs: timings.countdownMs });
        break;
      case 'victory':
      case 'defeat':
        push({ type: 'outcome', outcome: event.type, at, durationMs: timings.outcomeDelayMs });
        break;
      case 'turnStart':
        // 今は表示しない
        break;
    }
  }
  return { cues, totalMs: at };
}
