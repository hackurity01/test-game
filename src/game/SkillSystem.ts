// 패시브 스킬 시스템 (플러그인/미들웨어 패턴)

import { Player } from './Player';
import { Enemy } from './Enemy';

/** 전투 컨텍스트 */
export interface BattleContext {
  player: Player;
  enemy: Enemy;
  slotIndex: number;
  extraDamage?: number;
  extraKi?: number;
}

/** 전투 이벤트 타입 */
export type BattleEventType =
  | 'ki_gather_success'       // 기모으기 성공 (공격 안 받은 상태)
  | 'ki_gather_while_attacked' // 기모으기 중 피격
  | 'attack_hit'              // 공격 명중
  | 'block_success'           // 막기 성공
  | 'consecutive_attack';     // 연속 공격

/** 전투 이벤트 */
export interface BattleEvent {
  type: BattleEventType;
  context: BattleContext;
}

/** 이벤트 결과 */
export interface BattleEventResult {
  passiveId: string;
  extraKi?: number;
  extraDamage?: number;
  message?: string;
}

/** 패시브 효과 인터페이스 */
export interface PassiveEffect {
  id: string;
  name: string;
  onEvent(event: BattleEvent): BattleEventResult | null;
}

/** 스킬 시스템 (패시브 관리) */
export class SkillSystem {
  private passives: PassiveEffect[] = [];

  addPassive(passive: PassiveEffect): void {
    if (!this.passives.find(p => p.id === passive.id)) {
      this.passives.push(passive);
    }
  }

  removePassive(id: string): void {
    this.passives = this.passives.filter(p => p.id !== id);
  }

  trigger(event: BattleEvent): BattleEventResult[] {
    const results: BattleEventResult[] = [];
    for (const passive of this.passives) {
      const result = passive.onEvent(event);
      if (result) results.push(result);
    }
    return results;
  }

  hasPassive(id: string): boolean {
    return this.passives.some(p => p.id === id);
  }

  // ─── 내장 패시브 정의 ───

  /** 패링: 막기 성공 시 기 +1 */
  static readonly PARRY_PASSIVE: PassiveEffect = {
    id: 'passive_parry',
    name: '패링',
    onEvent(event: BattleEvent): BattleEventResult | null {
      if (event.type === 'block_success') {
        return {
          passiveId: 'passive_parry',
          extraKi: 1,
          message: '⚔️ [패링] 막기 성공! 기 +1',
        };
      }
      return null;
    },
  };

  /** 연속파: 공격 명중 시 추가 데미지 (연속 공격 횟수만큼) */
  static readonly RAPID_PASSIVE: PassiveEffect = {
    id: 'passive_rapid',
    name: '연속파',
    onEvent(event: BattleEvent): BattleEventResult | null {
      if (event.type === 'consecutive_attack') {
        const count = event.context.extraDamage ?? 1;
        return {
          passiveId: 'passive_rapid',
          extraDamage: count,
          message: `⚡ [연속파] 연속 공격 +${count} 추가 데미지!`,
        };
      }
      return null;
    },
  };

  /** 명상: 기모으기 성공 시 기 +1, 기모으기 중 피격 시 피해 +1 */
  static readonly MEDITATE_PASSIVE: PassiveEffect = {
    id: 'passive_meditate',
    name: '명상',
    onEvent(event: BattleEvent): BattleEventResult | null {
      if (event.type === 'ki_gather_success') {
        return {
          passiveId: 'passive_meditate',
          extraKi: 1,
          message: '🧘 [명상] 기모으기 기 +1 추가!',
        };
      }
      if (event.type === 'ki_gather_while_attacked') {
        return {
          passiveId: 'passive_meditate',
          extraDamage: 1,
          message: '💥 [명상] 기모으기 중 피격 피해 +1!',
        };
      }
      return null;
    },
  };
}
