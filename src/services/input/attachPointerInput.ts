/**
 * DOM の Pointer Events(マウス・タッチ・ペン共通)を InputManager に渡す。
 *
 * - ポインタをキャプチャし、指が要素の外に出ても離すまで追跡する
 * - ブラウザ標準のスクロール・ズーム・長押しメニューを抑止する
 * - マウスは左ボタンだけを扱う
 *
 * 戻り値の関数を呼ぶと、イベントの登録を解除する。
 */
import type { Point } from '../layout/layoutTypes';
import type { InputManager } from './InputManager';

export function attachPointerInput(element: HTMLElement, input: InputManager): () => void {
  // スクロール・ピンチズーム・ダブルタップズームを起こさない
  element.style.touchAction = 'none';

  const toScreen = (event: PointerEvent): Point => {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // キャプチャできない環境でも、要素の中での操作は受け付ける
    }
    input.pointerDown(event.pointerId, toScreen(event), event.timeStamp);
  };
  const onMove = (event: PointerEvent): void => {
    input.pointerMove(event.pointerId, toScreen(event));
  };
  const onUp = (event: PointerEvent): void => {
    input.pointerUp(event.pointerId, toScreen(event), event.timeStamp);
  };
  const onCancel = (event: PointerEvent): void => {
    input.pointerCancel(event.pointerId);
  };
  const onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
  element.addEventListener('contextmenu', onContextMenu);

  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerup', onUp);
    element.removeEventListener('pointercancel', onCancel);
    element.removeEventListener('contextmenu', onContextMenu);
  };
}
