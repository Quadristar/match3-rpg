import { describe, expect, it, vi } from 'vitest';
import { SaveManager } from '../../../src/services/save/SaveManager';
import type { SaveIssue, SaveSchema, SaveStorage } from '../../../src/services/save/saveTypes';
import { FailingStorage, MemoryStorage } from '../../../src/services/save/storages';

interface Counter {
  count: number;
}

const SCHEMA: SaveSchema<Counter> = {
  key: 'counter',
  version: 2,
  createDefault: () => ({ count: 0 }),
  // v1 は { n } だった
  migrations: { 1: (v1) => ({ count: (v1 as { n: number }).n }) },
  validate: (data): data is Counter => typeof (data as Counter | null)?.count === 'number',
};

function setup(storage: SaveStorage = new MemoryStorage(), available = true) {
  const onIssue = vi.fn<(issue: SaveIssue) => void>();
  const manager = new SaveManager({ gameId: 'game-a', storage, available, onIssue });
  return { manager, storage, onIssue };
}

describe('SaveManager: 名前空間', () => {
  it('保存キーにゲーム ID を前置きする', () => {
    const storage = new MemoryStorage();
    const { manager } = setup(storage);
    manager.open(SCHEMA).set({ count: 3 });
    expect(storage.keys()).toEqual(['game-a:counter']);
    expect(storage.getItem('game-a:counter')).toBe('{"version":2,"data":{"count":3}}');
  });

  it('ゲーム ID が違えば、同じ保存先でも互いのデータに影響しない', () => {
    const storage = new MemoryStorage();
    new SaveManager({ gameId: 'game-a', storage }).open(SCHEMA).set({ count: 5 });
    new SaveManager({ gameId: 'game-b', storage }).open(SCHEMA).set({ count: 9 });
    expect(new SaveManager({ gameId: 'game-a', storage }).open(SCHEMA).get()).toEqual({ count: 5 });
    expect(new SaveManager({ gameId: 'game-b', storage }).open(SCHEMA).get()).toEqual({ count: 9 });
  });
});

describe('SaveManager: 読み書き', () => {
  it('データがなければ初期状態', () => {
    const { manager } = setup();
    expect(manager.open(SCHEMA).get()).toEqual({ count: 0 });
  });

  it('保存したデータを次回読み込める', () => {
    const storage = new MemoryStorage();
    setup(storage).manager.open(SCHEMA).set({ count: 42 });
    expect(setup(storage).manager.open(SCHEMA).get()).toEqual({ count: 42 });
  });

  it('古いバージョンは移行し、新しい形式で書き戻す', () => {
    const storage = new MemoryStorage();
    storage.setItem('game-a:counter', JSON.stringify({ version: 1, data: { n: 7 } }));
    const { manager, onIssue } = setup(storage);
    expect(manager.open(SCHEMA).get()).toEqual({ count: 7 });
    expect(storage.getItem('game-a:counter')).toBe('{"version":2,"data":{"count":7}}');
    expect(onIssue).not.toHaveBeenCalled();
  });
});

describe('SaveManager: 異常時', () => {
  it('壊れたデータは別のキーに退避してから、初期状態で始める', () => {
    const storage = new MemoryStorage();
    storage.setItem('game-a:counter', '{broken');
    const { manager, onIssue } = setup(storage);
    expect(manager.open(SCHEMA).get()).toEqual({ count: 0 });
    expect(storage.getItem('game-a:counter.corrupt')).toBe('{broken');
    expect(storage.getItem('game-a:counter')).toBe('{"version":2,"data":{"count":0}}');
    expect(onIssue).toHaveBeenCalledTimes(1);
    expect(manager.issues[0]).toMatchObject({ kind: 'corrupt', key: 'game-a:counter' });
    expect(manager.status).toBe('ok');
  });

  it('退避に失敗した場合は、元のデータを上書きしない', () => {
    const base = new MemoryStorage();
    base.setItem('game-a:counter', '{broken');
    const { manager } = setup(new FailingStorage(base));
    expect(manager.open(SCHEMA).get()).toEqual({ count: 0 });
    expect(base.getItem('game-a:counter')).toBe('{broken');
    expect(manager.issues.map((i) => i.kind)).toEqual(['writeFailed', 'corrupt']);
  });

  it('書き込めない場合はメモリ上で動作を続け、状態を memory にする', () => {
    const { manager } = setup(new FailingStorage(new MemoryStorage()));
    const slot = manager.open(SCHEMA);
    expect(manager.status).toBe('ok');
    slot.set({ count: 1 });
    expect(manager.status).toBe('memory');
    expect(slot.get()).toEqual({ count: 1 });
    slot.set({ count: 2 });
    expect(slot.get()).toEqual({ count: 2 });
    // 失敗が続いている間は、記録は1件だけ
    expect(manager.issues.filter((i) => i.kind === 'writeFailed')).toHaveLength(1);
  });

  it('書き込みが回復したら状態を ok に戻す', () => {
    let failing = true;
    const base = new MemoryStorage();
    const storage: SaveStorage = {
      getItem: (k) => base.getItem(k),
      setItem: (k, v) => {
        if (failing) throw new Error('QuotaExceededError');
        base.setItem(k, v);
      },
      removeItem: (k) => base.removeItem(k),
    };
    const { manager } = setup(storage);
    const slot = manager.open(SCHEMA);
    slot.set({ count: 1 });
    expect(manager.status).toBe('memory');
    failing = false;
    slot.set({ count: 2 });
    expect(manager.status).toBe('ok');
    expect(base.getItem('game-a:counter')).toBe('{"version":2,"data":{"count":2}}');
  });

  it('読み込みで例外が出たら初期状態で始める', () => {
    const storage: SaveStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const { manager } = setup(storage);
    expect(manager.open(SCHEMA).get()).toEqual({ count: 0 });
    expect(manager.issues[0]).toMatchObject({ kind: 'unavailable' });
  });

  it('保存先を使えない場合は最初から memory で、問題を記録する', () => {
    const { manager, onIssue } = setup(new MemoryStorage(), false);
    expect(manager.status).toBe('memory');
    expect(onIssue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unavailable' }));
    const slot = manager.open(SCHEMA);
    slot.set({ count: 3 });
    expect(slot.get()).toEqual({ count: 3 });
  });
});
