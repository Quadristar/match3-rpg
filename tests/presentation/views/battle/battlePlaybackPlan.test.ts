import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../../../src/systems/session';
import { ENEMIES } from '../../../../src/data/enemies';
import { DEFAULT_BATTLE_DATA } from '../../../../src/systems/battle';
import type { BattleEvent } from '../../../../src/systems/battle';
import { findMoves } from '../../../../src/systems/puzzle';
import { buildBattlePlayback } from '../../../../src/presentation/views/battle/battlePlaybackPlan';

const TIMINGS = { partyAttackMs: 100, enemyAttackMs: 200, countdownMs: 10, outcomeDelayMs: 50 };

describe('buildBattlePlayback', () => {
  it('出来事がなければ空', () => {
    expect(buildBattlePlayback([], TIMINGS)).toEqual({ cues: [], totalMs: 0 });
  });

  it('出来事の順に、重ならないように時刻を並べる(ターンの始まりは表示しない)', () => {
    const events: BattleEvent[] = [
      { type: 'turnStart', turn: 3 },
      { type: 'partyAttack', actorId: 'hero', targetId: 'e', hits: [], rawTotal: 30, damage: 30, hpBefore: 300, hpAfter: 270 },
      { type: 'enemyAttack', actorId: 'e', targetId: 'hero', damage: 20, hpBefore: 100, hpAfter: 80 },
      { type: 'enemyCountdown', enemyId: 'e', turnsUntilAttack: 3 },
    ];
    expect(buildBattlePlayback(events, TIMINGS)).toEqual({
      cues: [
        { type: 'enemyDamaged', damage: 30, hpAfter: 270, at: 0, durationMs: 100 },
        { type: 'partyDamaged', targetId: 'hero', damage: 20, hpAfter: 80, at: 100, durationMs: 200 },
        { type: 'countdown', turnsUntilAttack: 3, at: 300, durationMs: 10 },
      ],
      totalMs: 310,
    });
  });

  it('勝敗は最後に、少し間を置く合図になる', () => {
    const events: BattleEvent[] = [
      { type: 'partyAttack', actorId: 'hero', targetId: 'e', hits: [], rawTotal: 30, damage: 30, hpBefore: 30, hpAfter: 0 },
      { type: 'victory', enemyId: 'e', exp: 50 },
    ];
    expect(buildBattlePlayback(events, TIMINGS).cues.at(-1)).toEqual({ type: 'outcome', outcome: 'victory', at: 100, durationMs: 50 });
    expect(buildBattlePlayback([{ type: 'defeat' }], TIMINGS).cues).toEqual([
      { type: 'outcome', outcome: 'defeat', at: 0, durationMs: 50 },
    ]);
  });

  it('実際の戦闘の出来事でも、合図の HP は出来事どおりに減り、最後の値が戦闘の状態と一致する', () => {
    const battleData = { ...DEFAULT_BATTLE_DATA, enemies: [{ ...ENEMIES[0], maxHp: 200 }] };
    const session = new BattleSession({ seed: 9, battleData });
    let enemyHp = session.battle.enemy.hp;
    let partyHp = session.battle.party[0]?.hp ?? 0;
    for (let i = 0; i < 100 && !session.isOver; i++) {
      const move = findMoves(session.board)[0];
      if (move === undefined) break;
      const result = session.swap(move.a, move.b);
      const { cues, totalMs } = buildBattlePlayback(result?.turn.events ?? [], TIMINGS);
      for (const cue of cues) {
        if (cue.type === 'enemyDamaged') enemyHp = cue.hpAfter;
        if (cue.type === 'partyDamaged') partyHp = cue.hpAfter;
      }
      expect(enemyHp).toBe(session.battle.enemy.hp);
      expect(partyHp).toBe(session.battle.party[0]?.hp);
      expect(totalMs).toBe(cues.reduce((sum, c) => sum + c.durationMs, 0));
    }
    expect(session.isOver).toBe(true);
  });
});
