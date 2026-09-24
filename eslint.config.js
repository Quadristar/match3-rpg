// @ts-check
/**
 * ESLint 設定。
 *
 * コード品質のルールに加え、docs/ARCHITECTURE.md の「依存ルール」を
 * no-restricted-imports で強制する。層の境界を越える import はエラーになる。
 *
 * | 層           | import してよいもの                                  |
 * |--------------|------------------------------------------------------|
 * | core         | なし(外部ライブラリも不可)                          |
 * | data         | core                                                 |
 * | systems      | core, data                                           |
 * | services     | core, 外部ライブラリ                                 |
 * | presentation | core, systems(主に型), services, 外部ライブラリ     |
 * | app          | すべて                                               |
 *
 * デモ(presentation/scenes/demo/)は main.ts 以外から import できない。
 *
 * 判定方法: src/ 直下の層フォルダを指す相対パス(../data/… など)と、
 * パッケージ名での import(pixi.js など)を正規表現で検出する。
 * 違反が確実にエラーになることは tests/eslint/dependencyRules.test.ts で検証している。
 */
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** 層の名前 */
const LAYERS = ['core', 'data', 'systems', 'services', 'presentation', 'app'];

/**
 * 指定した層への import を禁止するパターンを作る。
 * `../data/x`・`../../data/x`・`src/data/x`・`/src/data/x` などを検出する。
 * @param {string} layer 禁止する層
 * @param {string} from  ルールを適用する層(メッセージ用)
 */
function forbidLayer(layer, from) {
  return {
    regex: `^(?:(?:\\.\\./)+|(?:.*/)?src/)${layer}(?:/|$)`,
    message: `依存ルール違反: ${from} から ${layer} は import できません(docs/ARCHITECTURE.md「依存ルール」)。`,
  };
}

/**
 * 外部パッケージ(pixi.js・gsap・howler・node: など、相対パス以外)の import を禁止するパターン。
 * @param {string} from ルールを適用する層(メッセージ用)
 */
function forbidPackages(from) {
  return {
    regex: '^(?!\\.{1,2}/)(?!(?:.*/)?src/)',
    message: `依存ルール違反: ${from} は外部ライブラリ(pixi.js / gsap / howler など)を import できません。純粋な TypeScript で書いてください。`,
  };
}

/**
 * デモ(presentation/scenes/demo/)への import を禁止するパターン。
 * デモはフォルダごと削除できるよう、main.ts 以外から参照しない。
 */
const FORBID_DEMO = {
  // `demo` という名前のフォルダを指す import を検出する(./demo/…・../scenes/demo など)
  regex: '(?:^|/)demo(?:/|$)',
  message: 'デモ(presentation/scenes/demo/)は main.ts 以外から import できません(フォルダごと削除できるようにするため)。',
};

/**
 * 層ごとの no-restricted-imports 設定を作る。
 * @param {string} layer 対象の層
 * @param {string[]} allowedLayers import を許可する層
 * @param {boolean} allowPackages 外部ライブラリを許可するか
 */
function layerRule(layer, allowedLayers, allowPackages) {
  const forbidden = LAYERS.filter((l) => l !== layer && !allowedLayers.includes(l));
  const patterns = [...forbidden.map((l) => forbidLayer(l, layer)), FORBID_DEMO];
  if (!allowPackages) {
    patterns.push(forbidPackages(layer));
  }
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns }],
    },
  };
}

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // 設定ファイルは Node.js で実行される
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // ---- 依存ルール ----
  layerRule('core', [], false),
  layerRule('data', ['core'], false),
  layerRule('systems', ['core', 'data'], false),
  layerRule('services', ['core'], true),
  layerRule('presentation', ['core', 'systems', 'services'], true),
  // app はすべての層を import できる(デモだけは禁止)
  layerRule('app', LAYERS, true),

  // ---- systems は時刻と非決定的な乱数に依存しない ----
  {
    files: ['src/systems/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'systems では Math.random() を使わず、引数で受け取った SeededRng を使ってください。',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'systems では Date.now() を使わず、時刻は引数で受け取ってください。',
        },
      ],
    },
  },
);
