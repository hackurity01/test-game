// 핵심 전투 씬 - 3슬롯 배치 전투 시스템 (Phase 2: 연계 태그 + 반응 스킬 + 눈치보기 강화)

import Phaser from 'phaser';
import { GameState } from '../game/GameState';
import { Enemy, EnemyAction } from '../game/Enemy';
import { CardInstance, CardTag } from '../game/Card';
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
  /** 텔레그래프 텍스트 Y 위치 (슬롯 아래) */
  ENEMY_TELEGRAPH_Y: 228,

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
  SLOT1_X: 500,
  SLOT2_X: 800,
  SLOT3_X: 1100,
  KI_GAUGE_X_LEFT: 200,
  KI_GAUGE_X_RIGHT: 1400,
  EXECUTE_BTN_X: 1450,
} as const;

const SLOT_COUNT = 3;
const SLOT_X_POSITIONS = [LAYOUT.SLOT1_X, LAYOUT.SLOT2_X, LAYOUT.SLOT3_X];

// ──────────────────────────────────────────
// Phase 2-1: 연계 태그 시스템 타입
// ──────────────────────────────────────────

/** 연계 보너스 결과 */
interface ChainBonus {
  damageBonus: number;       // 추가 피해
  kiCostReduction: number;   // 기 소모 감소
  bypassDefend: boolean;     // 적 막기 관통
  markMultiplier: number;    // 표식 데미지 배수 (1 = 기본, 2 = 2배)
}

/** 기본 연계 보너스 (아무 효과 없음) */
const NO_CHAIN: ChainBonus = {
  damageBonus: 0,
  kiCostReduction: 0,
  bypassDefend: false,
  markMultiplier: 1,
};

/**
 * 이전 슬롯 태그와 현재 슬롯 태그를 비교하여 연계 보너스 계산 (Phase 2-1)
 *
 * 연계 규칙:
 * - CHARGE → ENERGY: 피해 +2
 * - ENERGY → ENERGY: 피해 +1 추가 (연속파)
 * - MARK → 공격스킬: 표식 효과 ×2 (markMultiplier = 2)
 * - MOVE → 공격스킬: 막기 관통 (bypassDefend = true)
 * - DEFEND → ENERGY: 기 소모 -1 (최소 1)
 */
function calcChainBonus(prevTags: CardTag[], currentTags: CardTag[], currentEffectType: string): ChainBonus {
  const bonus: ChainBonus = { ...NO_CHAIN };
  const isAttack = currentEffectType === 'damage' || currentEffectType === 'ambush';

  for (const prevTag of prevTags) {
    // CHARGE → ENERGY: +2뎀
    if (prevTag === 'CHARGE' && currentTags.includes('ENERGY')) {
      bonus.damageBonus += 2;
    }
    // ENERGY → ENERGY: +1뎀 (연속파)
    if (prevTag === 'ENERGY' && currentTags.includes('ENERGY')) {
      bonus.damageBonus += 1;
    }
    // MARK → 공격: 표식 2배
    if (prevTag === 'MARK' && isAttack) {
      bonus.markMultiplier = 2;
    }
    // MOVE → 공격: 막기 관통
    if (prevTag === 'MOVE' && isAttack) {
      bonus.bypassDefend = true;
    }
    // DEFEND → ENERGY: 기 소모 -1
    if (prevTag === 'DEFEND' && currentTags.includes('ENERGY')) {
      bonus.kiCostReduction += 1;
    }
  }

  return bonus;
}

/**
 * 연계 보너스 힌트 텍스트 생성 (UI 표시용)
 */
function buildChainHintText(bonus: ChainBonus): string {
  const parts: string[] = [];
  if (bonus.damageBonus > 0) parts.push(`+${bonus.damageBonus}뎀`);
  if (bonus.kiCostReduction > 0) parts.push(`기-${bonus.kiCostReduction}`);
  if (bonus.bypassDefend) parts.push('관통');
  if (bonus.markMultiplier > 1) parts.push(`표식×${bonus.markMultiplier}`);
  if (parts.length === 0) return '';
  return `→ ${parts.join(' ')}`;
}

// ──────────────────────────────────────────
// BattleScene
// ──────────────────────────────────────────

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

  /** 적 슬롯별 텔레그래프 텍스트 오브젝트 배열 */
  private enemyTelegraphTexts: Phaser.GameObjects.Text[] = [];

  // HP 바
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;

  // 전투 상태
  private phase: BattlePhase = 'draw';
  private selectedCard: CardInstance | null = null;
  private battleLog: string[] = [];

  /**
   * sense 스킬 효과 상태 (Phase 2-3)
   * sense 배치 시 true → 슬롯 2개 제한 활성화
   */
  private senseActive: boolean = false;

  /**
   * ki_shield 연속 효과 상태 (Phase 2-2)
   * ki_shield 성공 시 다음 슬롯 기소모 -1
   */
  private kiShieldNextSlotBonus: number = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.gameState = GameState.getInstance();

    // 씬 재시작 시 초기화
    this.playerSlots = [];
    this.enemySlotContainers = [];
    this.enemyTelegraphTexts = [];
    this.handCards = [];
    this.battleLog = [];
    this.selectedCard = null;
    this.phase = 'draw';
    this.senseActive = false;
    this.kiShieldNextSlotBonus = 0;

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

    this.drawSectionDividers(width);

    this.createEnemyArea(width);
    this.createBattleArea(width);
    this.createPlayerArea(width);
    this.createSkillArea(width, height);
    this.createBottomArea(width, height);

    this.updateHpDisplays();
    this.updateKiGauges();

    this.enemy.generateIntent();
    this.updateTelegraphTexts();
    this.startDrawPhase();
  }

  // =================== UI 생성 ===================

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

      const telegraph = this.add.text(SLOT_X_POSITIONS[i], LAYOUT.ENEMY_TELEGRAPH_Y, '', {
        fontSize: '10px',
        color: '#ffff00',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        align: 'center',
      }).setOrigin(0.5, 0);
      this.enemyTelegraphTexts.push(telegraph);
    }

    this.enemyKiGauge.update(this.enemy.ki);
  }

  private createBattleArea(width: number): void {
    const midY = (LAYOUT.BATTLE_SECTION_TOP + LAYOUT.BATTLE_SECTION_BOTTOM) / 2;

    this.phaseText = this.add.text(width / 2, LAYOUT.PHASE_TEXT_Y, '카드를 슬롯에 배치하세요', {
      fontSize: '14px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, midY - 50, '👾', {
      fontSize: '48px', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);
  }

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

    this.playerKiGauge.update(this.gameState.player.ki);
  }

  private createSkillArea(width: number, _height: number): void {
    this.add.text(width / 2, LAYOUT.SKILL_LABEL_Y, '스킬 선택 (클릭하여 슬롯에 배치)', {
      fontSize: '12px', color: '#666688', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
  }

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

  private startDrawPhase(): void {
    this.phase = 'draw';
    this.senseActive = false;
    this.kiShieldNextSlotBonus = 0;
    this.playerSlots.forEach(s => s.removeCard());
    this.gameState.player.onTurnStart();
    this.renderHand();
    this.setPhase('placement');
  }

  private renderHand(): void {
    this.handCards.forEach(c => c.destroy());
    this.handCards = [];

    const allCards = this.gameState.deck.getAllCards();
    const seenIds = new Set<string>();
    const availableCards = allCards.filter(card => {
      if (seenIds.has(card.data.id)) return false;
      if (card.usesLeft !== null && card.usesLeft <= 0) return false;
      if (card.data.isPassive) return false;
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

  private canSelectCard(card: CardInstance): boolean {
    if (card.usesLeft !== null && card.usesLeft <= 0) return false;
    return true;
  }

  /**
   * sense 스킬 활성화 시 슬롯 2개 제한 확인 (Phase 2-3)
   * sense가 슬롯 0에 있으면 슬롯 1, 2만 사용 가능 (슬롯 2 인덱스 제한)
   */
  private getMaxSlotCount(): number {
    return this.senseActive ? 2 : SLOT_COUNT;
  }

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

    const maxSlots = this.getMaxSlotCount();
    const emptySlot = this.playerSlots.slice(0, maxSlots).find(s => s.isEmpty());
    if (emptySlot) {
      this.placeCardInSlot(card, emptySlot.slotIndex);
    }
  }

  /** 슬롯에 카드 배치 후 연계 보너스 힌트 갱신 */
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

    // sense 스킬 배치 시 적 3슬롯 즉시 공개 (Phase 2-3)
    if (card.data.id === 'sense') {
      this.senseActive = true;
      this.revealEnemySlot(0, this.enemy.intent.action1);
      this.revealEnemySlot(1, this.enemy.intent.action2);
      this.revealEnemySlot(2, this.enemy.intent.action3);
      this.addLog('🔍 [감지]: 적 3슬롯 전체 공개! (이번 턴 슬롯 2개 제한)');
    }

    // scout 스킬 배치 시 적 다음 슬롯 행동 공개 (Phase 2-3 강화)
    if (card.data.id === 'scout') {
      const nextSlotIdx = slotIndex + 1;
      if (nextSlotIdx < SLOT_COUNT) {
        const actions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
        this.revealEnemySlot(nextSlotIdx, actions[nextSlotIdx]);
        this.addLog(`👁 [눈치보기]: 적 슬롯 ${nextSlotIdx + 1} 행동 공개!`);
      }
    }

    // 연계 보너스 힌트 갱신 (Phase 2-1)
    this.updateChainHints();
  }

  /**
   * 모든 슬롯의 연계 보너스 힌트 텍스트 갱신 (Phase 2-1)
   * 배치 상태가 바뀔 때마다 호출
   */
  private updateChainHints(): void {
    for (let i = 1; i < SLOT_COUNT; i++) {
      const prevSlot = this.playerSlots[i - 1];
      const currSlot = this.playerSlots[i];
      const prevCard = prevSlot.getCard();
      const currCard = currSlot.getCard();

      if (!prevCard || !currCard) {
        currSlot.setChainHint('');
        continue;
      }

      const prevTags = prevCard.data.tags ?? [];
      const currTags = currCard.data.tags ?? [];
      const bonus = calcChainBonus(prevTags, currTags, currCard.data.effect.type);
      const hintText = buildChainHintText(bonus);
      currSlot.setChainHint(hintText);
    }
  }

  private onSlotRemove(slotIndex: number): void {
    if (this.phase !== 'placement') return;
    const slot = this.playerSlots[slotIndex];
    const removed = slot.removeCard();
    if (removed) {
      this.addLog(`슬롯 ${slotIndex + 1}: ${removed.data.name} 제거됨`);
    }
    // sense 제거 시 제한 해제
    if (removed?.data.id === 'sense') {
      this.senseActive = false;
    }
    this.updateChainHints();
  }

  private async onExecuteClicked(): Promise<void> {
    if (this.phase !== 'placement') return;

    const maxSlots = this.getMaxSlotCount();
    const hasAnyCard = this.playerSlots.slice(0, maxSlots).some(s => !s.isEmpty());
    if (!hasAnyCard) {
      this.addLog('❌ 슬롯에 카드를 배치하세요!');
      return;
    }

    // sense 슬롯 제한: 슬롯 3에 카드가 있으면 제거
    if (this.senseActive && !this.playerSlots[2].isEmpty()) {
      this.playerSlots[2].removeCard();
      this.addLog('🔍 감지 효과: 슬롯 3 사용 불가 (제거됨)');
    }

    this.setPhase('executing');

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
    this.playerSlots.forEach(s => s.removeCard());
    this.enemy.generateIntent();
    this.hideAllEnemySlots();
    this.updateTelegraphTexts();

    this.checkBattleResult();
  }

  private setSlotEmphasis(activeSlot: number): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const alpha = i === activeSlot ? 1 : 0.3;
      this.enemySlotContainers[i].setAlpha(alpha);
      this.playerSlots[i].getContainer().setAlpha(alpha);
    }
  }

  private clearSlotEmphasis(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.enemySlotContainers[i].setAlpha(1);
      this.playerSlots[i].getContainer().setAlpha(1);
    }
  }

  // =================== 슬롯 실행 ===================

  private async executeSlotPhase(slotIndex: number): Promise<void> {
    const playerSlot = this.playerSlots[slotIndex];
    const playerCard = playerSlot.getCard();
    const intentActions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
    const enemyAction = intentActions[slotIndex];

    this.addLog(`── 슬롯 ${slotIndex + 1} 대결 ──`);
    playerSlot.setHighlight(true);

    // 슬롯 시작 시 막기/회피 상태 초기화
    this.gameState.player.setBlocking(false);
    this.gameState.player.setDodging(false);

    // ── 연계 보너스 계산 (Phase 2-1) ──
    let chainBonus: ChainBonus = { ...NO_CHAIN };
    if (slotIndex > 0 && playerCard) {
      const prevCard = this.playerSlots[slotIndex - 1].getCard();
      if (prevCard) {
        const prevTags = prevCard.data.tags ?? [];
        const currTags = playerCard.data.tags ?? [];
        chainBonus = calcChainBonus(prevTags, currTags, playerCard.data.effect.type);
        const hintText = buildChainHintText(chainBonus);
        if (hintText) {
          this.addLog(`🔗 연계 발동! ${hintText}`);
        }
      }
    }

    // ki_shield 연속 효과 적용 (Phase 2-2)
    const kiShieldBonus = this.kiShieldNextSlotBonus;
    if (kiShieldBonus > 0) {
      this.kiShieldNextSlotBonus = 0;
    }

    // 플레이어 카드 기 비용 계산 (연계 + ki_shield 보너스 적용)
    const playerKiCostBase = playerCard ? playerCard.data.kiCost : 0;
    const playerKiCostReduction = chainBonus.kiCostReduction + kiShieldBonus;
    const playerKiCost = Math.max(playerKiCostBase > 0 ? 1 : 0, playerKiCostBase - playerKiCostReduction);
    const enemyKiCost = enemyAction.kiCost;

    // 우선순위 판정
    let priority: 'player_first' | 'enemy_first' | 'simultaneous';
    if (playerKiCost > enemyKiCost) {
      priority = 'player_first';
    } else if (enemyKiCost > playerKiCost) {
      priority = 'enemy_first';
    } else {
      priority = 'simultaneous';
    }

    // 플레이어 카드 유효성 체크
    type PlayerBattleType = 'ki_gather' | 'attack' | 'defend' | 'steal' | 'mark' | 'reactive' | 'swap_next' | 'reveal_all' | 'none';
    let playerBattleType: PlayerBattleType = 'none';
    let playerCardValid = false;

    if (playerCard) {
      if (playerCard.usesLeft !== null && playerCard.usesLeft <= 0) {
        this.addLog(`❌ [${playerCard.data.name}]: 사용 횟수 소진 → 무효`);
        await playerSlot.flashInsufficientKi();
      } else if (!this.gameState.player.hasEnoughKi(playerKiCost)) {
        this.addLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효 (필요: ${playerKiCost})`);
        await playerSlot.flashInsufficientKi();
      } else {
        playerCardValid = true;
        const effectType = playerCard.data.effect.type;
        if (effectType === 'ki_gain')                              playerBattleType = 'ki_gather';
        else if (effectType === 'damage')                          playerBattleType = 'attack';
        else if (effectType === 'block' || effectType === 'dodge') playerBattleType = 'defend';
        else if (effectType === 'steal_ki')                        playerBattleType = 'steal';
        else if (effectType === 'mark')                            playerBattleType = 'mark';
        else if (effectType === 'swap_next')                       playerBattleType = 'swap_next';
        else if (effectType === 'reveal_all')                      playerBattleType = 'reveal_all';
        // 반응 스킬들
        else if (effectType === 'counter' || effectType === 'ki_block' ||
                 effectType === 'ambush' || effectType === 'react_dodge') {
          playerBattleType = 'reactive';
        }
      }
    }

    // 적 행동 분류
    type EnemyBattleType = 'ki_gather' | 'attack' | 'defend';
    let enemyBattleType: EnemyBattleType;
    if (enemyAction.type === 'ki_gather')   enemyBattleType = 'ki_gather';
    else if (enemyAction.type === 'defend') enemyBattleType = 'defend';
    else                                    enemyBattleType = 'attack';

    // 순간이동 회피 판정
    const playerIsDodge = playerBattleType === 'defend' && playerCard?.data.effect.type === 'dodge';
    const enemyIsAttack = enemyBattleType === 'attack';

    let playerDodgeSuccess = false;
    if (playerCardValid && playerIsDodge && enemyIsAttack) {
      if (priority === 'player_first' || priority === 'simultaneous') {
        playerDodgeSuccess = true;
      }
    }

    const enemyAttackMissed = playerDodgeSuccess;

    // 반응 스킬 처리 (Phase 2-2)
    if (playerCardValid && playerBattleType === 'reactive' && playerCard) {
      await this.executeReactiveSkill(
        playerCard, playerSlot, slotIndex,
        enemyAction, enemyBattleType, playerKiCost
      );
    } else if (priority === 'player_first') {
      await this.executePlayerAction(playerCard, playerCardValid, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType, enemyAttackMissed, false, playerKiCost, chainBonus);
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, playerBattleType, playerCardValid, false, enemyAttackMissed);
    } else if (priority === 'enemy_first') {
      const forceMissPlayer = enemyIsAttack && playerIsDodge && priority === 'enemy_first';
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, playerBattleType, playerCardValid, false, false);
      await this.executePlayerAction(playerCard, playerCardValid && !forceMissPlayer, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType, false, forceMissPlayer, playerKiCost, chainBonus);
    } else {
      await this.executeSimultaneous(playerCard, playerCardValid, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType, playerDodgeSuccess, playerKiCost, chainBonus);
    }

    playerSlot.setHighlight(false);
    this.updateAllUI();
    await this.wait(300);
  }

  // =================== 반응 스킬 처리 (Phase 2-2) ===================

  /**
   * 반응 스킬 실행
   * 적 행동을 먼저 확인하고 조건에 맞으면 반응 효과 발동
   */
  private async executeReactiveSkill(
    playerCard: CardInstance,
    playerSlot: SlotUI,
    slotIndex: number,
    enemyAction: EnemyAction,
    enemyBattleType: 'ki_gather' | 'attack' | 'defend',
    actualKiCost: number
  ): Promise<void> {
    const reactCondition = playerCard.data.reactCondition;
    const effectType = playerCard.data.effect.type;

    // 조건 충족 여부 판단
    let conditionMet = false;
    switch (reactCondition) {
      case 'enemy_attack':
        conditionMet = enemyBattleType === 'attack';
        break;
      case 'enemy_ki_gather':
        conditionMet = enemyBattleType === 'ki_gather';
        break;
      case 'enemy_defend':
        conditionMet = enemyBattleType === 'defend';
        break;
      case 'enemy_energy_attack':
        // 적이 에너지 공격 계열(attack_s, attack_l, special)인지 확인
        conditionMet = enemyBattleType === 'attack';
        break;
    }

    // 기 소모 (조건 충족 여부와 관계없이 배치된 카드는 기 소모)
    if (!this.gameState.player.hasEnoughKi(actualKiCost)) {
      this.addLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효`);
      await playerSlot.flashInsufficientKi();
      // 적 행동은 그대로 실행
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, 'none', false, false, false);
      return;
    }

    this.gameState.player.spendKi(actualKiCost);
    if (playerCard.usesLeft !== null) playerCard.usesLeft -= 1;
    this.updateKiGauges();

    if (!conditionMet) {
      // 조건 불충족: 효과 없음 (기만 소모)
      this.addLog(`⚪ [${playerCard.data.name}]: 조건 불충족 → 효과 없음`);
      await playerSlot.flashExecuted();
      // 적 행동은 정상 실행
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, 'none', false, false, false);
      return;
    }

    // 조건 충족: 반응 효과 발동
    this.addLog(`⚡ [${playerCard.data.name}]: 반응 발동!`);

    switch (effectType) {
      case 'counter': {
        // counter_stance: 피해 -2 + 반격 2뎀
        const counterDmg = playerCard.data.effect.value;
        this.addLog(`🥊 [카운터 자세]: 적 공격 경감(-2) + 반격 ${counterDmg}뎀`);

        // 적 행동 실행 (피해 -2 적용)
        const enemyResult = this.enemy.executeAction(enemyAction);
        if (!enemyResult.skipped && enemyResult.damage > 0) {
          const reducedDmg = Math.max(0, enemyResult.damage - 2);
          if (reducedDmg > 0) {
            const actualDmg = this.gameState.player.takeDamage(reducedDmg);
            this.gameState.recordDamageTaken(actualDmg);
            this.addLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해 (경감 적용)`);
            await this.showDamageEffect(true, actualDmg);
          } else {
            this.addLog(`🛡️ 카운터 자세로 피해 완전 경감!`);
          }
        }
        this.updateKiGauges();

        // 반격 피해
        const counterActual = this.enemy.takeDamage(counterDmg);
        this.gameState.recordDamageDealt(counterActual);
        this.addLog(`⚡ 반격: 적에게 ${counterActual} 피해!`);
        await this.showDamageEffect(false, counterActual);
        break;
      }

      case 'ki_block': {
        // ki_shield: 적 기모으기 차단 + 다음 슬롯 기소모 -1
        const blockAmt = playerCard.data.effect.value;
        this.addLog(`🔰 [기 보호막]: 적 기+${blockAmt} 차단`);

        // 적 기모으기 실행하되 기 획득량을 차단
        const enemyResult = this.enemy.executeAction(enemyAction);
        if (!enemyResult.skipped && enemyResult.kiGained > 0) {
          // 차단: 획득한 기를 다시 빼앗음
          const blocked = Math.min(enemyResult.kiGained, blockAmt);
          // enemy.ki는 직접 접근 불가이므로 stealKi로 차단
          this.enemy.stealKi(blocked);
          this.addLog(`🔰 적 기 +${enemyResult.kiGained} → ${blocked} 차단됨`);
        }
        this.updateKiGauges();

        // 다음 슬롯 기소모 -1 효과 등록
        this.kiShieldNextSlotBonus = 1;
        this.addLog(`🔰 다음 슬롯 기소모 -1 적용 예약`);
        break;
      }

      case 'ambush': {
        // ambush_counter: 막기 무효 + 관통 피해 4
        const ambushDmg = playerCard.data.effect.value;
        this.addLog(`🗡️ [잠복 반격]: 적 막기 무효 + 관통 ${ambushDmg}뎀`);

        // 적은 막기 상태이므로 executeAction만 호출 (피해는 없음)
        this.enemy.executeAction(enemyAction);
        this.updateKiGauges();

        // 막기 무시하고 직접 피해
        const ambushActual = this.enemy.takeDamage(ambushDmg);
        this.gameState.recordDamageDealt(ambushActual);
        this.addLog(`⚡ 관통 피해: 적에게 ${ambushActual} 피해!`);
        await this.showDamageEffect(false, ambushActual);
        break;
      }

      case 'react_dodge': {
        // reactive_teleport: 에너지 공격 자동 회피
        this.addLog(`💨 [반응 순간이동]: 에너지 공격 자동 회피!`);

        const enemyResult = this.enemy.executeAction(enemyAction);
        this.updateKiGauges();

        if (enemyResult.damage > 0) {
          this.addLog(`💨 적 [${enemyAction.name}] 회피 성공! (${enemyResult.damage}뎀 무효)`);
        }
        break;
      }
    }

    await playerSlot.flashExecuted();
  }

  /**
   * 플레이어 행동 실행
   */
  private async executePlayerAction(
    playerCard: CardInstance | null,
    playerCardValid: boolean,
    playerBattleType: 'ki_gather' | 'attack' | 'defend' | 'steal' | 'mark' | 'reactive' | 'swap_next' | 'reveal_all' | 'none',
    playerSlot: SlotUI,
    slotIndex: number,
    enemyAction: EnemyAction,
    enemyBattleType: 'ki_gather' | 'attack' | 'defend',
    enemyAttackMissed: boolean,
    dodgeForceFail: boolean = false,
    actualKiCost?: number,
    chainBonus?: ChainBonus
  ): Promise<void> {
    if (!playerCard || !playerCardValid) return;

    const kiCost = actualKiCost ?? playerCard.data.kiCost;
    const bonus = chainBonus ?? NO_CHAIN;

    // 기 소모
    this.gameState.player.spendKi(kiCost);
    if (playerCard.usesLeft !== null) playerCard.usesLeft -= 1;
    this.updateKiGauges();

    switch (playerBattleType) {
      case 'ki_gather': {
        const gained = this.gameState.player.gainKi(playerCard.data.effect.value);
        this.addLog(`✨ [${playerCard.data.name}]: 기 +${gained}`);
        await playerSlot.flashExecuted();

        const enemyEffective = enemyBattleType === 'attack' && !enemyAttackMissed;
        if (enemyEffective) {
          const results = this.skillSystem.trigger({
            type: 'ki_gather_while_attacked',
            context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
          });
          for (const r of results) {
            if (r.message) this.addLog(r.message);
          }
        } else {
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
        break;
      }

      case 'defend': {
        const isDodge = playerCard.data.effect.type === 'dodge';
        if (dodgeForceFail && isDodge) {
          this.addLog(`❌ [${playerCard.data.name}]: 이미 공격받아 순간이동 불가!`);
        } else if (isDodge) {
          this.gameState.player.setDodging(true);
          if (enemyAttackMissed) {
            this.addLog(`💨 [${playerCard.data.name}]: 선공 순간이동 → 적 공격 회피!`);
          } else {
            this.addLog(`💨 [${playerCard.data.name}]: 회피 준비!`);
          }
        } else {
          this.gameState.player.setBlocking(true);
          this.addLog(`🛡️ [${playerCard.data.name}]: 막기 준비!`);
        }
        await playerSlot.flashExecuted();

        if (!isDodge && enemyBattleType === 'attack' && !enemyAttackMissed) {
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
        break;
      }

      case 'mark': {
        const markVal = playerCard.data.effect.value;
        this.enemy.addMark(markVal);
        this.addLog(`🎯 [${playerCard.data.name}]: 적에게 표식 +${markVal} (누적: ${this.enemy.mark})`);
        await playerSlot.flashExecuted();
        break;
      }

      case 'steal': {
        const enemyAttacking = enemyBattleType === 'attack' && !enemyAttackMissed;
        if (enemyAttacking) {
          this.addLog(`❌ [${playerCard.data.name}]: 공격받아 강탈 실패!`);
        } else {
          const stolen = this.enemy.stealKi(playerCard.data.effect.value);
          if (stolen > 0) {
            this.gameState.player.gainKi(stolen);
            this.addLog(`💰 [${playerCard.data.name}]: 적에게서 기 ${stolen} 강탈!`);
          } else {
            this.addLog(`💰 [${playerCard.data.name}]: 강탈했지만 적의 기가 없었다.`);
          }
          this.updateKiGauges();
        }
        await playerSlot.flashExecuted();
        break;
      }

      case 'attack': {
        // MOVE 연계 → 막기 관통
        const blockedByEnemy = enemyBattleType === 'defend' && !bonus.bypassDefend;
        if (blockedByEnemy) {
          this.addLog(`🛡️ 적이 막기로 [${playerCard.data.name}]을 막았다!`);
          await playerSlot.flashExecuted();
        } else {
          if (bonus.bypassDefend && enemyBattleType === 'defend') {
            this.addLog(`👟 MOVE 연계: 적 막기 관통!`);
          }
          await this.applyAttackEffect(playerCard, playerSlot, bonus);
        }
        break;
      }

      case 'swap_next': {
        // 강화된 scout (Phase 2-3): 적 다음 슬롯 공개 + 카드 교체 가능
        const enemyAttacking = enemyBattleType === 'attack' && !enemyAttackMissed;
        if (enemyAttacking) {
          this.addLog(`❌ [${playerCard.data.name}]: 공격받아 눈치보기 실패!`);
        } else {
          const nextIdx = slotIndex + 1;
          if (nextIdx < SLOT_COUNT) {
            const nextActions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
            this.revealEnemySlot(nextIdx, nextActions[nextIdx]);
            this.addLog(`👁 [눈치보기]: 적 슬롯 ${nextIdx + 1} 공개! 다음 슬롯 교체 가능.`);
            // 다음 슬롯 카드 제거 (교체 가능 상태)
            if (!this.playerSlots[nextIdx].isEmpty()) {
              const removed = this.playerSlots[nextIdx].removeCard();
              if (removed) {
                this.addLog(`슬롯 ${nextIdx + 1}: ${removed.data.name} 제거 (교체 가능)`);
              }
            }
          }
        }
        await playerSlot.flashExecuted();
        break;
      }

      case 'reveal_all': {
        // sense (Phase 2-3): 이미 배치 시 공개됨, 실행 시 로그만
        this.addLog(`🔍 [감지]: 적 전략 분석 완료`);
        await playerSlot.flashExecuted();
        break;
      }

      default:
        break;
    }
  }

  /**
   * 적 행동 실행
   */
  private async executeEnemyAction(
    enemyAction: EnemyAction,
    enemyBattleType: 'ki_gather' | 'attack' | 'defend',
    slotIndex: number,
    playerBattleType: string,
    playerCardValid: boolean,
    _alreadyExecuted: boolean,
    enemyAttackMissed: boolean
  ): Promise<void> {
    const enemyResult = this.enemy.executeAction(enemyAction);
    if (enemyResult.skipped) {
      this.addLog(`❌ 적 [${enemyAction.name}]: 기 부족 → 무효`);
      this.flashEnemySlotBg(slotIndex, 0x880000);
      return;
    }
    if (enemyResult.kiGained > 0) {
      this.addLog(`⚡ 적 기모으기: +${enemyResult.kiGained}`);
    }
    this.updateKiGauges();

    if (enemyBattleType === 'attack' && !enemyAttackMissed && enemyResult.damage > 0) {
      const playerBlocking = this.gameState.player.isBlocking;
      const playerDodging  = this.gameState.player.isDodging;

      if (playerDodging) {
        this.addLog(`💨 순간이동으로 [${enemyAction.name}] 회피!`);
      } else if (playerBlocking) {
        this.addLog(`🛡️ 막기로 [${enemyAction.name}] 상쇄!`);
      } else {
        let finalDamage = enemyResult.damage;

        if (playerBattleType === 'ki_gather' && playerCardValid) {
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
      }
    } else if (enemyBattleType === 'attack' && enemyAttackMissed) {
      this.addLog(`💨 [${enemyAction.name}] 빗나감! (순간이동 회피)`);
    }
  }

  /**
   * 동시 발동 처리
   */
  private async executeSimultaneous(
    playerCard: CardInstance | null,
    playerCardValid: boolean,
    playerBattleType: string,
    playerSlot: SlotUI,
    slotIndex: number,
    enemyAction: EnemyAction,
    enemyBattleType: 'ki_gather' | 'attack' | 'defend',
    playerDodgeSuccess: boolean,
    actualKiCost?: number,
    chainBonus?: ChainBonus
  ): Promise<void> {
    this.addLog('⚡ 동시 발동!');

    await this.executePlayerAction(
      playerCard, playerCardValid, playerBattleType as any,
      playerSlot, slotIndex, enemyAction, enemyBattleType,
      playerDodgeSuccess, false, actualKiCost, chainBonus
    );

    await this.executeEnemyAction(
      enemyAction, enemyBattleType, slotIndex,
      playerBattleType, playerCardValid, false,
      playerDodgeSuccess
    );
  }

  /**
   * 공격 카드 효과 적용 (연계 보너스 + 표식 멀티플라이어 포함, Phase 2-1)
   */
  private async applyAttackEffect(card: CardInstance, slot: SlotUI, chainBonus?: ChainBonus): Promise<void> {
    const effect = card.data.effect;
    const bonus = chainBonus ?? NO_CHAIN;
    const enemyMark = this.enemy.mark;

    // 표식 배수: 기본 (1 + mark) × markMultiplier(연계)
    const baseMarkMultiplier = 1 + enemyMark;
    const totalMarkMultiplier = baseMarkMultiplier * bonus.markMultiplier;

    if (effect.type === 'damage') {
      const baseDmg = effect.value;
      const bonusDmg = bonus.damageBonus;
      const totalBeforeMark = baseDmg + bonusDmg;
      const totalDmg = Math.floor(totalBeforeMark * totalMarkMultiplier);

      // 로그 상세 출력
      const logParts: string[] = [];
      if (enemyMark > 0 || bonus.markMultiplier > 1) {
        logParts.push(`표식×${totalMarkMultiplier}`);
        this.enemy.consumeMark();
      }
      if (bonusDmg > 0) {
        logParts.push(`연계+${bonusDmg}뎀`);
      }

      const dmg = this.enemy.takeDamage(totalDmg);
      this.gameState.recordDamageDealt(dmg);

      if (logParts.length > 0) {
        this.addLog(`🔗 ${logParts.join(' ')} → ${baseDmg}+${bonusDmg}=${totalBeforeMark} × ${totalMarkMultiplier} = ${dmg}뎀`);
      } else {
        this.addLog(`⚡ [${card.data.name}]: 적에게 ${dmg} 피해!`);
      }
      await this.showDamageEffect(false, dmg);

      this.skillSystem.trigger({
        type: 'attack_hit',
        context: { player: this.gameState.player, enemy: this.enemy, slotIndex: 0 },
      });
    }

    await slot.flashExecuted();
  }

  // =================== 결과 처리 ===================

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

  private setPhase(phase: BattlePhase): void {
    this.phase = phase;
    const phaseLabels: Record<BattlePhase, string> = {
      draw: '드로우 중...',
      placement: this.senseActive
        ? '카드를 슬롯에 배치하세요 (감지: 최대 2개)'
        : '카드를 슬롯에 배치하세요 (최대 3개)',
      executing: '전투 실행 중...',
      result: '전투 종료',
    };
    this.phaseText.setText(phaseLabels[phase]);

    const canExecute = phase === 'placement';
    this.executeBtn.setColor(canExecute ? '#44ff44' : '#336633');
    this.executeBtnBg.setFillStyle(canExecute ? 0x224422 : 0x111811);
  }

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

  private updateKiGauges(): void {
    this.playerKiGauge.update(this.gameState.player.ki);
    this.enemyKiGauge.update(this.enemy.ki);
  }

  private updateAllUI(): void {
    this.updateHpDisplays();
    this.updateKiGauges();

    this.handCards.forEach(cardUI => {
      const canSelect = cardUI.card.usesLeft === null || cardUI.card.usesLeft > 0;
      cardUI.setEnabled(canSelect);
    });
  }

  private updateTelegraphTexts(): void {
    const telegraphs = this.enemy.intent.telegraphs;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const text = this.enemyTelegraphTexts[i];
      if (!text) continue;
      const msg = telegraphs[i] ?? '';
      text.setText(msg);
    }
  }

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

  private hideEnemySlot(slotIndex: number): void {
    const container = this.enemySlotContainers[slotIndex];
    const actionText = container.getAt(2) as Phaser.GameObjects.Text;
    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;

    actionText.setText('???');
    actionText.setColor('#cc88ff');
    bg.setFillStyle(0x220033);
    bg.setStrokeStyle(1, 0x553366);
  }

  private hideAllEnemySlots(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.hideEnemySlot(i);
    }
  }

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

  private addLog(message: string): void {
    this.battleLog.push(message);
    if (this.battleLog.length > 4) {
      this.battleLog.shift();
    }
    this.logText.setText(this.battleLog.join('  |  '));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
