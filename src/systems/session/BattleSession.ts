/**
 * BattleSession: パズルとバトルをつなぐ(docs/decisions/003)。
 *
 * - 盤面の状態・バトルの状態・乱数を持つ
 * - 入れ替え(a, b)を受け取り、resolveMove → playTurn を行い、盤面の結果(MoveResult)と
 *   バトルの出来事(BattleEvent[])をまとめて返す
 * - 再生の順番(盤面の連鎖 → バトルの出来事)は描画側(BattleScene)が決める
 *
 * systems/puzzle と systems/battle の両方を import してよいのは、この session だけ(ESLint で強制)。
 * 描画に依存しない。同じシードと同じ操作なら、同じ結果になる。
 */
import { SeededRng } from '../../core/SeededRng';
import { PUZZLE_CONFIG, type PuzzleConfig } from '../../data/puzzleConfig';
import {
  type BattleData,
  type BattleState,
  type ClearedTiles,
  createBattleState,
  DEFAULT_BATTLE_DATA,
  playTurn,
  type TurnResult,
} from '../battle';
import { type BoardState, type Cell, generateBoard, type MoveResult, nextBoard, resolveMove } from '../puzzle';

export interface BattleSessionOptions {
  /** 盤面の乱数のシード */
  readonly seed: number;
  /** 戦うステージ(既定: 'prototype') */
  readonly stageId?: string;
  readonly puzzleConfig?: PuzzleConfig;
  readonly battleData?: BattleData;
}

/** 1回の入れ替えの結果 */
export interface SwapResult {
  /** 入れ替える前の盤面(盤面の再生の起点) */
  readonly boardBefore: BoardState;
  /** 盤面の結果(連鎖の再生に使う) */
  readonly move: MoveResult;
  /** バトルの結果(出来事・通った段階・ターンを消費したか) */
  readonly turn: TurnResult;
}

/** 盤面の結果を、バトルが使う形(消えたパネル)に変える。揃わなかった入れ替えは空 */
export function toClearedTiles(move: MoveResult): ClearedTiles {
  if (!move.valid) {
    return { steps: [] };
  }
  return { steps: move.steps.map((step) => step.matches.map((m) => ({ kind: m.kind, count: m.cells.length }))) };
}

export class BattleSession {
  readonly seed: number;
  private readonly rng: SeededRng;
  private readonly puzzleConfig: PuzzleConfig;
  private readonly battleData: BattleData;
  private currentBoard: BoardState;
  private currentBattle: BattleState;

  constructor(options: BattleSessionOptions) {
    this.seed = options.seed;
    this.rng = new SeededRng(options.seed);
    this.puzzleConfig = options.puzzleConfig ?? PUZZLE_CONFIG;
    this.battleData = options.battleData ?? DEFAULT_BATTLE_DATA;
    this.currentBoard = generateBoard(this.rng, this.puzzleConfig);
    this.currentBattle = createBattleState(options.stageId ?? 'prototype', this.battleData);
  }

  /** 現在の盤面(再配置があればその後の盤面) */
  get board(): BoardState {
    return this.currentBoard;
  }

  /** 現在のバトルの状態 */
  get battle(): BattleState {
    return this.currentBattle;
  }

  /** 戦闘が終わったか */
  get isOver(): boolean {
    return this.currentBattle.outcome !== 'ongoing';
  }

  /**
   * 入れ替えを行う。戦闘が終わっていたら何もせず null を返す。
   * 揃わない入れ替えは、盤面もバトルも変わらない(ターンも消費しない)。
   */
  swap(a: Cell, b: Cell): SwapResult | null {
    if (this.isOver) {
      return null;
    }
    const boardBefore = this.currentBoard;
    const move = resolveMove(boardBefore, a, b, this.rng, this.puzzleConfig);
    const turn = playTurn(this.currentBattle, toClearedTiles(move), { rules: this.battleData.rules });
    this.currentBoard = nextBoard(move);
    this.currentBattle = turn.state;
    return { boardBefore, move, turn };
  }
}
