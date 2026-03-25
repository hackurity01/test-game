// 카드 타입 정의 및 카드 데이터

/** 연계 태그 타입 (Phase 2-1) */
export type CardTag = 'CHARGE' | 'ENERGY' | 'MARK' | 'MOVE' | 'DEFEND';

/** 반응 조건 타입 (Phase 2-2) */
export type ReactCondition =
  | 'enemy_attack'        // 적이 공격할 때
  | 'enemy_ki_gather'     // 적이 기모으기할 때
  | 'enemy_defend'        // 적이 막기할 때
  | 'enemy_energy_attack'; // 적이 에너지 공격할 때

/** 카드 ID 열거형 */
export type CardId =
  | 'ki_gather'          // 기모으기
  | 'energy_wave'        // 에네르기파
  | 'block'              // 막기
  | 'energy_wave_l'      // 대형 에네르기파
  | 'steal'              // 강탈
  | 'mark'               // 표식
  | 'teleport'           // 순간이동
  | 'scout'              // 눈치보기
  | 'passive_parry'      // 패링 (패시브)
  | 'passive_rapid'      // 연속파 (패시브)
  | 'passive_meditate'   // 명상 (패시브)
  // Phase 2 신규 스킬
  | 'counter_stance'     // 카운터 자세 (반응)
  | 'ki_shield'          // 기 보호막 (반응)
  | 'ambush_counter'     // 잠복 반격 (반응)
  | 'reactive_teleport'  // 반응 순간이동 (반응)
  | 'sense';             // 감지

/** 카드 효과 타입 */
export type CardEffectType =
  | 'ki_gain'      // 기 획득
  | 'damage'       // 적에게 피해
  | 'block'        // 이번 슬롯 방어
  | 'steal_ki'     // 상대 기 강탈
  | 'mark'         // 표식 중첩
  | 'dodge'        // 이번 슬롯 회피
  | 'swap_next'    // 다음 슬롯 카드 교체 + 적 다음 슬롯 공개 (강화된 scout)
  | 'reveal_all'   // 적 3슬롯 전체 공개 (sense)
  | 'counter'      // 카운터 자세 (반응: 피해 경감 + 반격)
  | 'ki_block'     // 기 보호막 (반응: 적 기모으기 차단)
  | 'ambush'       // 잠복 반격 (반응: 막기 무효 + 관통)
  | 'react_dodge'  // 반응 순간이동 (반응: 에너지 공격 회피)
  | 'passive';     // 패시브 (슬롯에 올리지 않는 영구 효과)

/** 카드 희귀도 */
export type CardRarity = 'common' | 'uncommon' | 'rare';

/** 카드 인터페이스 */
export interface CardData {
  id: CardId;
  name: string;
  description: string;
  kiCost: number;
  rarity: CardRarity;
  effect: CardEffect;
  isPassive?: boolean;         // 패시브 스킬 여부
  tags?: CardTag[];            // 연계 태그 (Phase 2-1)
  isReactive?: boolean;        // 반응 스킬 여부 (Phase 2-2)
  reactCondition?: ReactCondition; // 반응 조건 (Phase 2-2)
}

/** 카드 효과 인터페이스 */
export interface CardEffect {
  type: CardEffectType;
  value: number;
  secondaryValue?: number;
  count?: number;
}

/** 카드 인스턴스 (고유 ID 포함) */
export interface CardInstance {
  instanceId: string;
  data: CardData;
  usesLeft: number | null;  // 남은 사용 횟수 (null = 무제한)
}

/** 모든 카드 데이터 정의 */
export const CARD_DATABASE: Record<CardId, CardData> = {
  // ─── 기본 스킬 (무제한, 시작 덱 포함) ───
  ki_gather: {
    id: 'ki_gather',
    name: '기모으기',
    description: '기를 +1 충전한다.',
    kiCost: 0,
    rarity: 'common',
    effect: { type: 'ki_gain', value: 1 },
    tags: ['CHARGE'],  // 기모으기 → CHARGE 태그
  },
  energy_wave: {
    id: 'energy_wave',
    name: '에네르기파',
    description: '적에게 2의 피해를 준다.',
    kiCost: 1,
    rarity: 'common',
    effect: { type: 'damage', value: 2 },
    tags: ['ENERGY'],  // 에너지 공격 → ENERGY 태그
  },
  block: {
    id: 'block',
    name: '막기',
    description: '이번 슬롯 공격을 방어한다.',
    kiCost: 0,
    rarity: 'common',
    effect: { type: 'block', value: 4 },
    tags: ['DEFEND'],  // 방어 → DEFEND 태그
  },

  // ─── 추가 스킬 (보상/구매로 획득) ───
  energy_wave_l: {
    id: 'energy_wave_l',
    name: '대형 에네르기파',
    description: '적에게 5의 피해를 준다.',
    kiCost: 3,
    rarity: 'uncommon',
    effect: { type: 'damage', value: 5 },
    tags: ['ENERGY'],  // 에너지 대형 공격 → ENERGY 태그
  },
  steal: {
    id: 'steal',
    name: '강탈',
    description: '적의 기 2를 강탈한다. (공격받으면 무효)',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'steal_ki', value: 2 },
    tags: [],  // 강탈 → 태그 없음
  },
  mark: {
    id: 'mark',
    name: '표식',
    description: '적에게 표식 중첩 +1. 공격 시 데미지 × (1 + 중첩).',
    kiCost: 0,
    rarity: 'uncommon',
    effect: { type: 'mark', value: 1 },
    tags: ['MARK'],  // 표식 → MARK 태그
  },
  teleport: {
    id: 'teleport',
    name: '순간이동',
    description: '이번 슬롯 모든 공격을 회피한다.',
    kiCost: 1,
    rarity: 'rare',
    effect: { type: 'dodge', value: 0 },
    tags: ['MOVE'],  // 이동/회피 → MOVE 태그
  },
  scout: {
    id: 'scout',
    name: '눈치보기',
    description: '적 다음 슬롯 행동 공개 + 카드 교체 가능.',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'swap_next', value: 0 },
    tags: [],  // 정보 스킬 → 태그 없음
  },

  // ─── 패시브 스킬 (영구 효과) ───
  passive_parry: {
    id: 'passive_parry',
    name: '패링 (패시브)',
    description: '막기 성공 시 기 +1.',
    kiCost: 0,
    rarity: 'rare',
    isPassive: true,
    effect: { type: 'passive', value: 1 },
    tags: [],
  },
  passive_rapid: {
    id: 'passive_rapid',
    name: '연속파 (패시브)',
    description: '연속 공격(파) 성공 시 횟수만큼 추가 데미지.',
    kiCost: 0,
    rarity: 'rare',
    isPassive: true,
    effect: { type: 'passive', value: 0 },
    tags: [],
  },
  passive_meditate: {
    id: 'passive_meditate',
    name: '명상 (패시브)',
    description: '기모으기 성공 시 기 +1. 단, 기모으기 중 피격 시 피해 +1.',
    kiCost: 0,
    rarity: 'rare',
    isPassive: true,
    effect: { type: 'passive', value: 1 },
    tags: [],
  },

  // ─── Phase 2 신규 반응 스킬 ───

  counter_stance: {
    id: 'counter_stance',
    name: '카운터 자세',
    description: '적 공격 시: 피해 -2 + 반격 2뎀. 조건 불충족 시 효과 없음.',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'counter', value: 2 },  // value = 반격 데미지
    tags: [],
    isReactive: true,
    reactCondition: 'enemy_attack',
  },
  ki_shield: {
    id: 'ki_shield',
    name: '기 보호막',
    description: '적 기모으기 시: 기+1 차단 + 다음 슬롯 기소모 -1. 조건 불충족 시 효과 없음.',
    kiCost: 0,
    rarity: 'uncommon',
    effect: { type: 'ki_block', value: 1 },  // value = 차단하는 기 양
    tags: [],
    isReactive: true,
    reactCondition: 'enemy_ki_gather',
  },
  ambush_counter: {
    id: 'ambush_counter',
    name: '잠복 반격',
    description: '적 막기 시: 막기 무효 + 관통 4뎀. 조건 불충족 시 1뎀.',
    kiCost: 2,
    rarity: 'rare',
    effect: { type: 'ambush', value: 4 },   // value = 관통 피해
    tags: [],
    isReactive: true,
    reactCondition: 'enemy_defend',
  },
  reactive_teleport: {
    id: 'reactive_teleport',
    name: '반응 순간이동',
    description: '적 에너지 공격 시: 자동 회피. 조건 불충족 시 효과 없음.',
    kiCost: 1,
    rarity: 'rare',
    effect: { type: 'react_dodge', value: 0 },
    tags: ['MOVE'],  // 이동 계열
    isReactive: true,
    reactCondition: 'enemy_energy_attack',
  },

  // ─── Phase 2 신규 일반 스킬 ───

  sense: {
    id: 'sense',
    name: '감지',
    description: '적 3슬롯 전체 공개. 단, 이번 턴 슬롯 2개만 사용 가능.',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'reveal_all', value: 0 },
    tags: [],
    isReactive: false,
  },
};

/** 시작 덱 카드 목록 */
export const STARTER_DECK_IDS: CardId[] = [
  'ki_gather',
  'ki_gather',
  'ki_gather',
  'energy_wave',
  'energy_wave',
  'block',
  'block',
];

/** 보상 카드 풀 (전투 후 선택 가능한 카드들) */
export const REWARD_CARD_POOL: CardId[] = [
  'energy_wave_l',
  'steal',
  'mark',
  'teleport',
  'scout',
  'passive_parry',
  'passive_rapid',
  'passive_meditate',
  // Phase 2 추가
  'counter_stance',
  'ki_shield',
  'ambush_counter',
  'reactive_teleport',
  'sense',
];

/** 특수 기술 사용 횟수 제한 */
const CARD_USE_LIMITS: Partial<Record<CardId, number>> = {
  energy_wave_l: 3,
  steal: 3,
  mark: 3,
  teleport: 1,
  scout: 2,
  // Phase 2 반응 스킬 제한
  counter_stance: 3,
  ki_shield: 3,
  ambush_counter: 2,
  reactive_teleport: 2,
  sense: 2,
};

/** 카드 인스턴스 생성 헬퍼 */
let instanceCounter = 0;
export function createCardInstance(cardId: CardId): CardInstance {
  return {
    instanceId: `card_${cardId}_${++instanceCounter}`,
    data: CARD_DATABASE[cardId],
    usesLeft: CARD_USE_LIMITS[cardId] ?? null,
  };
}

/** 카드 색상 반환 (희귀도 기반) */
export function getCardColor(rarity: CardRarity): number {
  switch (rarity) {
    case 'common':    return 0x4a4a6a;
    case 'uncommon':  return 0x2a6a4a;
    case 'rare':      return 0x6a2a6a;
    default:          return 0x4a4a6a;
  }
}

/** 카드 비용 색상 반환 */
export function getKiCostColor(kiCost: number): number {
  if (kiCost === 0) return 0x00ff88;
  if (kiCost <= 2)  return 0xffcc00;
  return 0xff4444;
}

/** 태그 아이콘 텍스트 반환 */
export function getTagIcons(tags?: CardTag[]): string {
  if (!tags || tags.length === 0) return '';
  return tags.map(tag => {
    switch (tag) {
      case 'ENERGY':  return '⚡E';
      case 'CHARGE':  return '🔋C';
      case 'MARK':    return '🎯M';
      case 'MOVE':    return '👟V';
      case 'DEFEND':  return '🛡D';
      default:        return '';
    }
  }).filter(Boolean).join(' ');
}
