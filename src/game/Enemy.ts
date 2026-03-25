// 적 AI 및 인텐트 시스템

/** 적 타입 */
export type EnemyType = 'normal' | 'elite' | 'boss';

/** 적 행동 타입 */
export type EnemyActionType =
  | 'ki_gather'     // 기모으기
  | 'attack_s'      // 소형 공격
  | 'attack_l'      // 대형 공격
  | 'defend'        // 막기
  | 'special'       // 특수 (보스)
  | 'regenerate'    // 재생집중 (피콜로 Phase 3-2)
  | 'command'       // 명령 하달 (레드리본 대령 Phase 3-3)
  | 'attack_pierce'; // 관통 공격 (레드리본 대령 Phase 3-3)

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

/** 적 패시브 타입 (Phase 3-1) */
export type EnemyPassiveId = 'regenerate_passive' | 'infinite_cloak';

/** 적 패시브 정의 */
export interface EnemyPassive {
  id: EnemyPassiveId;
  name: string;
  description: string;
}

/** 적 패시브 데이터 */
export const ENEMY_PASSIVES: Record<EnemyPassiveId, EnemyPassive> = {
  regenerate_passive: {
    id: 'regenerate_passive',
    name: '신진대사 재생',
    description: '매 턴 시작 HP +1',
  },
  infinite_cloak: {
    id: 'infinite_cloak',
    name: '무한의 망토',
    description: '플레이어가 막기 사용 시 기 +1',
  },
};

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
  mark: number;                        // 표식 중첩 수
  patternIndex: number;                // 패턴 시퀀스 내 현재 인덱스 (턴마다 +1 순환)
  // Phase 3 추가 필드
  passives: EnemyPassiveId[];          // 패시브 목록 (Phase 3-1)
  commandActive: boolean;              // 명령 하달 활성화 여부 (Phase 3-3)
  regenerationCancelled: boolean;      // 재생 효과 이번 턴 취소 여부 (Phase 3-2)
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

// ===== Phase 3-2: 피콜로 재생집중 행동 =====
const REGENERATE_ACTION: EnemyAction = {
  type: 'regenerate',
  name: '재생집중',
  description: '이번 턴 HP +2 회복 (강한 공격에 취약)',
  kiCost: 0,
};

// ===== Phase 3-3: 레드리본 대령 행동 =====
const COMMAND_ACTION: EnemyAction = {
  type: 'command',
  name: '명령 하달',
  description: '다음 슬롯 공격에 관통 속성 부여 (강탈/감지로 무효화 가능)',
  kiCost: 0,
};

const ATTACK_PIERCE_ACTION: EnemyAction = {
  type: 'attack_pierce',
  name: '관통 공격',
  description: '플레이어에게 5 피해 (명령 활성 시 막기로 막히지 않음)',
  kiCost: 0,
  damage: 5,
};

// ===== 엘리트(피라프단) 행동 맵: EnemyActionType → EnemyAction =====
const ELITE_ACTION_MAP: Record<EnemyActionType, EnemyAction> = {
  ki_gather:     KI_GATHER_ACTION,
  attack_s:      ATTACK_S_ACTION,
  attack_l:      ATTACK_L_ACTION,
  defend:        DEFEND_ACTION,
  special:       ELITE_ATTACK_ACTION,
  regenerate:    REGENERATE_ACTION,    // 피라프단은 미사용이지만 타입 완결을 위해
  command:       COMMAND_ACTION,
  attack_pierce: ATTACK_PIERCE_ACTION,
};

// ===== 보스(피콜로) 행동 맵 =====
const BOSS_ACTION_MAP: Record<EnemyActionType, EnemyAction> = {
  ki_gather:     KI_GATHER_ACTION,
  attack_s:      ATTACK_S_ACTION,
  attack_l:      ATTACK_L_ACTION,
  defend:        DEFEND_ACTION,
  special:       BOSS_SPECIAL_ACTION,
  regenerate:    REGENERATE_ACTION,   // Phase 3-2 추가
  command:       COMMAND_ACTION,
  attack_pierce: ATTACK_PIERCE_ACTION,
};

// ===== Phase 3-3: 레드리본 대령 행동 맵 =====
const RED_RIBBON_ACTION_MAP: Record<EnemyActionType, EnemyAction> = {
  ki_gather:     KI_GATHER_ACTION,
  attack_s:      ATTACK_S_ACTION,
  attack_l:      ATTACK_L_ACTION,
  defend:        DEFEND_ACTION,
  special:       ELITE_ATTACK_ACTION,
  regenerate:    REGENERATE_ACTION,
  command:       COMMAND_ACTION,
  attack_pierce: ATTACK_PIERCE_ACTION,
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

// ===== Phase 3-3: 레드리본 대령 고정 패턴 =====
const RED_RIBBON_PATTERNS: EnemyPattern[] = [
  {
    // 단일 패턴: command → attack_pierce → defend 반복
    condition: () => true,
    sequence: ['command', 'attack_pierce', 'defend'],
    telegraphs: ['명령을 내린다!', null, null],
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
    // 패턴3: HP < 30% → 마지막 발악 + 재생집중 (Phase 3-2)
    // 두 번째 슬롯을 regenerate로 변경 → 강한 공격 취약 타이밍
    condition: (hp, maxHp) => hp / maxHp < 0.3,
    sequence: ['special', 'regenerate', 'defend'],
    telegraphs: ['눈에서 빛이 모인다...', '⚠️ 재생 집중 중...', null],
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
          passives: [],
          commandActive: false,
          regenerationCancelled: false,
        };
      }
      case 'elite': {
        // Phase 3-3: 랜덤으로 피라프단 or 레드리본 대령 선택
        const isColonel = Math.random() < 0.5;

        if (isColonel) {
          // 레드리본 대령 (HP 18~22)
          const hp = Math.floor(Math.random() * 5) + 18;
          return {
            type,
            name: '레드리본 대령',
            maxHp: hp,
            currentHp: hp,
            maxKi: 4,
            currentKi: 0,
            intent: placeholder,
            availableSkills: [COMMAND_ACTION, ATTACK_PIERCE_ACTION, DEFEND_ACTION],
            mark: 0,
            patternIndex: 0,
            passives: [],
            commandActive: false,
            regenerationCancelled: false,
          };
        } else {
          // 피라프단 (HP 15~20)
          const hp = Math.floor(Math.random() * 6) + 15;
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
            passives: [],
            commandActive: false,
            regenerationCancelled: false,
          };
        }
      }
      case 'boss':
        // Phase 3-1: 피콜로에 패시브 2개 추가
        return {
          type,
          name: '피콜로',
          maxHp: 25,
          currentHp: 25,
          maxKi: 5,
          currentKi: 0,
          intent: placeholder,
          availableSkills: [KI_GATHER_ACTION, ATTACK_S_ACTION, DEFEND_ACTION, ATTACK_L_ACTION, BOSS_SPECIAL_ACTION, REGENERATE_ACTION],
          mark: 0,
          patternIndex: 0,
          passives: ['regenerate_passive', 'infinite_cloak'],  // Phase 3-1
          commandActive: false,
          regenerationCancelled: false,
        };
    }
  }

  /**
   * 다음 인텐트(3개 행동) 생성
   * - normal: 기존 랜덤 로직 유지
   * - elite: 피라프단 or 레드리본 대령 분기
   * - boss: 피콜로 고정 패턴
   */
  generateIntent(): void {
    // 재생 취소 플래그 초기화 (새 턴 인텐트 생성)
    this.state.regenerationCancelled = false;

    switch (this.state.type) {
      case 'normal':
        this.generateNormalIntent();
        break;
      case 'elite':
        // Phase 3-3: 이름으로 variant 분기
        if (this.state.name === '레드리본 대령') {
          this.generatePatternIntent(RED_RIBBON_PATTERNS, RED_RIBBON_ACTION_MAP);
        } else {
          this.generatePatternIntent(PIRAFU_PATTERNS, ELITE_ACTION_MAP);
        }
        break;
      case 'boss':
        this.generatePatternIntent(PICCOLO_PATTERNS, BOSS_ACTION_MAP);
        break;
    }
  }

  // ===== 인텐트 생성 내부 메서드 =====

  /**
   * 일반 적(레드리본 병사): 랜덤 행동 생성
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
      telegraphs: [null, null, null],
    };
  }

  /**
   * 패턴 기반 인텐트 생성 (elite/boss 공용)
   */
  private generatePatternIntent(
    patterns: EnemyPattern[],
    actionMap: Record<EnemyActionType, EnemyAction>
  ): void {
    const selectedPattern = patterns.find(p =>
      p.condition(this.state.currentHp, this.state.maxHp, this.state.currentKi)
    ) ?? patterns[patterns.length - 1];

    const seqLen = selectedPattern.sequence.length;

    const actions: EnemyAction[] = [];
    const telegraphs: (string | null)[] = [];

    let simKi = this.state.currentKi;

    for (let i = 0; i < 3; i++) {
      const seqIdx = (this.state.patternIndex + i) % seqLen;
      let actionType = selectedPattern.sequence[seqIdx];
      let telegraph = selectedPattern.telegraphs[seqIdx];

      const intendedAction = actionMap[actionType];
      // command, regenerate, attack_pierce, defend 는 기 부족 대체 없음
      const noFallback = ['command', 'regenerate', 'attack_pierce', 'defend'].includes(actionType);
      if (!noFallback && simKi < intendedAction.kiCost) {
        actionType = 'ki_gather';
        telegraph = null;
      }

      const finalAction = actionMap[actionType];
      actions.push(finalAction);
      telegraphs.push(telegraph);

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

    this.state.patternIndex = (this.state.patternIndex + 1) % seqLen;
  }

  private chooseNormalAction(ki: number): EnemyAction {
    if (Math.random() < 0.25) return DEFEND_ACTION;
    if (ki >= ATTACK_S_ACTION.kiCost) return ATTACK_S_ACTION;
    return KI_GATHER_ACTION;
  }

  // ===== 행동 실행 =====

  /** 적 행동 실행 */
  executeAction(action: EnemyAction): {
    damage: number;
    kiGained: number;
    skipped: boolean;
    healed: number;
  } {
    if (this.state.currentKi < action.kiCost) {
      return { damage: 0, kiGained: 0, skipped: true, healed: 0 };
    }

    this.state.currentKi -= action.kiCost;

    let damage = 0;
    let kiGained = 0;
    let healed = 0;

    switch (action.type) {
      case 'ki_gather':
        kiGained = action.kiGain ?? 0;
        this.state.currentKi = Math.min(this.state.maxKi, this.state.currentKi + kiGained);
        break;
      case 'attack_s':
      case 'attack_l':
      case 'special':
      case 'attack_pierce':
        damage = action.damage ?? 0;
        break;
      case 'defend':
        break;
      case 'regenerate':
        // Phase 3-2: 재생집중 - 강한 공격이 없었으면 HP +2
        if (!this.state.regenerationCancelled) {
          healed = 2;
          this.state.currentHp = Math.min(this.state.maxHp, this.state.currentHp + healed);
        }
        break;
      case 'command':
        // Phase 3-3: 명령 하달 - commandActive 설정
        this.state.commandActive = true;
        break;
    }

    return { damage, kiGained, skipped: false, healed };
  }

  /** 기 강탈 */
  stealKi(amount: number): number {
    const stolen = Math.min(this.state.currentKi, amount);
    this.state.currentKi -= stolen;
    return stolen;
  }

  /** Phase 3-1: 기 충전 (무한의 망토 패시브용) */
  addKi(amount: number): void {
    this.state.currentKi = Math.min(this.state.maxKi, this.state.currentKi + amount);
  }

  /** 표식 추가 */
  addMark(amount: number): void {
    this.state.mark = Math.max(0, this.state.mark + amount);
  }

  /** 표식 1 소비 */
  consumeMark(): number {
    const m = this.state.mark;
    if (m > 0) this.state.mark = Math.max(0, this.state.mark - 1);
    return m;
  }

  /** 보스 재생 (1/턴) - Phase 3-1 패시브 신진대사 재생 */
  regenerate(): void {
    if (this.state.type === 'boss' && this.state.passives.includes('regenerate_passive')) {
      this.state.currentHp = Math.min(this.state.maxHp, this.state.currentHp + 1);
    }
  }

  /** Phase 3-2: 재생집중 효과 취소 */
  cancelRegeneration(): void {
    this.state.regenerationCancelled = true;
  }

  /** Phase 3-3: 명령 하달 무효화 */
  cancelCommand(): void {
    this.state.commandActive = false;
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
  /** Phase 3-1: 패시브 목록 */
  get passives(): EnemyPassiveId[] { return this.state.passives; }
  /** Phase 3-3: 명령 활성 여부 */
  get commandActive(): boolean { return this.state.commandActive; }
  /** Phase 3-2: 재생 취소 여부 */
  get regenerationCancelled(): boolean { return this.state.regenerationCancelled; }

  getState(): Readonly<EnemyState> {
    return { ...this.state };
  }
}
