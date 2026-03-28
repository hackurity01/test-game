// 런 결과 씬 - 승리/패배 화면

import Phaser from 'phaser';
import { GameState } from '../game/GameState';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const gameState = GameState.getInstance();
    const result = gameState.runResult;

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

    if (!result) {
      this.add.text(width / 2, height / 2, '결과 없음', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
      return;
    }

    if (result.won) {
      this.showVictory(width, height, result);
    } else {
      this.showDefeat(width, height, result);
    }
  }

  /** 승리 화면 */
  private showVictory(
    width: number,
    height: number,
    result: { floorsCleared: number; totalDamageDealt: number; totalDamageTaken: number }
  ): void {
    // 별 파티클 효과 (간단한 텍스트로 대체)
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(30, width - 30);
      const y = Phaser.Math.Between(30, height - 30);
      this.add.text(x, y, '✨', {
        fontSize: `${Phaser.Math.Between(14, 28)}px`,
      }).setAlpha(0.6);
    }

    this.add.text(width / 2, 80, '🏆 런 클리어!', {
      fontSize: '36px',
      color: '#ffdd00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, 140, '피콜로를 쓰러뜨렸다!', {
      fontSize: '18px',
      color: '#ff8888',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.renderStats(width, height, result);
    this.createRestartButton(width, height);
  }

  /** 패배 화면 */
  private showDefeat(
    width: number,
    height: number,
    result: { floorsCleared: number; totalDamageDealt: number; totalDamageTaken: number }
  ): void {
    this.add.text(width / 2, 80, '💀 패배...', {
      fontSize: '36px',
      color: '#ff4444',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, 140, '다시 도전하라!', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.renderStats(width, height, result);
    this.createRestartButton(width, height);
  }

  /** 통계 표시 */
  private renderStats(
    width: number,
    height: number,
    result: { floorsCleared: number; totalDamageDealt: number; totalDamageTaken: number }
  ): void {
    const stats = [
      { label: '클리어한 층', value: `${result.floorsCleared}층` },
      { label: '준 피해 합계', value: `${result.totalDamageDealt}` },
      { label: '받은 피해 합계', value: `${result.totalDamageTaken}` },
    ];

    // 통계 박스 배경
    this.add.rectangle(width / 2, height / 2 + 10, 300, 150, 0x111133)
      .setStrokeStyle(1, 0x333355);

    this.add.text(width / 2, height / 2 - 60, '── 런 통계 ──', {
      fontSize: '14px',
      color: '#666688',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    stats.forEach((stat, i) => {
      const y = height / 2 - 30 + i * 40;
      
      this.add.text(width / 2 - 100, y, stat.label, {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: 'Arial',
      }).setOrigin(0, 0.5);

      this.add.text(width / 2 + 100, y, stat.value, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    });
  }

  /** 재시작 버튼 */
  private createRestartButton(width: number, height: number): void {
    const btnBg = this.add.rectangle(width / 2, height - 60, 200, 48, 0x1a1a4a)
      .setStrokeStyle(2, 0x4444cc)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, height - 60, '🔄 새 런 시작', {
      fontSize: '18px',
      color: '#8888ff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x2a2a6a);
      btnText.setColor('#ffffff');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x1a1a4a);
      btnText.setColor('#8888ff');
    });
    btnBg.on('pointerdown', () => {
      // 게임 상태 리셋 후 새 런 시작
      GameState.reset();
      const newState = GameState.getInstance();
      newState.startNewRun();
      this.scene.start('MapScene');
    });
  }
}
