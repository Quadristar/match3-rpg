/**
 * MoveResult を「再生の手順」に変える。Pixi・GSAP に依存しない。
 *
 * 描画側(BoardView)は、actions を先頭から順に1つずつ再生する(前の手順が終わってから次へ)。
 * 時間はすべて再生全体の速さ(PLAYBACK_CONFIG.speed)が 1 のときの値。全体の速さは再生側で1か所だけ変える。
 */
import { type BoardState, type Cell, type MoveResult, nextBoard, type Tile } from '../../../systems/puzzle';
import type { PlaybackTimings } from './boardViewConfig';

/** パネル1つの移動。spawn があれば、盤面の上(from)に新しいパネルが現れて to へ落ちる */
export interface TileMove {
  readonly from: Cell;
  readonly to: Cell;
  readonly spawn?: Tile;
  /** 移動にかける時間(落ちる距離に比例) */
  readonly durationMs: number;
}

export type PlaybackAction =
  /** 2つのパネルの位置を入れ替える(揃わないときは、同じ入れ替えをもう一度行って戻す) */
  | { readonly type: 'swap'; readonly a: Cell; readonly b: Cell; readonly durationMs: number }
  /** パネルを消す。combo はこの消去が何段目の連鎖か(1 から) */
  | { readonly type: 'clear'; readonly combo: number; readonly cells: readonly Cell[]; readonly durationMs: number }
  /** 落下と補充(同時に動かす)。durationMs は moves の中で最も長い時間 */
  | { readonly type: 'fall'; readonly moves: readonly TileMove[]; readonly durationMs: number }
  /** 盤面全体を board に置き換える(詰みの解消) */
  | { readonly type: 'reshuffle'; readonly board: BoardState; readonly durationMs: number }
  /** 何もせずに待つ */
  | { readonly type: 'wait'; readonly durationMs: number };

export interface PlaybackPlan {
  readonly actions: readonly PlaybackAction[];
  /** 再生が終わった後の盤面(再配置があればその盤面)。回転時などに即座に終えるときもこの盤面を描く */
  readonly finalBoard: BoardState;
  /** 連鎖の段数(揃わなかった場合は 0) */
  readonly comboCount: number;
  /** actions の時間の合計 */
  readonly totalMs: number;
}

/**
 * 元の盤面 board と、その盤面で resolveMove した結果から、再生の手順を作る。
 * 盤面の外・隣でない入れ替え(no-match 以外の無効)は、動きのない空の手順にする。
 */
export function buildPlaybackPlan(board: BoardState, result: MoveResult, timings: PlaybackTimings): PlaybackPlan {
  const actions: PlaybackAction[] = [];
  const { a, b } = result.move;
  if (!result.valid) {
    if (result.reason === 'no-match') {
      actions.push({ type: 'swap', a, b, durationMs: timings.swapMs }, { type: 'swap', a, b, durationMs: timings.swapMs });
    }
    return finish(actions, board, 0);
  }

  actions.push({ type: 'swap', a, b, durationMs: timings.swapMs });
  result.steps.forEach((step, index) => {
    if (index > 0) {
      actions.push({ type: 'wait', durationMs: timings.stepPauseMs });
    }
    actions.push({ type: 'clear', combo: index + 1, cells: step.removed, durationMs: timings.clearMs });

    // 列ごとの補充の数。補充するパネルは、その数だけ盤面の上に並んでから落ちてくる
    const spawnCount = new Map<number, number>();
    for (const spawn of step.spawns) {
      spawnCount.set(spawn.cell.col, (spawnCount.get(spawn.cell.col) ?? 0) + 1);
    }
    const moves: TileMove[] = [
      ...step.falls.map((fall) => moveOf(fall.from, fall.to, timings)),
      ...step.spawns.map((spawn) => {
        const from = { row: spawn.cell.row - (spawnCount.get(spawn.cell.col) ?? 0), col: spawn.cell.col };
        return { ...moveOf(from, spawn.cell, timings), spawn: spawn.tile };
      }),
    ];
    actions.push({ type: 'fall', moves, durationMs: Math.max(0, ...moves.map((m) => m.durationMs)) });
  });
  if (result.reshuffled !== undefined) {
    actions.push({ type: 'reshuffle', board: result.reshuffled, durationMs: timings.reshuffleMs });
  }
  return finish(actions, nextBoard(result), result.steps.length);
}

function moveOf(from: Cell, to: Cell, timings: PlaybackTimings): TileMove {
  return { from, to, durationMs: (to.row - from.row) * timings.fallMsPerCell };
}

function finish(actions: PlaybackAction[], finalBoard: BoardState, comboCount: number): PlaybackPlan {
  const totalMs = actions.reduce((sum, action) => sum + action.durationMs, 0);
  return { actions, finalBoard, comboCount, totalMs };
}
