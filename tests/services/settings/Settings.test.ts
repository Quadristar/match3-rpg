import { describe, expect, it, vi } from 'vitest';
import { SaveManager } from '../../../src/services/save/SaveManager';
import { MemoryStorage } from '../../../src/services/save/storages';
import { renderResolution } from '../../../src/services/settings/quality';
import { Settings } from '../../../src/services/settings/Settings';
import { createSettingsSchema, isSettingsData } from '../../../src/services/settings/settingsSchema';
import type { SettingsData } from '../../../src/services/settings/settingsTypes';

const DEFAULTS: SettingsData = {
  volume: { master: 1, bgm: 0.8, se: 0.8, voice: 1 },
  muted: false,
  quality: 'medium',
};

/** 手動で進める予約 */
class FakeScheduler {
  private pending: { callback: () => void; cancelled: boolean }[] = [];
  readonly schedule = (callback: () => void): (() => void) => {
    const entry = { callback, cancelled: false };
    this.pending.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };
  /** 予約を実行する */
  run(): void {
    const entries = this.pending;
    this.pending = [];
    for (const e of entries) if (!e.cancelled) e.callback();
  }
  get count(): number {
    return this.pending.filter((e) => !e.cancelled).length;
  }
}

function setup(storage = new MemoryStorage()) {
  const scheduler = new FakeScheduler();
  const save = new SaveManager({ gameId: 'g', storage });
  const setItem = vi.spyOn(storage, 'setItem');
  const settings = new Settings({ save, defaults: DEFAULTS, saveDelayMs: 500, schedule: scheduler.schedule });
  return { settings, storage, scheduler, setItem };
}

const saved = (storage: MemoryStorage): unknown => JSON.parse(storage.getItem('g:settings') ?? 'null');

describe('Settings: 初期値と読み込み', () => {
  it('保存がなければ初期値', () => {
    const { settings } = setup();
    expect(settings.current).toEqual(DEFAULTS);
    expect(settings.quality).toBe('medium');
  });

  it('保存された設定を読み込む', () => {
    const storage = new MemoryStorage();
    setup(storage).settings.setQuality('low');
    expect(setup(storage).settings.quality).toBe('low');
  });

  it('初期値のオブジェクトを書き換えない', () => {
    const { settings } = setup();
    settings.setVolume('bgm', 0.1);
    expect(DEFAULTS.volume.bgm).toBe(0.8);
  });
});

describe('Settings: 音量', () => {
  it('0〜1 に丸める', () => {
    const { settings } = setup();
    settings.setVolume('se', 1.5);
    expect(settings.volume('se')).toBe(1);
    settings.setVolume('se', -1);
    expect(settings.volume('se')).toBe(0);
    settings.setVolume('se', Number.NaN);
    expect(settings.volume('se')).toBe(0);
  });

  it('実際の音量は マスター × 種類別、ミュート中は 0', () => {
    const { settings } = setup();
    settings.setVolume('master', 0.5);
    settings.setVolume('bgm', 0.4);
    expect(settings.effectiveVolume('bgm')).toBeCloseTo(0.2);
    expect(settings.effectiveVolume('master')).toBe(0.5);
    settings.setMuted(true);
    expect(settings.effectiveVolume('bgm')).toBe(0);
  });

  it('連続した変更は、最後の変更から一定時間後に1回だけ保存する', () => {
    const { settings, storage, scheduler, setItem } = setup();
    for (let v = 0.1; v < 0.6; v += 0.1) {
      settings.setVolume('bgm', v);
    }
    expect(setItem).not.toHaveBeenCalled();
    expect(scheduler.count).toBe(1);
    scheduler.run();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(saved(storage)).toMatchObject({ data: { volume: { bgm: settings.volume('bgm') } } });
  });

  it('flush で保留中の保存をすぐに行う', () => {
    const { settings, storage, scheduler, setItem } = setup();
    settings.setVolume('voice', 0.3);
    settings.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(saved(storage)).toMatchObject({ data: { volume: { voice: 0.3 } } });
    scheduler.run();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('変更がなければ flush しても保存しない', () => {
    const { settings, setItem } = setup();
    settings.flush();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('Settings: ミュートと品質', () => {
  it('変更するとすぐに保存し、通知する', () => {
    const { settings, storage } = setup();
    const listener = vi.fn();
    settings.onChange(listener);
    settings.setQuality('high');
    expect(saved(storage)).toMatchObject({ data: { quality: 'high' } });
    settings.setMuted(true);
    expect(saved(storage)).toMatchObject({ data: { muted: true, quality: 'high' } });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ muted: true }));
  });

  it('同じ値なら通知も保存もしない', () => {
    const { settings, setItem } = setup();
    const listener = vi.fn();
    settings.onChange(listener);
    settings.setQuality('medium');
    settings.setMuted(false);
    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('settingsSchema', () => {
  it('形の正しい設定だけを受け付ける', () => {
    expect(isSettingsData(DEFAULTS)).toBe(true);
    expect(isSettingsData({ ...DEFAULTS, quality: 'ultra' })).toBe(false);
    expect(isSettingsData({ ...DEFAULTS, volume: { ...DEFAULTS.volume, bgm: 2 } })).toBe(false);
    expect(isSettingsData({ ...DEFAULTS, muted: 'no' })).toBe(false);
    expect(isSettingsData(null)).toBe(false);
  });

  it('初期値は毎回新しいオブジェクト', () => {
    const schema = createSettingsSchema(DEFAULTS);
    expect(schema.createDefault()).not.toBe(schema.createDefault());
    expect(schema.createDefault()).toEqual(DEFAULTS);
  });
});

describe('renderResolution', () => {
  const specs = { low: { maxResolution: 1.5 }, medium: { maxResolution: 2 }, high: { maxResolution: 2 } };
  it('devicePixelRatio を品質プリセットの上限で頭打ちにする', () => {
    expect(renderResolution(3, 'high', specs)).toBe(2);
    expect(renderResolution(3, 'medium', specs)).toBe(2);
    expect(renderResolution(3, 'low', specs)).toBe(1.5);
    expect(renderResolution(1, 'low', specs)).toBe(1);
    expect(renderResolution(Number.NaN, 'high', specs)).toBe(1);
  });
});
