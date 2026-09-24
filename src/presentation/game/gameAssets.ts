/**
 * アセットのマニフェスト。画像は public/assets/ に置き、ここにパスを登録する。
 * boot は起動時に読み込む(ロゴや読み込み画面の画像など)。
 */
import type { AssetManifest } from '../../services/assets/assetTypes';

export const gameManifest = {
  boot: {},
} as const satisfies AssetManifest;

export type GameManifest = typeof gameManifest;
