/**
 * ESLint の依存ルール(docs/ARCHITECTURE.md「依存ルール」)が機能していることの検証。
 *
 * 実際のファイルは作らず、各層に置いたと仮定したコードを ESLint に渡し、
 * 境界違反が no-restricted-imports / no-restricted-properties のエラーになることを確かめる。
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

/** 指定したパスに置いたと仮定してコードを lint し、エラーになったルール名を返す */
async function lintAs(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.severity === 2)
    .map((m) => m.ruleId ?? '(parse error)');
}

/** import 1行だけのコード(未使用変数の警告を避けるため export する) */
function importCode(source: string): string {
  return `import { x } from '${source}';\nexport const y = x;\n`;
}

const IMPORT_RULE = 'no-restricted-imports';

describe('依存ルール: 違反はエラーになる', () => {
  const violations: [file: string, source: string][] = [
    // core: 外部依存なし
    ['src/core/Foo.ts', 'pixi.js'],
    ['src/core/Foo.ts', 'gsap'],
    ['src/core/Foo.ts', 'howler'],
    ['src/core/Foo.ts', 'node:fs'],
    ['src/core/Foo.ts', '../data/items'],
    ['src/core/Foo.ts', '../systems/battle'],
    ['src/core/Foo.ts', '../services/save/SaveManager'],
    ['src/core/Foo.ts', '../presentation/ui/Button'],
    ['src/core/Foo.ts', '../app/Game'],
    ['src/core/sub/Foo.ts', '../../services/audio'],
    ['src/core/Foo.ts', '/src/services/audio'],
    // data: core のみ
    ['src/data/items.ts', 'pixi.js'],
    ['src/data/items.ts', '../systems/battle'],
    ['src/data/items.ts', '../services/assets/manifest'],
    ['src/data/items.ts', '../presentation/ui/Button'],
    ['src/data/items.ts', '../app/Game'],
    // systems: core, data のみ
    ['src/systems/battle.ts', 'pixi.js'],
    ['src/systems/battle.ts', 'gsap'],
    ['src/systems/battle.ts', 'howler'],
    ['src/systems/battle.ts', '../services/input/InputManager'],
    ['src/systems/battle.ts', '../presentation/scenes/BootScene'],
    ['src/systems/battle.ts', '../app/Game'],
    // systems の中: puzzle と battle は互いに import しない。session は import されない(docs/decisions/003)
    ['src/systems/puzzle/Foo.ts', '../battle'],
    ['src/systems/puzzle/Foo.ts', '../battle/types'],
    ['src/systems/puzzle/sub/Foo.ts', '../../battle'],
    ['src/systems/puzzle/Foo.ts', '../../systems/battle/TurnFlow'],
    ['src/systems/battle/Foo.ts', '../puzzle'],
    ['src/systems/battle/Foo.ts', '../puzzle/types'],
    ['src/systems/battle/Foo.ts', '/src/systems/puzzle'],
    ['src/systems/puzzle/Foo.ts', '../session'],
    ['src/systems/battle/Foo.ts', '../session/BattleSession'],
    // systems の中のフォルダにも、層の依存ルールは効く
    ['src/systems/puzzle/Foo.ts', 'pixi.js'],
    ['src/systems/battle/Foo.ts', '../../services/input/InputManager'],
    ['src/systems/session/Foo.ts', 'gsap'],
    ['src/systems/session/Foo.ts', '../../presentation/ui/Button'],
    // services: core と外部ライブラリ
    ['src/services/audio/AudioManager.ts', '../../data/items'],
    ['src/services/audio/AudioManager.ts', '../../systems/battle'],
    ['src/services/audio/AudioManager.ts', '../../presentation/ui/Button'],
    ['src/services/audio/AudioManager.ts', '../../app/Game'],
    // presentation: core, systems, services, 外部ライブラリ
    ['src/presentation/ui/Button.ts', '../../data/items'],
    ['src/presentation/ui/Button.ts', '../../app/Game'],
    // デモは main.ts 以外から import できない
    ['src/app/Game.ts', '../presentation/scenes/demo'],
    ['src/app/Game.ts', '../presentation/scenes/demo/DemoSceneA'],
    ['src/presentation/scenes/Scene.ts', './demo/demoLayout'],
    ['src/presentation/ui/Button.ts', '../scenes/demo'],
  ];

  it.each(violations)('%s から %s を import するとエラー', async (file, source) => {
    expect(await lintAs(file, importCode(source))).toContain(IMPORT_RULE);
  });

  it('import type でも境界違反はエラーになる', async () => {
    const code = `import type { X } from '../services/save/SaveManager';\nexport type Y = X;\n`;
    expect(await lintAs('src/core/Foo.ts', code)).toContain(IMPORT_RULE);
  });

  it('systems で Math.random() と Date.now() を使うとエラー', async () => {
    const code = `export const r = Math.random();\nexport const t = Date.now();\n`;
    const errors = await lintAs('src/systems/battle.ts', code);
    expect(errors.filter((e) => e === 'no-restricted-properties')).toHaveLength(2);
  });
});

describe('依存ルール: 許可された import はエラーにならない', () => {
  const allowed: [file: string, source: string][] = [
    ['src/core/Foo.ts', './SeededRng'],
    ['src/data/items.ts', '../core/SeededRng'],
    ['src/systems/battle.ts', '../core/SeededRng'],
    ['src/systems/battle.ts', '../data/items'],
    ['src/systems/session/BattleSession.ts', '../puzzle'],
    ['src/systems/session/BattleSession.ts', '../battle'],
    ['src/systems/session/BattleSession.ts', '../../core/SeededRng'],
    ['src/systems/puzzle/Board.ts', './types'],
    ['src/systems/puzzle/Board.ts', '../../core/SeededRng'],
    ['src/systems/puzzle/Board.ts', '../../data/puzzleConfig'],
    ['src/systems/battle/TurnFlow.ts', './types'],
    ['src/systems/battle/TurnFlow.ts', '../../data/tileEffects'],
    ['src/services/audio/AudioManager.ts', '../../core/EventBus'],
    ['src/services/audio/AudioManager.ts', 'howler'],
    ['src/presentation/ui/Button.ts', 'pixi.js'],
    ['src/presentation/ui/Button.ts', '../../core/EventBus'],
    ['src/presentation/ui/Button.ts', '../../systems/battle'],
    ['src/presentation/ui/Button.ts', '../../services/input/InputManager'],
    ['src/app/Game.ts', 'pixi.js'],
    ['src/app/Game.ts', '../data/items'],
    ['src/app/Game.ts', '../presentation/ui/Button'],
    ['src/main.ts', './presentation/scenes/demo'],
    ['src/presentation/scenes/demo/DemoSceneA.ts', './demoLayout'],
    ['src/presentation/scenes/demo/DemoSceneA.ts', '../Scene'],
  ];

  it.each(allowed)('%s から %s を import できる', async (file, source) => {
    expect(await lintAs(file, importCode(source))).toEqual([]);
  });
});
