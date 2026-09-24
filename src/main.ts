/**
 * エントリーポイント。ゲームを起動するだけで、処理は app/ に置く。
 *
 * 雛形ではデモ(presentation/scenes/demo/)を起動する。
 * ゲームを作るときは、demoGame をゲーム用のレイアウト定義・シーンに差し替える。
 */
import { Game } from './app/Game';
import { showBootError } from './app/showBootError';
import { demoGame } from './presentation/scenes/demo';

const root = document.getElementById('app');

if (root === null) {
  throw new Error('#app 要素が見つかりません');
}

Game.start(root, demoGame).catch((error: unknown) => {
  showBootError(root, error);
});
