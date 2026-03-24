// 핵심 전투 씬 - 3슬롯 배치 전투 시스템

import Phaser from 'phaser';
import { GameState } from '../game/GameState';
import { Enemy, EnemyAction } from '../game/Enemy';
import { CardInstance } from '../game/Card';
import { SkillSystem } from '../game/SkillSystem';
import { CardUI } from '../ui/CardUI';
import { SlotUI } from '../ui/SlotUI';
import { KiGauge } from '../ui/KiGauge';

/** 전투 단계 */
type BattlePhase =
  | 'draw'        // 드로우 단계
  | 'placement'   // 카드 배치 단계 (플레이어 입력)
  | 'executing'   // 실행 단계 (자동 실행)
  | 'result';     // 전투 결과

// 레이아웃 상수 (1600x900 기준)
const LAYOUT = {
  ENEMY_SECTION_BOTTOM: 240,
  ENEMY_NAME_Y: 20,
  ENEMY_HP_Y: 55,
  ENEMY_HP_BAR_Y: 80,
  ENEMY_KI_Y: 100,
  ENEMY_SKILLS_LABEL_Y: 120,
  ENEMY_SKILLS_Y: 150,
  ENEMY_SLOTS_Y: 200,

  BATTLE_SECTION_TOP: 240,
  BATTLE_SECTION_BOTTOM: 460,
  PHASE_TEXT_Y: 255,

  PLAYER_SECTION_TOP: 460,
  PLAYER_SECTION_BOTTOM: 620,
  PLAYER_HP_Y: 478,
  PLAYER_HP_BAR_Y: 505,
  PLAYER_KI_Y: 530,
  PLAYER_SLOTS_Y: 560,

  SKILL_SECTION_TOP: 620,
  SKILL_SECTION_BOTTOM: 820,
  SKILL_LABEL_Y: 638,
  HAND_CARDS_Y: 730,

  BOTTOM_Y: 860,
  LOG_Y: 860,
  EXECUTE_BTN_Y: 860,

  CENTER_X: 800,
  SLOT1_X: 500,   // 3슬롯 균등 배치
  SLOT2_X: 800,
  SLOT3_X: 1100,
  KI_GAUGE_X_LEFT: 200,
  KI_GAUGE_X_RIGHT: 1400,
  EXECUTE_BTN_X: 1450,
} as const;

const SLOT_COUNT = 3;
const SLOT_X_POSITIONS = [LAYOUT.SLOT1_X, LAYOUT.SLOT2_X, LAYOUT.SLOT3_X];

export class BattleScene extends Phaser.Scene {
  // 게임 상태
  private gameState!: GameState;
  private enemy!: Enemy;
  private skillSystem!: SkillSystem;

  // UI 컴포넌트
  private playerSlots: SlotUI[] = [];
  private enemySlotContainers: Phaser.GameObjects.Container[] = [];
  private handCards: CardUI[] = [];
  private playerKiGauge!: KiGauge;
  private enemyKiGauge!: KiGauge;

  // 텍스트 표시
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyNameText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private executeBtn!: Phaser.GameObjects.Text;
  private executeBtnBg!: Phaser.GameObjects.Rectangle;

  // HP 바
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;

  // 전투 상태
  private phase: BattlePhase = 'draw';
  private selectedCard: CardInstance | null = null;
  private battleLog: string[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.gameState = GameState.getInstance();

    // ⚠️ Phaser는 씬 재시작 시 동일 인스턴스의 create()를 재호출한다.
    // scene.stop() 시 Phaser가 모든 DisplayList 오브젝트를 파괴하지만,
    // 클래스 프로퍼티 배열(playerSlots, enemySlotContainers 등)은 유지되므로
    // 파괴된 Phaser 오브젝트를 참조하는 stale SlotUI들이 남아있게 된다.
    // 새 라운드 시작 전에 반드시 초기화해야 한다.
    this.playerSlots = [];
    this.enemySlotContainers = [];
    this.handCards = [];
    this.battleLog = [];
    this.selectedCard = null;
    this.phase = 'draw';

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e);

    // 적 생성
    const floorInfo = this.gameState.getCurrentFloorInfo();
    this.enemy = new Enemy(floorInfo.enemyType);

    // 패시브 스킬 시스템 초기화
    this.skillSystem = new SkillSystem();
    const allCards = this.gameState.deck.getAllCards();
    for (const card of allCards) {
      if (card.data.id === 'passive_parry')    this.skillSystem.addPassive(SkillSystem.PARRY_PASSIVE);
      if (card.data.id === 'passive_rapid')    this.skillSystem.addPassive(SkillSystem.RAPID_PASSIVE);
      if (card.data.id === 'passive_meditate') this.skillSystem.addPassive(SkillSystem.MEDITATE_PASSIVE);
    }

    // 구역 구분선
    this.drawSectionDividers(width);

    // UI 구성
    this.createEnemyArea(width);
    this.createBattleArea(width);
    this.createPlayerArea(width);
    this.createSkillArea(width, height);
    this.createBottomArea(width, height);

    // 모든 UI 생성 완료 후 초기 상태 반영
    this.updateHpDisplays();
    this.updateKiGauges();

    // 전투 시작
    this.enemy.generateIntent();
    this.startDrawPhase();
  }

  // =================== UI 생성 ===================

  /** 구역 구분선 */
  private drawSectionDividers(width: number): void {
    const lineStyle = { color: 0x333355, alpha: 0.8 };

    const line1 = this.add.rectangle(width / 2, LAYOUT.ENEMY_SECTION_BOTTOM, width, 1, lineStyle.color);
    line1.setAlpha(lineStyle.alpha);
    const line2 = this.add.rectangle(width / 2, LAYOUT.PLAYER_SECTION_TOP, width, 1, lineStyle.color);
    line2.setAlpha(lineStyle.alpha);
    const line3 = this.add.rectangle(width / 2, LAYOUT.SKILL_SECTION_TOP, width, 1, lineStyle.color);
    line3.setAlpha(lineStyle.alpha);
    const line4 = this.add.rectangle(width / 2, LAYOUT.SKILL_SECTION_BOTTOM, width, 1, lineStyle.color);
    line4.setAlpha(lineStyle.alpha);

    this.add.rectangle(width / 2, LAYOUT.ENEMY_SECTION_BOTTOM / 2, width, LAYOUT.ENEMY_SECTION_BOTTOM, 0x0d0d22).setAlpha(0.5);
    this.add.rectangle(width / 2, (LAYOUT.PLAYER_SECTION_TOP + LAYOUT.PLAYER_SECTION_BOTTOM) / 2, width, LAYOUT.PLAYER_SECTION_BOTTOM - LAYOUT.PLAYER_SECTION_TOP, 0x0d220d).setAlpha(0.3);
    this.add.rectangle(width / 2, (LAYOUT.SKILL_SECTION_TOP + LAYOUT.SKILL_SECTION_BOTTOM) / 2, width, LAYOUT.SKILL_SECTION_BOTTOM - LAYOUT.SKILL_SECTION_TOP, 0x110d22).setAlpha(0.4);
  }

  /** 적 영역 UI */
  private createEnemyArea(width: number): void {
    const floorInfo = this.gameState.getCurrentFloorInfo();
    const floorTypeLabel = { normal: '일반', elite: '⚡ 엘리트', boss: '💀 보스' }[floorInfo.enemyType];

    this.add.text(20, 8, `${floorInfo.floor}층 · ${floorTypeLabel}`, {
      fontSize: '13px', color: '#8888cc', fontFamily: 'Arial',
    }).setOrigin(0, 0);

    this.enemyNameText = this.add.text(width / 2, LAYOUT.ENEMY_NAME_Y, this.enemy.name, {
      fontSize: '22px', color: '#ff6666', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.enemyHpText = this.add.text(width / 2, LAYOUT.ENEMY_HP_Y, '', {
      fontSize: '13px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.rectangle(width / 2, LAYOUT.ENEMY_HP_BAR_Y, 300, 10, 0x330000).setStrokeStyle(1, 0x551111);
    this.enemyHpBar = this.add.rectangle(width / 2, LAYOUT.ENEMY_HP_BAR_Y, 300, 10, 0xdd2222);

    this.enemyKiGauge = new KiGauge({
      scene: this,
      x: LAYOUT.KI_GAUGE_X_RIGHT,
      y: LAYOUT.ENEMY_KI_Y,
      maxKi: this.enemy.maxKi,
      label: '적 기',
      color: 0xff4444,
      width: 140,
    });

    // 적 사용 가능 기술 (좌측)
    this.add.text(20, LAYOUT.ENEMY_SKILLS_LABEL_Y, '사용 가능 기술:', {
      fontSize: '11px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0, 0);

    const availableSkills = this.enemy.availableSkills;
    let skillX = 130;
    availableSkills.forEach(skill => {
      const isAttack = skill.type === 'attack_s' || skill.type === 'attack_l' || skill.type === 'special';
      const tagColor = isAttack ? 0x441111 : (skill.type === 'ki_gather' ? 0x112244 : 0x114411);
      const tagBorderColor = isAttack ? 0xaa3333 : (skill.type === 'ki_gather' ? 0x3355aa : 0x33aa33);
      const textColor = isAttack ? '#ff8888' : (skill.type === 'ki_gather' ? '#88aaff' : '#88ff88');

      const tagWidth = skill.name.length * 9 + 16;
      this.add.rectangle(skillX + tagWidth / 2, LAYOUT.ENEMY_SKILLS_LABEL_Y + 6, tagWidth, 22, tagColor)
        .setStrokeStyle(1, tagBorderColor);
      this.add.text(skillX + tagWidth / 2, LAYOUT.ENEMY_SKILLS_LABEL_Y + 6, skill.name, {
        fontSize: '11px', color: textColor, fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
      skillX += tagWidth + 6;
    });

    // 적 슬롯 디스플레이 (3개)
    const slotLabels = ['슬롯 1', '슬롯 2', '슬롯 3'];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const container = this.add.container(SLOT_X_POSITIONS[i], LAYOUT.ENEMY_SLOTS_Y);

      const bg = this.add.rectangle(0, 0, 140, 38, 0x220033).setStrokeStyle(1, 0x553366);
      const label = this.add.text(-55, -16, slotLabels[i], {
        fontSize: '10px', color: '#886699', fontFamily: 'Arial',
      }).setOrigin(0, 0);
      const actionText = this.add.text(0, 4, '???', {
        fontSize: '13px', color: '#cc88ff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      container.add([bg, label, actionText]);
      this.enemySlotContainers.push(container);
    }

    // updateHpDisplays는 모든 UI 생성 후 한 번만 호출 (playerHpText가 아직 없음)
    this.enemyKiGauge.update(this.enemy.ki);
  }

  /** 전투 애니메이션 영역 */
  private createBattleArea(width: number): void {
    const midY = (LAYOUT.BATTLE_SECTION_TOP + LAYOUT.BATTLE_SECTION_BOTTOM) / 2;

    this.phaseText = this.add.text(width / 2, LAYOUT.PHASE_TEXT_Y, '카드를 슬롯에 배치하세요', {
      fontSize: '14px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, midY - 50, '👾', {
      fontSize: '48px', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);
  }

  /** 플레이어 영역 */
  private createPlayerArea(width: number): void {
    this.playerHpText = this.add.text(width / 2, LAYOUT.PLAYER_HP_Y, '', {
      fontSize: '13px', color: '#88ff88', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.rectangle(width / 2, LAYOUT.PLAYER_HP_BAR_Y, 300, 10, 0x003300).setStrokeStyle(1, 0x115511);
    this.playerHpBar = this.add.rectangle(width / 2, LAYOUT.PLAYER_HP_BAR_Y, 300, 10, 0x22dd22);

    this.playerKiGauge = new KiGauge({
      scene: this,
      x: LAYOUT.KI_GAUGE_X_LEFT,
      y: LAYOUT.PLAYER_KI_Y,
      maxKi: this.gameState.player.maxKi,
      label: '기',
      color: 0x4488ff,
      width: 140,
    });

    // 플레이어 슬롯 (3개)
    const slotLabels = ['슬롯 1', '슬롯 2', '슬롯 3'];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = new SlotUI({
        scene: this,
        x: SLOT_X_POSITIONS[i],
        y: LAYOUT.PLAYER_SLOTS_Y,
        slotIndex: i,
        label: slotLabels[i],
        onRemove: (slotIndex) => this.onSlotRemove(slotIndex),
      });
      this.playerSlots.push(slot);
    }

    // updateHpDisplays는 모든 UI 생성 후 한 번만 호출
    this.playerKiGauge.update(this.gameState.player.ki);
  }

  /** 스킬 선택 영역 */
  private createSkillArea(width: number, _height: number): void {
    this.add.text(width / 2, LAYOUT.SKILL_LABEL_Y, '스킬 선택 (클릭하여 슬롯에 배치)', {
      fontSize: '12px', color: '#666688', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
  }

  /** 하단 영역 (로그 + 실행 버튼) */
  private createBottomArea(width: number, height: number): void {
    this.logText = this.add.text(width / 2, LAYOUT.LOG_Y, '', {
      fontSize: '11px', color: '#888888', fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5, 0.5);

    this.executeBtnBg = this.add.rectangle(LAYOUT.EXECUTE_BTN_X, LAYOUT.EXECUTE_BTN_Y, 160, 36, 0x224422)
      .setStrokeStyle(2, 0x44cc44)
      .setInteractive({ useHandCursor: true });

    this.executeBtn = this.add.text(LAYOUT.EXECUTE_BTN_X, LAYOUT.EXECUTE_BTN_Y, '▶ 전투 실행', {
      fontSize: '15px', color: '#44ff44', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.executeBtnBg.on('pointerover', () => this.executeBtnBg.setFillStyle(0x336633));
    this.executeBtnBg.on('pointerout', () => this.executeBtnBg.setFillStyle(0x224422));
    this.executeBtnBg.on('pointerdown', () => this.onExecuteClicked());

    this.add.text(20, height - 12, '손오공', {
      fontSize: '12px', color: '#666644', fontFamily: 'Arial',
    }).setOrigin(0, 1);
  }

  // =================== 전투 플로우 ===================

  /** 드로우 단계 시작 */
  private startDrawPhase(): void {
    this.phase = 'draw';
    // 이전 실행에서 남아있을 수 있는 슬롯 상태를 보장적으로 리셋
    // (onExecuteClicked에서 이미 호출했더라도 추가 tween/alpha 잔재를 제거)
    this.playerSlots.forEach(s => s.removeCard());
    this.gameState.player.onTurnStart();
    this.renderHand();
    this.setPhase('placement');
  }

  /** 보유 스킬 전체 렌더링 (패시브 제외, 중복 제거) */
  private renderHand(): void {
    this.handCards.forEach(c => c.destroy());
    this.handCards = [];

    const allCards = this.gameState.deck.getAllCards();
    const seenIds = new Set<string>();
    const availableCards = allCards.filter(card => {
      if (seenIds.has(card.data.id)) return false;
      if (card.usesLeft !== null && card.usesLeft <= 0) return false;
      if (card.data.isPassive) return false;  // 패시브는 손패에 표시 안 함
      seenIds.add(card.data.id);
      return true;
    });

    const { width } = this.scale;
    const cardSpacing = 110;
    const totalWidth = Math.max(0, (availableCards.length - 1) * cardSpacing);
    const startX = width / 2 - totalWidth / 2;

    availableCards.forEach((card, index) => {
      const x = startX + index * cardSpacing;
      const cardUI = new CardUI({
        scene: this,
        x,
        y: LAYOUT.HAND_CARDS_Y,
        card,
        onSelect: (selectedCard) => this.onCardSelected(selectedCard),
        interactive: true,
      });
      cardUI.setEnabled(true);
      this.handCards.push(cardUI);
    });
  }

  /** 카드가 슬롯 배치 가능한지 (횟수만 체크) */
  private canSelectCard(card: CardInstance): boolean {
    if (card.usesLeft !== null && card.usesLeft <= 0) return false;
    return true;
  }

  /** 카드 선택 처리 */
  private onCardSelected(card: CardInstance): void {
    if (this.phase !== 'placement') return;

    if (!this.canSelectCard(card)) {
      this.addLog(`✗ ${card.data.name}: 사용 횟수 소진!`);
      return;
    }

    if (this.selectedCard?.instanceId === card.instanceId) {
      this.selectedCard = null;
      this.handCards.forEach(c => c.setSelected(false));
      return;
    }

    this.selectedCard = card;
    this.handCards.forEach(c => c.setSelected(c.card.instanceId === card.instanceId));

    const emptySlot = this.playerSlots.find(s => s.isEmpty());
    if (emptySlot) {
      this.placeCardInSlot(card, emptySlot.slotIndex);
    }
  }

  /** 슬롯에 카드 배치 */
  private placeCardInSlot(card: CardInstance, slotIndex: number): void {
    const slot = this.playerSlots[slotIndex];
    if (!slot.isEmpty()) {
      const existingCard = slot.removeCard();
      if (existingCard) {
        this.addLog(`슬롯 ${slotIndex + 1}: ${existingCard.data.name} 제거됨`);
      }
    }
    slot.placeCard(card);
    this.selectedCard = null;
    this.handCards.forEach(c => c.setSelected(false));
    this.addLog(`슬롯 ${slotIndex + 1}: [${card.data.name}] 배치`);
  }

  /** 슬롯에서 카드 제거 */
  private onSlotRemove(slotIndex: number): void {
    if (this.phase !== 'placement') return;
    const slot = this.playerSlots[slotIndex];
    const removed = slot.removeCard();
    if (removed) {
      this.addLog(`슬롯 ${slotIndex + 1}: ${removed.data.name} 제거됨`);
    }
  }

  /** 실행 버튼 클릭 */
  private async onExecuteClicked(): Promise<void> {
    if (this.phase !== 'placement') return;

    const hasAnyCard = this.playerSlots.some(s => !s.isEmpty());
    if (!hasAnyCard) {
      this.addLog('❌ 슬롯에 카드를 배치하세요!');
      return;
    }

    this.setPhase('executing');

    // 보스 재생 (턴 시작, 1/턴)
    if (this.enemy.type === 'boss') {
      this.enemy.regenerate();
      this.addLog('💚 피콜로가 재생으로 HP +1!');
      this.updateHpDisplays();
    }

    // 실행 클릭 → 3개 슬롯 즉시 공개
    this.revealEnemySlot(0, this.enemy.intent.action1);
    this.revealEnemySlot(1, this.enemy.intent.action2);
    this.revealEnemySlot(2, this.enemy.intent.action3);
    await this.wait(600);

    // 슬롯 1 → 2 → 3 순서로 실행
    this.setSlotEmphasis(0);
    await this.executeSlotPhase(0);

    if (!this.enemy.isDead() && !this.gameState.player.isDead()) {
      this.setSlotEmphasis(1);
      await this.executeSlotPhase(1);
    }

    if (!this.enemy.isDead() && !this.gameState.player.isDead()) {
      this.setSlotEmphasis(2);
      await this.executeSlotPhase(2);
    }

    this.clearSlotEmphasis();
    // removeCard() 내부에서 트윈/상태 완전 초기화 후 카드 제거
    this.playerSlots.forEach(s => s.removeCard());
    this.enemy.generateIntent();
    this.hideAllEnemySlots();

    this.checkBattleResult();
  }

  /** 특정 슬롯 강조 (나머지는 흐리게) */
  private setSlotEmphasis(activeSlot: number): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const alpha = i === activeSlot ? 1 : 0.3;
      this.enemySlotContainers[i].setAlpha(alpha);
      this.playerSlots[i].getContainer().setAlpha(alpha);
    }
  }

  /** 슬롯 강조 초기화 */
  private clearSlotEmphasis(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.enemySlotContainers[i].setAlpha(1);
      this.playerSlots[i].getContainer().setAlpha(1);
    }
  }

  /** 슬롯 N 페이즈 실행 - 대결 매트릭스 기반 */
  private async executeSlotPhase(slotIndex: number): Promise<void> {
    const playerSlot = this.playerSlots[slotIndex];
    const playerCard = playerSlot.getCard();
    const intentActions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
    const enemyAction = intentActions[slotIndex];

    this.addLog(`── 슬롯 ${slotIndex + 1} 대결 ──`);
    playerSlot.setHighlight(true);

    // ── 슬롯 시작 시 막기/회피 상태 초기화 ──
    this.gameState.player.setBlocking(false);
    this.gameState.player.setDodging(false);

    // ── 플레이어 카드 유효성 체크 및 행동 분류 ──
    type PlayerBattleType = 'ki_gather' | 'attack' | 'defend' | 'steal' | 'mark' | 'none';
    let playerBattleType: PlayerBattleType = 'none';
    let playerCardExecuted = false;

    if (playerCard) {
      if (playerCard.usesLeft !== null && playerCard.usesLeft <= 0) {
        this.addLog(`❌ [${playerCard.data.name}]: 사용 횟수 소진 → 무효`);
        await playerSlot.flashInsufficientKi();
      } else if (!this.gameState.player.hasEnoughKi(playerCard.data.kiCost)) {
        this.addLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효`);
        await playerSlot.flashInsufficientKi();
      } else {
        this.gameState.player.spendKi(playerCard.data.kiCost);
        if (playerCard.usesLeft !== null) playerCard.usesLeft -= 1;
        this.updateKiGauges();
        playerCardExecuted = true;

        const effectType = playerCard.data.effect.type;
        if (effectType === 'ki_gain')                        playerBattleType = 'ki_gather';
        else if (effectType === 'damage')                    playerBattleType = 'attack';
        else if (effectType === 'block' || effectType === 'dodge') playerBattleType = 'defend';
        else if (effectType === 'steal_ki')                  playerBattleType = 'steal';
        else if (effectType === 'mark')                      playerBattleType = 'mark';
        // swap_next, passive → 'none' (배치 불가 처리됨)
      }
    }

    // ── 적 행동 분류 ──
    type EnemyBattleType = 'ki_gather' | 'attack' | 'defend';
    let enemyBattleType: EnemyBattleType;
    if (enemyAction.type === 'ki_gather')     enemyBattleType = 'ki_gather';
    else if (enemyAction.type === 'defend')   enemyBattleType = 'defend';
    else                                      enemyBattleType = 'attack';

    // ── 적 행동 실행 (기 소모 + 기모으기 효과 적용) ──
    const enemyResult = this.enemy.executeAction(enemyAction);
    if (enemyResult.skipped) {
      this.addLog(`❌ 적 [${enemyAction.name}]: 기 부족 → 무효`);
      this.flashEnemySlotBg(slotIndex, 0x880000);
    } else if (enemyResult.kiGained > 0) {
      this.addLog(`⚡ 적 기모으기: +${enemyResult.kiGained}`);
    }
    this.updateKiGauges();

    const enemyEffective = !enemyResult.skipped;

    // ── 피해 매트릭스 판정 ──

    // 플레이어가 적을 공격할 수 있는가?
    // attack vs ki_gather/mark/steal(비공격) → 명중
    // attack vs attack → 무승부
    // attack vs defend → 막힘
    const playerDealsFullDamage = playerCardExecuted && playerBattleType === 'attack' &&
      (!enemyEffective || (enemyBattleType !== 'attack' && enemyBattleType !== 'defend'));

    // 적이 플레이어에게 데미지를 줄 수 있는가?
    // player ki_gather/none/mark → 무방비
    // player steal (if enemy attacks) → 강탈 실패 = 무방비
    // player defend/dodge → 방어
    // player attack vs enemy attack → 무승부 = 무방비 아님
    const playerIsVulnerable =
      playerBattleType === 'ki_gather' ||
      playerBattleType === 'none' ||
      playerBattleType === 'mark' ||
      (playerBattleType === 'steal' && enemyBattleType === 'attack');

    const enemyDealsFullDamage = enemyEffective && enemyBattleType === 'attack' && playerIsVulnerable;

    // 강탈 성공 여부
    const stealSucceeds = playerCardExecuted && playerBattleType === 'steal' &&
      (!enemyEffective || enemyBattleType !== 'attack');

    // ── 상호작용 로그 ──
    if (playerCardExecuted && enemyEffective) {
      if (playerBattleType === 'attack' && enemyBattleType === 'attack') {
        this.addLog('⚡⚡ 서로 파가 충돌! 무승부 (0 데미지)');
      } else if (playerBattleType === 'attack' && enemyBattleType === 'defend') {
        this.addLog(`🛡️ 적이 막기로 [${playerCard!.data.name}]을 막았다!`);
      } else if (playerBattleType === 'defend' && enemyBattleType === 'attack') {
        const isDodge = playerCard!.data.effect.type === 'dodge';
        this.addLog(isDodge
          ? `💨 순간이동으로 [${enemyAction.name}] 회피!`
          : `🛡️ 막기로 [${enemyAction.name}] 상쇄!`
        );
      }
    }

    // ── 플레이어 기모으기 효과 ──
    if (playerCardExecuted && playerBattleType === 'ki_gather') {
      const gained = this.gameState.player.gainKi(playerCard!.data.effect.value);
      this.addLog(`✨ [${playerCard!.data.name}]: 기 +${gained}`);
      await playerSlot.flashExecuted();

      // 명상 패시브: ki_gather 성공/피격 여부에 따라 트리거
      if (enemyDealsFullDamage) {
        // 기모으기 중 피격 → 추가 피해
        const results = this.skillSystem.trigger({
          type: 'ki_gather_while_attacked',
          context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
        });
        for (const r of results) {
          if (r.message) this.addLog(r.message);
        }
      } else {
        // 기모으기 성공 → 추가 기
        const results = this.skillSystem.trigger({
          type: 'ki_gather_success',
          context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
        });
        for (const r of results) {
          if (r.message) this.addLog(r.message);
          if (r.extraKi) this.gameState.player.gainKi(r.extraKi);
        }
        this.updateKiGauges();
      }
    }

    // ── 플레이어 막기/회피 효과 ──
    if (playerCardExecuted && playerBattleType === 'defend') {
      const isDodge = playerCard!.data.effect.type === 'dodge';
      if (isDodge) {
        this.gameState.player.setDodging(true);
        this.addLog(`💨 [${playerCard!.data.name}]: 회피 준비!`);
      } else {
        this.gameState.player.setBlocking(true);
        this.addLog(`🛡️ [${playerCard!.data.name}]: 막기 준비!`);
      }
      await playerSlot.flashExecuted();

      // 막기 성공 시 패링 패시브 트리거
      if (!isDodge && enemyEffective && enemyBattleType === 'attack') {
        const results = this.skillSystem.trigger({
          type: 'block_success',
          context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
        });
        for (const r of results) {
          if (r.message) this.addLog(r.message);
          if (r.extraKi) this.gameState.player.gainKi(r.extraKi);
        }
        this.updateKiGauges();
      }
    }

    // ── 표식 효과 ──
    if (playerCardExecuted && playerBattleType === 'mark') {
      const markVal = playerCard!.data.effect.value;
      this.enemy.addMark(markVal);
      this.addLog(`🎯 [${playerCard!.data.name}]: 적에게 표식 +${markVal} (누적: ${this.enemy.mark})`);
      await playerSlot.flashExecuted();
    }

    // ── 강탈 효과 ──
    if (stealSucceeds) {
      const stolen = this.enemy.stealKi(playerCard!.data.effect.value);
      if (stolen > 0) {
        this.gameState.player.gainKi(stolen);
        this.addLog(`💰 [${playerCard!.data.name}]: 적에게서 기 ${stolen} 강탈!`);
      } else {
        this.addLog(`💰 [${playerCard!.data.name}]: 강탈했지만 적의 기가 없었다.`);
      }
      this.updateKiGauges();
      await playerSlot.flashExecuted();
    } else if (playerCardExecuted && playerBattleType === 'steal' && !stealSucceeds) {
      this.addLog(`❌ [${playerCard!.data.name}]: 공격받아 강탈 실패!`);
    }

    // ── 플레이어 공격 효과 ──
    if (playerDealsFullDamage) {
      await this.applyAttackEffect(playerCard!, playerSlot);
    }

    // ── 적 공격 효과 ──
    if (enemyDealsFullDamage && enemyResult.damage > 0) {
      let finalDamage = enemyResult.damage;

      // 명상 패시브: 기모으기 중 피격 시 피해 +1
      if (playerBattleType === 'ki_gather') {
        const results = this.skillSystem.trigger({
          type: 'ki_gather_while_attacked',
          context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
        });
        for (const r of results) {
          if (r.extraDamage) finalDamage += r.extraDamage;
        }
      }

      const actualDmg = this.gameState.player.takeDamage(finalDamage);
      this.gameState.recordDamageTaken(actualDmg);
      this.addLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해!`);
      if (actualDmg > 0) await this.showDamageEffect(true, actualDmg);
    } else if (!playerCardExecuted && enemyEffective && enemyBattleType === 'attack' && enemyResult.damage > 0) {
      // 플레이어 카드 없음 + 적 공격
      const actualDmg = this.gameState.player.takeDamage(enemyResult.damage);
      this.gameState.recordDamageTaken(actualDmg);
      this.addLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해!`);
      if (actualDmg > 0) await this.showDamageEffect(true, actualDmg);
    }

    playerSlot.setHighlight(false);
    this.updateAllUI();
    await this.wait(300);
  }

  /** 공격 카드 효과 적용 (표식 멀티플라이어 포함) */
  private async applyAttackEffect(card: CardInstance, slot: SlotUI): Promise<void> {
    const effect = card.data.effect;
    const enemyMark = this.enemy.mark;
    const markMultiplier = 1 + enemyMark;

    if (effect.type === 'damage') {
      const baseDmg = effect.value;
      const totalDmg = Math.floor(baseDmg * markMultiplier);

      if (enemyMark > 0) {
        this.enemy.consumeMark();
        this.addLog(`🎯 표식 × ${enemyMark}: ${baseDmg} → ${totalDmg} 피해`);
      }

      const dmg = this.enemy.takeDamage(totalDmg);
      this.gameState.recordDamageDealt(dmg);
      this.addLog(`⚡ [${card.data.name}]: 적에게 ${dmg} 피해!`);
      await this.showDamageEffect(false, dmg);

      // 공격 명중 패시브 트리거 (연속파 등)
      this.skillSystem.trigger({
        type: 'attack_hit',
        context: { player: this.gameState.player, enemy: this.enemy, slotIndex: 0 },
      });
    }

    await slot.flashExecuted();
  }

  // =================== 결과 처리 ===================

  /** 전투 결과 체크 */
  private checkBattleResult(): void {
    if (this.enemy.isDead()) {
      this.addLog('🎉 적을 쓰러뜨렸다!');
      this.setPhase('result');

      this.time.delayedCall(800, () => {
        this.gameState.completeCurrentFloor();
        if (this.enemy.type === 'boss') {
          this.gameState.endRun(true);
          this.scene.stop();
          this.scene.start('ResultScene');
        } else {
          this.scene.stop();
          this.scene.start('RewardScene');
        }
      });
    } else if (this.gameState.player.isDead()) {
      this.addLog('💀 패배했다...');
      this.setPhase('result');

      this.time.delayedCall(800, () => {
        this.gameState.endRun(false);
        this.scene.stop();
        this.scene.start('ResultScene');
      });
    } else {
      this.time.delayedCall(500, () => {
        this.startDrawPhase();
      });
    }
  }

  // =================== UI 업데이트 ===================

  /** 단계 설정 */
  private setPhase(phase: BattlePhase): void {
    this.phase = phase;
    const phaseLabels: Record<BattlePhase, string> = {
      draw: '드로우 중...',
      placement: '카드를 슬롯에 배치하세요 (최대 3개)',
      executing: '전투 실행 중...',
      result: '전투 종료',
    };
    this.phaseText.setText(phaseLabels[phase]);

    const canExecute = phase === 'placement';
    this.executeBtn.setColor(canExecute ? '#44ff44' : '#336633');
    this.executeBtnBg.setFillStyle(canExecute ? 0x224422 : 0x111811);
  }

  /** HP 표시 업데이트 */
  private updateHpDisplays(): void {
    const p = this.gameState.player;
    if (this.playerHpText) {
      const markStr = p.mark > 0 ? ` 🎯×${p.mark}` : '';
      const blockStr = p.isBlocking ? ' 🛡️' : '';
      const dodgeStr = p.isDodging ? ' 💨' : '';
      this.playerHpText.setText(`HP: ${p.hp} / ${p.maxHp}${blockStr}${dodgeStr}${markStr}`);
    }
    if (this.playerHpBar) {
      const pRatio = p.hp / p.maxHp;
      this.playerHpBar.setScale(pRatio, 1);
      this.playerHpBar.setX(LAYOUT.CENTER_X - 150 + (pRatio * 300) / 2);
    }
    if (this.enemyHpText) {
      const markStr = this.enemy.mark > 0 ? ` 🎯×${this.enemy.mark}` : '';
      this.enemyHpText.setText(`HP: ${this.enemy.hp} / ${this.enemy.maxHp}${markStr}`);
    }
    if (this.enemyHpBar) {
      const eRatio = this.enemy.hp / this.enemy.maxHp;
      this.enemyHpBar.setScale(eRatio, 1);
      this.enemyHpBar.setX(LAYOUT.CENTER_X - 150 + (eRatio * 300) / 2);
    }
  }

  /** 기 게이지 업데이트 */
  private updateKiGauges(): void {
    this.playerKiGauge.update(this.gameState.player.ki);
    this.enemyKiGauge.update(this.enemy.ki);
  }

  /** 모든 UI 업데이트 */
  private updateAllUI(): void {
    this.updateHpDisplays();
    this.updateKiGauges();

    this.handCards.forEach(cardUI => {
      const canSelect = cardUI.card.usesLeft === null || cardUI.card.usesLeft > 0;
      cardUI.setEnabled(canSelect);
    });
  }

  /** 적 슬롯 공개 */
  private revealEnemySlot(slotIndex: number, action: EnemyAction): void {
    const container = this.enemySlotContainers[slotIndex];
    const actionText = container.getAt(2) as Phaser.GameObjects.Text;
    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;

    actionText.setText(`${action.name} (기${action.kiCost})`);

    const isAttack = action.type === 'attack_s' || action.type === 'attack_l' || action.type === 'special';
    if (isAttack) {
      actionText.setColor('#ff8888');
      bg.setFillStyle(0x440000);
      bg.setStrokeStyle(1, 0xaa2222);
    } else {
      actionText.setColor('#88ff88');
      bg.setFillStyle(0x002200);
      bg.setStrokeStyle(1, 0x22aa22);
    }
  }

  /** 적 슬롯 숨김 (??? 표시) */
  private hideEnemySlot(slotIndex: number): void {
    const container = this.enemySlotContainers[slotIndex];
    const actionText = container.getAt(2) as Phaser.GameObjects.Text;
    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;

    actionText.setText('???');
    actionText.setColor('#cc88ff');
    bg.setFillStyle(0x220033);
    bg.setStrokeStyle(1, 0x553366);
  }

  /** 모든 적 슬롯 숨김 */
  private hideAllEnemySlots(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.hideEnemySlot(i);
    }
  }

  /** 적 슬롯 배경 플래시 (alpha tween 사용 — fillColor는 Phaser 3.60에서 tween 불가) */
  private flashEnemySlotBg(slotIndex: number, _color: number): void {
    const container = this.enemySlotContainers[slotIndex];
    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;

    this.tweens.killTweensOf(bg);
    bg.setAlpha(1);
    this.tweens.add({
      targets: bg,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => bg.setAlpha(1),
      onStop: () => bg.setAlpha(1),
    });
  }

  /** 피해 이펙트 표시 */
  private async showDamageEffect(onPlayer: boolean, damage: number): Promise<void> {
    const { width } = this.scale;
    const x = onPlayer ? width / 4 : width * 3 / 4;
    const y = onPlayer
      ? (LAYOUT.PLAYER_SECTION_TOP + LAYOUT.PLAYER_SECTION_BOTTOM) / 2
      : (LAYOUT.BATTLE_SECTION_TOP + LAYOUT.BATTLE_SECTION_BOTTOM) / 2;

    const dmgText = this.add.text(x, y, `-${damage}`, {
      fontSize: '32px',
      color: onPlayer ? '#ff4444' : '#ffff44',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: dmgText,
        y: y - 70,
        alpha: 0,
        duration: 700,
        ease: 'Power2',
        onComplete: () => {
          dmgText.destroy();
          resolve();
        },
      });
    });
  }

  /** 전투 로그 추가 */
  private addLog(message: string): void {
    this.battleLog.push(message);
    if (this.battleLog.length > 4) {
      this.battleLog.shift();
    }
    this.logText.setText(this.battleLog.join('  |  '));
  }

  /** 비동기 대기 헬퍼 */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
