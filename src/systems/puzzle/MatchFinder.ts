/**
 * マッチ判定: 縦・横に同じ種類が3個以上並んだものを探し、形状を判別する。
 */
import { compareCells, type ReadonlyGrid, tileAt } from './Board';
import type { BoardState, Cell, MatchGroup, MatchShape, TileKind } from './types';

/** マッチとみなす最小の長さ */
export const MIN_MATCH_LENGTH = 3;

/** 一直線の並び(縦または横) */
interface Line {
  readonly kind: TileKind;
  readonly horizontal: boolean;
  readonly cells: readonly Cell[];
}

/** 盤面のマッチをすべて返す(上のまとまりから順) */
export function findMatches(board: BoardState): MatchGroup[] {
  return findMatchesInGrid(board.tiles);
}

/** Grid のマッチをすべて返す。空きマス(null)はどの種類とも揃わない */
export function findMatchesInGrid(grid: ReadonlyGrid): MatchGroup[] {
  const lines = findLines(grid);
  const groups = groupLines(lines);
  return groups
    .map((group) => toMatchGroup(group))
    .sort((a, b) => compareCells(a.cells[0] as Cell, b.cells[0] as Cell));
}

/** 3個以上の縦・横の並びをすべて探す */
function findLines(grid: ReadonlyGrid): Line[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const lines: Line[] = [];
  const scan = (length: number, cellOf: (i: number) => Cell, horizontal: boolean): void => {
    let start = 0;
    for (let i = 1; i <= length; i++) {
      const startCell = cellOf(start);
      const startTile = tileAt(grid, startCell.row, startCell.col);
      const current = i < length ? cellOf(i) : null;
      const currentTile = current === null ? null : tileAt(grid, current.row, current.col);
      if (startTile !== null && currentTile !== null && currentTile.kind === startTile.kind) {
        continue;
      }
      if (startTile !== null && i - start >= MIN_MATCH_LENGTH) {
        const cells = Array.from({ length: i - start }, (_, k) => cellOf(start + k));
        lines.push({ kind: startTile.kind, horizontal, cells });
      }
      start = i;
    }
  };
  for (let row = 0; row < rows; row++) {
    scan(cols, (col) => ({ row, col }), true);
  }
  for (let col = 0; col < cols; col++) {
    scan(rows, (row) => ({ row, col }), false);
  }
  return lines;
}

/** マスを共有する並びどうしを1つのまとまりにする(マスを共有するのは同じ種類の縦と横だけ) */
function groupLines(lines: readonly Line[]): Line[][] {
  const parent = lines.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) {
      root = parent[root] as number;
    }
    parent[i] = root;
    return root;
  };
  const owner = new Map<string, number>();
  lines.forEach((line, index) => {
    for (const cell of line.cells) {
      const key = `${cell.row},${cell.col}`;
      const other = owner.get(key);
      if (other === undefined) {
        owner.set(key, index);
      } else {
        parent[find(index)] = find(other);
      }
    }
  });
  const groups = new Map<number, Line[]>();
  lines.forEach((line, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(line);
    groups.set(root, group);
  });
  return [...groups.values()];
}

function toMatchGroup(lines: readonly Line[]): MatchGroup {
  const unique = new Map<string, Cell>();
  for (const line of lines) {
    for (const cell of line.cells) {
      unique.set(`${cell.row},${cell.col}`, cell);
    }
  }
  const first = lines[0] as Line;
  return { kind: first.kind, shape: classifyShape(lines), cells: [...unique.values()].sort(compareCells) };
}

/** 形状を判別する(判別の規則は MatchShape を参照。仮仕様) */
function classifyShape(lines: readonly Line[]): MatchShape {
  const maxLength = Math.max(...lines.map((line) => line.cells.length));
  if (maxLength >= 5) {
    return 'line5';
  }
  const horizontals = lines.filter((line) => line.horizontal);
  const verticals = lines.filter((line) => !line.horizontal);
  if (horizontals.length > 0 && verticals.length > 0) {
    for (const h of horizontals) {
      for (const v of verticals) {
        const crossing = h.cells.find((hc) => v.cells.some((vc) => vc.row === hc.row && vc.col === hc.col));
        if (crossing !== undefined && !(isEnd(h, crossing) && isEnd(v, crossing))) {
          return 'T';
        }
      }
    }
    return 'L';
  }
  return maxLength === 4 ? 'line4' : 'line3';
}

function isEnd(line: Line, cell: Cell): boolean {
  const first = line.cells[0] as Cell;
  const last = line.cells[line.cells.length - 1] as Cell;
  return (cell.row === first.row && cell.col === first.col) || (cell.row === last.row && cell.col === last.col);
}
