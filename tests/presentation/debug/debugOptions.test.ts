import { describe, expect, it } from 'vitest';
import { DEBUG_DISABLED, parseDebugOptions } from '../../../src/presentation/debug/debugOptions';

describe('parseDebugOptions', () => {
  it('?debug がなければ無効で、ほかのパラメータも無視する', () => {
    expect(parseDebugOptions('')).toEqual(DEBUG_DISABLED);
    expect(parseDebugOptions('?safearea=40,0,24,0&assetfail=a&assetdelay=500&quality=low&savefail')).toEqual(DEBUG_DISABLED);
  });

  it('?debug だけなら有効で、上書きなし', () => {
    expect(parseDebugOptions('?debug')).toEqual({ ...DEBUG_DISABLED, enabled: true });
    expect(parseDebugOptions('?debug=1')).toMatchObject({ enabled: true });
  });

  it('safearea=上,右,下,左 を読み取る', () => {
    expect(parseDebugOptions('?debug&safearea=40,0,24,8').safeAreaOverride).toEqual({ top: 40, right: 0, bottom: 24, left: 8 });
    expect(parseDebugOptions('?safearea=1.5, 2 ,3,4&debug').safeAreaOverride).toEqual({ top: 1.5, right: 2, bottom: 3, left: 4 });
  });

  it('safearea の数が足りない・負の値・数値でない場合は上書きしない', () => {
    expect(parseDebugOptions('?debug&safearea=1,2,3').safeAreaOverride).toBeNull();
    expect(parseDebugOptions('?debug&safearea=1,2,3,-4').safeAreaOverride).toBeNull();
    expect(parseDebugOptions('?debug&safearea=a,b,c,d').safeAreaOverride).toBeNull();
  });

  it('assetfail はカンマ区切りのバンドル名', () => {
    expect(parseDebugOptions('?debug&assetfail=demoB').assetFailBundles).toEqual(['demoB']);
    expect(parseDebugOptions('?debug&assetfail=demoA,%20demoB,').assetFailBundles).toEqual(['demoA', 'demoB']);
  });

  it('assetdelay はミリ秒。不正な値は 0、上限は 10 秒', () => {
    expect(parseDebugOptions('?debug&assetdelay=1500').assetDelayMs).toBe(1500);
    expect(parseDebugOptions('?debug&assetdelay=abc').assetDelayMs).toBe(0);
    expect(parseDebugOptions('?debug&assetdelay=-5').assetDelayMs).toBe(0);
    expect(parseDebugOptions('?debug&assetdelay=999999').assetDelayMs).toBe(10_000);
  });

  it('quality は low / medium / high のどれか。それ以外は null', () => {
    expect(parseDebugOptions('?debug&quality=low').quality).toBe('low');
    expect(parseDebugOptions('?debug&quality=high').quality).toBe('high');
    expect(parseDebugOptions('?debug&quality=ultra').quality).toBeNull();
    expect(parseDebugOptions('?debug').quality).toBeNull();
  });

  it('savefail があれば保存を失敗させる', () => {
    expect(parseDebugOptions('?debug&savefail').saveFail).toBe(true);
    expect(parseDebugOptions('?debug').saveFail).toBe(false);
  });
});
