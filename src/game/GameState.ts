// 전체 게임 상태 관리 (싱글톤)

import { Deck } from './Deck';
import { Player } from './Player';
import { EnemyType } from './Enemy';
import { CardId, STARTER_DECK_IDS } from './Card';

/** 층 정보 */
export interface FloorInfo {
  floor: number;         // 1-10
  enemyType: EnemyType;  // 해당 층의 적 타입
  completed: boolean;
}

/** 런 결과 */
export interface RunResult {
  won: boolean;           // 클리어 여부
  floorsCleared: number;  // 클리어한 층 수
  totalDamageDealt: number;
  totalDamageTaken: number;
}

/** 전체 게임 상태 */
export class GameState {
  private static _instance: GameState | null = null;

  // 런 상태
  currentFloor: number = 1;
  floors: FloorInfo[] = [];
  deck: Deck;
  player: Player;
  isRunActive: boolean = false;
  runResult: RunResult | null = null;

  // 통계 (런 내)
  totalDamageDealt: number = 0;
  totalDamageTaken: number = 0;

  private constructor() {
    this.player = new Player();
    this.deck = new Deck(STARTER_DECK_IDS);
    this.initFloors();
  }

  /** 싱글톤 인스턴스 반환 */
  static getInstance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  /** 새 런 시작 */
  startNewRun(): void {
    this.currentFloor = 1;
    this.player = new Player();
    this.deck = new Deck(STARTER_DECK_IDS);
    this.initFloors();
    this.isRunActive = true;
    this.runResult = null;
    this.totalDamageDealt = 0;
    this.totalDamageTaken = 0;
  }

  /** 10층 구조 초기화 */
  private initFloors(): void {
    // 층 구조: 일반 7 + 엘리트 2 + 보스 1
    const floorTypes: EnemyType[] = [
      'normal',   // 1층
      'normal',   // 2층
      'normal',   // 3층
      'elite',    // 4층 (첫 번째 엘리트)
      'normal',   // 5층
      'normal',   // 6층
      'normal',   // 7층
      'elite',    // 8층 (두 번째 엘리트)
      'normal',   // 9층
      'boss',     // 10층 (보스: 피콜로)
    ];

    this.floors = floorTypes.map((type, index) => ({
      floor: index + 1,
      enemyType: type,
      completed: false,
    }));
  }

  /** 현재 층 정보 */
  getCurrentFloorInfo(): FloorInfo {
    return this.floors[this.currentFloor - 1];
  }

  /** 전투 완료 처리 (층 이동 시 HP +2 회복) */
  completeCurrentFloor(): void {
    this.floors[this.currentFloor - 1].completed = true;
    this.player.heal(2);
  }

  /** 다음 층으로 이동 */
  advanceFloor(): void {
    if (this.currentFloor < 10) {
      this.currentFloor++;
    } else {
      // 10층 클리어 = 런 승리
      this.endRun(true);
    }
  }

  /** 런 종료 */
  endRun(won: boolean): void {
    this.isRunActive = false;
    this.runResult = {
      won,
      floorsCleared: this.currentFloor - (won ? 0 : 1),
      totalDamageDealt: this.totalDamageDealt,
      totalDamageTaken: this.totalDamageTaken,
    };
  }

  /** 덱에 카드 추가 (보상) */
  addCardToDeck(cardId: CardId): void {
    this.deck.addCard(cardId);
  }

  /** 데미지 통계 업데이트 */
  recordDamageDealt(amount: number): void {
    this.totalDamageDealt += amount;
  }

  recordDamageTaken(amount: number): void {
    this.totalDamageTaken += amount;
  }

  /** 게임 리셋 (새 런을 위해) */
  static reset(): void {
    GameState._instance = null;
  }
}
