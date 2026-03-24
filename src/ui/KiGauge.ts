// 기 게이지 UI 컴포넌트

import Phaser from 'phaser';

/** 기 게이지 설정 */
export interface KiGaugeConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  maxKi: number;
  label: string;      // "플레이어 기" or "적 기"
  color: number;      // 게이지 색상
  width?: number;
  height?: number;
}

/** 기 게이지 UI 클래스 */
export class KiGauge {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private segments: Phaser.GameObjects.Rectangle[] = [];
  private labelText: Phaser.GameObjects.Text;
  private maxKi: number;
  private segmentWidth: number;
  private segmentHeight: number;
  private color: number;

  constructor(config: KiGaugeConfig) {
    this.scene = config.scene;
    this.maxKi = config.maxKi;
    this.color = config.color;
    this.segmentWidth = (config.width ?? 120) / config.maxKi - 2;
    this.segmentHeight = config.height ?? 16;

    this.container = this.scene.add.container(config.x, config.y);

    // 라벨 텍스트
    this.labelText = this.scene.add.text(0, -20, config.label, {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);

    this.container.add(this.labelText);

    // 기 세그먼트 생성
    const totalWidth = (this.segmentWidth + 2) * this.maxKi;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.maxKi; i++) {
      const x = startX + i * (this.segmentWidth + 2) + this.segmentWidth / 2;
      
      // 빈 슬롯 (배경)
      const bg = this.scene.add.rectangle(x, 0, this.segmentWidth, this.segmentHeight, 0x333333)
        .setStrokeStyle(1, 0x555555);
      
      // 채워진 세그먼트
      const segment = this.scene.add.rectangle(x, 0, this.segmentWidth, this.segmentHeight, this.color)
        .setAlpha(0); // 기본은 비어있음
      
      this.container.add(bg);
      this.container.add(segment);
      this.segments.push(segment);
    }
  }

  /** 기 수치 업데이트 */
  update(currentKi: number): void {
    for (let i = 0; i < this.segments.length; i++) {
      // 채워진 정도에 따라 세그먼트 표시
      if (i < currentKi) {
        this.segments[i].setAlpha(1);
        this.segments[i].setFillStyle(this.color);
      } else {
        this.segments[i].setAlpha(0.15); // 빈 세그먼트는 흐리게
      }
    }

    // 라벨에 수치 표시
    const labelBase = this.labelText.text.split(':')[0];
    this.labelText.setText(`${labelBase}: ${currentKi}/${this.maxKi}`);
  }

  /** 기 부족 시 빨간 깜빡임 효과 */
  flashInsufficient(): void {
    this.scene.tweens.add({
      targets: this.segments,
      fillColor: 0xff0000,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // 색상을 원래대로 복원 (직접 업데이트 불가, update 호출 필요)
        this.segments.forEach(s => s.setFillStyle(this.color));
      },
    });
  }

  /** 컨테이너 참조 반환 */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /** 표시/숨김 */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /** 위치 설정 */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** 제거 */
  destroy(): void {
    this.container.destroy();
  }
}
