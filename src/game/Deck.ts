// 덱 관리 시스템 - 핸드/무덤/셔플 처리

import { CardInstance, CardId, createCardInstance } from './Card';

/** 덱 상태 인터페이스 */
export interface DeckState {
  drawPile: CardInstance[];    // 드로우 파일 (남은 덱)
  hand: CardInstance[];        // 현재 손패
  discardPile: CardInstance[]; // 무덤
  maxHandSize: number;         // 최대 핸드 크기
}

/** 덱 관리 클래스 */
export class Deck {
  private state: DeckState;

  constructor(cardIds: CardId[], maxHandSize: number = 3) {
    // 카드 인스턴스 생성
    const cards = cardIds.map(id => createCardInstance(id));
    
    this.state = {
      drawPile: this.shuffle([...cards]),
      hand: [],
      discardPile: [],
      maxHandSize,
    };
  }

  /** 배열 셔플 (피셔-예이츠 알고리즘) */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /** 핸드 채우기 (최대 핸드 크기까지 드로우) */
  drawToHand(): void {
    while (this.state.hand.length < this.state.maxHandSize) {
      // 드로우 파일이 비었으면 무덤을 셔플해서 드로우 파일로 이동
      if (this.state.drawPile.length === 0) {
        if (this.state.discardPile.length === 0) break; // 더 드로우할 카드 없음
        this.recycleDiscard();
      }
      
      const card = this.state.drawPile.pop();
      if (card) {
        this.state.hand.push(card);
      }
    }
  }

  /** 무덤을 셔플해서 드로우 파일로 재활용 */
  private recycleDiscard(): void {
    this.state.drawPile = this.shuffle([...this.state.discardPile]);
    this.state.discardPile = [];
  }

  /** 핸드에서 카드를 사용 (무덤으로 이동) */
  playCard(instanceId: string): CardInstance | null {
    const index = this.state.hand.findIndex(c => c.instanceId === instanceId);
    if (index === -1) return null;
    
    const [card] = this.state.hand.splice(index, 1);
    this.state.discardPile.push(card);
    return card;
  }

  /** 턴 종료: 나머지 핸드를 무덤으로 이동 */
  discardHand(): void {
    this.state.discardPile.push(...this.state.hand);
    this.state.hand = [];
  }

  /** 덱에 카드 추가 (보상으로 얻은 카드) */
  addCard(cardId: CardId): void {
    const newCard = createCardInstance(cardId);
    // 드로우 파일에 랜덤 위치 삽입
    const insertIndex = Math.floor(Math.random() * (this.state.drawPile.length + 1));
    this.state.drawPile.splice(insertIndex, 0, newCard);
  }

  /** 현재 핸드 반환 */
  getHand(): CardInstance[] {
    return [...this.state.hand];
  }

  /** 드로우 파일 크기 */
  getDrawPileSize(): number {
    return this.state.drawPile.length;
  }

  /** 무덤 크기 */
  getDiscardPileSize(): number {
    return this.state.discardPile.length;
  }

  /** 전체 덱 카드 목록 (드로우 + 핸드 + 무덤) */
  getAllCards(): CardInstance[] {
    return [
      ...this.state.drawPile,
      ...this.state.hand,
      ...this.state.discardPile,
    ];
  }

  /** 덱 상태 직렬화 (GameState 저장용) */
  serialize(): { cardIds: CardId[] } {
    const allCards = this.getAllCards();
    return {
      cardIds: allCards.map(c => c.data.id),
    };
  }
}
