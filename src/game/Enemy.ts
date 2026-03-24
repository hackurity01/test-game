// 적 AI 및 인텐트 시스템

/** 적 타입 */
export type EnemyType = 'normal' | 'elite' | 'boss';

/** 적 행동 타입 */
export type EnemyActionType =
  | 'ki_gather'  // 기모으기
  | 'attack_s'   // 소형 공격
  | 'attack_l'   // 대형 공격
  | 'defend'     // 막기
  | 'special';   // 특수 (보스)

/** 적 행동 정의 */
export interface EnemyAction {
  type: EnemyActionType;
  name: string;
  description: string;
  kiCost: number;
  kiGain?: number;
  damage?: number;
}

/** 적 인텐트 (3개 행동 예고) */
export interface EnemyIntent {
  action1: EnemyAction;  // 슬롯 1 행동
  action2: EnemyAction;  // 슬롯 2 행동
  action3: EnemyAction;  // 슬롯 3 행동
}

/** 적 상태 */
export interface EnemyState {
  type: EnemyType;
  name: string;
  maxHp: number;
  currentHp: number;
  maxKi: number;
  currentKi: number;
  intent: EnemyIntent;
  availableSkills: EnemyAction[];
  mark: number;  // 표식 중첩 수
}

// ===== 적 행동 데이터 =====

const KI_GATHER_ACTION: EnemyAction = {
  type: 'ki_gather',
  name: '기모으기',
  description: '기를 1 충전한다',
  kiCost: 0,
  kiGain: 1,
};

const ATTACK_S_ACTION: EnemyAction = {
  type: 'attack_s',
  name: '에네르기파',
  description: '플레이어에게 2 피해',
  kiCost: 1,
  damage: 2,
};

const DEFEND_ACTION: EnemyAction = {
  type: 'defend',
  name: '막기',
  description: '파 공격을 완전히 상쇄한다',
  kiCost: 0,
};

const ATTACK_L_ACTION: EnemyAction = {
  type: 'attack_l',
  name: '강력한 파',
  description: '플레이어에게 4 피해',
  kiCost: 2,
  damage: 4,
};

const ELITE_ATTACK_ACTION: EnemyAction = {
  type: 'attack_l',
  name: '에네르기파(대)',
  description: '플레이어에게 6 피해',
  kiCost: 3,
  damage: 6,
};

const BOSS_SPECIAL_ACTION: EnemyAction = {
  type: 'special',
  name: '마안광선',
  description: '플레이어에게 8 피해 (기 4 필요)',
  kiCost: 4,
  damage: 8,
};

/** 적 클래스 */
export class Enemy {
  private state: EnemyState;

  constructor(type: EnemyType) {
    this.state = this.createBaseState(type);
    this.generateIntent();
  }

  /** 타입별 기초 상태 생성 */
  private createBaseState(type: EnemyType): EnemyState {
    const placeholder: EnemyIntent = {
      action1: KI_GATHER_ACTION,
      action2: KI_GATHER_ACTION,
      action3: KI_GATHER_ACTION,
    };

    switch (type) {
      case 'normal': {
        const hp = Math.floor(Math.random() * 5) + 8;  // 8~12
        return {
          type,
          name: '레드리본 병사',
          maxHp: hp,
          currentHp: hp,
          maxKi: 3,
          currentKi: 0,
          intent: placeholder,
          availableSkills: [KI_GATHER_ACTION, ATTACK_S_ACTION, DEFEND_ACTION],
          mark: 0,
        };
      }
      case 'elite': {
        const hp = Math.floor(Math.random() * 6) + 15;  // 15~20
        return {
          type,
          name: '피라프단',
          maxHp: hp,
          currentHp: hp,
          maxKi: 5,
          currentKi: 0,
          intent: placeholder,
          availableSkills: [KI_GATHER_ACTION, ATTACK_S_ACTION, DEFEND_ACTION, ATTACK_L_ACTION, ELITE_ATTACK_ACTION],
          mark: 0,
        };
      }
      case 'boss':
        return {
          type,
          name: '피콜로',
          maxHp: 25,
          currentHp: 25,
          maxKi: 5,
          currentKi: 0,
          intent: placeholder,
          availableSkills: [KI_GATHER_ACTION, ATTACK_S_ACTION, DEFEND_ACTION, ATTACK_L_ACTION, BOSS_SPECIAL_ACTION],
          mark: 0,
        };
    }
  }

  /** 다음 인텐트(3개 행동) 생성 */
  generateIntent(): void {
    const action1 = this.chooseActionWithKi(this.state.currentKi);

    const ki2 = Math.min(
      this.state.maxKi,
      this.state.currentKi + (action1.kiGain ?? 0) - action1.kiCost
    );
    const action2 = this.chooseActionWithKi(ki2);

    const ki3 = Math.min(
      this.state.maxKi,
      ki2 + (action2.kiGain ?? 0) - action2.kiCost
    );
    const action3 = this.chooseActionWithKi(ki3);

    this.state.intent = { action1, action2, action3 };
  }

  /** 특정 기 수치로 행동 선택 */
  private chooseActionWithKi(ki: number): EnemyAction {
    switch (this.state.type) {
      case 'normal':  return this.chooseNormalAction(ki);
      case 'elite':   return this.chooseEliteAction(ki);
      case 'boss':    return this.chooseBossAction(ki);
    }
  }

  /** 일반 적: 25% 막기, 기 있으면 공격, 없으면 기모으기 */
  private chooseNormalAction(ki: number): EnemyAction {
    if (Math.random() < 0.25) return DEFEND_ACTION;
    if (ki >= ATTACK_S_ACTION.kiCost) return ATTACK_S_ACTION;
    return KI_GATHER_ACTION;
  }

  /** 엘리트: 20% 막기, 기 충분하면 강력한 공격 우선 */
  private chooseEliteAction(ki: number): EnemyAction {
    if (Math.random() < 0.20) return DEFEND_ACTION;
    if (ki >= ELITE_ATTACK_ACTION.kiCost) return ELITE_ATTACK_ACTION;
    if (ki >= ATTACK_L_ACTION.kiCost) return ATTACK_L_ACTION;
    if (ki >= ATTACK_S_ACTION.kiCost) return ATTACK_S_ACTION;
    return KI_GATHER_ACTION;
  }

  /** 보스(피콜로): 기 모으면 마안광선, 15% 막기 */
  private chooseBossAction(ki: number): EnemyAction {
    if (ki >= BOSS_SPECIAL_ACTION.kiCost) return BOSS_SPECIAL_ACTION;
    if (Math.random() < 0.15) return DEFEND_ACTION;
    if (ki >= ATTACK_L_ACTION.kiCost) return ATTACK_L_ACTION;
    if (ki >= ATTACK_S_ACTION.kiCost) return ATTACK_S_ACTION;
    return KI_GATHER_ACTION;
  }

  /** 적 행동 실행 */
  executeAction(action: EnemyAction): {
    damage: number;
    kiGained: number;
    skipped: boolean;
  } {
    if (this.state.currentKi < action.kiCost) {
      return { damage: 0, kiGained: 0, skipped: true };
    }

    this.state.currentKi -= action.kiCost;

    let damage = 0;
    let kiGained = 0;

    switch (action.type) {
      case 'ki_gather':
        kiGained = action.kiGain ?? 0;
        this.state.currentKi = Math.min(this.state.maxKi, this.state.currentKi + kiGained);
        break;
      case 'attack_s':
      case 'attack_l':
      case 'special':
        damage = action.damage ?? 0;
        break;
      case 'defend':
        break;
    }

    return { damage, kiGained, skipped: false };
  }

  /** 플레이어가 기 강탈 - 실제로 빼앗긴 기 반환 */
  stealKi(amount: number): number {
    const stolen = Math.min(this.state.currentKi, amount);
    this.state.currentKi -= stolen;
    return stolen;
  }

  /** 표식 추가 */
  addMark(amount: number): void {
    this.state.mark = Math.max(0, this.state.mark + amount);
  }

  /** 표식 1 소비 - 소비 전 중첩 수 반환 */
  consumeMark(): number {
    const m = this.state.mark;
    if (m > 0) this.state.mark = Math.max(0, this.state.mark - 1);
    return m;
  }

  /** 보스 재생 (1/턴) */
  regenerate(): void {
    if (this.state.type === 'boss') {
      this.state.currentHp = Math.min(this.state.maxHp, this.state.currentHp + 1);
    }
  }

  /** 피해 받기 */
  takeDamage(amount: number): number {
    const actualDamage = Math.max(0, amount);
    this.state.currentHp = Math.max(0, this.state.currentHp - actualDamage);
    return actualDamage;
  }

  /** 사망 여부 */
  isDead(): boolean {
    return this.state.currentHp <= 0;
  }

  // === Getters ===
  get hp(): number { return this.state.currentHp; }
  get maxHp(): number { return this.state.maxHp; }
  get ki(): number { return this.state.currentKi; }
  get maxKi(): number { return this.state.maxKi; }
  get name(): string { return this.state.name; }
  get type(): EnemyType { return this.state.type; }
  get intent(): EnemyIntent { return this.state.intent; }
  get availableSkills(): EnemyAction[] { return this.state.availableSkills; }
  get mark(): number { return this.state.mark; }

  getState(): Readonly<EnemyState> {
    return { ...this.state };
  }
}

