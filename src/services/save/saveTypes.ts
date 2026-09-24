/**
 * セーブで使う型。DOM に依存しない。
 */

/**
 * 保存先。localStorage と同じ形にしてあり、差し替えられる(将来の IndexedDB 移行やテスト用)。
 * setItem は、容量超過などで失敗すると例外を投げてよい。
 */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * セーブデータの定義(中身は各ゲームが決める)。
 *
 * 例:
 *   const progressSchema: SaveSchema<Progress> = {
 *     key: 'progress',
 *     version: 2,
 *     createDefault: () => ({ stage: 1, coins: 0 }),
 *     migrations: { 1: (v1) => ({ ...(v1 as object), coins: 0 }) }, // v1 → v2
 *     validate: isProgress,
 *   };
 */
export interface SaveSchema<D> {
  /** 保存キー(ゲーム ID の後ろに付く)。ゲームの中で重複させない */
  readonly key: string;
  /** 現在のバージョン(1 以上の整数)。形式を変えたら 1 増やし、移行処理を足す */
  readonly version: number;
  /** データがないとき・読めないときの初期状態 */
  readonly createDefault: () => D;
  /** 移行処理。migrations[n] はバージョン n のデータを n+1 に変換する */
  readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
  /** 移行後のデータが正しい形かの検査。省略すると検査しない(省略は非推奨) */
  readonly validate?: (data: unknown) => data is D;
}

/** 保存の状態: 正常 / 保存できずメモリ上で動作中 */
export type SaveStatus = 'ok' | 'memory';

/** 保存で起きた問題の記録 */
export interface SaveIssue {
  /**
   * unavailable … 保存先を使えない(プライベートブラウズなど)
   * corrupt     … 読めないデータがあった(退避して初期状態で開始)
   * writeFailed … 書き込めなかった(容量超過など)
   */
  readonly kind: 'unavailable' | 'corrupt' | 'writeFailed';
  /** 対象の保存キー(ゲーム ID を含む) */
  readonly key: string;
  readonly detail: string;
  readonly error?: unknown;
}
