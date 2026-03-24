// 카드 타입 정의 및 카드 데이터

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
  | 'passive_meditate';  // 명상 (패시브)

/** 카드 효과 타입 */
export type CardEffectType =
  | 'ki_gain'     // 기 획득
  | 'damage'      // 적에게 피해
  | 'block'       // 이번 슬롯 방어
  | 'steal_ki'    // 상대 기 강탈
  | 'mark'        // 표식 중첩
  | 'dodge'       // 이번 슬롯 회피
  | 'swap_next'   // 다음 슬롯 카드 교체
  | 'passive';    // 패시브 (슬롯에 올리지 않는 영구 효과)

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
  isPassive?: boolean;  // 패시브 스킬 여부
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
  },
  energy_wave: {
    id: 'energy_wave',
    name: '에네르기파',
    description: '적에게 2의 피해를 준다.',
    kiCost: 1,
    rarity: 'common',
    effect: { type: 'damage', value: 2 },
  },
  block: {
    id: 'block',
    name: '막기',
    description: '이번 슬롯 공격을 방어한다.',
    kiCost: 0,
    rarity: 'common',
    effect: { type: 'block', value: 4 },
  },

  // ─── 추가 스킬 (보상/구매로 획득) ───
  energy_wave_l: {
    id: 'energy_wave_l',
    name: '대형 에네르기파',
    description: '적에게 5의 피해를 준다.',
    kiCost: 3,
    rarity: 'uncommon',
    effect: { type: 'damage', value: 5 },
  },
  steal: {
    id: 'steal',
    name: '강탈',
    description: '적의 기 2를 강탈한다. (공격받으면 무효)',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'steal_ki', value: 2 },
  },
  mark: {
    id: 'mark',
    name: '표식',
    description: '적에게 표식 중첩 +1. 공격 시 데미지 × (1 + 중첩).',
    kiCost: 0,
    rarity: 'uncommon',
    effect: { type: 'mark', value: 1 },
  },
  teleport: {
    id: 'teleport',
    name: '순간이동',
    description: '이번 슬롯 모든 공격을 회피한다.',
    kiCost: 1,
    rarity: 'rare',
    effect: { type: 'dodge', value: 0 },
  },
  scout: {
    id: 'scout',
    name: '눈치보기',
    description: '다음 슬롯 카드 교체 가능. (공격받으면 무효)',
    kiCost: 1,
    rarity: 'uncommon',
    effect: { type: 'swap_next', value: 0 },
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
  },
  passive_rapid: {
    id: 'passive_rapid',
    name: '연속파 (패시브)',
    description: '연속 공격(파) 성공 시 횟수만큼 추가 데미지.',
    kiCost: 0,
    rarity: 'rare',
    isPassive: true,
    effect: { type: 'passive', value: 0 },
  },
  passive_meditate: {
    id: 'passive_meditate',
    name: '명상 (패시브)',
    description: '기모으기 성공 시 기 +1. 단, 기모으기 중 피격 시 피해 +1.',
    kiCost: 0,
    rarity: 'rare',
    isPassive: true,
    effect: { type: 'passive', value: 1 },
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
];

/** 특수 기술 사용 횟수 제한 */
const CARD_USE_LIMITS: Partial<Record<CardId, number>> = {
  energy_wave_l: 3,
  steal: 3,
  mark: 3,
  teleport: 1,
  scout: 2,
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
