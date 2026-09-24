import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { countDisplayObjects, type DebugStats, formatDebugStats, FrameRateMeter } from '../../../src/presentation/debug/debugStats';

describe('FrameRateMeter', () => {
  it('計測間隔に達するまでは false を返し、達したら FPS を計算して true を返す', () => {
    const meter = new FrameRateMeter(250);
    for (let i = 0; i < 9; i++) {
      expect(meter.update(25)).toBe(false);
    }
    expect(meter.update(25)).toBe(true);
    expect(meter.fps).toBeCloseTo(40);
  });

  it('計測のたびにリセットされ、フレームが遅くなると FPS も下がる', () => {
    const meter = new FrameRateMeter(250);
    for (let i = 0; i < 10; i++) meter.update(25);
    for (let i = 0; i < 4; i++) expect(meter.update(50)).toBe(false);
    expect(meter.update(50)).toBe(true);
    expect(meter.fps).toBeCloseTo(20);
  });
});

describe('countDisplayObjects', () => {
  it('子孫を含めて数える', () => {
    const root = new Container();
    const a = new Container();
    a.addChild(new Container(), new Container());
    root.addChild(a, new Container());
    expect(countDisplayObjects(root)).toBe(5);
  });
});

describe('formatDebugStats', () => {
  const base: DebugStats = {
    fps: 59.6,
    textureBytes: 2 * 1024 * 1024,
    displayObjects: 42,
    orientation: 'portrait',
    logical: { width: 720, height: 1280 },
    scale: 0.5416,
    bundles: [
      { name: 'boot', state: 'loaded', refCount: 1, progress: 1 },
      { name: 'demoB', state: 'loading', refCount: 1, progress: 0.5 },
    ],
    assetFailures: 0,
    quality: 'medium',
    resolution: 2,
    saveStatus: 'ok',
  };

  it('FPS・推定メモリ・表示オブジェクト数・向きと論理解像度・バンドルを表示する', () => {
    expect(formatDebugStats(base)).toBe(
      [
        'FPS 60',
        'Tex 2.00 MB(推定)',
        'Obj 42',
        '縦 720×1280 ×0.54',
        'Bundle boot×1 demoB×1(読込中)',
        '品質 中 解像度 2',
        '保存 正常',
      ].join('\n'),
    );
  });

  it('バンドルがなければ(なし)、失敗があれば件数を表示する', () => {
    const text = formatDebugStats({ ...base, bundles: [], assetFailures: 2, orientation: 'landscape' });
    expect(text).toContain('Bundle (なし)');
    expect(text).toContain('読込失敗 2件');
    expect(text).toContain('横 720×1280');
  });

  it('品質と保存の状態を表示する', () => {
    const text = formatDebugStats({ ...base, quality: 'low', resolution: 1.5, saveStatus: 'memory' });
    expect(text).toContain('品質 低 解像度 1.5');
    expect(text).toContain('保存 メモリ上で動作中');
  });
});
