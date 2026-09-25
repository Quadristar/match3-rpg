/**
 * バトルロジックで使う型。描画に依存しない。
 */

/**
 * 1回の入れ替えで消えたパネル(バトルが使う部分だけ)。
 * systems/puzzle に依存しないため、バトル側で形を決める。MoveResult からの変換は systems/session が行う。
 */
export interface ClearedTiles {
  /** 連鎖の段ごとの、消えたまとまりの一覧(steps[i] が i+1 段目)。空なら揃わなかった入れ替え */
  readonly steps: readonly (readonly ClearedGroup[])[];
}

/** 消えたまとまり1つ */
export interface ClearedGroup {
  /** パネルの種類の番号(systems/puzzle の TileKind と同じ値) */
  readonly kind: number;
  /** 消えたパネルの数 */
  readonly count: number;
}

/** 戦闘の参加者(味方・敵)の状態 */
export interface Combatant {
  readonly id: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
}

/** 敵の状態 */
export interface EnemyState extends Combatant {
  /** 何ターンごとに攻撃するか */
  readonly attackInterval: number;
  /** 次の攻撃までの残りターン数(0 になったターンに攻撃する。Phase 4b で表示する) */
  readonly turnsUntilAttack: number;
  /** 倒したときの経験値 */
  readonly exp: number;
}

/** 戦闘の結果 */
export type BattleOutcome = 'ongoing' | 'victory' | 'defeat';

/** 戦闘全体の状態(書き換えない。変化は新しい状態として返す) */
export interface BattleState {
  /** 終わったターン数(最初は 0) */
  readonly turn: number;
  /** 味方(今は1人。先頭がリーダー) */
  readonly party: readonly Combatant[];
  readonly enemy: EnemyState;
  readonly outcome: BattleOutcome;
}

/**
 * ダメージの修飾子(バフ・デバフなど)。仮仕様: 次の順に適用する
 * 1. rawRate: パズルの合計(防御を引く前)に掛ける
 * 2. defenseRate: 防御に掛ける
 * 3. finalRate: 防御を引いた後に掛ける
 */
export interface DamageModifier {
  readonly kind: 'rawRate' | 'defenseRate' | 'finalRate';
  readonly value: number;
  /** どこから来た修飾子か(スキル名など。表示・デバッグ用) */
  readonly source?: string;
}

/** 連鎖1段ぶんの攻撃 */
export interface AttackHit {
  /** 何段目の連鎖か(1 から) */
  readonly combo: number;
  /** その段で、この行動に使われたパネルの数 */
  readonly tileCount: number;
}

/** 連鎖1段ぶんの攻撃の計算結果(演出用) */
export interface HitResult extends AttackHit {
  /** 段の倍率 */
  readonly multiplier: number;
  /** その段の基本ダメージ(パネル数 × 攻撃力 × 倍率。切り捨て・防御の前) */
  readonly raw: number;
}

/** 行動(AttackResolver・EnemyAI が作り、BattleState に適用する) */
export type BattleAction =
  | {
      /** 味方の攻撃(パズルの結果から作る) */
      readonly type: 'partyAttack';
      readonly actorId: string;
      readonly hits: readonly AttackHit[];
      readonly attribute?: string;
    }
  | {
      /** 敵の攻撃 */
      readonly type: 'enemyAttack';
      readonly targetId: string;
    };

/**
 * 描画側が順に再生する出来事。
 * HP は、その出来事の前と後の値を持つ(HP の減少の演出にそのまま使える)。
 */
export type BattleEvent =
  | { readonly type: 'turnStart'; readonly turn: number }
  | {
      readonly type: 'partyAttack';
      readonly actorId: string;
      readonly targetId: string;
      /** 連鎖の段ごとの内訳 */
      readonly hits: readonly HitResult[];
      /** 段の raw の合計(防御の前) */
      readonly rawTotal: number;
      /** 最終ダメージ */
      readonly damage: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  | {
      readonly type: 'enemyAttack';
      readonly actorId: string;
      readonly targetId: string;
      readonly damage: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  /** 敵の次の攻撃までの残りターン数(敵の行動の後、毎ターン出す) */
  | { readonly type: 'enemyCountdown'; readonly enemyId: string; readonly turnsUntilAttack: number }
  | { readonly type: 'victory'; readonly enemyId: string; readonly exp: number }
  | { readonly type: 'defeat' };
