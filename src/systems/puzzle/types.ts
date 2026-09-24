/**
 * パズルロジックで使う型。描画・入力に依存しない。
 *
 * 座標は (row, col)。row 0 が盤面のいちばん上、col 0 がいちばん左。
 * パネルは上から下へ落ちる。
 */

/** パネルの種類。0 〜 kindCount-1 の番号(意味づけは data/tileEffects で行う予定) */
export type TileKind = number;

/**
 * パネルの修飾(特殊パネル・属性など)。
 * 仮仕様: 今は存在しないため never とし、modifiers は常に空の配列。特殊パネルを作る段階で定義する。
 */
export type TileModifier = never;

/** パネル */
export interface Tile {
  readonly kind: TileKind;
  readonly modifiers: readonly TileModifier[];
}

/** 盤面上の位置 */
export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** 盤面(すべてのマスにパネルがある状態)。tiles[row][col] */
export interface BoardState {
  readonly rows: number;
  readonly cols: number;
  readonly tiles: readonly (readonly Tile[])[];
}

/**
 * マッチの形状(仮仕様)
 * - line3 / line4: 縦または横の一直線に 3 個 / 4 個
 * - line5: 一直線に 5 個以上を含む(L・T の形でも、5 個以上の列があれば line5 を優先する)
 * - L: 縦の列と横の列が、どちらも端どうしで交わる
 * - T: 縦の列と横の列が、少なくとも一方の端以外で交わる(十字も T とする)
 */
export type MatchShape = 'line3' | 'line4' | 'line5' | 'L' | 'T';

/** 揃ったパネルのまとまり。縦と横の列がマスを共有する場合は1つのまとまりにする */
export interface MatchGroup {
  readonly kind: TileKind;
  readonly shape: MatchShape;
  /** まとまりに含まれるマス(上の行から、同じ行は左から順) */
  readonly cells: readonly Cell[];
}

/** 落下: from のパネルが to へ移る(同じ列で、下方向) */
export interface Fall {
  readonly from: Cell;
  readonly to: Cell;
}

/** 補充: cell に新しいパネル tile が入る(盤面の上から落ちてくる) */
export interface Spawn {
  readonly cell: Cell;
  readonly tile: Tile;
}

/**
 * 連鎖1段ぶんの記録。描画側は removed → falls → spawns の順に再生する。
 * falls は列ごとに下のパネルから順に並ぶ。この順に移せば、移動先は必ず空いている。
 */
export interface CascadeStep {
  readonly matches: readonly MatchGroup[];
  /** 消えたマス(matches の cells をまとめたもの。上の行から、同じ行は左から順) */
  readonly removed: readonly Cell[];
  readonly falls: readonly Fall[];
  readonly spawns: readonly Spawn[];
}

/** 入れ替えの操作(隣り合う2マス) */
export interface Move {
  readonly a: Cell;
  readonly b: Cell;
}

/**
 * 入れ替えられない理由
 * - out-of-board: 盤面の外のマスを指定した
 * - not-adjacent: 上下左右に隣り合っていない(同じマス・斜めを含む)
 * - no-match: 入れ替えても揃わない
 */
export type InvalidMoveReason = 'out-of-board' | 'not-adjacent' | 'no-match';

/**
 * 入れ替えの結果。
 *
 * 描画側は、元の盤面で a と b を入れ替えてから steps を順に再生すると finalBoard になる。
 * reshuffled があるときは、その後に盤面を reshuffled に置き換える(詰みの解消)。
 * 次の操作に使う盤面は `reshuffled ?? finalBoard`(nextBoard() で取り出せる)。
 */
export type MoveResult =
  | {
      readonly valid: true;
      readonly move: Move;
      /** 連鎖1段ごとの記録(1段以上)。段数がコンボ数になる */
      readonly steps: readonly CascadeStep[];
      /** 連鎖がすべて終わった盤面 */
      readonly finalBoard: BoardState;
      /** finalBoard に動かせる手がないとき、並べ替えた盤面 */
      readonly reshuffled?: BoardState;
    }
  | {
      readonly valid: false;
      readonly move: Move;
      readonly reason: InvalidMoveReason;
      /** 常に空 */
      readonly steps: readonly [];
      /** 元の盤面のまま */
      readonly finalBoard: BoardState;
    };
