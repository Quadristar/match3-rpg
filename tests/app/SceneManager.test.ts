/**
 * SceneManager のライフサイクル・フェード・切り替え要求の扱いのテスト。
 * Pixi の Container は Node 上でも生成・破棄できるため、実物を使う(描画はしない)。
 */
import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { SceneManager } from '../../src/app/SceneManager';
import { Button } from '../../src/presentation/ui/Button';
import type { Scene, SceneContext } from '../../src/presentation/scenes/Scene';
import type { ProgressListener } from '../../src/services/assets/assetTypes';
import { InputManager } from '../../src/services/input/InputManager';
import type { InputEvent } from '../../src/services/input/inputTypes';
import { SaveManager } from '../../src/services/save/SaveManager';
import { MemoryStorage } from '../../src/services/save/storages';
import { Settings } from '../../src/services/settings/Settings';
import { computeLayout } from '../../src/services/layout/computeLayout';
import type { Layout, LayoutDefinition } from '../../src/services/layout/layoutTypes';

type Key = 'a' | 'b' | 'c';

/** テスト用のマニフェスト(中身は使わない) */
type Manifest = { common: Record<string, string>; bundleA: Record<string, string>; bundleB: Record<string, string> };
type Bundle = keyof Manifest;

const FADE_MS = 100;
const LOADING_DELAY_MS = 300;

const DEFINITION: LayoutDefinition<never, never> = {
  portrait: { regions: {}, anchors: {} },
  landscape: { regions: {}, anchors: {} },
};

function makeLayout(width: number, height: number): Layout {
  return computeLayout(
    { width, height, safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 } },
    { portrait: { width: 720, height: 1280 }, landscape: { width: 1280, height: 720 } },
    DEFINITION,
  );
}

/** 呼び出しを log に記録するテスト用のシーン */
class RecordingScene implements Scene<Layout, Manifest> {
  readonly root = new Container();
  readonly background = new Container();
  readonly child = new Container();
  resizedWith: Layout[] = [];

  constructor(
    readonly name: string,
    private readonly log: string[],
    private readonly enterResult?: Promise<void>,
    readonly bundles: readonly Bundle[] = [],
  ) {
    this.root.addChild(this.child);
  }

  enter(): void | Promise<void> {
    this.log.push(`${this.name}.enter`);
    return this.enterResult;
  }
  exit(): void {
    this.log.push(`${this.name}.exit`);
  }
  update(): void {
    this.log.push(`${this.name}.update`);
  }
  resize(layout: Layout): void {
    this.log.push(`${this.name}.resize`);
    this.resizedWith.push(layout);
  }
}

/** 手動で完了させられる、偽のバンドル読み込み */
class FakeBundles {
  readonly refCounts = new Map<Bundle, number>();
  /** true の間は acquire の完了を保留する */
  hold = false;
  failNext = false;
  private readonly pending: { resolve: () => void; onProgress?: ProgressListener | undefined }[] = [];

  constructor(private readonly log: string[]) {}

  acquire(bundle: Bundle, onProgress?: ProgressListener): Promise<void> {
    this.log.push(`acquire:${bundle}`);
    this.refCounts.set(bundle, (this.refCounts.get(bundle) ?? 0) + 1);
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('load failed'));
    }
    if (!this.hold) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.pending.push({ resolve, onProgress }));
  }

  release(bundle: Bundle): boolean {
    this.log.push(`release:${bundle}`);
    this.refCounts.set(bundle, (this.refCounts.get(bundle) ?? 0) - 1);
    return true;
  }

  /** 保留中の読み込みの進捗を通知する */
  report(progress: number): void {
    for (const p of this.pending) {
      p.onProgress?.(progress);
    }
  }

  /** 保留中の読み込みをすべて完了させる */
  flush(): void {
    this.hold = false;
    for (const p of this.pending.splice(0)) {
      p.resolve();
    }
  }
}

function setup(
  options: {
    enterResults?: Partial<Record<Key, Promise<void>>>;
    bundles?: Partial<Record<Key, readonly Bundle[]>>;
    /** 生成で例外を投げるシーン */
    throwOnCreate?: readonly Key[];
    /** enter で(同期的に)例外を投げるシーン */
    throwOnEnter?: readonly Key[];
    /** resize で例外を投げるシーン */
    throwOnResize?: readonly Key[];
  } = {},
) {
  const log: string[] = [];
  const bundles = new FakeBundles(log);
  const loading = { show: vi.fn<(progress: number) => void>(), hide: vi.fn() };
  const input = new InputManager({
    thresholds: { dragStartDistance: 10, tapMaxDurationMs: 300, swipeMinDistance: 50, swipeMaxDurationMs: 500 },
    toLogical: (point) => point,
  });
  const saveManager = new SaveManager({ gameId: 'test', storage: new MemoryStorage() });
  const settings = new Settings({
    save: saveManager,
    defaults: { volume: { master: 1, bgm: 1, se: 1, voice: 1 }, muted: false, quality: 'medium' },
    saveDelayMs: 0,
  });
  const save = saveManager.open({ key: 'game', version: 1, createDefault: () => ({}) });
  const created: Partial<Record<Key, RecordingScene>> = {};
  const contexts: SceneContext<Key, Manifest>[] = [];
  const factory = (key: Key) => (context: SceneContext<Key, Manifest>) => {
    log.push(`${key}.create`);
    if (options.throwOnCreate?.includes(key) === true) {
      throw new Error(`${key} create failed`);
    }
    contexts.push(context);
    const scene = new RecordingScene(key, log, options.enterResults?.[key], options.bundles?.[key] ?? []);
    if (options.throwOnEnter?.includes(key) === true) {
      scene.enter = () => {
        log.push(`${key}.enter`);
        throw new Error(`${key} enter failed`);
      };
    }
    if (options.throwOnResize?.includes(key) === true) {
      scene.resize = () => {
        throw new Error(`${key} resize failed`);
      };
    }
    created[key] = scene;
    return scene;
  };
  const sceneLayer = new Container();
  const backgroundLayer = new Container();
  const fadeOverlay = new Container();
  let layout = makeLayout(390, 844);
  const onError = vi.fn();
  const manager = new SceneManager<Key, Layout, Manifest>({
    scenes: { a: factory('a'), b: factory('b'), c: factory('c') },
    sceneLayer,
    backgroundLayer,
    fadeOverlay,
    fadeDurationMs: FADE_MS,
    assets: bundles,
    input,
    loading,
    loadingDelayMs: LOADING_DELAY_MS,
    getLayout: () => layout,
    context: {
      renderer: { name: 'test', resolution: 1 },
      assets: {
        get: () => {
          throw new Error('テストでは使わない');
        },
      },
      save,
      settings,
    },
    onError,
  });
  const rotate = (): Layout => {
    layout = makeLayout(layout.screen.height, layout.screen.width);
    manager.resize(layout);
    return layout;
  };
  return {
    log,
    created,
    contexts,
    manager,
    sceneLayer,
    backgroundLayer,
    fadeOverlay,
    onError,
    rotate,
    bundles,
    loading,
    input,
    getLayout: () => layout,
  };
}

/** 待機中の Promise のコールバックを実行させる */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** フェード1回分の時間を進める */
function finishFade(manager: SceneManager<Key, Layout, Manifest>): void {
  manager.update(FADE_MS);
}

describe('SceneManager: 開始', () => {
  it('最初のシーンだけを生成し、enter → resize の順に呼んでからフェードインする', () => {
    const { log, manager, created, sceneLayer, backgroundLayer, fadeOverlay } = setup();
    manager.start('a');

    expect(log).toEqual(['a.create', 'a.enter', 'a.resize']);
    expect(created.b).toBeUndefined();
    expect(sceneLayer.children).toContain(created.a?.root);
    expect(backgroundLayer.children).toContain(created.a?.background);
    expect(fadeOverlay.alpha).toBe(1);
    expect(manager.isTransitioning).toBe(true);

    finishFade(manager);
    expect(fadeOverlay.alpha).toBe(0);
    expect(fadeOverlay.visible).toBe(false);
    expect(manager.isTransitioning).toBe(false);
    expect(manager.currentKey).toBe('a');
  });

  it('start は2回呼べない', () => {
    const { manager } = setup();
    manager.start('a');
    expect(() => manager.start('b')).toThrow();
  });
});

describe('SceneManager: 切り替え', () => {
  it('フェードアウト → exit → 破棄 → 生成 → enter → resize → フェードインの順に進む', () => {
    const { log, manager, created, fadeOverlay } = setup();
    manager.start('a');
    finishFade(manager);
    log.length = 0;

    manager.change('b');
    manager.update(FADE_MS / 2);
    expect(fadeOverlay.alpha).toBeCloseTo(0.5);
    expect(log).toEqual(['a.update']);

    manager.update(FADE_MS / 2);
    expect(log).toEqual(['a.update', 'a.update', 'a.exit', 'b.create', 'b.enter', 'b.resize']);
    expect(fadeOverlay.alpha).toBe(1);

    manager.update(FADE_MS / 2);
    expect(fadeOverlay.alpha).toBeCloseTo(0.5);
    manager.update(FADE_MS / 2);
    expect(fadeOverlay.alpha).toBe(0);
    expect(manager.currentKey).toBe('b');
    expect(created.a?.root.destroyed).toBe(true);
  });

  it('exit の後、root・background・子要素がすべて破棄され、レイヤーから外れる', () => {
    const { manager, created, sceneLayer, backgroundLayer } = setup();
    manager.start('a');
    finishFade(manager);
    const a = created.a;
    manager.change('b');
    finishFade(manager);

    expect(a?.root.destroyed).toBe(true);
    expect(a?.child.destroyed).toBe(true);
    expect(a?.background.destroyed).toBe(true);
    expect(sceneLayer.children).not.toContain(a?.root);
    expect(backgroundLayer.children).not.toContain(a?.background);
  });

  it('exit が例外を投げても表示物は破棄され、エラーが通知される', () => {
    const { manager, created, onError } = setup();
    manager.start('a');
    finishFade(manager);
    const a = created.a;
    if (a === undefined) throw new Error('a が生成されていない');
    a.exit = () => {
      throw new Error('exit failed');
    };
    manager.change('b');
    finishFade(manager);
    expect(a.root.destroyed).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(manager.currentKey).toBe('b');
  });

  it('シーンから context.changeScene で切り替えられる', () => {
    const { manager, contexts } = setup();
    manager.start('a');
    finishFade(manager);
    contexts[0]?.changeScene('b');
    finishFade(manager);
    finishFade(manager);
    expect(manager.currentKey).toBe('b');
  });

  it('切り替え中でないとき、現在と同じキーの要求は無視する', () => {
    const { manager, log } = setup();
    manager.start('a');
    finishFade(manager);
    manager.change('a');
    expect(manager.isTransitioning).toBe(false);
    expect(log.filter((l) => l === 'a.create')).toHaveLength(1);
  });
});

describe('SceneManager: 切り替え中の別の要求', () => {
  it('フェードアウト中の要求は行き先を上書きする(途中の行き先は生成されない)', () => {
    const { manager, created } = setup();
    manager.start('a');
    finishFade(manager);

    manager.change('b');
    manager.update(FADE_MS / 2);
    manager.change('c');
    manager.update(FADE_MS / 2);

    expect(created.b).toBeUndefined();
    expect(manager.currentKey).toBe('c');
  });

  it('フェードイン中の要求は保留し、フェードイン完了後に切り替える(最新の1つだけ)', () => {
    const { manager, created } = setup();
    manager.start('a');
    finishFade(manager);
    manager.change('b');
    finishFade(manager); // b に切り替わり、フェードイン開始

    manager.update(FADE_MS / 2);
    manager.change('a');
    manager.change('c');
    expect(manager.currentKey).toBe('b');

    manager.update(FADE_MS / 2); // フェードイン完了 → 保留中の c へフェードアウト開始
    expect(manager.isTransitioning).toBe(true);
    finishFade(manager);
    expect(manager.currentKey).toBe('c');
    expect(created.a?.root.destroyed).toBe(true);
  });
});

describe('SceneManager: 回転(resize)', () => {
  it('切り替え中でなければ、そのまま resize を呼ぶ', () => {
    const { manager, created, rotate } = setup();
    manager.start('a');
    finishFade(manager);
    const layout = rotate();
    expect(created.a?.resizedWith.at(-1)).toBe(layout);
    expect(layout.orientation).toBe('landscape');
  });

  it('同じレイアウトでは resize を二重に呼ばない', () => {
    const { manager, log, getLayout } = setup();
    manager.start('a');
    finishFade(manager);
    manager.resize(getLayout());
    expect(log.filter((l) => l === 'a.resize')).toHaveLength(1);
  });

  it('フェードアウト中に回転すると、切り替えを即座に完了させてから新しいシーンを配置する', () => {
    const { manager, created, log, fadeOverlay, rotate } = setup();
    manager.start('a');
    finishFade(manager);
    manager.change('b');
    manager.update(FADE_MS / 2);
    log.length = 0;

    const layout = rotate();

    expect(log).toEqual(['a.exit', 'b.create', 'b.enter', 'b.resize']);
    expect(created.b?.resizedWith).toEqual([layout]);
    expect(fadeOverlay.alpha).toBe(0);
    expect(manager.isTransitioning).toBe(false);
  });

  it('フェードイン中に回転すると、フェードを即座に完了させてから resize を呼ぶ', () => {
    const { manager, created, fadeOverlay, rotate } = setup();
    manager.start('a');
    manager.update(FADE_MS / 2);
    expect(fadeOverlay.alpha).toBeCloseTo(0.5);

    const layout = rotate();

    expect(fadeOverlay.alpha).toBe(0);
    expect(manager.isTransitioning).toBe(false);
    expect(created.a?.resizedWith.at(-1)).toBe(layout);
  });

  it('回転で完了させた切り替えに保留中の要求があれば、続けてその切り替えを始める', () => {
    const { manager, rotate } = setup();
    manager.start('a');
    manager.change('b'); // フェードイン中なので保留
    rotate();
    expect(manager.currentKey).toBe('a');
    expect(manager.isTransitioning).toBe(true);
    finishFade(manager);
    finishFade(manager);
    expect(manager.currentKey).toBe('b');
  });
});

describe('SceneManager: 非同期の enter', () => {
  it('enter の完了までは暗転したまま update も resize も呼ばず、完了後に resize → フェードイン', async () => {
    let resolve: () => void = () => {};
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const { manager, log, fadeOverlay } = setup({ enterResults: { a: pending } });
    manager.start('a');
    manager.update(FADE_MS);
    expect(log).toEqual(['a.create', 'a.enter']);
    expect(fadeOverlay.alpha).toBe(1);

    resolve();
    await flushPromises();
    expect(log).toEqual(['a.create', 'a.enter', 'a.resize']);
    finishFade(manager);
    expect(fadeOverlay.alpha).toBe(0);
  });

  it('enter の完了待ち中に回転した場合、完了時に最新のレイアウトで配置し、フェードを省略する', async () => {
    let resolve: () => void = () => {};
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const { manager, created, fadeOverlay, rotate } = setup({ enterResults: { a: pending } });
    manager.start('a');
    const layout = rotate();
    expect(created.a?.resizedWith).toEqual([]);

    resolve();
    await flushPromises();
    expect(created.a?.resizedWith).toEqual([layout]);
    expect(fadeOverlay.alpha).toBe(0);
    expect(manager.isTransitioning).toBe(false);
  });

  it('enter が失敗したらエラーが通知される', async () => {
    const failing = Promise.reject(new Error('load failed'));
    const { manager, onError } = setup({ enterResults: { a: failing } });
    manager.start('a');
    await flushPromises();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('SceneManager: destroy', () => {
  it('現在のシーンの exit を呼び、表示物を破棄する', () => {
    const { manager, created, log } = setup();
    manager.start('a');
    manager.destroy();
    expect(log.at(-1)).toBe('a.exit');
    expect(created.a?.root.destroyed).toBe(true);
    expect(manager.currentKey).toBeNull();
  });
});

describe('SceneManager: バンドルの読み込みと解放', () => {
  it('bundles を読み込んでから enter を呼ぶ', async () => {
    const { manager, log, bundles } = setup({ bundles: { a: ['bundleA'] } });
    bundles.hold = true;
    manager.start('a');
    expect(log).toEqual(['a.create', 'acquire:bundleA']);
    manager.update(FADE_MS);
    expect(log).not.toContain('a.update');

    bundles.flush();
    await flushPromises();
    expect(log).toEqual(['a.create', 'acquire:bundleA', 'a.enter', 'a.resize']);
  });

  it('exit の後に bundles を解放する。旧シーンの解放は新シーンの読み込み後に行う', async () => {
    const { manager, log, bundles } = setup({ bundles: { a: ['common', 'bundleA'], b: ['common', 'bundleB'] } });
    manager.start('a');
    await flushPromises();
    finishFade(manager);
    log.length = 0;

    manager.change('b');
    finishFade(manager);
    await flushPromises();

    expect(log).toEqual([
      'a.update',
      'a.exit',
      'b.create',
      'acquire:common',
      'acquire:bundleB',
      'release:common',
      'release:bundleA',
      'b.enter',
      'b.resize',
    ]);
    // 両方で使う common は解放されずに残る(参照数が 0 にならない)
    expect(bundles.refCounts.get('common')).toBe(1);
    expect(bundles.refCounts.get('bundleA')).toBe(0);
    expect(bundles.refCounts.get('bundleB')).toBe(1);
  });

  it('読み込みが長引いたら読み込み中表示を出し、進捗を伝え、読み込み後に隠す', async () => {
    const { manager, bundles, loading } = setup({ bundles: { a: ['bundleA'] } });
    bundles.hold = true;
    manager.start('a');

    manager.update(LOADING_DELAY_MS - 1);
    expect(loading.show).not.toHaveBeenCalled();

    bundles.report(0.5);
    manager.update(1);
    expect(loading.show).toHaveBeenLastCalledWith(0.5);

    bundles.flush();
    await flushPromises();
    expect(loading.hide).toHaveBeenCalledTimes(1);
  });

  it('すぐに読み込めた場合は読み込み中表示を出さない', async () => {
    const { manager, loading } = setup({ bundles: { a: ['bundleA'] } });
    manager.start('a');
    await flushPromises();
    finishFade(manager);
    expect(loading.show).not.toHaveBeenCalled();
    expect(loading.hide).not.toHaveBeenCalled();
  });

  it('読み込み中の切り替え要求は保留し、表示してから切り替える(読み込みは中断しない)', async () => {
    const { manager, bundles } = setup({ bundles: { a: ['bundleA'], b: ['bundleB'] } });
    bundles.hold = true;
    manager.start('a');
    manager.change('b');
    expect(manager.currentKey).toBe('a');

    bundles.flush();
    await flushPromises();
    finishFade(manager); // a のフェードイン完了 → b へのフェードアウト開始
    expect(manager.isTransitioning).toBe(true);
    finishFade(manager);
    await flushPromises();
    finishFade(manager);
    expect(manager.currentKey).toBe('b');
    expect(bundles.refCounts.get('bundleA')).toBe(0);
  });

  it('読み込み中に回転した場合、完了時に最新のレイアウトで配置し、フェードを省略する', async () => {
    const { manager, bundles, created, fadeOverlay, rotate } = setup({ bundles: { a: ['bundleA'] } });
    bundles.hold = true;
    manager.start('a');
    const layout = rotate();
    expect(created.a?.resizedWith).toEqual([]);

    bundles.flush();
    await flushPromises();
    expect(created.a?.resizedWith).toEqual([layout]);
    expect(fadeOverlay.alpha).toBe(0);
    expect(manager.isTransitioning).toBe(false);
  });

  it('読み込み中に destroy されたら、enter を呼ばずに bundles を解放する', async () => {
    const { manager, bundles, log } = setup({ bundles: { a: ['bundleA'] } });
    bundles.hold = true;
    manager.start('a');
    manager.destroy();
    expect(bundles.refCounts.get('bundleA')).toBe(0);
    bundles.flush();
    await flushPromises();
    expect(log).not.toContain('a.enter');
  });

  it('読み込みが失敗したらエラーが通知される', async () => {
    const { manager, bundles, onError } = setup({ bundles: { a: ['bundleA'] } });
    bundles.failNext = true;
    manager.start('a');
    await flushPromises();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

/** タップを1回入力する */
function tap(input: InputManager): void {
  input.pointerDown(1, { x: 0, y: 0 }, 0);
  input.pointerUp(1, { x: 0, y: 0 }, 10);
}

describe('SceneManager: 入力', () => {
  it('切り替え中は入力を一時停止し、切り替えが終わったら再開する', async () => {
    const { manager, input, bundles } = setup({ bundles: { b: ['bundleB'] } });
    manager.start('a');
    expect(input.isPaused).toBe(true);
    finishFade(manager);
    expect(input.isPaused).toBe(false);

    bundles.hold = true;
    manager.change('b');
    expect(input.isPaused).toBe(true);
    finishFade(manager); // 読み込み中
    expect(input.isPaused).toBe(true);
    bundles.flush();
    await flushPromises();
    finishFade(manager);
    expect(input.isPaused).toBe(false);
  });

  it('回転で切り替えを即座に完了させた場合も再開する', () => {
    const { manager, input, rotate } = setup();
    manager.start('a');
    rotate();
    expect(input.isPaused).toBe(false);
  });

  it('シーンが登録した入力は、切り替え中を除いて届き、exit で自動的に解除される', () => {
    const { manager, input, contexts } = setup();
    manager.start('a');
    const events: InputEvent[] = [];
    contexts[0]?.input.on((e) => events.push(e));

    tap(input); // フェードイン中なので届かない
    finishFade(manager);
    tap(input);
    expect(events.map((e) => e.type)).toEqual(['tap']);

    manager.change('b');
    finishFade(manager);
    finishFade(manager);
    tap(input); // a は exit 済みなので届かない
    expect(events).toHaveLength(1);
  });

  it('シーンが一時停止したまま exit しても、入力は再開される', () => {
    const { manager, input, contexts } = setup();
    manager.start('a');
    finishFade(manager);
    contexts[0]?.input.pause();
    expect(input.isPaused).toBe(true);

    manager.change('b');
    finishFade(manager);
    finishFade(manager);
    expect(input.isPaused).toBe(false);
  });

  it('シーンの root の中のボタンが反応したタップは、ゲーム側(input.on)に渡さない', () => {
    const { manager, input, contexts, created } = setup();
    manager.start('a');
    finishFade(manager);
    const onClick = vi.fn();
    const button = new Button({ label: 'ok', width: 40, height: 40, onClick });
    created.a?.root.addChild(button); // 原点 (0, 0) に置く
    const events: InputEvent[] = [];
    contexts[0]?.input.on((e) => events.push(e));

    tap(input); // (0, 0) = ボタンの上
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);

    button.visible = false;
    tap(input); // 非表示なのでゲーム側へ
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(events.map((e) => e.type)).toEqual(['tap']);
  });

  it('destroy すると一時停止も解除する', () => {
    const { manager, input } = setup();
    manager.start('a');
    manager.destroy();
    expect(input.isPaused).toBe(false);
  });
});

describe('SceneManager: 失敗したとき', () => {
  /** 暗転用の幕が外れ、入力が再開し、切り替え中でなくなっていることを確かめる */
  function expectRecovered(context: ReturnType<typeof setup>): void {
    expect(context.fadeOverlay.visible).toBe(false);
    expect(context.fadeOverlay.alpha).toBe(0);
    expect(context.input.isPaused).toBe(false);
    expect(context.manager.isTransitioning).toBe(false);
  }

  it('生成で失敗したら、幕を外し入力を再開してから通知する', () => {
    const context = setup({ throwOnCreate: ['b'] });
    const { manager, onError, input, fadeOverlay } = context;
    manager.start('a');
    finishFade(manager);
    onError.mockImplementation(() => {
      // 通知の時点で、すでに解除されている
      expect(fadeOverlay.visible).toBe(false);
      expect(input.isPaused).toBe(false);
    });
    manager.change('b');
    finishFade(manager);
    expect(onError).toHaveBeenCalledTimes(1);
    expectRecovered(context);
    expect(manager.currentKey).toBeNull();
  });

  it('enter が同期的に例外を投げたら、幕を外し入力を再開して通知する', () => {
    const context = setup({ throwOnEnter: ['a'] });
    context.manager.start('a');
    expect(context.onError).toHaveBeenCalledTimes(1);
    expectRecovered(context);
  });

  it('enter の Promise が失敗したら、幕を外し入力を再開して通知する', async () => {
    const context = setup({ enterResults: { a: Promise.reject(new Error('enter failed')) } });
    context.manager.start('a');
    await flushPromises();
    expect(context.onError).toHaveBeenCalledTimes(1);
    expectRecovered(context);
  });

  it('読み込みが失敗したら、読み込み中表示も隠し、幕を外し入力を再開して通知する', async () => {
    const context = setup({ bundles: { a: ['bundleA'] } });
    context.bundles.failNext = true;
    context.manager.start('a');
    context.manager.update(LOADING_DELAY_MS + 1); // 読み込み中表示を出す
    await flushPromises();
    expect(context.onError).toHaveBeenCalledTimes(1);
    expect(context.loading.hide).toHaveBeenCalled();
    expectRecovered(context);
  });

  it('enter 後の配置(resize)で失敗したら、幕を外し入力を再開して通知する', () => {
    const context = setup({ throwOnResize: ['b'] });
    context.manager.start('a');
    finishFade(context.manager);
    context.manager.change('b');
    finishFade(context.manager);
    expect(context.log).toContain('b.enter');
    expect(context.onError).toHaveBeenCalledTimes(1);
    expectRecovered(context);
  });

  it('exit と破棄で失敗しても、残りの破棄を行い、切り替えを続けて幕を外す', () => {
    const context = setup();
    const { manager, created, onError, sceneLayer, input } = context;
    manager.start('a');
    finishFade(manager);
    const a = created.a;
    if (a === undefined) throw new Error('a が生成されていない');
    a.exit = () => {
      throw new Error('exit failed');
    };
    const destroyRoot = a.root.destroy.bind(a.root);
    a.root.destroy = (options) => {
      destroyRoot(options);
      throw new Error('destroy failed');
    };
    manager.change('b');
    finishFade(manager);
    finishFade(manager);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(a.background.destroyed).toBe(true);
    expect(a.child.destroyed).toBe(true);
    expect(sceneLayer.children).toEqual([created.b?.root]);
    expect(manager.currentKey).toBe('b');
    expectRecovered(context);
    // exit で失敗したシーンが登録した入力も解除されている
    expect(input.isPaused).toBe(false);
  });

  it('失敗したシーンには update を呼ばず、その後の切り替えは通常どおり行える', () => {
    const context = setup({ throwOnEnter: ['a'] });
    const { manager, log } = context;
    manager.start('a');
    log.length = 0;
    manager.update(16);
    expect(log).not.toContain('a.update');
    manager.change('b');
    finishFade(manager);
    finishFade(manager);
    expect(manager.currentKey).toBe('b');
    expect(log).toContain('a.exit');
    expect(log).toContain('b.enter');
    expectRecovered(context);
  });

  it('失敗したら保留中の要求を捨てる', async () => {
    const context = setup({ bundles: { a: ['bundleA'] } });
    const { manager, bundles } = context;
    bundles.hold = true;
    bundles.failNext = true;
    manager.start('a');
    manager.change('b'); // 読み込み中の要求は保留される
    await flushPromises();
    finishFade(manager);
    finishFade(manager);
    expect(context.created.b).toBeUndefined();
    expectRecovered(context);
  });

  it('読み込み中に destroy された後の失敗は、状態を変えずに通知だけする', async () => {
    const context = setup({ bundles: { a: ['bundleA'] } });
    const { manager, bundles, onError, fadeOverlay } = context;
    bundles.failNext = true;
    manager.start('a');
    manager.destroy();
    fadeOverlay.alpha = 1;
    fadeOverlay.visible = true;
    await flushPromises();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fadeOverlay.visible).toBe(true);
  });
});
