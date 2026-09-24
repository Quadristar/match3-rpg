/**
 * SaveManager: ゲームごとの名前空間で、バージョン付きのセーブデータを読み書きする。
 *
 * - 保存キーは「ゲーム ID:キー」。GitHub Pages では同じドメインの全ゲームが
 *   localStorage を共有するため、ゲーム ID で区別する
 * - 読み込み時に移行処理を順に適用し、移行したら新しい形式で書き戻す
 * - 異常時(仮仕様。どれもゲームは止めない):
 *     読めないデータ … 元の文字列を「キー.corrupt」に退避してから、初期状態で始める
 *                      (退避に失敗したら元のデータは上書きしない)
 *     保存先を使えない・書き込めない … メモリ上のデータで動作を続け、状態を 'memory' にする
 *   問題は issues に記録し、onIssue を呼ぶ
 */
import { readSaveRecord, writeSaveRecord } from './readSaveRecord';
import type { SaveIssue, SaveSchema, SaveStatus, SaveStorage } from './saveTypes';

export interface SaveManagerOptions {
  /** ゲーム ID(保存キーの前置き) */
  readonly gameId: string;
  readonly storage: SaveStorage;
  /** 保存先が永続的に使えるか(false ならメモリ上で動作中として扱う) */
  readonly available?: boolean;
  readonly onIssue?: (issue: SaveIssue) => void;
}

/** 1つの保存キーに対応するデータ */
export interface SaveSlot<D> {
  /** 現在のデータ。直接書き換えず、set() で渡すこと */
  get(): D;
  /** データを置き換えて保存する */
  set(data: D): void;
}

/** 退避先のキーの接尾辞 */
const CORRUPT_SUFFIX = '.corrupt';

export class SaveManager {
  private readonly issueLog: SaveIssue[] = [];
  private writeFailing = false;

  constructor(private readonly options: SaveManagerOptions) {
    if (options.available === false) {
      this.record({ kind: 'unavailable', key: `${options.gameId}:*`, detail: '保存先を使えないため、メモリ上で動作します' });
    }
  }

  /** 保存の状態 */
  get status(): SaveStatus {
    return this.options.available === false || this.writeFailing ? 'memory' : 'ok';
  }

  /** これまでに起きた問題 */
  get issues(): readonly SaveIssue[] {
    return this.issueLog;
  }

  /** ゲーム ID を付けた保存キー */
  keyOf(key: string): string {
    return `${this.options.gameId}:${key}`;
  }

  /** データを読み込み、読み書き用のスロットを返す */
  open<D>(schema: SaveSchema<D>): SaveSlot<D> {
    const key = this.keyOf(schema.key);
    let current = this.load(key, schema);
    return {
      get: () => current,
      set: (data: D) => {
        current = data;
        this.write(key, writeSaveRecord(schema, data));
      },
    };
  }

  private load<D>(key: string, schema: SaveSchema<D>): D {
    let raw: string | null;
    try {
      raw = this.options.storage.getItem(key);
    } catch (error) {
      this.record({ kind: 'unavailable', key, detail: '読み込めませんでした。初期状態で始めます', error });
      return schema.createDefault();
    }
    if (raw === null) {
      return schema.createDefault();
    }

    const result = readSaveRecord(raw, schema);
    if (result.kind === 'ok') {
      if (result.migratedFrom !== null) {
        this.write(key, writeSaveRecord(schema, result.data));
      }
      return result.data;
    }

    // 読めないデータ: 退避してから初期状態で始める
    const data = schema.createDefault();
    const backedUp = this.write(key + CORRUPT_SUFFIX, raw);
    this.record({
      kind: 'corrupt',
      key,
      detail: `${result.reason}。${backedUp ? `元のデータを ${key}${CORRUPT_SUFFIX} に退避し、` : '退避できなかったため元のデータは残したまま、'}初期状態で始めます`,
      error: result.error,
    });
    if (backedUp) {
      this.write(key, writeSaveRecord(schema, data));
    }
    return data;
  }

  /** 書き込む。失敗したら記録して false を返す(続けて失敗している間は記録しない) */
  private write(key: string, value: string): boolean {
    try {
      this.options.storage.setItem(key, value);
      this.writeFailing = false;
      return true;
    } catch (error) {
      if (!this.writeFailing) {
        this.record({ kind: 'writeFailed', key, detail: '保存できませんでした。メモリ上で動作を続けます', error });
      }
      this.writeFailing = true;
      return false;
    }
  }

  private record(issue: SaveIssue): void {
    this.issueLog.push(issue);
    this.options.onIssue?.(issue);
  }
}
