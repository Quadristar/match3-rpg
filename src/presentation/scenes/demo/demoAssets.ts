/**
 * デモ用のアセットのマニフェスト。
 * ゲームを作るときは、このファイルごと削除し、ゲーム用のマニフェストに差し替える。
 *
 * 画像はこのリポジトリ用に作った単純な図形(public/assets/demo/)。
 */
import type { AssetManifest } from '../../../services/assets/assetTypes';

export const demoManifest = {
  /** 起動時に読み込む。ゲームでは、ロゴや読み込み画面で使う画像などを置く */
  boot: {},
  /** デモシーンAで使う */
  demoA: { shapes: 'assets/demo/shapes-a.png' },
  /** デモシーンBで使う */
  demoB: { shapes: 'assets/demo/shapes-b.png' },
} as const satisfies AssetManifest;

export type DemoManifest = typeof demoManifest;
