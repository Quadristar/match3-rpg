/**
 * データ同士の参照(ID)と値の整合性の検査。
 */
import { describe, expect, it } from 'vitest';
import { BATTLE_RULES } from '../../src/data/battleRules';
import { CHARACTERS } from '../../src/data/characters';
import { ENEMIES } from '../../src/data/enemies';
import { PUZZLE_CONFIG } from '../../src/data/puzzleConfig';
import { STAGES } from '../../src/data/stages';
import { TILE_EFFECTS } from '../../src/data/tileEffects';

function duplicates(ids: readonly string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

describe('データの整合性', () => {
  it('ID が重複していない', () => {
    expect(duplicates(CHARACTERS.map((c) => c.id))).toEqual([]);
    expect(duplicates(ENEMIES.map((e) => e.id))).toEqual([]);
    expect(duplicates(STAGES.map((s) => s.id))).toEqual([]);
  });

  it('ステージが参照する敵・キャラクターが存在する', () => {
    const enemyIds = new Set<string>(ENEMIES.map((e) => e.id));
    const characterIds = new Set<string>(CHARACTERS.map((c) => c.id));
    for (const stage of STAGES) {
      expect(enemyIds.has(stage.enemyId), `${stage.id} の敵 ${stage.enemyId}`).toBe(true);
      expect(stage.partyIds.length, `${stage.id} の編成`).toBeGreaterThan(0);
      for (const id of stage.partyIds) {
        expect(characterIds.has(id), `${stage.id} の味方 ${id}`).toBe(true);
      }
    }
  });

  it('パネルの効果の種類の番号が、パズルの種類数の範囲にある', () => {
    for (const kind of Object.keys(TILE_EFFECTS.byKind).map(Number)) {
      expect(Number.isInteger(kind) && kind >= 0 && kind < PUZZLE_CONFIG.kindCount, `種類 ${kind}`).toBe(true);
    }
    expect(TILE_EFFECTS.default.action).toBe('attack');
  });

  it('能力値と規則が正の値', () => {
    for (const c of CHARACTERS) {
      expect(c.maxHp, c.id).toBeGreaterThan(0);
      expect(c.attack, c.id).toBeGreaterThan(0);
      expect(c.defense, c.id).toBeGreaterThanOrEqual(0);
    }
    for (const e of ENEMIES) {
      expect(e.maxHp, e.id).toBeGreaterThan(0);
      expect(e.attack, e.id).toBeGreaterThan(0);
      expect(e.defense, e.id).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(e.attackInterval) && e.attackInterval >= 1, e.id).toBe(true);
      expect(e.rewards.exp, e.id).toBeGreaterThanOrEqual(0);
    }
    expect(BATTLE_RULES.minDamage).toBeGreaterThanOrEqual(1);
  });

  it('プロトタイプの仮仕様の値(GAME_DESIGN §9)', () => {
    expect(CHARACTERS[0]).toMatchObject({ maxHp: 100, attack: 10, defense: 0 });
    expect(ENEMIES[0]).toMatchObject({ maxHp: 300, attack: 20, defense: 0, attackInterval: 3, rewards: { exp: 50 } });
    expect(BATTLE_RULES.comboBonusPerStep).toBe(0.25);
  });
});
