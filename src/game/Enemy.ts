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
  /** 각 슬롯의 텔레그래프 텍스트 (null이면 미표시) */
  telegraphs: (string | null)[];
}

/**
 * 적 고정 패턴 인터페이스
 * elite/boss 적이 사용하는 결정론적 행동 패턴
 */
export interface EnemyPattern {
  /** HP, 최대HP, 현재 기를 입력받아 이 패턴의 발동 조건을 반환 */
  condition: (enemyHp: number, enemyMaxHp: number, enemyKi: number) => boolean;
  /** 3슬롯 행동 타입 배열 (순환 반복) */
  sequence: EnemyActionType[];
  /** 각 시퀀스 인덱스에 대응하는 텔레그래프 텍스트 (null이면 미표시) */
  telegraphs: (string | null)[];
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
  mark: number;        // 표식 중첩 수
  patternIndex: number; // 패턴 시퀀스 내 현재 인덱스 (턴마다 +1 순환)
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

// ===== 엘리트(피라프단) 행동 맵: EnemyActionType → EnemyAction =====
const ELITE_ACTION_MAP: Record<EnemyActionType, EnemyAction> = {
  ki_gather: KI_GATHER_ACTION,
  attack_s:  ATTACK_S_ACTION,
  attack_l:  ATTACK_L_ACTION,   // 피라프단은 비용2/피해4 버전 사용
  defend:    DEFEND_ACTION,
  special:   ELITE_ATTACK_ACTION, // 미사용이지만 타입 완결을 위해 포함
};

// ===== 보스(피콜로) 행동 맵 =====
const BOSS_ACTION_MAP: Record<EnemyActionType, EnemyAction> = {
  ki_gather: KI_GATHER_ACTION,
  attack_s:  ATTACK_S_ACTION,
  attack_l:  ATTACK_L_ACTION,
  defend:    DEFEND_ACTION,
  special:   BOSS_SPECIAL_ACTION,
};

// ===== 피라프단(elite) 고정 패턴 =====
const PIRAFU_PATTERNS: EnemyPattern[] = [
  {
    // 패턴1: HP > 50% → 기 모아서 강력한 파
    condition: (hp, maxHp) => hp / maxHp > 0.5,
    sequence: ['ki_gather', 'ki_gather', 'attack_l'],
    telegraphs: ['기를 모은다...', '기를 모은다...', null],
  },
  {
    // 패턴2: HP ≤ 50% → 분노, 더 공격적으로
    condition: (hp, maxHp) => hp / maxHp <= 0.5,
    sequence: ['ki_gather', 'attack_l', 'attack_l'],
    telegraphs: ['분노하며 기를 모은다!', null, null],
  },
];

// ===== 피콜로(boss) 고정 패턴 =====
const PICCOLO_PATTERNS: EnemyPattern[] = [
  {
    // 패턴1: HP > 60% → 기 축적 후 소형 공격
    condition: (hp, maxHp) => hp / maxHp > 0.6,
    sequence: ['ki_gather', 'attack_s', 'ki_gather'],
    telegraphs: ['기를 끌어모은다...', null, '기를 끌어모은다...'],
  },
  {
    // 패턴2a: HP 30%~60%, 기 ≥ 3 → 마안광선 충전 시퀀스
    condition: (hp, maxHp, ki) => hp / maxHp <= 0.6 && hp / maxHp >= 0.3 && ki >= 3,
    sequence: ['ki_gather', 'ki_gather', 'special'],
    telegraphs: ['기를 끌어모은다...', '눈에서 빛이 모인다...', '마안광선 발사!!'],
  },
  {
    // 패턴2b: HP 30%~60%, 기 < 3 → 근접 공세
    condition: (hp, maxHp, ki) => hp / maxHp <= 0.6 && hp / maxHp >= 0.3 && ki < 3,
    sequence: ['attack_l', 'ki_gather', 'attack_s'],
    telegraphs: [null, '기를 끌어모은다...', null],
  },
  {
    // 패턴3: HP < 30% → 마지막 발악
    condition: (hp, maxHp) => hp / maxHp < 0.3,
    sequence: ['special', 'attack_l', 'defend'],
    telegraphs: ['눈에서 빛이 모인다...', null, null],
  },
];

/** 적 클래스 */
export class Enemy {
  private state: EnemyState;

  constructor(type: EnemyType) {
    this.state = this.createBaseState(type);
    this.generateIntent();
  }

  /** 타입별 기초 상태 생성 */
  private createBaseState(type: EnemyType): EnemyState {
    // 플레이스홀더 인텐트 (생성자에서 generateIntent로 곧 교체됨)
    const placeholder: EnemyIntent = {
      action1: KI_GATHER_ACTION,
      action2: KI_GATHER_ACTION,
      action3: KI_GATHER_ACTION,
      telegraphs: [null, null, null],
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
          patternIndex: 0,
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
          patternIndex: 0,
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
          patternIndex: 0,
        };
    }
  }

  /**
   * 다음 인텐트(3개 행동) 생성
   * - normal: 기존 랜덤 로직 유지
   * - elite/boss: 고정 패턴 시퀀스 사용
   * 호출마다 patternIndex가 1 증가 (순환)
   */
  generateIntent(): void {
    switch (this.state.type) {
      case 'normal':
        this.generateNormalIntent();
        break;
      case 'elite':
        this.generatePatternIntent(PIRAFU_PATTERNS, ELITE_ACTION_MAP);
        break;
      case 'boss':
        this.generatePatternIntent(PICCOLO_PATTERNS, BOSS_ACTION_MAP);
        break;
    }
  }

  // ===== 인텐트 생성 내부 메서드 =====

  /**
   * 일반 적(레드리본 병사): 랜덤 행동 생성
   * 단순한 적이므로 기존 랜덤 로직 유지
   */
  private generateNormalIntent(): void {
    const ki0 = this.state.currentKi;
    const action1 = this.chooseNormalAction(ki0);
    const ki1 = Math.min(this.state.maxKi, ki0 + (action1.kiGain ?? 0) - action1.kiCost);
    const action2 = this.chooseNormalAction(ki1);
    const ki2 = Math.min(this.state.maxKi, ki1 + (action2.kiGain ?? 0) - action2.kiCost);
    const action3 = this.chooseNormalAction(ki2);

    this.state.intent = {
      action1,
      action2,
      action3,
      telegraphs: [null, null, null],  // 랜덤 적은 텔레그래프 없음
    };
    // patternIndex는 normal 적에서는 변경하지 않음
  }

  /**
   * 패턴 기반 인텐트 생성 (elite/boss 공용)
   * 조건에 맞는 첫 번째 패턴을 선택하고 patternIndex 위치부터 3개 행동을 결정
   */
  private generatePatternIntent(
    patterns: EnemyPattern[],
    actionMap: Record<EnemyActionType, EnemyAction>
  ): void {
    // 현재 HP/기 상태 기준으로 발동할 패턴 선택 (조건이 맞는 첫 번째 패턴)
    const selectedPattern = patterns.find(p =>
      p.condition(this.state.currentHp, this.state.maxHp, this.state.currentKi)
    ) ?? patterns[patterns.length - 1];  // 조건 없을 시 마지막 패턴 (폴백)

    const seqLen = selectedPattern.sequence.length;

    // 3개 슬롯에 대해 행동 및 텔레그래프 결정
    const actions: EnemyAction[] = [];
    const telegraphs: (string | null)[] = [];

    // 기 시뮬레이션: 슬롯 간 기 연산을 추적
    let simKi = this.state.currentKi;

    for (let i = 0; i < 3; i++) {
      // patternIndex를 시작점으로 순환 접근
      const seqIdx = (this.state.patternIndex + i) % seqLen;
      let actionType = selectedPattern.sequence[seqIdx];
      let telegraph = selectedPattern.telegraphs[seqIdx];

      // 기 부족으로 해당 행동 불가 → ki_gather로 자동 대체
      const intendedAction = actionMap[actionType];
      if (simKi < intendedAction.kiCost) {
        actionType = 'ki_gather';
        telegraph = null;  // 강제 대체 시 텔레그래프 미표시
      }

      const finalAction = actionMap[actionType];
      actions.push(finalAction);
      telegraphs.push(telegraph);

      // 시뮬레이션 기 업데이트
      simKi = Math.min(
        this.state.maxKi,
        simKi + (finalAction.kiGain ?? 0) - finalAction.kiCost
      );
    }

    this.state.intent = {
      action1: actions[0],
      action2: actions[1],
      action3: actions[2],
      telegraphs,
    };

    // patternIndex 1 증가 (다음 턴에는 한 칸 시프트된 시퀀스 사용)
    this.state.patternIndex = (this.state.patternIndex + 1) % seqLen;
  }

  // ===== 일반 적 랜덤 선택 =====

  /** 일반 적: 25% 막기, 기 있으면 공격, 없으면 기모으기 */
  private chooseNormalAction(ki: number): EnemyAction {
    if (Math.random() < 0.25) return DEFEND_ACTION;
    if (ki >= ATTACK_S_ACTION.kiCost) return ATTACK_S_ACTION;
    return KI_GATHER_ACTION;
  }

  // ===== 행동 실행 =====

  /** 적 행동 실행 (기 소모/획득, 피해 반환) */
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
  get patternIndex(): number { return this.state.patternIndex; }

  getState(): Readonly<EnemyState> {
    return { ...this.state };
  }
}
