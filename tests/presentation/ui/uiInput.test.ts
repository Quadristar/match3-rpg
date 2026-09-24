/**
 * UI の当たり判定・優先順位・押下の判定のテスト。
 * Button と Panel は Pixi の表示物だが、Node 上でも生成と座標変換ができるため実物を使う(描画はしない)。
 */
import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../../src/presentation/ui/Button';
import { Panel } from '../../../src/presentation/ui/Panel';
import { UIInputRouter } from '../../../src/presentation/ui/UIInputRouter';
import { findUITarget } from '../../../src/presentation/ui/uiTargets';

/** (x, y) に置いた 100×50 のボタン */
function button(x: number, y: number, onClick = vi.fn()) {
  const b = new Button({ label: 'b', width: 100, height: 50, onClick });
  b.position.set(x, y);
  return { button: b, onClick };
}

const p = (x: number, y: number) => ({ x, y });

describe('findUITarget: 当たり判定', () => {
  it('ボタンの範囲内だけが当たる(原点は中央)', () => {
    const root = new Container();
    const { button: b } = button(200, 100);
    root.addChild(b);
    expect(findUITarget(root, p(200, 100))).toBe(b);
    expect(findUITarget(root, p(249, 124))).toBe(b);
    expect(findUITarget(root, p(251, 100))).toBeNull();
    expect(findUITarget(root, p(200, 126))).toBeNull();
  });

  it('親が拡大縮小・移動していても、表示どおりの位置で判定する', () => {
    const root = new Container();
    const parent = new Container();
    parent.position.set(10, 20);
    parent.scale.set(0.5);
    root.addChild(parent);
    const { button: b } = button(200, 100); // 画面上は (110, 70) に 50×25 で表示される
    parent.addChild(b);
    expect(findUITarget(root, p(110, 70))).toBe(b);
    expect(findUITarget(root, p(134, 82))).toBe(b);
    expect(findUITarget(root, p(137, 70))).toBeNull();
    expect(findUITarget(root, p(200, 100))).toBeNull(); // 論理座標のままでは当たらない
  });

  it('非表示のボタン、非表示の親の中のボタンは当たらない', () => {
    const root = new Container();
    const { button: hidden } = button(100, 100);
    hidden.visible = false;
    const group = new Container();
    const { button: inGroup } = button(300, 100);
    group.addChild(inGroup);
    group.visible = false;
    root.addChild(hidden, group);
    expect(findUITarget(root, p(100, 100))).toBeNull();
    expect(findUITarget(root, p(300, 100))).toBeNull();
  });

  it('ステージから外れた(root の外の)ボタンは対象にならない', () => {
    const root = new Container();
    const { button: b } = button(100, 100);
    expect(findUITarget(root, p(100, 100))).toBeNull();
    root.addChild(b);
    b.removeFromParent();
    expect(findUITarget(root, p(100, 100))).toBeNull();
  });
});

describe('findUITarget: 重なりと優先順位', () => {
  it('重なっている場合は、手前に表示されているもの(後から追加した兄弟)が当たる', () => {
    const root = new Container();
    const { button: back } = button(100, 100);
    const { button: front } = button(120, 100);
    root.addChild(back, front);
    expect(findUITarget(root, p(110, 100))).toBe(front);
    expect(findUITarget(root, p(60, 100))).toBe(back);
  });

  it('奥のグループの子より、手前のグループの子が優先される(描画順)', () => {
    const root = new Container();
    const backGroup = new Container();
    const frontGroup = new Container();
    const { button: back } = button(100, 100);
    const { button: front } = button(100, 100);
    backGroup.addChild(back);
    frontGroup.addChild(front);
    root.addChild(backGroup, frontGroup);
    expect(findUITarget(root, p(100, 100))).toBe(front);
    root.setChildIndex(backGroup, 1);
    expect(findUITarget(root, p(100, 100))).toBe(back);
  });

  it('Panel の上のボタンは Panel より手前、Panel は背後のボタンを遮る', () => {
    const root = new Container();
    const { button: behind } = button(100, 100);
    const panel = new Panel({ width: 300, height: 300 });
    panel.position.set(100, 100);
    const { button: onPanel } = button(0, 80);
    panel.addChild(onPanel);
    root.addChild(behind, panel);
    expect(findUITarget(root, p(100, 180))).toBe(onPanel);
    expect(findUITarget(root, p(100, 100))).toBe(panel); // 背後のボタンではなく Panel
    expect(findUITarget(root, p(400, 400))).toBeNull(); // モーダルでなければ外は素通り
  });

  it('モーダルの Panel は、外をタップしても背後に入力を通さない', () => {
    const root = new Container();
    const { button: behind } = button(500, 500);
    const panel = new Panel({ width: 200, height: 200, modal: true });
    panel.position.set(100, 100);
    root.addChild(behind, panel);
    expect(findUITarget(root, p(500, 500))).toBe(panel);
    expect(findUITarget(root, p(900, 900))).toBe(panel);
    panel.visible = false;
    expect(findUITarget(root, p(500, 500))).toBe(behind);
    expect(findUITarget(root, p(900, 900))).toBeNull();
  });

  it('モーダルより手前にあるボタンは押せる', () => {
    const root = new Container();
    const panel = new Panel({ width: 200, height: 200, modal: true });
    const { button: front } = button(500, 500);
    root.addChild(panel, front);
    expect(findUITarget(root, p(500, 500))).toBe(front);
  });
});

describe('UIInputRouter: 押下の判定', () => {
  function setup() {
    const root = new Container();
    const { button: b, onClick } = button(100, 100);
    root.addChild(b);
    const setPressed = vi.spyOn(b, 'setPressed');
    return { router: new UIInputRouter(root), button: b, onClick, setPressed, root };
  }

  it('置いた時点で押下中にし、ボタンの上で離したら1回だけ実行する', () => {
    const { router, onClick, setPressed } = setup();
    expect(router.down(p(100, 100))).toBe(true);
    expect(setPressed).toHaveBeenLastCalledWith(true);
    expect(onClick).not.toHaveBeenCalled();
    router.up(p(110, 105));
    expect(setPressed).toHaveBeenLastCalledWith(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('外に出たら押下中を戻し、そのまま離しても実行しない', () => {
    const { router, onClick, setPressed } = setup();
    router.down(p(100, 100));
    router.move(p(300, 100));
    expect(setPressed).toHaveBeenLastCalledWith(false);
    router.up(p(300, 100));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('外に出てから戻れば、再び押下中になり、離すと実行する', () => {
    const { router, onClick, setPressed } = setup();
    router.down(p(100, 100));
    router.move(p(300, 100));
    router.move(p(100, 100));
    expect(setPressed).toHaveBeenLastCalledWith(true);
    router.up(p(100, 100));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('何もない場所では独占しない(ゲーム側に渡す)', () => {
    const { router } = setup();
    expect(router.down(p(400, 400))).toBe(false);
  });

  it('無効なボタンは押下中にも実行にもならないが、背後には通さない', () => {
    const { router, button: b, onClick, setPressed } = setup();
    b.enabled = false;
    setPressed.mockClear();
    expect(router.down(p(100, 100))).toBe(true);
    router.up(p(100, 100));
    expect(setPressed).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('押している間に無効化・非表示になったら実行しない', () => {
    const { router, button: b, onClick } = setup();
    router.down(p(100, 100));
    b.enabled = false;
    router.up(p(100, 100));
    b.enabled = true;
    router.down(p(100, 100));
    b.visible = false;
    router.up(p(100, 100));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('取り消されたら押下中を戻し、実行しない', () => {
    const { router, onClick, setPressed } = setup();
    router.down(p(100, 100));
    router.cancel();
    expect(setPressed).toHaveBeenLastCalledWith(false);
    router.up(p(100, 100));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Panel の上(ボタン以外)を押した場合は独占するが何も実行しない', () => {
    const root = new Container();
    const panel = new Panel({ width: 300, height: 300 });
    panel.position.set(150, 150);
    root.addChild(panel);
    const router = new UIInputRouter(root);
    expect(router.down(p(150, 150))).toBe(true);
    router.up(p(150, 150));
  });
});
