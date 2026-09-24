/**
 * 読み込み処理に、失敗や遅延をわざと起こす機能を足す(動作確認用)。
 * スマホでは通信状況を変えにくいため、代わりの画像や読み込み中表示の確認に使う。
 */
import type { AssetLoader } from './assetTypes';

export interface SimulatedIssues {
  /** 必ず失敗させるファイル */
  readonly failUrls: ReadonlySet<string>;
  /** 1ファイルごとに追加する待ち時間(ミリ秒) */
  readonly delayMs: number;
}

export function withSimulatedIssues<T>(
  loader: AssetLoader<T>,
  issues: SimulatedIssues,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): AssetLoader<T> {
  if (issues.failUrls.size === 0 && issues.delayMs <= 0) {
    return loader;
  }
  return {
    async load(url: string): Promise<T> {
      if (issues.delayMs > 0) {
        await wait(issues.delayMs);
      }
      if (issues.failUrls.has(url)) {
        throw new Error(`動作確認のため失敗させました: ${url}`);
      }
      return loader.load(url);
    },
    unload: (url) => loader.unload(url),
  };
}
