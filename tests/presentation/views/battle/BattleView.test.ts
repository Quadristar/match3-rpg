/**
 * BattleView の破棄(シーンの終了時)の検査。
 * 不具合: 「タイトルへ」でシーンを終えると、root の破棄の途中で BattleView が
 * 揺れの対象(root)の位置を戻そうとして例外になり、画面が暗転したまま止まっていた。
 */
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../../../../src/presentation/views/battle/BattleView';
import { buildBattlePlayback } from '../../../../src/presentation/views/battle/battlePlaybackPlan';
import { BATTLE_VIEW_CONFIG } from '../../../../src/presentation/views/battle/battleViewConfig';
import { createBattleState } from '../../../../src/systems/battle';

function createScene(): { root: Container; view: BattleView } {
  const root = new Container();
  const view = new BattleView({ enemyName: '敵', partyName: '味方', shakeTarget: root });
  root.addChild(view);
  const region = { x: 0, y: 0, width: 300, height: 300 };
  view.layout(region, region);
  view.sync(createBattleState('prototype'));
  return { root, view };
}

describe('BattleView の破棄', () => {
  it('揺れの対象(シーンの root)ごと子要素を破棄しても例外にならない', () => {
    const { root } = createScene();
    expect(() => root.destroy({ children: true })).not.toThrow();
  });

  it('再生中に、シーンの終了時と同じ順(stop → root の破棄)で破棄しても例外にならない', () => {
    const { root, view } = createScene();
    const state = createBattleState('prototype');
    const events = [
      { type: 'enemyAttack', actorId: 'e', targetId: 'hero', damage: 20, hpBefore: 100, hpAfter: 80 },
    ] as const;
    view.play(buildBattlePlayback(events, BATTLE_VIEW_CONFIG.timings), state);
    expect(view.isPlaying).toBe(true);
    view.stop();
    expect(() => root.destroy({ children: true })).not.toThrow();
  });

  it('再生中のまま破棄しても例外にならない', () => {
    const { root, view } = createScene();
    const events = [
      { type: 'enemyAttack', actorId: 'e', targetId: 'hero', damage: 20, hpBefore: 100, hpAfter: 80 },
    ] as const;
    view.play(buildBattlePlayback(events, BATTLE_VIEW_CONFIG.timings), createBattleState('prototype'));
    expect(() => root.destroy({ children: true })).not.toThrow();
  });
});
