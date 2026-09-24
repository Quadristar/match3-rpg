/**
 * 読み込めなかった画像の代わりに使うテクスチャ。
 * 一目で分かるよう、マゼンタと黒の市松模様にする。
 */
import { Texture } from 'pixi.js';

/** 代わりのテクスチャの見た目 */
const FALLBACK_STYLE = {
  size: 64,
  cells: 4,
  colors: ['#ff00ff', '#000000'],
} as const;

export function createFallbackTexture(): Texture {
  const { size, cells, colors } = FALLBACK_STYLE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context !== null) {
    const cell = size / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        context.fillStyle = colors[(x + y) % 2] ?? colors[0];
        context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  return Texture.from(canvas);
}
