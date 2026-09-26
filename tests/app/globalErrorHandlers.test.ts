/**
 * window の error・unhandledrejection を受け取って通知するテスト(window の代わりに EventTarget を使う)。
 */
import { describe, expect, it, vi } from 'vitest';
import { installGlobalErrorHandlers } from '../../src/app/globalErrorHandlers';

/** ErrorEvent・PromiseRejectionEvent の代わり(Node にはないため、プロパティを足した Event を使う) */
function eventWith(type: string, props: Record<string, unknown>): Event {
  return Object.assign(new Event(type), props);
}

describe('installGlobalErrorHandlers', () => {
  it('error イベントのエラーを通知する', () => {
    const target = new EventTarget();
    const report = vi.fn();
    installGlobalErrorHandlers(target, report);
    const error = new Error('ticker failed');
    target.dispatchEvent(eventWith('error', { error, message: 'Uncaught Error: ticker failed' }));
    expect(report).toHaveBeenCalledWith(error);
  });

  it('error イベントにエラーがなければ message を通知する', () => {
    const target = new EventTarget();
    const report = vi.fn();
    installGlobalErrorHandlers(target, report);
    target.dispatchEvent(eventWith('error', { error: null, message: 'Script error.' }));
    expect(report).toHaveBeenCalledWith('Script error.');
  });

  it('unhandledrejection の理由を通知する', () => {
    const target = new EventTarget();
    const report = vi.fn();
    installGlobalErrorHandlers(target, report);
    const reason = new Error('rejected');
    target.dispatchEvent(eventWith('unhandledrejection', { reason }));
    expect(report).toHaveBeenCalledWith(reason);
  });

  it('解除した後は通知しない', () => {
    const target = new EventTarget();
    const report = vi.fn();
    const uninstall = installGlobalErrorHandlers(target, report);
    uninstall();
    target.dispatchEvent(eventWith('error', { error: new Error('x') }));
    target.dispatchEvent(eventWith('unhandledrejection', { reason: 'y' }));
    expect(report).not.toHaveBeenCalled();
  });
});
