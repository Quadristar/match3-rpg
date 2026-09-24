/**
 * デモの画像を、基準点に置き、領域の短い辺に対する割合の大きさに合わせる。
 */
import type { Sprite } from 'pixi.js';
import type { Point, Rect } from '../../../services/layout/layoutTypes';

export function fitPicture(sprite: Sprite, anchor: Point, region: Rect, ratio: number): void {
  const size = Math.min(region.width, region.height) * ratio;
  const textureSize = Math.max(sprite.texture.width, sprite.texture.height, 1);
  sprite.scale.set(size / textureSize);
  sprite.position.set(anchor.x, anchor.y);
}
