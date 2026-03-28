// 슬롯 배치 UI 컴포넌트 (Phase 2: 연계 태그 + 반응 스킬 UI 지원)

import Phaser from 'phaser';
import { CardInstance, getTagIcons } from '../game/Card';
import { CARD_UI_WIDTH, CARD_UI_HEIGHT } from './CardUI';

/** 슬롯 상태 */
export interface SlotState {
  slotIndex: number;
  card: CardInstance | null;
  isHighlighted: boolean;
}

/** 슬롯 UI 설정 */
export interface SlotUIConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  slotIndex: number;
  label: string;
  onDrop?: (slotIndex: number, card: CardInstance) => void;
  onRemove?: (slotIndex: number) => void;
}

/** 슬롯 UI 클래스 */
export class SlotUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  /** 반응 스킬용 점선 테두리 오버레이 (Graphics로 그림) */
  private reactiveBorder: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private cardNameText: Phaser.GameObjects.Text;
  private cardCostText: Phaser.GameObjects.Text;
  private slashEffect: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  /** 카드 태그 아이콘 표시 텍스트 (Phase 2-1) */
  private tagText: Phaser.GameObjects.Text;
  /** 연계 보너스 힌트 텍스트 (슬롯 상단) */
  private chainHintText: Phaser.GameObjects.Text;

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

    // 반응 스킬용 점선 테두리 (기본 숨김)
    this.reactiveBorder = this.scene.add.graphics();
    this.reactiveBorder.setVisible(false);

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
    this.cardCostText = this.scene.add.text(0, 8, '', {
      fontSize: '11px',
      color: '#ffcc00',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);

    // 태그 아이콘 텍스트 (카드 하단, Phase 2-1)
    this.tagText = this.scene.add.text(0, CARD_UI_HEIGHT / 2 - 8, '', {
      fontSize: '10px',
      color: '#aaaaff',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5, 1);

    // 연계 보너스 힌트 텍스트 (슬롯 위쪽, Phase 2-1)
    this.chainHintText = this.scene.add.text(0, -CARD_UI_HEIGHT / 2 - 32, '', {
      fontSize: '10px',
      color: '#ffaa00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 1);

    // 스킵 효과 텍스트
    this.slashEffect = this.scene.add.text(0, 0, '기 부족!', {
      fontSize: '18px',
      color: '#ff4444',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setVisible(false);

    // 빈 슬롯 힌트 텍스트
    this.hintText = this.scene.add.text(0, 0, '카드를\n클릭하여\n배치', {
      fontSize: '11px',
      color: '#444466',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.container.add([
      this.background,
      this.reactiveBorder,
      this.labelText,
      this.chainHintText,
      this.cardNameText,
      this.cardCostText,
      this.tagText,
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

  /**
   * 점선 테두리 그리기 (반응 스킬용)
   * Phaser Graphics로 직접 그림
   */
  private drawDashedBorder(): void {
    this.reactiveBorder.clear();
    const w = CARD_UI_WIDTH + 10;
    const h = CARD_UI_HEIGHT + 10;
    const x = -w / 2;
    const y = -h / 2;

    this.reactiveBorder.lineStyle(2, 0xffaa00, 1);  // 주황색 점선

    // 점선 패턴: 간격 6px, 선 4px
    const dashLen = 6;
    const gapLen = 4;

    // 상단 선
    let pos = x;
    while (pos < x + w) {
      const end = Math.min(pos + dashLen, x + w);
      this.reactiveBorder.beginPath();
      this.reactiveBorder.moveTo(pos, y);
      this.reactiveBorder.lineTo(end, y);
      this.reactiveBorder.strokePath();
      pos += dashLen + gapLen;
    }
    // 하단 선
    pos = x;
    while (pos < x + w) {
      const end = Math.min(pos + dashLen, x + w);
      this.reactiveBorder.beginPath();
      this.reactiveBorder.moveTo(pos, y + h);
      this.reactiveBorder.lineTo(end, y + h);
      this.reactiveBorder.strokePath();
      pos += dashLen + gapLen;
    }
    // 좌측 선
    pos = y;
    while (pos < y + h) {
      const end = Math.min(pos + dashLen, y + h);
      this.reactiveBorder.beginPath();
      this.reactiveBorder.moveTo(x, pos);
      this.reactiveBorder.lineTo(x, end);
      this.reactiveBorder.strokePath();
      pos += dashLen + gapLen;
    }
    // 우측 선
    pos = y;
    while (pos < y + h) {
      const end = Math.min(pos + dashLen, y + h);
      this.reactiveBorder.beginPath();
      this.reactiveBorder.moveTo(x + w, pos);
      this.reactiveBorder.lineTo(x + w, end);
      this.reactiveBorder.strokePath();
      pos += dashLen + gapLen;
    }
  }

  /** 카드 배치 */
  placeCard(card: CardInstance): void {
    // 진행 중인 모든 트윈 정리
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);

    this.background.setAlpha(1);
    this.slashEffect.setVisible(false).setAlpha(1).setY(0);
    this.container.setAlpha(1).setScale(1);

    this.state.card = card;

    // 카드 정보 표시, 힌트 숨김
    this.hintText.setVisible(false);
    this.cardNameText.setText(card.data.name);
    this.cardCostText.setText(`기 비용: ${card.data.kiCost}`);

    // 반응 스킬 여부에 따라 배경색/테두리 변경
    if (card.data.isReactive) {
      // 반응 스킬: 어두운 주황색 배경 + 점선 테두리
      this.background.setFillStyle(0x443322);
      this.background.setStrokeStyle(1, 0x886644);  // 실선은 얇게
      this.drawDashedBorder();
      this.reactiveBorder.setVisible(true);
    } else {
      this.background.setFillStyle(0x334466);
      this.background.setStrokeStyle(2, 0x6688cc);
      this.reactiveBorder.setVisible(false);
    }

    // 태그 아이콘 표시 (Phase 2-1)
    const tagIcons = getTagIcons(card.data.tags);
    this.tagText.setText(tagIcons);

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

    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);

    this.background.setAlpha(1);
    this.slashEffect.setVisible(false).setAlpha(1).setY(0);
    this.container.setAlpha(1).setScale(1);

    this.cardNameText.setText('');
    this.cardCostText.setText('');
    this.tagText.setText('');          // 태그 초기화
    this.chainHintText.setText('');    // 연계 힌트 초기화
    this.reactiveBorder.setVisible(false);  // 점선 테두리 숨김
    this.hintText.setVisible(true);
    this.background.setFillStyle(0x222244);
    this.background.setStrokeStyle(2, 0x4444aa);

    return card;
  }

  /**
   * 연계 보너스 힌트 텍스트 설정 (Phase 2-1)
   * 이전 슬롯에서 연계 가능한 경우 "→ +2뎀" 등 표시
   * @param hint 힌트 텍스트 (빈 문자열이면 숨김)
   */
  setChainHint(hint: string): void {
    this.chainHintText.setText(hint);
  }

  /** 기 부족 시 빨간 플래시 효과 */
  flashInsufficientKi(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(this.background);
      this.scene.tweens.killTweensOf(this.slashEffect);
      this.background.setAlpha(1);
      this.slashEffect.setVisible(false).setAlpha(1).setY(0);

      this.slashEffect.setVisible(true);

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

  /** 실행 중 하이라이트 */
  setHighlight(highlight: boolean): void {
    this.state.isHighlighted = highlight;
    if (highlight) {
      this.background.setStrokeStyle(3, 0xffff00);
    } else {
      if (this.state.card?.data.isReactive) {
        this.background.setStrokeStyle(1, 0x886644);
      } else {
        this.background.setStrokeStyle(2, this.state.card ? 0x6688cc : 0x4444aa);
      }
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
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.background);
    this.scene.tweens.killTweensOf(this.slashEffect);
    this.container.destroy();
  }
}
