// 배틀 로그 UI 컴포넌트 (Phase 4-3)
// 화면 우측에 최대 6줄 스크롤 로그 표시

import Phaser from 'phaser';

/** 배틀 로그 설정 */
export interface BattleLogUIConfig {
  scene: Phaser.Scene;
  x: number;      // 패널 좌상단 x
  y: number;      // 패널 좌상단 y
  width?: number; // 패널 너비 (기본 220)
}

/** 배틀 로그 UI 클래스 */
export class BattleLogUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private headerText: Phaser.GameObjects.Text;
  private logLines: Phaser.GameObjects.Text[] = [];

  private readonly MAX_LINES = 6;
  private readonly LINE_HEIGHT = 18;
  private readonly PANEL_WIDTH: number;
  private readonly PANEL_HEIGHT: number;

  /** 현재 로그 항목 목록 */
  private entries: string[] = [];

  constructor(config: BattleLogUIConfig) {
    this.scene = config.scene;
    this.PANEL_WIDTH = config.width ?? 220;
    // 헤더(20px) + 각 줄(18px * 6) + 패딩(8px)
    this.PANEL_HEIGHT = 20 + this.MAX_LINES * this.LINE_HEIGHT + 8;

    // 컨테이너: 좌상단 기준
    this.container = this.scene.add.container(config.x, config.y);

    // 반투명 검정 배경
    this.bg = this.scene.add.rectangle(
      this.PANEL_WIDTH / 2,
      this.PANEL_HEIGHT / 2,
      this.PANEL_WIDTH,
      this.PANEL_HEIGHT,
      0x000000,
      0.65
    );
    this.bg.setStrokeStyle(1, 0x444444, 0.8);
    this.container.add(this.bg);

    // 헤더 텍스트
    this.headerText = this.scene.add.text(6, 4, '전투 로그', {
      fontSize: '11px',
      color: '#666688',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.container.add(this.headerText);

    // 구분선
    const divider = this.scene.add.rectangle(
      this.PANEL_WIDTH / 2,
      20,
      this.PANEL_WIDTH - 8,
      1,
      0x444466,
      0.6
    );
    this.container.add(divider);

    // 로그 텍스트 줄 생성 (최대 6줄)
    for (let i = 0; i < this.MAX_LINES; i++) {
      const y = 22 + i * this.LINE_HEIGHT;
      const txt = this.scene.add.text(6, y, '', {
        fontSize: '12px',
        color: '#bbbbcc',
        fontFamily: 'Arial',
        wordWrap: { width: this.PANEL_WIDTH - 12 },
        lineSpacing: 0,
      }).setOrigin(0, 0).setAlpha(0);
      this.container.add(txt);
      this.logLines.push(txt);
    }
  }

  /**
   * 로그 항목 추가
   * 오래된 항목부터 위로 올라가며 사라짐
   */
  addEntry(message: string): void {
    this.entries.push(message);
    // 최대 라인 수 초과 시 오래된 항목 제거
    if (this.entries.length > this.MAX_LINES) {
      this.entries.shift();
    }
    this.refreshDisplay();
  }

  /**
   * 표시 갱신: entries 배열 → 텍스트 줄 업데이트
   * 최신 항목이 아래에, 오래된 항목이 위에 (위로 밀려남)
   */
  private refreshDisplay(): void {
    const count = this.entries.length;

    for (let i = 0; i < this.MAX_LINES; i++) {
      // 표시할 인덱스: entries 배열에서 현재 표시 영역에 맞게 계산
      const entryIndex = count - this.MAX_LINES + i;
      const txt = this.logLines[i];

      if (entryIndex < 0 || entryIndex >= count) {
        // 빈 줄
        txt.setText('').setAlpha(0);
      } else {
        const entry = this.entries[entryIndex];
        txt.setText(entry);

        // 최신 항목일수록 밝게, 오래된 항목일수록 어둡게
        const relativeIndex = i;  // 0=오래된, 5=최신
        const alpha = 0.35 + (relativeIndex / (this.MAX_LINES - 1)) * 0.65;
        txt.setAlpha(alpha);

        // 색상: 최신 항목(마지막 2개)은 밝은 흰색, 나머지는 회색
        if (relativeIndex >= this.MAX_LINES - 2) {
          txt.setColor('#e0e0ff');
        } else if (relativeIndex >= this.MAX_LINES - 4) {
          txt.setColor('#aaaacc');
        } else {
          txt.setColor('#777799');
        }
      }
    }
  }

  /** 로그 초기화 */
  clear(): void {
    this.entries = [];
    this.refreshDisplay();
  }

  /** 표시/숨김 */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /** 컨테이너 반환 */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /** 제거 */
  destroy(): void {
    this.container.destroy();
  }
}
