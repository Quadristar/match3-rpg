/**
 * Pixi のイベントシステムを止める。
 *
 * 入力は InputManager に一本化しているため、Pixi 側でもポインタを処理すると二重に反応するおそれがある。
 * - 初期化オプション(eventMode: 'none'、eventFeatures をすべて false)で処理を無効にする(Game.ts)
 * - さらに、Pixi がキャンバスと document に登録した DOM のイベントと、
 *   ポインタ移動を定期的に送り直す処理(EventsTicker)を外す(この関数)
 */
import type { Renderer } from 'pixi.js';

export function disablePixiEvents(renderer: Renderer): void {
  // setTargetElement の型は null を受け付けないが、実装は null を渡すと
  // 「登録済みのイベントをすべて外し、何も登録しない」動作をする(pixi.js 8.21 の EventSystem で確認)。
  // 型の上だけの問題のため、キャストで渡す
  renderer.events.setTargetElement(null as unknown as HTMLElement);
}
