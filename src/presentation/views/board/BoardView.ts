/**
 * 盤面の表示と、再生の手順(PlaybackPlan)の再生。
 *
 * - 再生は GSAP のタイムラインで行う。全体の速さは timeScale の1か所で変える(setPlaybackSpeed)
 * - finishNow() で再生を即座に終え、再生後の盤面(plan.finalBoard)から描き直す(回転時など)
 * - パネルの表示物(TileView)は ObjectPool で再利用する
 * - 盤面の外(上)から落ちてくる補充のパネルは、盤面の範囲でマスクして隠す
 *
 * 配置は layout() で受け取った BoardGeometry に従う(このコンテナの原点 = 盤面の左上)。
 */
import { gsap } from 'gsap';
import { Container, type DestroyOptions, Graphics } from 'pixi.js';
import { ObjectPool } from '../../../core/ObjectPool';
import type { BoardState, Cell } from '../../../systems/puzzle';
import type { BoardGeometry } from './BoardGeometry';
import { BOARD_VIEW_CONFIG } from './boardViewConfig';
import type { PlaybackAction, PlaybackPlan } from './playbackPlan';
import { TileView } from './TileView';

const C = BOARD_VIEW_CONFIG;

export interface PlaybackCallbacks {
  /** 連鎖の段の消去を始めたとき(combo は 1 から) */
  readonly onCombo?: (combo: number) => void;
  /** 再生が終わったとき(finishNow で即座に終えた場合も呼ぶ) */
  readonly onComplete?: (plan: PlaybackPlan) => void;
}

type TileGrid = (TileView | null)[][];

export class BoardView extends Container {
  private readonly backdrop = new Graphics({ label: 'BoardView.backdrop' });
  private readonly tilesLayer = new Container({ label: 'BoardView.tiles' });
  private readonly tilesMask = new Graphics({ label: 'BoardView.mask' });
  private readonly selectionFrame = new Graphics({ label: 'BoardView.selection' });
  private readonly pool = new ObjectPool<TileView>({
    create: () => new TileView(),
    reset: (tile) => {
      gsap.killTweensOf([tile, tile.scale]);
      tile.resetForPool();
    },
    dispose: (tile) => tile.destroy({ children: true }),
  });
  /** 取り出し中のパネル(再生中に消えるものを含む) */
  private readonly activeTiles = new Set<TileView>();
  private tiles: TileGrid = [];
  private geometry: BoardGeometry | null = null;
  private board: BoardState | null = null;
  private selected: Cell | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private playing: { readonly plan: PlaybackPlan; readonly callbacks: PlaybackCallbacks } | null = null;
  private speed: number = C.playbackSpeed;

  constructor() {
    super({ label: 'BoardView' });
    this.tilesLayer.mask = this.tilesMask;
    this.addChild(this.backdrop, this.tilesLayer, this.tilesMask, this.selectionFrame);
  }

  /** 再生中か */
  get isPlaying(): boolean {
    return this.playing !== null;
  }

  /** 盤面を即座に表示する(再生中なら即座に終える) */
  setBoard(board: BoardState): void {
    this.finishNow();
    this.board = board;
    this.drawTiles(board);
  }

  /** 配置を変える。再生中なら即座に終えてから描き直す */
  layout(geometry: BoardGeometry): void {
    this.finishNow();
    this.geometry = geometry;
    this.position.set(geometry.origin.x, geometry.origin.y);
    this.drawBackdrop(geometry);
    if (this.board !== null) {
      this.drawTiles(this.board);
    }
    this.drawSelection();
  }

  /** 選択中のマスを表示する(null で解除) */
  setSelected(cell: Cell | null): void {
    this.selected = cell;
    this.drawSelection();
  }

  /** 再生全体の速さを変える(1 が標準)。再生中にも反映する */
  setPlaybackSpeed(speed: number): void {
    this.speed = speed;
    this.timeline?.timeScale(speed);
  }

  /** 再生を始める。再生中なら、前の再生を即座に終えてから始める */
  play(plan: PlaybackPlan, callbacks: PlaybackCallbacks = {}): void {
    this.finishNow();
    this.board = plan.finalBoard;
    this.setSelected(null);
    const geometry = this.geometry;
    if (geometry === null || plan.actions.length === 0) {
      this.drawTiles(plan.finalBoard);
      callbacks.onComplete?.(plan);
      return;
    }
    this.playing = { plan, callbacks };
    const timeline = gsap.timeline({ onComplete: () => this.complete() });
    timeline.timeScale(this.speed);
    const grid: TileGrid = this.tiles.map((row) => row.slice());
    let at = 0;
    for (const action of plan.actions) {
      this.schedule(timeline, action, at, grid, geometry, callbacks);
      at += action.durationMs / 1000;
    }
    this.timeline = timeline;
  }

  /** 再生中なら即座に終え、再生後の盤面から描き直す */
  finishNow(): void {
    if (this.playing === null) {
      return;
    }
    this.complete();
  }

  /** 再生を止める(描き直さない。シーンの終了時用) */
  stop(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.playing = null;
  }

  override destroy(options?: DestroyOptions): void {
    this.stop();
    this.releaseAllTiles();
    this.pool.clear();
    super.destroy(options);
  }

  /** 再生を終える: タイムラインを止め、再生後の盤面から描き直して通知する */
  private complete(): void {
    const playing = this.playing;
    this.stop();
    if (playing === null) {
      return;
    }
    this.tilesLayer.alpha = 1;
    this.drawTiles(playing.plan.finalBoard);
    playing.callbacks.onComplete?.(playing.plan);
  }

  /** 1つの手順をタイムラインの at 秒の位置に並べる。grid は並べた時点でのパネルの配置 */
  private schedule(
    timeline: gsap.core.Timeline,
    action: PlaybackAction,
    at: number,
    grid: TileGrid,
    geometry: BoardGeometry,
    callbacks: PlaybackCallbacks,
  ): void {
    const duration = action.durationMs / 1000;
    const tileAt = (cell: Cell): TileView | null => grid[cell.row]?.[cell.col] ?? null;
    const setTile = (cell: Cell, tile: TileView | null): void => {
      const row = grid[cell.row];
      if (row !== undefined) row[cell.col] = tile;
    };
    switch (action.type) {
      case 'swap': {
        const tileA = tileAt(action.a);
        const tileB = tileAt(action.b);
        const posA = geometry.localCenter(action.a);
        const posB = geometry.localCenter(action.b);
        if (tileA !== null) timeline.to(tileA, { x: posB.x, y: posB.y, duration, ease: 'power2.inOut' }, at);
        if (tileB !== null) timeline.to(tileB, { x: posA.x, y: posA.y, duration, ease: 'power2.inOut' }, at);
        setTile(action.a, tileB);
        setTile(action.b, tileA);
        return;
      }
      case 'clear': {
        const combo = action.combo;
        timeline.call(() => callbacks.onCombo?.(combo), undefined, at);
        for (const cell of action.cells) {
          const tile = tileAt(cell);
          setTile(cell, null);
          if (tile === null) continue;
          timeline.to(tile.scale, { x: 0, y: 0, duration, ease: 'back.in' }, at);
          timeline.to(tile, { alpha: 0, duration, ease: 'power1.in' }, at);
          timeline.call(() => this.releaseTile(tile), undefined, at + duration);
        }
        return;
      }
      case 'fall': {
        const size = geometry.cellSize * C.tileSizeRatio;
        for (const move of action.moves) {
          let tile: TileView | null;
          if (move.spawn !== undefined) {
            tile = this.acquireTile(move.spawn.kind, size, geometry.localCenter(move.from));
            // 落ち始めるまでは隠しておく
            tile.visible = false;
            timeline.set(tile, { visible: true }, at);
          } else {
            tile = tileAt(move.from);
            setTile(move.from, null);
          }
          setTile(move.to, tile);
          if (tile === null) continue;
          const to = geometry.localCenter(move.to);
          timeline.to(tile, { x: to.x, y: to.y, duration: move.durationMs / 1000, ease: 'power2.in' }, at);
        }
        return;
      }
      case 'reshuffle': {
        const board = action.board;
        timeline.to(this.tilesLayer, { alpha: 0, duration: duration / 2 }, at);
        timeline.call(() => this.drawTiles(board), undefined, at + duration / 2);
        timeline.to(this.tilesLayer, { alpha: 1, duration: duration / 2 }, at + duration / 2);
        return;
      }
      case 'wait':
        return;
    }
  }

  /** 盤面のパネルをすべて描き直す(取り出し中のパネルはすべてプールに戻す) */
  private drawTiles(board: BoardState): void {
    this.releaseAllTiles();
    const geometry = this.geometry;
    if (geometry === null) {
      this.tiles = [];
      return;
    }
    const size = geometry.cellSize * C.tileSizeRatio;
    this.tiles = board.tiles.map((row, r) =>
      row.map((tile, c) => this.acquireTile(tile.kind, size, geometry.localCenter({ row: r, col: c }))),
    );
  }

  private acquireTile(kind: number, size: number, position: { x: number; y: number }): TileView {
    const tile = this.pool.acquire();
    tile.setKind(kind, size);
    tile.position.set(position.x, position.y);
    this.tilesLayer.addChild(tile);
    this.activeTiles.add(tile);
    return tile;
  }

  private releaseTile(tile: TileView): void {
    if (this.activeTiles.delete(tile)) {
      this.pool.release(tile);
    }
  }

  private releaseAllTiles(): void {
    for (const tile of [...this.activeTiles]) {
      this.releaseTile(tile);
    }
    this.tiles = [];
  }

  private drawBackdrop(geometry: BoardGeometry): void {
    const { cellSize, rows, cols } = geometry;
    const g = this.backdrop.clear();
    g.rect(0, 0, geometry.width, geometry.height).fill(C.boardColor);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = C.cellColors[(r + c) % C.cellColors.length] ?? C.boardColor;
        g.rect(c * cellSize, r * cellSize, cellSize, cellSize).fill(color);
      }
    }
    this.tilesMask.clear().rect(0, 0, geometry.width, geometry.height).fill(0xffffff);
  }

  private drawSelection(): void {
    const g = this.selectionFrame.clear();
    const geometry = this.geometry;
    const cell = this.selected;
    if (geometry === null || cell === null) {
      return;
    }
    const s = geometry.cellSize;
    const w = C.selection.lineWidth;
    g.rect(cell.col * s + w / 2, cell.row * s + w / 2, s - w, s - w).stroke({ width: w, color: C.selection.color });
  }
}
