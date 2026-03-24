// 보상 씬 - 전투 후 카드 3개 중 1개 선택

import Phaser from 'phaser';
import { GameState } from '../game/GameState';
import { CardId, REWARD_CARD_POOL, createCardInstance, CARD_DATABASE } from '../game/Card';
import { CardUI, CARD_UI_WIDTH, CARD_UI_HEIGHT } from '../ui/CardUI';

export class RewardScene extends Phaser.Scene {
  private gameState!: GameState;
  private rewardCards: CardId[] = [];
  private cardUIs: CardUI[] = [];

  constructor() {
    super({ key: 'RewardScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.gameState = GameState.getInstance();

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e);

    // 타이틀
    this.add.text(width / 2, 40, '🏆 전투 승리!', {
      fontSize: '28px',
      color: '#ffdd44',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 보상 설명
    this.add.text(width / 2, 85, '카드 1개를 선택해 덱에 추가하세요', {
      fontSize: '15px',
      color: '#aaaaaa',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // 현재 층 정보
    const floor = this.gameState.currentFloor;
    this.add.text(width / 2, 110, `${floor}층 클리어!`, {
      fontSize: '13px',
      color: '#88aaff',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // 보상 카드 3개 선택 (랜덤)
    this.rewardCards = this.pickRewardCards(3);
    this.renderRewardCards(width, height);

    // 스킵 버튼
    this.createSkipButton(width, height);
  }

  /** 보상 카드 풀에서 랜덤 선택 */
  private pickRewardCards(count: number): CardId[] {
    const pool = [...REWARD_CARD_POOL];
    const result: CardId[] = [];
    
    for (let i = 0; i < count && pool.length > 0; i++) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool[index]);
      pool.splice(index, 1); // 중복 제거
    }
    
    return result;
  }

  /** 보상 카드 UI 렌더링 */
  private renderRewardCards(width: number, height: number): void {
    const cardSpacing = 130;
    const startX = width / 2 - cardSpacing;
    const cardY = height / 2;

    this.rewardCards.forEach((cardId, index) => {
      const x = startX + index * cardSpacing;
      const cardInstance = createCardInstance(cardId);

      const cardUI = new CardUI({
        scene: this,
        x,
        y: cardY,
        card: cardInstance,
        onSelect: (selected) => this.onCardSelected(selected.data.id),
        interactive: true,
      });

      this.cardUIs.push(cardUI);

      // 카드 아래 효과 설명 (더 크게)
      const effect = CARD_DATABASE[cardId].effect;
      let effectDesc = '';
      switch (effect.type) {
        case 'ki_gain':    effectDesc = `기 +${effect.value}`; break;
        case 'damage':     effectDesc = `${effect.value} 피해`; break;
        case 'block':      effectDesc = `막기 (방어)`; break;
        case 'steal_ki':   effectDesc = `기 ${effect.value} 강탈`; break;
        case 'mark':       effectDesc = `표식 +${effect.value}`; break;
        case 'dodge':      effectDesc = `공격 회피`; break;
        case 'swap_next':  effectDesc = `다음 슬롯 교체`; break;
        case 'passive':    effectDesc = `[패시브]`; break;
      }

      this.add.text(x, cardY + CARD_UI_HEIGHT / 2 + 15, effectDesc, {
        fontSize: '12px',
        color: '#ffcc88',
        fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5, 0);
    });
  }

  /** 카드 선택 처리 */
  private onCardSelected(cardId: CardId): void {
    // 덱에 카드 추가
    this.gameState.addCardToDeck(cardId);
    
    const cardName = CARD_DATABASE[cardId].name;
    this.showSelectionFeedback(cardName);

    // 잠시 후 다음 씬으로
    this.time.delayedCall(1000, () => {
      this.proceedToNextScene();
    });
  }

  /** 선택 피드백 표시 */
  private showSelectionFeedback(cardName: string): void {
    const { width, height } = this.scale;
    
    // 카드 선택 UI 비활성화
    this.cardUIs.forEach(ui => ui.setEnabled(false));

    this.add.text(width / 2, height - 100, `✅ ${cardName}을 덱에 추가했습니다!`, {
      fontSize: '16px',
      color: '#44ff88',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
  }

  /** 스킵 버튼 (카드 추가 없이 다음으로) */
  private createSkipButton(width: number, height: number): void {
    const btnBg = this.add.rectangle(width / 2, height - 40, 160, 36, 0x221122)
      .setStrokeStyle(1, 0x664466)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, height - 40, '건너뛰기', {
      fontSize: '14px',
      color: '#886688',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x332233));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x221122));
    btnBg.on('pointerdown', () => this.proceedToNextScene());
  }

  /** 다음 씬으로 이동 */
  private proceedToNextScene(): void {
    // 씬 전환 전 모든 UI 명시적 정리
    this.cardUIs.forEach(ui => ui.destroy());
    this.cardUIs = [];

    // 층 진행
    this.gameState.advanceFloor();

    if (!this.gameState.isRunActive) {
      this.scene.start('ResultScene');
    } else {
      this.scene.start('MapScene');
    }
  }
}
