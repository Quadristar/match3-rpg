/**
 * エントリーポイント。ゲームを起動するだけで、処理は app/ に置く。
 */
import { Game } from './app/Game';
import { showBootError } from './app/showBootError';
import { gameSetup } from './presentation/game';

const root = document.getElementById('app');

if (root === null) {
  throw new Error('#app 要素が見つかりません');
}

Game.start(root, gameSetup).catch((error: unknown) => {
  showBootError(root, error);
});
