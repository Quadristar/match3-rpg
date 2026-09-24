/**
 * Settings: 音量・ミュート・品質プリセットを持ち、SaveManager で保存する。
 *
 * - 値を変えると、すぐに onChange で通知する
 * - 保存(仮仕様):
 *     音量 … スライダーのように頻繁に変わるため、saveDelayMs の間変化がなくなってから保存する
 *     ミュート・品質 … すぐに保存する
 *   ページを閉じる前などに flush() を呼ぶと、保留中の保存をすぐに行う
 * - 音声の再生にはまだつながっていない(Howler.js の導入時に AudioManager から使う)
 */
import type { SaveSchema } from '../save/saveTypes';
import type { SaveSlot } from '../save/SaveManager';
import { createSettingsSchema } from './settingsSchema';
import type { QualityPreset, SettingsData, VolumeCategory } from './settingsTypes';

/** 保存スロットを開く機能(SaveManager が満たす) */
export interface SaveOpener {
  open<D>(schema: SaveSchema<D>): SaveSlot<D>;
}

export interface SettingsOptions {
  readonly save: SaveOpener;
  /** 初期値(保存されたデータがないときに使う) */
  readonly defaults: SettingsData;
  /** 音量の変更を保存するまでの待ち時間(ミリ秒) */
  readonly saveDelayMs: number;
  /** 遅らせて実行する(テストで差し替える)。戻り値で取り消す */
  readonly schedule?: (callback: () => void, ms: number) => () => void;
}

export type SettingsListener = (settings: SettingsData) => void;

const defaultSchedule = (callback: () => void, ms: number): (() => void) => {
  const id = setTimeout(callback, ms);
  return () => clearTimeout(id);
};

function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export class Settings {
  private readonly slot: SaveSlot<SettingsData>;
  private readonly listeners = new Set<SettingsListener>();
  private data: SettingsData;
  private cancelPendingSave: (() => void) | null = null;

  constructor(private readonly options: SettingsOptions) {
    this.slot = options.save.open(createSettingsSchema(options.defaults));
    this.data = this.slot.get();
  }

  /** 現在の設定 */
  get current(): SettingsData {
    return this.data;
  }

  get quality(): QualityPreset {
    return this.data.quality;
  }

  get muted(): boolean {
    return this.data.muted;
  }

  /** 音量の設定値(0〜1) */
  volume(category: VolumeCategory): number {
    return this.data.volume[category];
  }

  /**
   * 実際に使う音量(0〜1)。ミュート中は 0、それ以外は マスター × 種類別。
   * master を指定した場合はマスター音量そのもの。
   */
  effectiveVolume(category: VolumeCategory): number {
    if (this.data.muted) {
      return 0;
    }
    const master = this.data.volume.master;
    return category === 'master' ? master : master * this.data.volume[category];
  }

  setVolume(category: VolumeCategory, value: number): void {
    const volume = clampVolume(value);
    if (this.data.volume[category] === volume) {
      return;
    }
    this.update({ ...this.data, volume: { ...this.data.volume, [category]: volume } });
    this.scheduleSave();
  }

  setMuted(muted: boolean): void {
    if (this.data.muted === muted) {
      return;
    }
    this.update({ ...this.data, muted });
    this.flush();
  }

  setQuality(quality: QualityPreset): void {
    if (this.data.quality === quality) {
      return;
    }
    this.update({ ...this.data, quality });
    this.flush();
  }

  /** 変更の通知を受け取る。戻り値の関数を呼ぶと解除する */
  onChange(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 保留中の保存があれば、すぐに保存する */
  flush(): void {
    this.cancelPendingSave?.();
    this.cancelPendingSave = null;
    if (this.slot.get() !== this.data) {
      this.slot.set(this.data);
    }
  }

  private update(data: SettingsData): void {
    this.data = data;
    for (const listener of [...this.listeners]) {
      listener(data);
    }
  }

  private scheduleSave(): void {
    this.cancelPendingSave?.();
    this.cancelPendingSave = (this.options.schedule ?? defaultSchedule)(() => {
      this.cancelPendingSave = null;
      this.flush();
    }, this.options.saveDelayMs);
  }
}
