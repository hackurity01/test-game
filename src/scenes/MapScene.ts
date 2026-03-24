// 맵 씬 - 10층 탑 클라이밍 구조 표시

import Phaser from 'phaser';
import { GameState, FloorInfo } from '../game/GameState';

export class MapScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super({ key: 'MapScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.gameState = GameState.getInstance();

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e);

    // 타이틀
    this.add.text(width / 2, 30, '🗼 탑 클라이밍', {
      fontSize: '24px',
      color: '#aaaaff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 플레이어 상태
    const player = this.gameState.player;
    this.add.text(width / 2, 70, `HP: ${player.hp} / ${player.maxHp}  |  기: ${player.ki}`, {
      fontSize: '14px',
      color: '#88ff88',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    // 층 목록 표시 (10층부터 1층까지 위에서 아래로)
    this.renderFloors(width, height);

    // 현재 층 진행 버튼
    this.createEnterButton(width, height);
  }

  /** 층 목록 렌더링 */
  private renderFloors(width: number, height: number): void {
    const floors = this.gameState.floors;
    const currentFloor = this.gameState.currentFloor;
    
    const startY = 110;
    const floorHeight = (height - 200) / 10;

    // 10층부터 1층 순서로 표시
    for (let i = 10; i >= 1; i--) {
      const floor = floors[i - 1];
      const y = startY + (10 - i) * floorHeight;
      
      this.renderFloorRow(floor, i, y, width, floorHeight, currentFloor);
    }
  }

  /** 층 행 렌더링 */
  private renderFloorRow(
    floor: FloorInfo,
    floorNum: number,
    y: number,
    width: number,
    rowHeight: number,
    currentFloor: number
  ): void {
    const isCurrentFloor = floorNum === currentFloor;
    const isCompleted = floor.completed;
    const isAccessible = floorNum <= currentFloor;

    // 행 배경색 결정
    let bgColor = 0x111122;
    if (isCurrentFloor) bgColor = 0x223344;
    else if (isCompleted) bgColor = 0x112211;

    // 적 타입 아이콘
    const typeIcon = {
      normal: '⚔️',
      elite: '⚡',
      boss: '💀',
    }[floor.enemyType];

    // 배경 박스
    const bg = this.add.rectangle(width / 2, y + rowHeight / 2, width - 60, rowHeight - 4, bgColor);
    
    if (isCurrentFloor) {
      bg.setStrokeStyle(2, 0x4488ff);
    } else if (isCompleted) {
      bg.setStrokeStyle(1, 0x224422);
    } else {
      bg.setStrokeStyle(1, 0x222233);
    }

    // 층 번호
    const floorLabel = floorNum === 10 ? '10F 🏆' : `${floorNum}F`;
    this.add.text(50, y + rowHeight / 2, floorLabel, {
      fontSize: '13px',
      color: isCurrentFloor ? '#88ccff' : isCompleted ? '#44aa44' : '#555566',
      fontFamily: 'Arial',
      fontStyle: isCurrentFloor ? 'bold' : 'normal',
    }).setOrigin(0, 0.5);

    // 적 타입
    const enemyName = {
      normal: '레드리본 병사 (HP 20)',
      elite: '피라프단 (HP 35)',
      boss: '피콜로 - BOSS (HP 60)',
    }[floor.enemyType];

    this.add.text(width / 2, y + rowHeight / 2, `${typeIcon} ${enemyName}`, {
      fontSize: '13px',
      color: floor.enemyType === 'boss' ? '#ff6666' : 
             floor.enemyType === 'elite' ? '#ffaa44' : '#cccccc',
      fontFamily: 'Arial',
      fontStyle: floor.enemyType === 'boss' ? 'bold' : 'normal',
    }).setOrigin(0.5, 0.5);

    // 상태 표시
    let statusText = '';
    let statusColor = '#888888';
    
    if (isCompleted) {
      statusText = '✅ 완료';
      statusColor = '#44aa44';
    } else if (isCurrentFloor) {
      statusText = '▶ 현재';
      statusColor = '#88ccff';
    } else if (!isAccessible) {
      statusText = '🔒';
      statusColor = '#444466';
    }

    this.add.text(width - 50, y + rowHeight / 2, statusText, {
      fontSize: '12px',
      color: statusColor,
      fontFamily: 'Arial',
    }).setOrigin(1, 0.5);
  }

  /** 현재 층 진입 버튼 */
  private createEnterButton(width: number, height: number): void {
    const currentFloor = this.gameState.currentFloor;
    const floorInfo = this.gameState.getCurrentFloorInfo();
    
    const typeLabel = {
      normal: '⚔️ 일반 전투',
      elite: '⚡ 엘리트 전투',
      boss: '💀 보스 전투!',
    }[floorInfo.enemyType];

    const btnBg = this.add.rectangle(width / 2, height - 35, 240, 44, 0x2a1a44)
      .setStrokeStyle(2, 0x8844ff)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, height - 35,
      `▶ ${currentFloor}층 진입: ${typeLabel}`, {
      fontSize: '15px',
      color: '#cc88ff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x44226a);
      btnText.setColor('#ffffff');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x2a1a44);
      btnText.setColor('#cc88ff');
    });
    btnBg.on('pointerdown', () => {
      // 씬 전환 전 현재 씬 명시적 shutdown
      this.scene.stop();
      this.scene.start('BattleScene');
    });
  }
}
