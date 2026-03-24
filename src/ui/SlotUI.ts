// 2슬롯 배치 UI 컴포넌트

import Phaser from 'phaser';
import { CardInstance } from '../game/Card';
import { CARD_UI_WIDTH, CARD_UI_HEIGHT } from './CardUI';

/** 슬롯 상태 */
export interface SlotState {
  slotIndex: number;     // 0 = 슬롯1, 1 = 슬롯2
  card: CardInstance | null;
  isHighlighted: boolean;
}

/** 슬롯 UI 설정 */
export interface SlotUIConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  slotIndex: number;
  label: string;         // "슬롯 1" or "슬롯 2"
  onDrop?: (slotIndex: number, card: CardInstance) => void;
  onRemove?: (slotIndex: number) => void;
}

/** 슬롯 UI 클래스 */
export class SlotUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private cardNameText: Phaser.GameObjects.Text;
  private cardCostText: Phaser.GameObjects.Text;
  private slashEffect: Phaser.GameObjects.Text; // 스킵 피드백
  private hintText: Phaser.GameObjects.Text;    // 빈 슬롯 힌트

  private state: SlotState;
  private onDrop?: (slotIndex: number, card: CardInstance) => void;
  private onRemove?: (slotIndex: number) => void;

  readonly slotIndex: number;

  constructor(config: SlotUIConfig) {
    this.scene = config.scene;
    this.slotIndex = config.slotIndex;
    this.onDrop = config.onDrop;
    this.onRemove = config.onRemove;

    this.state = {
      slotIndex: config.slotIndex,
      card: null,
      isHighlighted: false,
    };

    this.container = this.scene.add.container(config.x, config.y);

    // 슬롯 배경
    this.background = this.scene.add.rectangle(0, 0, CARD_UI_WIDTH + 10, CARD_UI_HEIGHT + 10, 0x222244)
      .setStrokeStyle(2, 0x4444aa);

    // 슬롯 라벨
    this.labelText = this.scene.add.text(0, -CARD_UI_HEIGHT / 2 - 18, config.label, {
      fontSize: '13px',
      color: '#8888cc',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 카드 이름 (배치된 카드 표시)
    this.cardNameText = this.scene.add.text(0, -15, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      wordWrap: { width: CARD_UI_WIDTH },
      align: 'center',
    }).setOrigin(0.5, 0.5);

    // 카드 비용 표시
    this.cardCostText = this.scene.add.text(0, 15, '', {
      fontSize: '11px',
      color: '#ffcc00',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);

    // 스킵 효과 텍스트
    this.slashEffect = this.scene.add.text(0, 0, '기 부족!', {
      fontSize: '18px',
      color: '#ff4444',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setVisible(false);

    // 빈 슬롯 힌트 텍스트 (class property로 관리해 hide/show 제어)
    this.hintText = this.scene.add.text(0, 0, '카드를\n클릭하여\n배치', {
      fontSize: '11px',
      color: '#444466',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.container.add([
      this.background,
      this.labelText,
      this.cardNameText,
      this.cardCostText,
      this.slashEffect,
      this.hintText,
    ]);

    // 슬롯 클릭 → 카드 제거
    this.background.setInteractive({ useHandCursor: true });
    this.background.on('pointerdown', () => {
      if (this.state.card) {
        this.onRemove?.(this.slotIndex);
      }
    });
    this.background.on('pointerover', () => {
      if (!this.state.card) {
        this.background.setStrokeStyle(2, 0x8888ff);
      }
    });
    this.background.on('pointerout', () => {
      if (!this.state.card) {
        this.background.setStrokeStyle(2, 0x4444aa);
      }
    });
  }

  /** 카드 배치 */
  placeCard(card: CardInstance): void {
    // 진행 중인 모든 트윈 정리 (alpha, scale, y 포함)
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);

    // 트윈 kill 후 남은 중간 상태를 명시적으로 전부 리셋
    this.background.setAlpha(1);
    this.slashEffect.setVisible(false).setAlpha(1).setY(0);
    this.container.setAlpha(1).setScale(1);

    this.state.card = card;

    // 카드 정보 표시, 힌트 숨김
    this.hintText.setVisible(false);
    this.cardNameText.setText(card.data.name);
    this.cardCostText.setText(`기 비용: ${card.data.kiCost}`);
    this.background.setFillStyle(0x334466);
    this.background.setStrokeStyle(2, 0x6688cc);

    // 배치 애니메이션
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 80,
      yoyo: true,
    });
  }

  /** 카드 제거 */
  removeCard(): CardInstance | null {
    const card = this.state.card;
    this.state.card = null;

    // 진행 중인 트윈 모두 정리 후 시각 상태 완전 리셋
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);

    // alpha는 killTweensOf 후 직접 리셋 (Phaser 3.60에서 kill이 seek(0) 미보장)
    this.background.setAlpha(1);
    this.slashEffect.setVisible(false).setAlpha(1).setY(0);
    this.container.setAlpha(1).setScale(1);

    this.cardNameText.setText('');
    this.cardCostText.setText('');
    this.hintText.setVisible(true);
    this.background.setFillStyle(0x222244);
    this.background.setStrokeStyle(2, 0x4444aa);

    return card;
  }

  /** 기 부족 시 빨간 플래시 효과 */
  flashInsufficientKi(): Promise<void> {
    return new Promise((resolve) => {
      // 이전 트윈 먼저 정리 + 상태 리셋
      this.scene.tweens.killTweensOf(this.background);
      this.scene.tweens.killTweensOf(this.slashEffect);
      this.background.setAlpha(1);
      this.slashEffect.setVisible(false).setAlpha(1).setY(0);

      this.slashEffect.setVisible(true);

      // 배경 알파 플래시 (fillColor 트윈 대신 알파 사용)
      this.scene.tweens.add({
        targets: this.background,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.background.setAlpha(1);
        },
      });

      // "기 부족!" 텍스트 페이드아웃
      // onStop도 등록해 tween이 killTweensOf로 중단될 때도 반드시 resolve()되도록 보장
      this.scene.tweens.add({
        targets: this.slashEffect,
        alpha: 0,
        y: -30,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
          this.slashEffect.setVisible(false).setAlpha(1).setY(0);
          resolve();
        },
        onStop: () => {
          this.slashEffect.setVisible(false).setAlpha(1).setY(0);
          resolve();
        },
      });
    });
  }

  /** 실행 중 하이라이트 (슬롯 1 실행 중 강조) */
  setHighlight(highlight: boolean): void {
    this.state.isHighlighted = highlight;
    if (highlight) {
      this.background.setStrokeStyle(3, 0xffff00);
    } else {
      this.background.setStrokeStyle(2, this.state.card ? 0x6688cc : 0x4444aa);
    }
  }

  /** 실행 완료 피드백 (초록 플래시) */
  flashExecuted(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this.background);
      this.background.setAlpha(1);
      this.scene.tweens.add({
        targets: this.background,
        alpha: 0.4,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.background.setAlpha(1);
          resolve();
        },
        onStop: () => {
          this.background.setAlpha(1);
          resolve();
        },
      });
    });
  }

  /** 현재 배치된 카드 반환 */
  getCard(): CardInstance | null {
    return this.state.card;
  }

  /** 슬롯이 비어있는지 */
  isEmpty(): boolean {
    return this.state.card === null;
  }

  /** 컨테이너 참조 */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /** 위치 설정 */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** 제거 */
  destroy(): void {
    // 진행 중인 트윈을 먼저 kill해 onStop/onComplete 콜백이 destroy된 오브젝트를 접근하지 않도록
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);
    this.container.destroy();
  }
}
