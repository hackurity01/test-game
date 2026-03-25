// 핵심 전투 씬 - 3슬롯 배치 전투 시스템
// Phase 3: 피콜로 패시브, 재생집중 취약, 레드리본 대령, 패시브/적 정보 UI
// Phase 4: 기 고갈 패널티, 오버차지 방지, 배틀 로그 UI

import Phaser from 'phaser';
import { GameState } from '../game/GameState';
import { Enemy, EnemyAction, ENEMY_PASSIVES } from '../game/Enemy';
import { CardInstance, CardTag } from '../game/Card';
import { SkillSystem } from '../game/SkillSystem';
import { CardUI } from '../ui/CardUI';
import { SlotUI } from '../ui/SlotUI';
import { KiGauge } from '../ui/KiGauge';
import { BattleLogUI } from '../ui/BattleLogUI';

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

  // Phase 3-4: 패시브 패널 (좌하단)
  PASSIVE_PANEL_X: 20,
  PASSIVE_PANEL_Y: 840,

  // Phase 4-3: 배틀 로그 패널 (우측)
  BATTLE_LOG_X: 1380,
  BATTLE_LOG_Y: 270,
  BATTLE_LOG_WIDTH: 210,

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

interface ChainBonus {
  damageBonus: number;
  kiCostReduction: number;
  bypassDefend: boolean;
  markMultiplier: number;
}

const NO_CHAIN: ChainBonus = {
  damageBonus: 0,
  kiCostReduction: 0,
  bypassDefend: false,
  markMultiplier: 1,
};

function calcChainBonus(prevTags: CardTag[], currentTags: CardTag[], currentEffectType: string): ChainBonus {
  const bonus: ChainBonus = { ...NO_CHAIN };
  const isAttack = currentEffectType === 'damage' || currentEffectType === 'ambush';

  for (const prevTag of prevTags) {
    if (prevTag === 'CHARGE' && currentTags.includes('ENERGY')) bonus.damageBonus += 2;
    if (prevTag === 'ENERGY' && currentTags.includes('ENERGY')) bonus.damageBonus += 1;
    if (prevTag === 'MARK' && isAttack) bonus.markMultiplier = 2;
    if (prevTag === 'MOVE' && isAttack) bonus.bypassDefend = true;
    if (prevTag === 'DEFEND' && currentTags.includes('ENERGY')) bonus.kiCostReduction += 1;
  }

  return bonus;
}

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

  // Phase 4-3: 배틀 로그 UI
  private battleLogUI!: BattleLogUI;

  /** 적 슬롯별 텔레그래프 텍스트 */
  private enemyTelegraphTexts: Phaser.GameObjects.Text[] = [];

  // HP 바
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;

  // 전투 상태
  private phase: BattlePhase = 'draw';
  private selectedCard: CardInstance | null = null;
  private battleLog: string[] = [];

  /** sense 스킬 효과 상태 */
  private senseActive: boolean = false;

  /** ki_shield 연속 효과 상태 */
  private kiShieldNextSlotBonus: number = 0;

  // ── Phase 3-1: 피콜로 재생 텍스트 ──
  /** 피콜로 전투 중 "재생 1/턴" 표시 텍스트 */
  private piccRegenText!: Phaser.GameObjects.Text;

  // ── Phase 3-4: 플레이어 패시브 패널 ──
  /** 패시브 패널 텍스트 오브젝트 목록 (패시브 발동 시 번쩍임용) */
  private passivePanelTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  /** 패시브 패널 컨테이너 */
  private passivePanelContainer!: Phaser.GameObjects.Container;

  // ── Phase 3-4: 적 정보 팝업 ──
  /** 적 정보 팝업 컨테이너 (null = 닫힘) */
  private enemyInfoPopup: Phaser.GameObjects.Container | null = null;
  /** 팝업 열림 여부 */
  private enemyInfoOpen: boolean = false;

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
    this.passivePanelTexts = new Map();
    this.enemyInfoPopup = null;
    this.enemyInfoOpen = false;

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
    this.createPassivePanel();       // Phase 3-4
    this.createPiccoloRegenText();   // Phase 3-1
    this.createBattleLogUI();        // Phase 4-3

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

    // Phase 3-4: ℹ️ 버튼
    const infoBtn = this.add.text(width / 2 + 120, LAYOUT.ENEMY_NAME_Y + 2, 'ℹ️', {
      fontSize: '18px', fontFamily: 'Arial',
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

    infoBtn.on('pointerdown', () => this.toggleEnemyInfoPopup());
    infoBtn.on('pointerover', () => infoBtn.setStyle({ color: '#ffff88' }));
    infoBtn.on('pointerout', () => infoBtn.setStyle({ color: '#ffffff' }));

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
      const isPierce = skill.type === 'attack_pierce';
      const isAttack = skill.type === 'attack_s' || skill.type === 'attack_l' || skill.type === 'special' || isPierce;
      const isCommand = skill.type === 'command';
      const tagColor = isAttack ? 0x441111 : (skill.type === 'ki_gather' ? 0x112244 : (isCommand ? 0x442200 : 0x114411));
      const tagBorderColor = isAttack ? 0xaa3333 : (skill.type === 'ki_gather' ? 0x3355aa : (isCommand ? 0xaa6600 : 0x33aa33));
      const textColor = isAttack ? '#ff8888' : (skill.type === 'ki_gather' ? '#88aaff' : (isCommand ? '#ffaa44' : '#88ff88'));

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
    // 하단 로그 텍스트 제거됨 (우측 BattleLogUI로 통합)
    this.logText = this.add.text(width / 2, LAYOUT.LOG_Y, '', {
      fontSize: '11px', color: '#888888', fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5, 0.5).setVisible(false);

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

  /**
   * Phase 3-1: 피콜로 "재생 1/턴" 항상 표시 텍스트 생성
   * 보스 전투에서만 visible
   */
  private createPiccoloRegenText(): void {
    const isBoss = this.enemy.type === 'boss';
    // 피콜로 패시브 중 regenerate_passive가 있는지 확인
    const hasRegen = isBoss && this.enemy.passives.includes('regenerate_passive');

    this.piccRegenText = this.add.text(
      LAYOUT.KI_GAUGE_X_RIGHT - 50,
      LAYOUT.ENEMY_HP_Y + 20,
      '재생 1/턴',
      {
        fontSize: '11px',
        color: '#44ff88',
        fontFamily: 'Arial',
        fontStyle: 'italic',
      }
    ).setOrigin(0.5, 0);

    this.piccRegenText.setVisible(hasRegen);
  }

  /**
   * Phase 4-3: 배틀 로그 UI 생성 (화면 우측)
   */
  private createBattleLogUI(): void {
    this.battleLogUI = new BattleLogUI({
      scene: this,
      x: LAYOUT.BATTLE_LOG_X,
      y: LAYOUT.BATTLE_LOG_Y,
      width: LAYOUT.BATTLE_LOG_WIDTH,
    });
  }

  /**
   * Phase 3-4: 플레이어 패시브 패널 생성 (화면 좌하단)
   */
  private createPassivePanel(): void {
    this.passivePanelContainer = this.add.container(LAYOUT.PASSIVE_PANEL_X, LAYOUT.PASSIVE_PANEL_Y);

    const passiveCards = this.gameState.deck.getAllCards().filter(c => c.data.isPassive);
    if (passiveCards.length === 0) {
      // 패시브 없으면 패널 숨김
      this.passivePanelContainer.setVisible(false);
      return;
    }

    // 배경
    const panelWidth = Math.min(400, passiveCards.length * 120 + 20);
    const bg = this.add.rectangle(panelWidth / 2, -10, panelWidth, 24, 0x111133, 0.7)
      .setStrokeStyle(1, 0x333366);
    this.passivePanelContainer.add(bg);

    // 라벨
    const label = this.add.text(6, -18, '패시브:', {
      fontSize: '10px', color: '#6666aa', fontFamily: 'Arial',
    }).setOrigin(0, 0.5);
    this.passivePanelContainer.add(label);

    // 패시브 아이콘 맵
    const passiveIconMap: Record<string, string> = {
      passive_parry: '🛡 패링',
      passive_rapid: '⚡ 연속파',
      passive_meditate: '🧘 명상',
    };

    let xOffset = 55;
    passiveCards.forEach((card) => {
      const iconText = passiveIconMap[card.data.id] ?? `✨ ${card.data.name}`;
      const txt = this.add.text(xOffset, -18, iconText, {
        fontSize: '11px',
        color: '#aaaaff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      this.passivePanelContainer.add(txt);
      this.passivePanelTexts.set(card.data.id, txt);
      xOffset += txt.width + 14;

      // 구분자 (마지막 항목 제외)
      if (xOffset < panelWidth) {
        const sep = this.add.text(xOffset - 6, -18, '|', {
          fontSize: '11px', color: '#444466', fontFamily: 'Arial',
        }).setOrigin(0.5, 0.5);
        this.passivePanelContainer.add(sep);
      }
    });
  }

  /**
   * Phase 3-4: 패시브 발동 시 노란색 번쩍임
   */
  private flashPassiveText(passiveId: string): void {
    const txt = this.passivePanelTexts.get(passiveId);
    if (!txt) return;

    txt.setColor('#ffff00');
    this.time.delayedCall(500, () => {
      if (txt && txt.active) txt.setColor('#aaaaff');
    });
  }

  /**
   * Phase 3-4: 적 정보 팝업 토글
   */
  private toggleEnemyInfoPopup(): void {
    if (this.enemyInfoOpen) {
      this.closeEnemyInfoPopup();
    } else {
      this.openEnemyInfoPopup();
    }
  }

  private openEnemyInfoPopup(): void {
    if (this.enemyInfoPopup) {
      this.enemyInfoPopup.destroy();
      this.enemyInfoPopup = null;
    }

    this.enemyInfoOpen = true;
    const popupX = 900;
    const popupY = 30;
    const popupW = 300;

    // 내용 구성
    const lines: string[] = [];
    lines.push(`📋 ${this.enemy.name}`);
    lines.push(`HP: ${this.enemy.hp} / ${this.enemy.maxHp}`);
    lines.push(`기: ${this.enemy.ki} / ${this.enemy.maxKi}`);

    // 패시브 목록 (적)
    if (this.enemy.passives.length > 0) {
      lines.push('');
      lines.push('[ 패시브 ]');
      for (const passiveId of this.enemy.passives) {
        const p = ENEMY_PASSIVES[passiveId];
        if (p) lines.push(`• ${p.name}: ${p.description}`);
      }
    }

    // 사용 가능 스킬 목록
    lines.push('');
    lines.push('[ 스킬 ]');
    for (const skill of this.enemy.availableSkills) {
      lines.push(`• ${skill.name} (기${skill.kiCost}): ${skill.description}`);
    }

    const popupText = lines.join('\n');
    // 팝업 높이 동적 계산
    const lineCount = lines.length;
    const popupH = lineCount * 16 + 20;

    const popup = this.add.container(popupX, popupY);
    const bg = this.add.rectangle(popupW / 2, popupH / 2, popupW, popupH, 0x111122, 0.95)
      .setStrokeStyle(2, 0x6644aa);
    const txt = this.add.text(10, 10, popupText, {
      fontSize: '11px',
      color: '#ccccff',
      fontFamily: 'Arial',
      wordWrap: { width: popupW - 20 },
    }).setOrigin(0, 0);

    // 닫기 버튼
    const closeBtn = this.add.text(popupW - 8, 4, '✕', {
      fontSize: '14px', color: '#ff6666', fontFamily: 'Arial',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeEnemyInfoPopup());

    popup.add([bg, txt, closeBtn]);
    // 팝업이 클릭 이벤트를 통해 닫힐 수 있도록 bg도 인터랙티브
    bg.setInteractive();
    bg.on('pointerdown', () => this.closeEnemyInfoPopup());

    this.enemyInfoPopup = popup;

    // 팝업을 씬 맨 앞으로
    this.children.bringToTop(popup);
  }

  private closeEnemyInfoPopup(): void {
    this.enemyInfoOpen = false;
    if (this.enemyInfoPopup) {
      this.enemyInfoPopup.destroy();
      this.enemyInfoPopup = null;
    }
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
    // Phase 4-1: 드로우 후 기 부족 카드 반투명 처리
    this.updateCardAffordability();
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

  private getMaxSlotCount(): number {
    return this.senseActive ? 2 : SLOT_COUNT;
  }

  private onCardSelected(card: CardInstance): void {
    if (this.phase !== 'placement') return;

    if (!this.canSelectCard(card)) {
      this.addBattleLog(`✗ ${card.data.name}: 사용 횟수 소진!`);
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

  private placeCardInSlot(card: CardInstance, slotIndex: number): void {
    const slot = this.playerSlots[slotIndex];

    // 기 부족해도 배치 허용 (예측 배치). 실행 시점에 기 부족이면 무효 처리됨.

    if (!slot.isEmpty()) {
      const existingCard = slot.removeCard();
      if (existingCard) {
        this.addBattleLog(`슬롯 ${slotIndex + 1}: ${existingCard.data.name} 제거됨`);
      }
    }
    slot.placeCard(card);
    this.selectedCard = null;
    this.handCards.forEach(c => c.setSelected(false));
    this.addBattleLog(`슬롯 ${slotIndex + 1}: [${card.data.name}] 배치`);

    if (card.data.id === 'sense') {
      this.senseActive = true;
      this.revealEnemySlot(0, this.enemy.intent.action1);
      this.revealEnemySlot(1, this.enemy.intent.action2);
      this.revealEnemySlot(2, this.enemy.intent.action3);
      this.addBattleLog('🔍 [감지]: 적 3슬롯 전체 공개! (이번 턴 슬롯 2개 제한)');
    }

    if (card.data.id === 'scout') {
      const nextSlotIdx = slotIndex + 1;
      if (nextSlotIdx < SLOT_COUNT) {
        const actions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
        this.revealEnemySlot(nextSlotIdx, actions[nextSlotIdx]);
        this.addBattleLog(`👁 [눈치보기]: 적 슬롯 ${nextSlotIdx + 1} 행동 공개!`);
      }
    }

    this.updateChainHints();
  }

  private updateChainHints(): void {
    // 연계 효과 비활성화 (임시) — 힌트 표시 없음
    for (let i = 1; i < SLOT_COUNT; i++) {
      this.playerSlots[i].setChainHint('');
    }
  }

  private onSlotRemove(slotIndex: number): void {
    if (this.phase !== 'placement') return;
    const slot = this.playerSlots[slotIndex];
    const removed = slot.removeCard();
    if (removed) {
      this.addBattleLog(`슬롯 ${slotIndex + 1}: ${removed.data.name} 제거됨`);
    }
    if (removed?.data.id === 'sense') {
      this.senseActive = false;
    }
    this.updateChainHints();
    // Phase 4-1: 카드 상태(반투명) 즉시 업데이트
    this.updateCardAffordability();
  }

  private async onExecuteClicked(): Promise<void> {
    if (this.phase !== 'placement') return;

    const maxSlots = this.getMaxSlotCount();
    const hasAnyCard = this.playerSlots.slice(0, maxSlots).some(s => !s.isEmpty());
    if (!hasAnyCard) {
      this.addBattleLog('❌ 슬롯에 카드를 배치하세요!');
      return;
    }

    if (this.senseActive && !this.playerSlots[2].isEmpty()) {
      this.playerSlots[2].removeCard();
      this.addBattleLog('🔍 감지 효과: 슬롯 3 사용 불가 (제거됨)');
    }

    this.setPhase('executing');

    // Phase 3-1: 피콜로 패시브 신진대사 재생 (1/턴)
    if (this.enemy.type === 'boss' && this.enemy.passives.includes('regenerate_passive')) {
      this.enemy.regenerate();
      this.addBattleLog('💚 [신진대사 재생] 피콜로 HP +1!');
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

    this.addBattleLog(`── 슬롯 ${slotIndex + 1} 대결 ──`);
    playerSlot.setHighlight(true);

    // 슬롯 시작 시 막기/회피 상태 초기화
    this.gameState.player.setBlocking(false);
    this.gameState.player.setDodging(false);

    // Phase 3-2: regenerate 슬롯 취약 표시
    if (enemyAction.type === 'regenerate') {
      this.showVulnerableText(slotIndex);
    }

    // 연계 보너스 계산
    // 연계 효과 비활성화 (임시)
    const chainBonus: ChainBonus = { ...NO_CHAIN };

    const kiShieldBonus = this.kiShieldNextSlotBonus;
    if (kiShieldBonus > 0) {
      this.kiShieldNextSlotBonus = 0;
    }

    const playerKiCostBase = playerCard ? playerCard.data.kiCost : 0;
    const playerKiCostReduction = chainBonus.kiCostReduction + kiShieldBonus;
    const playerKiCost = Math.max(playerKiCostBase > 0 ? 1 : 0, playerKiCostBase - playerKiCostReduction);
    const enemyKiCost = enemyAction.kiCost;

    let priority: 'player_first' | 'enemy_first' | 'simultaneous';
    if (playerKiCost > enemyKiCost) priority = 'player_first';
    else if (enemyKiCost > playerKiCost) priority = 'enemy_first';
    else priority = 'simultaneous';

    type PlayerBattleType = 'ki_gather' | 'attack' | 'defend' | 'steal' | 'mark' | 'reactive' | 'swap_next' | 'reveal_all' | 'none';
    let playerBattleType: PlayerBattleType = 'none';
    let playerCardValid = false;

    if (playerCard) {
      if (playerCard.usesLeft !== null && playerCard.usesLeft <= 0) {
        this.addBattleLog(`❌ [${playerCard.data.name}]: 사용 횟수 소진 → 무효`);
        await playerSlot.flashInsufficientKi();
      } else if (!this.gameState.player.hasEnoughKi(playerKiCost)) {
        this.addBattleLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효 (필요: ${playerKiCost})`);
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
        else if (effectType === 'counter' || effectType === 'ki_block' ||
                 effectType === 'ambush' || effectType === 'react_dodge') {
          playerBattleType = 'reactive';
        }
      }
    }

    type EnemyBattleType = 'ki_gather' | 'attack' | 'defend' | 'regenerate' | 'command';
    let enemyBattleType: EnemyBattleType;
    if (enemyAction.type === 'ki_gather')       enemyBattleType = 'ki_gather';
    else if (enemyAction.type === 'defend')     enemyBattleType = 'defend';
    else if (enemyAction.type === 'regenerate') enemyBattleType = 'regenerate';
    else if (enemyAction.type === 'command')    enemyBattleType = 'command';
    else                                        enemyBattleType = 'attack';

    const playerIsDodge = playerBattleType === 'defend' && playerCard?.data.effect.type === 'dodge';
    const enemyIsAttack = enemyBattleType === 'attack';

    let playerDodgeSuccess = false;
    if (playerCardValid && playerIsDodge && enemyIsAttack) {
      if (priority === 'player_first' || priority === 'simultaneous') {
        playerDodgeSuccess = true;
      }
    }

    const enemyAttackMissed = playerDodgeSuccess;

    if (playerCardValid && playerBattleType === 'reactive' && playerCard) {
      await this.executeReactiveSkill(
        playerCard, playerSlot, slotIndex,
        enemyAction, enemyBattleType as any, playerKiCost
      );
    } else {
      // 플레이어가 막기/회피를 배치했으면 실행 순서와 무관하게 미리 상태 반영
      // (enemy_first일 때 적 공격 처리 전에 blocking 상태가 false인 버그 방지)
      if (playerCardValid && playerBattleType === 'defend') {
        if (playerIsDodge) {
          this.gameState.player.setDodging(true);
        } else {
          this.gameState.player.setBlocking(true);
        }
      }

      if (priority === 'player_first') {
        await this.executePlayerAction(playerCard, playerCardValid, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType as any, enemyAttackMissed, false, playerKiCost, chainBonus);
        await this.executeEnemyAction(enemyAction, enemyBattleType as any, slotIndex, playerBattleType, playerCardValid, false, enemyAttackMissed);
      } else if (priority === 'enemy_first') {
        const forceMissPlayer = enemyIsAttack && playerIsDodge && priority === 'enemy_first';
        await this.executeEnemyAction(enemyAction, enemyBattleType as any, slotIndex, playerBattleType, playerCardValid, false, false);
        await this.executePlayerAction(playerCard, playerCardValid && !forceMissPlayer, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType as any, false, forceMissPlayer, playerKiCost, chainBonus);
      } else {
        await this.executeSimultaneous(playerCard, playerCardValid, playerBattleType, playerSlot, slotIndex, enemyAction, enemyBattleType as any, playerDodgeSuccess, playerKiCost, chainBonus);
      }
    }

    playerSlot.setHighlight(false);
    this.updateAllUI();
    await this.wait(300);
  }

  /**
   * Phase 3-2: 취약 표시 - 적 위에 "⚠️ 취약!" 텍스트 표시
   */
  private showVulnerableText(slotIndex: number): void {
    const x = SLOT_X_POSITIONS[slotIndex];
    const y = LAYOUT.ENEMY_SLOTS_Y - 50;

    const vulnText = this.add.text(x, y, '⚠️ 취약!', {
      fontSize: '18px',
      color: '#ffff00',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: vulnText,
      y: y - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => vulnText.destroy(),
    });
  }

  // =================== 반응 스킬 처리 (Phase 2-2) ===================

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

    let conditionMet = false;
    switch (reactCondition) {
      case 'enemy_attack':        conditionMet = enemyBattleType === 'attack';    break;
      case 'enemy_ki_gather':     conditionMet = enemyBattleType === 'ki_gather'; break;
      case 'enemy_defend':        conditionMet = enemyBattleType === 'defend';    break;
      case 'enemy_energy_attack': conditionMet = enemyBattleType === 'attack';    break;
    }

    if (!this.gameState.player.hasEnoughKi(actualKiCost)) {
      this.addBattleLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효`);
      await playerSlot.flashInsufficientKi();
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, 'none', false, false, false);
      return;
    }

    this.gameState.player.spendKi(actualKiCost);
    if (playerCard.usesLeft !== null) playerCard.usesLeft -= 1;
    this.updateKiGauges();

    if (!conditionMet) {
      this.addBattleLog(`⚪ [${playerCard.data.name}]: 조건 불충족 → 효과 없음`);
      await playerSlot.flashExecuted();
      await this.executeEnemyAction(enemyAction, enemyBattleType, slotIndex, 'none', false, false, false);
      return;
    }

    this.addBattleLog(`⚡ [${playerCard.data.name}]: 반응 발동!`);

    switch (effectType) {
      case 'counter': {
        const counterDmg = playerCard.data.effect.value;
        this.addBattleLog(`🥊 [카운터 자세]: 적 공격 경감(-2) + 반격 ${counterDmg}뎀`);
        const enemyResult = this.enemy.executeAction(enemyAction);
        if (!enemyResult.skipped && enemyResult.damage > 0) {
          const reducedDmg = Math.max(0, enemyResult.damage - 2);
          if (reducedDmg > 0) {
            const actualDmg = this.gameState.player.takeDamage(reducedDmg);
            this.gameState.recordDamageTaken(actualDmg);
            this.addBattleLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해 (경감 적용)`);
            await this.showDamageEffect(true, actualDmg);
          } else {
            this.addBattleLog(`🛡️ 카운터 자세로 피해 완전 경감!`);
          }
        }
        this.updateKiGauges();
        const counterActual = this.enemy.takeDamage(counterDmg);
        this.gameState.recordDamageDealt(counterActual);
        this.addBattleLog(`⚡ 반격: 적에게 ${counterActual} 피해!`);
        await this.showDamageEffect(false, counterActual);
        break;
      }

      case 'ki_block': {
        const blockAmt = playerCard.data.effect.value;
        this.addBattleLog(`🔰 [기 보호막]: 적 기+${blockAmt} 차단`);
        const enemyResult = this.enemy.executeAction(enemyAction);
        if (!enemyResult.skipped && enemyResult.kiGained > 0) {
          const blocked = Math.min(enemyResult.kiGained, blockAmt);
          this.enemy.stealKi(blocked);
          this.addBattleLog(`🔰 적 기 +${enemyResult.kiGained} → ${blocked} 차단됨`);
        }
        this.updateKiGauges();
        this.kiShieldNextSlotBonus = 1;
        this.addBattleLog(`🔰 다음 슬롯 기소모 -1 적용 예약`);
        break;
      }

      case 'ambush': {
        const ambushDmg = playerCard.data.effect.value;
        this.addBattleLog(`🗡️ [잠복 반격]: 적 막기 무효 + 관통 ${ambushDmg}뎀`);
        this.enemy.executeAction(enemyAction);
        this.updateKiGauges();
        const ambushActual = this.enemy.takeDamage(ambushDmg);
        this.gameState.recordDamageDealt(ambushActual);
        this.addBattleLog(`⚡ 관통 피해: 적에게 ${ambushActual} 피해!`);
        await this.showDamageEffect(false, ambushActual);
        break;
      }

      case 'react_dodge': {
        this.addBattleLog(`💨 [반응 순간이동]: 에너지 공격 자동 회피!`);
        const enemyResult = this.enemy.executeAction(enemyAction);
        this.updateKiGauges();
        if (enemyResult.damage > 0) {
          this.addBattleLog(`💨 적 [${enemyAction.name}] 회피 성공! (${enemyResult.damage}뎀 무효)`);
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
    enemyBattleType: 'ki_gather' | 'attack' | 'defend' | 'regenerate' | 'command',
    enemyAttackMissed: boolean,
    dodgeForceFail: boolean = false,
    actualKiCost?: number,
    chainBonus?: ChainBonus
  ): Promise<void> {
    if (!playerCard || !playerCardValid) return;

    const kiCost = actualKiCost ?? playerCard.data.kiCost;
    const bonus = chainBonus ?? NO_CHAIN;

    this.gameState.player.spendKi(kiCost);
    if (playerCard.usesLeft !== null) playerCard.usesLeft -= 1;
    this.updateKiGauges();

    switch (playerBattleType) {
      case 'ki_gather': {
        // Phase 4-2: 기가 이미 최대치면 오버차지 경고
        const isAtMax = this.gameState.player.ki >= this.gameState.player.maxKi;
        if (isAtMax) {
          this.addBattleLog('🔋 기 과부하! 기모으기 실패');
          this.showSlotNotification(slotIndex, '기 과부하!', '#ff8800');
          await playerSlot.flashExecuted();
          // 오버차지 시 Ki게이지 업데이트 (주황색 표시)
          this.updateKiGauges();
          break;
        }
        const gained = this.gameState.player.gainKi(playerCard.data.effect.value);
        this.addBattleLog(`✨ [${playerCard.data.name}]: 기 +${gained}`);
        await playerSlot.flashExecuted();

        const enemyEffective = (enemyBattleType === 'attack') && !enemyAttackMissed;
        if (enemyEffective) {
          const results = this.skillSystem.trigger({
            type: 'ki_gather_while_attacked',
            context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
          });
          for (const r of results) {
            if (r.message) this.addBattleLog(r.message);
          }
        } else {
          const results = this.skillSystem.trigger({
            type: 'ki_gather_success',
            context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
          });
          for (const r of results) {
            if (r.message) {
              this.addBattleLog(r.message);
              // Phase 3-4: 명상 패시브 발동 번쩍임
              if (r.passiveId === 'passive_meditate') this.flashPassiveText('passive_meditate');
            }
            if (r.extraKi) this.gameState.player.gainKi(r.extraKi);
          }
          this.updateKiGauges();
        }
        break;
      }

      case 'defend': {
        const isDodge = playerCard.data.effect.type === 'dodge';
        if (dodgeForceFail && isDodge) {
          this.addBattleLog(`❌ [${playerCard.data.name}]: 이미 공격받아 순간이동 불가!`);
        } else if (isDodge) {
          this.gameState.player.setDodging(true);
          if (enemyAttackMissed) {
            this.addBattleLog(`💨 [${playerCard.data.name}]: 선공 순간이동 → 적 공격 회피!`);
          } else {
            this.addBattleLog(`💨 [${playerCard.data.name}]: 회피 준비!`);
          }
        } else {
          this.gameState.player.setBlocking(true);
          this.addBattleLog(`🛡️ [${playerCard.data.name}]: 막기 준비!`);

          // Phase 3-1: 피콜로 무한의 망토 패시브 처리
          if (this.enemy.type === 'boss' && this.enemy.passives.includes('infinite_cloak')) {
            this.enemy.addKi(1);
            this.addBattleLog('🌀 [무한의 망토] 발동! 적 기+1');
            this.updateKiGauges();
            this.flashEnemySlotBg(slotIndex, 0x8800ff);
          }
        }
        await playerSlot.flashExecuted();

        // 막기 성공 패시브 트리거 (공격 슬롯 대상일 때만)
        if (!isDodge && (enemyBattleType === 'attack') && !enemyAttackMissed) {
          const results = this.skillSystem.trigger({
            type: 'block_success',
            context: { player: this.gameState.player, enemy: this.enemy, slotIndex },
          });
          for (const r of results) {
            if (r.message) {
              this.addBattleLog(r.message);
              // Phase 3-4: 패링 패시브 발동 번쩍임
              if (r.passiveId === 'passive_parry') this.flashPassiveText('passive_parry');
            }
            if (r.extraKi) this.gameState.player.gainKi(r.extraKi);
          }
          this.updateKiGauges();
        }
        break;
      }

      case 'mark': {
        const markVal = playerCard.data.effect.value;
        this.enemy.addMark(markVal);
        this.addBattleLog(`🎯 [${playerCard.data.name}]: 적에게 표식 +${markVal} (누적: ${this.enemy.mark})`);
        await playerSlot.flashExecuted();
        break;
      }

      case 'steal': {
        const enemyAttacking = (enemyBattleType === 'attack') && !enemyAttackMissed;
        if (enemyAttacking) {
          this.addBattleLog(`❌ [${playerCard.data.name}]: 공격받아 강탈 실패!`);
        } else {
          const stolen = this.enemy.stealKi(playerCard.data.effect.value);
          if (stolen > 0) {
            this.gameState.player.gainKi(stolen);
            this.addBattleLog(`💰 [${playerCard.data.name}]: 적에게서 기 ${stolen} 강탈!`);
            // Phase 3-3: 강탈로 명령 무효화
            if (this.enemy.commandActive) {
              this.enemy.cancelCommand();
              this.addBattleLog('💰 강탈로 레드리본 대령의 명령 무효화!');
            }
          } else {
            this.addBattleLog(`💰 [${playerCard.data.name}]: 강탈했지만 적의 기가 없었다.`);
          }
          this.updateKiGauges();
        }
        await playerSlot.flashExecuted();
        break;
      }

      case 'attack': {
        const blockedByEnemy = (enemyBattleType === 'defend') && !bonus.bypassDefend;

        // Phase 3-2: 강한 공격(3 이상)이 regenerate 슬롯 명중 시 재생 취소
        if (enemyBattleType === 'regenerate') {
          const attackPower = playerCard.data.effect.value + bonus.damageBonus;
          if (attackPower >= 3) {
            this.enemy.cancelRegeneration();
            this.addBattleLog('⚡ 강한 공격으로 피콜로 재생 효과 무효화!');
          }
        }

        if (blockedByEnemy) {
          this.addBattleLog(`🛡️ 적이 막기로 [${playerCard.data.name}]을 막았다!`);
          await playerSlot.flashExecuted();
        } else {
          if (bonus.bypassDefend && enemyBattleType === 'defend') {
            this.addBattleLog(`👟 MOVE 연계: 적 막기 관통!`);
          }
          await this.applyAttackEffect(playerCard, playerSlot, bonus);
        }
        break;
      }

      case 'swap_next': {
        const enemyAttacking = (enemyBattleType === 'attack') && !enemyAttackMissed;
        if (enemyAttacking) {
          this.addBattleLog(`❌ [${playerCard.data.name}]: 공격받아 눈치보기 실패!`);
        } else {
          const nextIdx = slotIndex + 1;
          if (nextIdx < SLOT_COUNT) {
            const nextActions = [this.enemy.intent.action1, this.enemy.intent.action2, this.enemy.intent.action3];
            this.revealEnemySlot(nextIdx, nextActions[nextIdx]);
            this.addBattleLog(`👁 [눈치보기]: 적 슬롯 ${nextIdx + 1} 공개! 다음 슬롯 교체 가능.`);
            if (!this.playerSlots[nextIdx].isEmpty()) {
              const removed = this.playerSlots[nextIdx].removeCard();
              if (removed) {
                this.addBattleLog(`슬롯 ${nextIdx + 1}: ${removed.data.name} 제거 (교체 가능)`);
              }
            }
            // Phase 3-3: 눈치보기로 명령 무효화
            if (this.enemy.commandActive) {
              this.enemy.cancelCommand();
              this.addBattleLog('👁 감지로 레드리본 대령의 명령 무효화!');
            }
          }
        }
        await playerSlot.flashExecuted();
        break;
      }

      case 'reveal_all': {
        this.addBattleLog(`🔍 [감지]: 적 전략 분석 완료`);
        // Phase 3-3: 감지로 명령 무효화
        if (this.enemy.commandActive) {
          this.enemy.cancelCommand();
          this.addBattleLog('🔍 감지로 레드리본 대령의 명령 무효화!');
        }
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
    enemyBattleType: 'ki_gather' | 'attack' | 'defend' | 'regenerate' | 'command',
    slotIndex: number,
    playerBattleType: string,
    playerCardValid: boolean,
    _alreadyExecuted: boolean,
    enemyAttackMissed: boolean
  ): Promise<void> {
    const enemyResult = this.enemy.executeAction(enemyAction);

    if (enemyResult.skipped) {
      this.addBattleLog(`❌ 적 [${enemyAction.name}]: 기 부족 → 무효`);
      this.flashEnemySlotBg(slotIndex, 0x880000);
      return;
    }

    if (enemyResult.kiGained > 0) {
      this.addBattleLog(`⚡ 적 기모으기: +${enemyResult.kiGained}`);
    }
    this.updateKiGauges();

    // Phase 3-2: 재생집중 처리
    if (enemyBattleType === 'regenerate') {
      if (this.enemy.regenerationCancelled) {
        this.addBattleLog('💔 [재생집중] 강한 공격으로 재생 무효화됨!');
      } else {
        this.addBattleLog(`💚 [재생집중] 피콜로 HP +2 회복!`);
        this.updateHpDisplays();
      }
      return;
    }

    // Phase 3-3: 명령 하달 처리
    if (enemyBattleType === 'command') {
      if (this.enemy.commandActive) {
        this.addBattleLog('📢 [명령 하달] 다음 슬롯 공격에 관통 속성 부여!');
      } else {
        this.addBattleLog('📢 [명령 하달] 명령이 무효화되었다!');
      }
      return;
    }

    // 일반 공격 처리 (ki_gather/defend/regenerate/command는 절대 피해 없음)
    if ((enemyBattleType === 'attack') && !enemyAttackMissed && enemyResult.damage > 0) {
      const playerBlocking = this.gameState.player.isBlocking;
      const playerDodging  = this.gameState.player.isDodging;

      // Phase 3-3: 관통 공격 (attack_pierce) - commandActive 시 막기 무시
      const isPierce = enemyAction.type === 'attack_pierce' && this.enemy.commandActive;

      if (playerDodging) {
        this.addBattleLog(`💨 순간이동으로 [${enemyAction.name}] 회피!`);
        // 명령 소비
        if (isPierce) this.enemy.cancelCommand();
      } else if (playerBlocking && !isPierce) {
        this.addBattleLog(`🛡️ 막기로 [${enemyAction.name}] 상쇄!`);
      } else {
        if (isPierce && playerBlocking) {
          this.addBattleLog(`⚔️ [관통 공격] 막기를 무시하고 관통!`);
          this.enemy.cancelCommand(); // 명령 효과 소비
        }

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
        this.addBattleLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해!`);
        if (actualDmg > 0) await this.showDamageEffect(true, actualDmg);
      }
    } else if ((enemyBattleType === 'attack') && enemyAttackMissed) {
      this.addBattleLog(`💨 [${enemyAction.name}] 빗나감! (순간이동 회피)`);
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
    enemyBattleType: 'ki_gather' | 'attack' | 'defend' | 'regenerate' | 'command',
    playerDodgeSuccess: boolean,
    actualKiCost?: number,
    chainBonus?: ChainBonus
  ): Promise<void> {
    // 양쪽이 모두 공격인 경우: 데미지 상쇄 처리
    const playerIsAttack = playerCardValid && playerCard &&
      (playerCard.data.effect.type === 'damage') && playerBattleType === 'attack';
    const enemyIsAttack = enemyBattleType === 'attack' && (enemyAction.damage ?? 0) > 0;

    if (playerIsAttack && enemyIsAttack) {
      // 플레이어 공격력 계산
      const bonus = chainBonus ?? NO_CHAIN;
      const enemyMark = this.enemy.mark;
      const baseMarkMultiplier = (1 + enemyMark) * bonus.markMultiplier;
      const baseDmg = playerCard!.data.effect.value + bonus.damageBonus;
      const playerDmg = Math.floor(baseDmg * baseMarkMultiplier);

      // 적 공격력 계산
      const enemyDmg = enemyAction.damage ?? 0;

      // 상쇄 후 실제 데미지
      const netPlayerDmg = Math.max(0, playerDmg - enemyDmg);
      const netEnemyDmg = Math.max(0, enemyDmg - playerDmg);

      this.addBattleLog(`⚡ 동시 공격! 내 ${playerDmg}뎀 vs 적 ${enemyDmg}뎀 → 상쇄 후 내 ${netPlayerDmg}뎀 / 적 ${netEnemyDmg}뎀`);

      if (enemyMark > 0) this.enemy.consumeMark();

      if (netPlayerDmg > 0) {
        const dealt = this.enemy.takeDamage(netPlayerDmg);
        this.gameState.recordDamageDealt(dealt);
        await this.showDamageEffect(false, dealt);
      }
      if (netEnemyDmg > 0) {
        const taken = this.gameState.player.takeDamage(netEnemyDmg);
        await this.showDamageEffect(true, taken);
      }

      // ki 소모 처리
      if (actualKiCost !== undefined && actualKiCost > 0) {
        this.gameState.player.spendKi(actualKiCost);
      }
      const enemyResult = this.enemy.executeAction(enemyAction);
      if (enemyResult.skipped) {
        this.addBattleLog(`적 [${enemyAction.name}]: 기 부족으로 건너뜀`);
      }

      await playerSlot.flashExecuted();
      this.updateKiGauges();
      return;
    }

    // 그 외(공격+방어, 기모으기 등): 기존 순차 처리
    this.addBattleLog('⚡ 동시 발동!');

    await this.executePlayerAction(
      playerCard, playerCardValid, playerBattleType as any,
      playerSlot, slotIndex, enemyAction, enemyBattleType as any,
      playerDodgeSuccess, false, actualKiCost, chainBonus
    );

    await this.executeEnemyAction(
      enemyAction, enemyBattleType, slotIndex,
      playerBattleType, playerCardValid, false,
      playerDodgeSuccess
    );
  }

  /**
   * 공격 카드 효과 적용 (연계 보너스 포함)
   */
  private async applyAttackEffect(card: CardInstance, slot: SlotUI, chainBonus?: ChainBonus): Promise<void> {
    const effect = card.data.effect;
    const bonus = chainBonus ?? NO_CHAIN;
    const enemyMark = this.enemy.mark;

    const baseMarkMultiplier = 1 + enemyMark;
    const totalMarkMultiplier = baseMarkMultiplier * bonus.markMultiplier;

    if (effect.type === 'damage') {
      const baseDmg = effect.value;
      const bonusDmg = bonus.damageBonus;
      const totalBeforeMark = baseDmg + bonusDmg;
      const totalDmg = Math.floor(totalBeforeMark * totalMarkMultiplier);

      const logParts: string[] = [];
      if (enemyMark > 0 || bonus.markMultiplier > 1) {
        logParts.push(`표식×${totalMarkMultiplier}`);
        this.enemy.consumeMark();
      }
      if (bonusDmg > 0) logParts.push(`연계+${bonusDmg}뎀`);

      const dmg = this.enemy.takeDamage(totalDmg);
      this.gameState.recordDamageDealt(dmg);

      if (logParts.length > 0) {
        this.addBattleLog(`🔗 ${logParts.join(' ')} → ${baseDmg}+${bonusDmg}=${totalBeforeMark} × ${totalMarkMultiplier} = ${dmg}뎀`);
      } else {
        this.addBattleLog(`⚡ [${card.data.name}]: 적에게 ${dmg} 피해!`);
      }
      await this.showDamageEffect(false, dmg);

      const results = this.skillSystem.trigger({
        type: 'attack_hit',
        context: { player: this.gameState.player, enemy: this.enemy, slotIndex: 0 },
      });
      // Phase 3-4: 연속파 패시브 발동 번쩍임
      for (const r of results) {
        if (r.passiveId === 'passive_rapid') this.flashPassiveText('passive_rapid');
      }
    }

    await slot.flashExecuted();
  }

  // =================== 결과 처리 ===================

  private checkBattleResult(): void {
    if (this.enemy.isDead()) {
      this.addBattleLog('🎉 적을 쓰러뜨렸다!');
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
      this.addBattleLog('💀 패배했다...');
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
    // Phase 4-1: 기 변화 시 카드 어포더빌리티 실시간 갱신
    if (this.phase === 'placement') {
      this.updateCardAffordability();
    }
  }

  private updateAllUI(): void {
    this.updateHpDisplays();
    this.updateKiGauges();
    // Phase 4-1: 기 부족 카드 반투명 처리 포함
    this.updateCardAffordability();
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

    // Phase 3-3: 관통 표시
    const isPierce = action.type === 'attack_pierce';
    const isCommand = action.type === 'command';
    const isRegen = action.type === 'regenerate';
    const isAttack = action.type === 'attack_s' || action.type === 'attack_l' || action.type === 'special' || isPierce;

    let displayName = `${action.name} (기${action.kiCost})`;
    if (isPierce && this.enemy.commandActive) displayName += ' [관통]';

    actionText.setText(displayName);

    if (isAttack) {
      actionText.setColor(isPierce ? '#ffaa44' : '#ff8888');
      bg.setFillStyle(isPierce ? 0x442200 : 0x440000);
      bg.setStrokeStyle(1, isPierce ? 0xaa6600 : 0xaa2222);
    } else if (isCommand) {
      actionText.setColor('#ffff44');
      bg.setFillStyle(0x222200);
      bg.setStrokeStyle(1, 0xaaaa00);
    } else if (isRegen) {
      actionText.setColor('#44ffaa');
      bg.setFillStyle(0x002222);
      bg.setStrokeStyle(1, 0x00aa66);
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

  /**
   * Phase 4-3: 배틀 로그 추가 헬퍼
   * 기존 하단 logText와 우측 BattleLogUI 모두 업데이트
   */
  private addBattleLog(message: string): void {
    this.battleLog.push(message);
    if (this.battleLog.length > 4) {
      this.battleLog.shift();
    }
    // 하단 logText (기존 유지)
    if (this.logText) {
      this.logText.setText(this.battleLog.join('  |  '));
    }
    // 우측 배틀 로그 UI (Phase 4-3)
    if (this.battleLogUI) {
      this.battleLogUI.addEntry(message);
    }
  }

  /** @deprecated addBattleLog 사용 권장 */
  private addLog(message: string): void {
    this.addBattleLog(message);
  }

  /**
   * Phase 4-1/4-2: 슬롯 위에 알림 텍스트 표시 (0.7초 후 사라짐)
   * @param slotIndex 슬롯 인덱스 (0~2)
   * @param message 표시할 메시지
   * @param color 텍스트 색상 (예: '#ff4444')
   */
  private showSlotNotification(slotIndex: number, message: string, color: string): void {
    const x = SLOT_X_POSITIONS[slotIndex];
    const y = LAYOUT.PLAYER_SLOTS_Y - 60;

    const txt = this.add.text(x, y, message, {
      fontSize: '18px',
      color,
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(100);

    this.tweens.add({
      targets: txt,
      y: y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /**
   * Phase 4-1: 핸드 카드 중 기 부족한 카드를 반투명 처리
   * updateAllUI 내에서 호출됨
   */
  private updateCardAffordability(): void {
    this.handCards.forEach(cardUI => {
      const card = cardUI.card;
      const usable = (card.usesLeft === null || card.usesLeft > 0);
      // 사용 횟수 소진된 카드만 비활성화. 기 부족은 배치 허용 (예측 배치).
      cardUI.setEnabled(usable);
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
