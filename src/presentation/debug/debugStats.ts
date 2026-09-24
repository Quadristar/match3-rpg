/**
 * デバッグ表示の計測と文字列の組み立て(Pixi の描画に依存しない部分)。
 */
import type { Container } from 'pixi.js';
import type { BundleStatus } from '../../services/assets/assetTypes';
import type { Orientation, Size } from '../../services/layout/layoutTypes';
import type { SaveStatus } from '../../services/save/saveTypes';
import type { QualityPreset } from '../../services/settings/settingsTypes';

/** デバッグ表示に出す値 */
export interface DebugStats {
  readonly fps: number;
  /** AssetManager が把握しているテクスチャの推定メモリ(バイト) */
  readonly textureBytes: number;
  readonly displayObjects: number;
  readonly orientation: Orientation;
  readonly logical: Size;
  readonly scale: number;
  readonly bundles: readonly BundleStatus[];
  /** 読み込みに最終的に失敗したアセットの数 */
  readonly assetFailures: number;
  readonly quality: QualityPreset;
  /** 現在の描画解像度 */
  readonly resolution: number;
  readonly saveStatus: SaveStatus;
}

/**
 * 一定間隔ごとに FPS を計算する。
 * update() が true を返したときが、表示を更新するタイミング。
 */
export class FrameRateMeter {
  private frames = 0;
  private elapsedMs = 0;
  private current = 0;

  constructor(private readonly intervalMs: number) {}

  /** 直近の計測間隔での FPS */
  get fps(): number {
    return this.current;
  }

  /** 1フレーム分進める。計測間隔に達したら FPS を更新して true を返す */
  update(deltaMs: number): boolean {
    this.frames += 1;
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < this.intervalMs) {
      return false;
    }
    this.current = this.elapsedMs > 0 ? (this.frames * 1000) / this.elapsedMs : 0;
    this.frames = 0;
    this.elapsedMs = 0;
    return true;
  }
}

/** 表示オブジェクトの数を数える(root 自身を含む) */
export function countDisplayObjects(root: Container): number {
  let count = 1;
  for (const child of root.children) {
    count += countDisplayObjects(child);
  }
  return count;
}

const ORIENTATION_LABEL: Record<Orientation, string> = { portrait: '縦', landscape: '横' };
const QUALITY_LABEL: Record<QualityPreset, string> = { low: '低', medium: '中', high: '高' };
const SAVE_STATUS_LABEL: Record<SaveStatus, string> = { ok: '正常', memory: 'メモリ上で動作中' };

/** バイト数を MB で表示する */
function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** デバッグ表示の文字列を組み立てる */
export function formatDebugStats(stats: DebugStats): string {
  const bundles =
    stats.bundles.length === 0
      ? '(なし)'
      : stats.bundles.map((b) => `${b.name}×${b.refCount}${b.state === 'loading' ? '(読込中)' : ''}`).join(' ');
  const lines = [
    `FPS ${Math.round(stats.fps)}`,
    `Tex ${formatMegabytes(stats.textureBytes)}(推定)`,
    `Obj ${stats.displayObjects}`,
    `${ORIENTATION_LABEL[stats.orientation]} ${stats.logical.width}×${stats.logical.height} ×${stats.scale.toFixed(2)}`,
    `Bundle ${bundles}`,
    `品質 ${QUALITY_LABEL[stats.quality]} 解像度 ${Math.round(stats.resolution * 100) / 100}`,
    `保存 ${SAVE_STATUS_LABEL[stats.saveStatus]}`,
  ];
  if (stats.assetFailures > 0) {
    lines.push(`読込失敗 ${stats.assetFailures}件`);
  }
  return lines.join('\n');
}
