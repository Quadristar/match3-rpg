/**
 * 読み込みの進捗を集計し、読み込みが長引いたときだけ読み込み中表示を出す。
 */
import type { LoadingIndicator } from './sceneManagerTypes';

export class LoadingProgressTracker {
  /** 読み込み中のバンドルごとの進捗(0〜1) */
  private readonly progress = new Map<string, number>();
  private elapsedMs = 0;
  private shown = false;

  constructor(
    private readonly indicator: LoadingIndicator,
    /** この時間を超えたら表示する(ミリ秒) */
    private readonly delayMs: number,
  ) {}

  /** 読み込みを始める */
  begin(bundles: readonly string[]): void {
    this.finish();
    for (const bundle of bundles) {
      this.progress.set(bundle, 0);
    }
  }

  setProgress(bundle: string, value: number): void {
    this.progress.set(bundle, value);
  }

  /** 経過時間を進め、表示が必要なら表示・更新する */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.delayMs) {
      this.shown = true;
      this.indicator.show(this.average());
    }
  }

  /** 読み込みを終える(表示していれば隠す) */
  finish(): void {
    if (this.shown) {
      this.shown = false;
      this.indicator.hide();
    }
    this.progress.clear();
    this.elapsedMs = 0;
  }

  /** バンドルごとの進捗の平均 */
  private average(): number {
    if (this.progress.size === 0) {
      return 0;
    }
    let sum = 0;
    for (const value of this.progress.values()) {
      sum += value;
    }
    return sum / this.progress.size;
  }
}
