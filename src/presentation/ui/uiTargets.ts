/**
 * UI の当たり判定の対象と、手前にある対象を探す処理。
 *
 * - 対象は表示物(Container)自身が UITarget を実装する(Button・Panel)
 * - 位置は画面座標で受け取り、各対象が toLocal で自分の座標に直して判定する
 *   (親が拡大縮小・移動していても、表示どおりの位置で判定される)
 * - 手前の判定は Pixi の描画順(子は親の後、兄弟は後ろの子ほど手前)に従う。
 *   zIndex による並べ替え(sortableChildren)は考慮しない(仮仕様)
 */
import type { Container } from 'pixi.js';
import type { Point } from '../../services/layout/layoutTypes';

/** 押せる対象(Button) */
export interface PressableTarget {
  readonly uiRole: 'pressable';
  /** 無効なら押下中の見た目にも実行にもならない(ただし背後には入力を通さない) */
  readonly enabled: boolean;
  /** 画面座標の点が当たっているか */
  hitTest(global: Point): boolean;
  /** 押下中の見た目にする・戻す */
  setPressed(pressed: boolean): void;
  /** 実行する(ボタンの上で指を離したとき) */
  activate(): void;
}

/** 入力を遮る対象(Panel)。モーダルなら、当たっていなくても背後に入力を通さない */
export interface BlockerTarget {
  readonly uiRole: 'blocker';
  readonly modal: boolean;
  hitTest(global: Point): boolean;
}

export type UITarget = PressableTarget | BlockerTarget;

function isUITarget(value: object): value is UITarget {
  const role = (value as { uiRole?: unknown }).uiRole;
  return role === 'pressable' || role === 'blocker';
}

/** 表示されているか(自分と、root までの親がすべて visible かつ renderable) */
export function isShownWithin(target: Container, root: Container): boolean {
  let node: Container | null = target;
  while (node !== null) {
    if (!node.visible || !node.renderable) {
      return false;
    }
    if (node === root) {
      return true;
    }
    node = node.parent;
  }
  return false; // root の外にある
}

/**
 * root の中で、画面座標 global にある最も手前の UI 対象を返す。
 * - 非表示(visible / renderable が false)の部分木は調べない
 * - モーダルの Panel より奥にあるものは、当たっていても返さない(モーダル自身を返す)
 * - 何もなければ null(ゲーム側に入力を渡す)
 */
export function findUITarget(root: Container, global: Point): (UITarget & Container) | null {
  if (!root.visible || !root.renderable) {
    return null;
  }
  // 手前から調べる: 後ろの子から順に、子孫を先に、最後に自分
  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = root.children[i];
    if (child !== undefined) {
      const found = findUITarget(child, global);
      if (found !== null) {
        return found;
      }
    }
  }
  if (isUITarget(root)) {
    if (root.hitTest(global)) {
      return root;
    }
    if (root.uiRole === 'blocker' && root.modal) {
      return root;
    }
  }
  return null;
}
