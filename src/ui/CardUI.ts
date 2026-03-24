// 카드 UI 컴포넌트

import Phaser from 'phaser';
import { CardInstance, getCardColor, getKiCostColor } from '../game/Card';

/** 카드 UI 설정 */
export interface CardUIConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  card: CardInstance;
  onSelect?: (card: CardInstance) => void;  // 선택 콜백
  interactive?: boolean;                     // 클릭 가능 여부
}

/** 카드 UI 상수 */
const CARD_WIDTH = 90;
const CARD_HEIGHT = 120;

/** 카드 UI 클래스 */
export class CardUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Arc;
  private costText: Phaser.GameObjects.Text;
  private selectedBorder: Phaser.GameObjects.Rectangle;
  
  readonly card: CardInstance;
  private isSelected: boolean = false;
  private onSelect?: (card: CardInstance) => void;
  private baseY: number = 0; // 호버 복원용 원래 Y 위치

  constructor(config: CardUIConfig) {
    this.scene = config.scene;
    this.card = config.card;
    this.onSelect = config.onSelect;

    this.container = this.scene.add.container(config.x, config.y);

    // 카드 배경
    const cardColor = getCardColor(config.card.data.rarity);
    this.background = this.scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, cardColor)
      .setStrokeStyle(2, 0x888888);

    // 선택 테두리 (기본 숨김)
    this.selectedBorder = this.scene.add.rectangle(0, 0, CARD_WIDTH + 4, CARD_HEIGHT + 4)
      .setStrokeStyle(3, 0xffff00)
      .setFillStyle(0, 0) // 투명
      .setVisible(false);

    // 카드 이름
    this.nameText = this.scene.add.text(0, -CARD_HEIGHT / 2 + 12, config.card.data.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      wordWrap: { width: CARD_WIDTH - 8 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // 카드 설명
    this.descText = this.scene.add.text(0, 5, config.card.data.description, {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'Arial',
      wordWrap: { width: CARD_WIDTH - 10 },
      align: 'center',
    }).setOrigin(0.5, 0.5);

    // 기 비용 배지
    const costColor = getKiCostColor(config.card.data.kiCost);
    this.costBadge = this.scene.add.circle(
      -CARD_WIDTH / 2 + 14,
      CARD_HEIGHT / 2 - 14,
      12,
      costColor
    ).setStrokeStyle(2, 0xffffff);

    this.costText = this.scene.add.text(
      -CARD_WIDTH / 2 + 14,
      CARD_HEIGHT / 2 - 14,
      config.card.data.kiCost === 0 ? '무료' : String(config.card.data.kiCost),
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5, 0.5);

    // 사용 횟수 표시 (우하단)
    const usesLeft = config.card.usesLeft;
    const usesLabel = usesLeft === null ? '∞' : `${usesLeft}회`;
    const usesColor = usesLeft === null ? '#666666' : (usesLeft === 0 ? '#ff4444' : '#44ffaa');
    const usesText = this.scene.add.text(
      CARD_WIDTH / 2 - 5,
      CARD_HEIGHT / 2 - 5,
      usesLabel,
      {
        fontSize: '11px',
        color: usesColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }
    ).setOrigin(1, 1);

    this.container.add([
      this.background,
      this.selectedBorder,
      this.nameText,
      this.descText,
      this.costBadge,
      this.costText,
      usesText,
    ]);

    // 인터랙션 설정
    if (config.interactive !== false) {
      this.background.setInteractive({ useHandCursor: true });
      this.background.on('pointerover', () => this.onHover(true));
      this.background.on('pointerout', () => this.onHover(false));
      this.background.on('pointerdown', () => this.onClick());
    }

    // 생성 직후 baseY 기록
    this.baseY = config.y;
  }

  /** 호버 효과 */
  private onHover(isOver: boolean): void {
    if (this.isSelected) return;

    // 진행 중인 트윈 먼저 취소 (드리프트 방지)
    this.scene.tweens.killTweensOf(this.container);

    if (isOver) {
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY - 10,
        duration: 100,
        ease: 'Power2',
      });
    } else {
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY,
        duration: 100,
        ease: 'Power2',
      });
    }
  }

  /** 클릭 처리 */
  private onClick(): void {
    this.onSelect?.(this.card);
  }

  /** 선택 상태 설정 */
  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.selectedBorder.setVisible(selected);
    
    if (selected) {
      this.background.setStrokeStyle(2, 0xffff00);
    } else {
      this.background.setStrokeStyle(2, 0x888888);
    }
  }

  /** 카드 활성화/비활성화 (기 부족 시) */
  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.container.setAlpha(1);
    } else {
      this.container.setAlpha(0.4); // 비활성화시 흐리게
    }
  }

  /** 위치 설정 */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** 원래 Y 위치 저장 (호버 복원용) */
  getY(): number {
    return this.container.y;
  }

  /** 컨테이너 참조 */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /** 제거 */
  destroy(): void {
    this.container.destroy();
  }
}

/** 카드 크기 상수 내보내기 */
export const CARD_UI_WIDTH = CARD_WIDTH;
export const CARD_UI_HEIGHT = CARD_HEIGHT;
