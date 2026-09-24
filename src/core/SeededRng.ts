/**
 * シード付き乱数生成器。
 *
 * - 同じシードからは、どの端末・どのブラウザでも同じ乱数列が得られる
 * - ゲームロジック(systems)の乱数はすべてこのクラスを使い、引数で受け取る
 * - アルゴリズムは sfc32(状態 32bit×4)。シードから初期状態を splitmix32 で作る
 *
 * 状態は getState() / setState() で保存・復元できる(セーブやリプレイ用)。
 */

/** 乱数生成器の内部状態(32bit 符号なし整数 ×4) */
export type SeededRngState = readonly [number, number, number, number];

/** 初期化直後に捨てる出力の回数(初期状態の偏りをなくすため) */
const WARM_UP_COUNT = 12;

/** 2^32。32bit 整数を [0, 1) の小数に変換するのに使う */
const UINT32_RANGE = 0x1_0000_0000;

export class SeededRng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;

  /**
   * @param seed シード。整数であること。32bit 符号なし整数に丸めて使う
   *             (例: -1 と 4294967295 は同じシードになる)
   */
  constructor(seed: number) {
    if (!Number.isInteger(seed)) {
      throw new RangeError(`SeededRng: seed は整数で指定してください (受け取った値: ${seed})`);
    }
    let s = seed >>> 0;
    const splitmix32 = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = splitmix32();
    this.b = splitmix32();
    this.c = splitmix32();
    this.d = splitmix32();
    for (let i = 0; i < WARM_UP_COUNT; i++) {
      this.nextUint32();
    }
  }

  /** 32bit 符号なし整数の乱数を返す(0 以上 2^32 未満) */
  nextUint32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = (this.b ^ (this.b >>> 9)) >>> 0;
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** 0 以上 1 未満の小数を返す */
  next(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** min 以上 max 未満の小数を返す */
  nextFloat(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new RangeError(`SeededRng.nextFloat: 範囲が不正です (${min}, ${max})`);
    }
    return min + this.next() * (max - min);
  }

  /** min 以上 max 以下(両端を含む)の整数を返す */
  nextInt(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
      throw new RangeError(`SeededRng.nextInt: 範囲が不正です (${min}, ${max})`);
    }
    const span = max - min + 1;
    if (span > UINT32_RANGE) {
      throw new RangeError(`SeededRng.nextInt: 範囲は 2^32 個以下にしてください (${min}, ${max})`);
    }
    return min + Math.floor(this.next() * span);
  }

  /** 確率 probability(0〜1)で true を返す */
  chance(probability: number): boolean {
    if (!(probability >= 0 && probability <= 1)) {
      throw new RangeError(`SeededRng.chance: 確率は 0〜1 で指定してください (${probability})`);
    }
    return this.next() < probability;
  }

  /** 配列から1要素を選んで返す。空配列ならエラー */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('SeededRng.pick: 空の配列からは選べません');
    }
    return items[this.nextInt(0, items.length - 1)] as T;
  }

  /** 配列を並べ替えた新しい配列を返す(元の配列は変更しない) */
  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = result[i] as T;
      result[i] = result[j] as T;
      result[j] = tmp;
    }
    return result;
  }

  /** 現在の内部状態を返す */
  getState(): SeededRngState {
    return [this.a, this.b, this.c, this.d];
  }

  /** getState() で得た状態に戻す */
  setState(state: SeededRngState): void {
    if (state.length !== 4 || !state.every((v) => Number.isInteger(v) && v >= 0 && v < UINT32_RANGE)) {
      throw new RangeError('SeededRng.setState: 状態は 32bit 符号なし整数 4 個で指定してください');
    }
    [this.a, this.b, this.c, this.d] = state;
  }
}
