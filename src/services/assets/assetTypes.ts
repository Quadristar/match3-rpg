/**
 * アセット管理で使う型。DOM や Pixi に依存しない。
 */

/**
 * マニフェスト: バンドル名 → (アセットのキー → ファイルパス)。
 *
 * ファイルパスを書くのはマニフェストだけにし、コードからはキーで参照する。
 * パスは index.html からの相対パス(例: "assets/demo/shapes-a.png")で書く。
 * 実体は public/ に置く。
 *
 * 例:
 *   export const manifest = {
 *     boot: {},
 *     title: { logo: 'assets/title/logo.png' },
 *   } as const satisfies AssetManifest;
 */
export type AssetManifest = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** マニフェストのバンドル名 */
export type BundleName<M extends AssetManifest> = keyof M & string;

/** バンドル内のアセットのキー */
export type AssetKey<M extends AssetManifest, B extends BundleName<M>> = keyof M[B] & string;

/** アセットの読み込み・解放を行う処理(Pixi の Assets や、テスト用の偽物) */
export interface AssetLoader<T> {
  load(url: string): Promise<T>;
  unload(url: string): void | Promise<void>;
}

/** バンドルの状態 */
export type BundleState = 'loading' | 'loaded';

/** バンドルの状況(デバッグ表示用) */
export interface BundleStatus {
  readonly name: string;
  readonly state: BundleState;
  readonly refCount: number;
  /** 0〜1 */
  readonly progress: number;
}

/** 最終的に読み込めなかったアセットの記録 */
export interface AssetFailure {
  readonly bundle: string;
  readonly key: string;
  readonly url: string;
  /** 試行した回数(初回を含む) */
  readonly attempts: number;
  readonly error: unknown;
  /** 起動に必須のバンドルか(true なら起動エラー、false なら代わりの画像で続行) */
  readonly critical: boolean;
}

/** 読み込みの進捗(0〜1)を受け取る関数 */
export type ProgressListener = (progress: number) => void;
