/**
 * LayoutManager: 画面の向きと配置を一元管理する。
 *
 * - 画面サイズとセーフエリアを受け取り、レイアウト定義から配置を計算する
 * - 向き・サイズ・セーフエリアが変わったら、登録された側に通知する
 *
 * 画面サイズやセーフエリアの取得(DOM)は呼び出し側(app/Game)が行い、update() に渡す。
 * そのため、このクラスは DOM・Pixi に依存せずテストできる。
 */
import { computeLayout } from './computeLayout';
import type { Insets, Layout, LayoutDefinition, LogicalSizes, ScreenInput } from './layoutTypes';

export type LayoutListener<R extends string, A extends string> = (layout: Layout<R, A>) => void;

function sameInsets(a: Insets, b: Insets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

function sameInput(a: ScreenInput, b: ScreenInput): boolean {
  return a.width === b.width && a.height === b.height && sameInsets(a.safeAreaInsets, b.safeAreaInsets);
}

export class LayoutManager<R extends string = string, A extends string = string> {
  private readonly listeners = new Set<LayoutListener<R, A>>();
  private input: ScreenInput;
  private layout: Layout<R, A>;

  constructor(
    private readonly logicalSizes: LogicalSizes,
    private readonly definition: LayoutDefinition<R, A>,
    initialInput: ScreenInput,
  ) {
    this.input = initialInput;
    this.layout = computeLayout(initialInput, logicalSizes, definition);
  }

  /** 現在のレイアウト */
  get current(): Layout<R, A> {
    return this.layout;
  }

  /**
   * 画面の状態を反映する。前回と変わっていれば再計算して通知し、true を返す。
   */
  update(input: ScreenInput): boolean {
    if (sameInput(this.input, input)) {
      return false;
    }
    this.input = input;
    this.layout = computeLayout(input, this.logicalSizes, this.definition);
    for (const listener of [...this.listeners]) {
      listener(this.layout);
    }
    return true;
  }

  /** 変更の通知を受け取る。戻り値の関数を呼ぶと登録を解除する */
  onChange(listener: LayoutListener<R, A>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
