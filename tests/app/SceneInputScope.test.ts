import { describe, expect, it, vi } from 'vitest';
import { SceneInputScope } from '../../src/app/SceneInputScope';

function fakeInput() {
  const offs: ReturnType<typeof vi.fn>[] = [];
  const resumes: ReturnType<typeof vi.fn>[] = [];
  return {
    offs,
    resumes,
    on: vi.fn(() => {
      const off = vi.fn();
      offs.push(off);
      return off;
    }),
    pause: vi.fn(() => {
      const resume = vi.fn();
      resumes.push(resume);
      return resume;
    }),
    addPointerHandler: vi.fn(() => {
      const off = vi.fn();
      offs.push(off);
      return off;
    }),
  };
}

describe('SceneInputScope', () => {
  it('dispose で、登録した受け取りと一時停止をすべて解除する', () => {
    const input = fakeInput();
    const scope = new SceneInputScope(input);
    scope.on(() => {});
    scope.on(() => {});
    scope.addPointerHandler({ down: () => true, move: () => {}, up: () => {}, cancel: () => {} });
    scope.pause();
    scope.dispose();
    expect(input.offs).toHaveLength(3);
    expect(input.offs.every((off) => off.mock.calls.length === 1)).toBe(true);
    expect(input.resumes[0]).toHaveBeenCalledTimes(1);
  });

  it('途中で解除したものは、dispose で二重に解除しない', () => {
    const input = fakeInput();
    const scope = new SceneInputScope(input);
    const off = scope.on(() => {});
    const resume = scope.pause();
    off();
    off();
    resume();
    scope.dispose();
    expect(input.offs[0]).toHaveBeenCalledTimes(1);
    expect(input.resumes[0]).toHaveBeenCalledTimes(1);
  });

  it('dispose の後の登録は何もしない', () => {
    const input = fakeInput();
    const scope = new SceneInputScope(input);
    scope.dispose();
    scope.on(() => {})();
    scope.pause()();
    expect(input.on).not.toHaveBeenCalled();
    expect(input.pause).not.toHaveBeenCalled();
  });
});
