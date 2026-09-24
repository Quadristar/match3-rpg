/**
 * シーンの型定義。
 *
 * シーンの管理(切り替え・フェード・アセットの読み込みと解放・破棄)は app/SceneManager が行う。
 * presentation は app を import できない(依存ルール)ため、シーンが従う型はここに置く。
 */
import type { Container, Texture } from 'pixi.js';
import type { AssetKey, AssetManifest, BundleName } from '../../services/assets/assetTypes';
import type { InputListener } from '../../services/input/inputTypes';
import type { Layout } from '../../services/layout/layoutTypes';
import type { SaveSlot } from '../../services/save/SaveManager';
import type { Settings } from '../../services/settings/Settings';

/**
 * シーン。SceneManager が次の順で呼び出す。
 *
 * 1. 生成(SceneFactory)
 * 2. bundles に書いたバンドルを読み込む(完了まで画面は暗転したまま。長引くと読み込み中表示が出る)
 * 3. enter()  … 表示物を作る。Promise を返すと、完了まで暗転したまま待つ
 * 4. resize() … 現在のレイアウトで配置する(enter の直後と、画面サイズ・向きが変わるたび)
 * 5. update() … 毎フレーム
 * 6. exit()   … 後片付け(タイマーやイベントの解除など)
 *
 * exit() の後、root と background は SceneManager が子要素ごと破棄し、bundles を解放する。
 * context.input で登録した入力の受け取りと一時停止も、exit の後に自動的に解除される。
 * シーン側で destroy()・アセットの解放・入力の解除を行う必要はない。
 */
export interface Scene<L extends Layout = Layout, M extends AssetManifest = AssetManifest> {
  /** このシーンで使うバンドル(enter の前に読み込まれ、exit の後に解放される) */
  readonly bundles?: readonly BundleName<M>[];
  /** 論理座標で描く表示物。拡大縮小されるゲーム用のルートに追加される */
  readonly root: Container;
  /** 画面座標で描く背景(任意)。背景レイヤーに追加され、余白を含む画面全体に描ける */
  readonly background?: Container;
  enter(): void | Promise<void>;
  exit(): void;
  update(deltaMs: number): void;
  resize(layout: L): void;
}

/** レンダラの情報 */
export interface RendererInfo {
  /** 例: "WebGL 2" */
  readonly name: string;
  /** 描画解像度(devicePixelRatio に上限をかけた値) */
  readonly resolution: number;
}

/** 読み込み済みのアセットを取り出す機能 */
export interface SceneAssets<M extends AssetManifest> {
  /** bundles に書いたバンドル(または boot)のアセットを取り出す */
  get<B extends BundleName<M>>(bundle: B, key: AssetKey<M, B>): Texture;
}

/**
 * シーンから使う入力の機能。
 * 位置は論理座標。シーン切り替え中は自動的に一時停止している。
 */
export interface SceneInput {
  /** 入力を受け取る。シーンの exit で自動的に解除される(戻り値の関数で途中で解除してもよい) */
  on(listener: InputListener): () => void;
  /** 入力を一時停止する(演出中など)。戻り値の関数で再開する。シーンの exit で自動的に再開する */
  pause(): () => void;
}

/** シーンの生成時に渡される、シーンから使える機能 */
export interface SceneContext<K extends string, M extends AssetManifest = AssetManifest, D = unknown> {
  /** 別のシーンへ切り替える(フェード付き) */
  changeScene(key: K): void;
  readonly renderer: RendererInfo;
  readonly assets: SceneAssets<M>;
  readonly input: SceneInput;
  /** ゲームのセーブデータ(中身の型はゲームが決める) */
  readonly save: SaveSlot<D>;
  /** 音量・ミュート・品質の設定 */
  readonly settings: Settings;
}

/** シーンを生成する関数。シーンは使うときに初めて生成される */
export type SceneFactory<K extends string, L extends Layout = Layout, M extends AssetManifest = AssetManifest, D = unknown> = (
  context: SceneContext<K, M, D>,
) => Scene<L, M>;

/** キーとシーン生成関数の対応 */
export type SceneRegistry<K extends string, L extends Layout = Layout, M extends AssetManifest = AssetManifest, D = unknown> = Readonly<
  Record<K, SceneFactory<K, L, M, D>>
>;
