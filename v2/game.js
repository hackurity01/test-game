// ============================================================
// CARD DATA
// ============================================================
const CARD_DB = {
  ki_gather:        { id:'ki_gather',        name:'기모으기',      desc:'기를 +1 충전한다.',                kiCost:0, rarity:'common',   effect:{type:'ki_gain',    value:1}, tags:['CHARGE'] },
  energy_wave:      { id:'energy_wave',      name:'에네르기파',    desc:'적에게 2의 피해를 준다.',          kiCost:1, rarity:'common',   effect:{type:'damage',     value:2}, tags:['ENERGY'] },
  block:            { id:'block',            name:'막기',          desc:'이번 슬롯 공격을 방어한다.',       kiCost:0, rarity:'common',   effect:{type:'block',      value:4}, tags:['DEFEND'] },
  energy_wave_l:    { id:'energy_wave_l',    name:'대형 에네르기파',desc:'적에게 5의 피해를 준다.',          kiCost:3, rarity:'uncommon', effect:{type:'damage',     value:5}, tags:['ENERGY'] },
  steal:            { id:'steal',            name:'강탈',          desc:'적의 기 2를 강탈한다. (공격받으면 무효)', kiCost:1, rarity:'uncommon', effect:{type:'steal_ki',  value:2}, tags:[] },
  mark:             { id:'mark',             name:'표식',          desc:'적에게 표식 중첩 +1.\n공격 시 데미지 × (1 + 중첩).',  kiCost:0, rarity:'uncommon', effect:{type:'mark',      value:1}, tags:['MARK'] },
  teleport:         { id:'teleport',         name:'순간이동',      desc:'이번 슬롯 모든 공격을 회피한다.',  kiCost:1, rarity:'rare',     effect:{type:'dodge',      value:0}, tags:['MOVE'] },
  scout:            { id:'scout',            name:'눈치보기',      desc:'적 다음 슬롯 행동 공개 + 카드 교체 가능.',             kiCost:1, rarity:'uncommon', effect:{type:'swap_next', value:0}, tags:[] },
  passive_parry:    { id:'passive_parry',    name:'패링 (패시브)', desc:'막기 성공 시 기 +1.',              kiCost:0, rarity:'rare',     effect:{type:'passive',    value:1}, isPassive:true, tags:[] },
  passive_rapid:    { id:'passive_rapid',    name:'연속파 (패시브)',desc:'연속 공격 성공 시 횟수만큼 추가 데미지.',              kiCost:0, rarity:'rare',     effect:{type:'passive',    value:0}, isPassive:true, tags:[] },
  passive_meditate: { id:'passive_meditate', name:'명상 (패시브)', desc:'기모으기 성공 시 기 +1.\n기모으기 중 피격 시 피해 +1.', kiCost:0, rarity:'rare',   effect:{type:'passive',    value:1}, isPassive:true, tags:[] },
  counter_stance:   { id:'counter_stance',   name:'카운터 자세',   desc:'적 공격 시: 피해 -2 + 반격 2뎀.\n조건 불충족 시 효과 없음.',  kiCost:1, rarity:'uncommon', effect:{type:'counter',    value:2}, isReactive:true, reactCond:'enemy_attack',        tags:[] },
  ki_shield:        { id:'ki_shield',        name:'기 보호막',     desc:'적 기모으기 시: 기+1 차단 + 다음 슬롯 기소모 -1.\n조건 불충족 시 효과 없음.', kiCost:0, rarity:'uncommon', effect:{type:'ki_block',   value:1}, isReactive:true, reactCond:'enemy_ki_gather',     tags:[] },
  ambush_counter:   { id:'ambush_counter',   name:'잠복 반격',     desc:'적 막기 시: 막기 무효 + 관통 4뎀.\n조건 불충족 시 1뎀.', kiCost:2, rarity:'rare',   effect:{type:'ambush',     value:4}, isReactive:true, reactCond:'enemy_defend',        tags:[] },
  reactive_teleport:{ id:'reactive_teleport',name:'반응 순간이동', desc:'적 에너지 공격 시: 자동 회피.\n조건 불충족 시 효과 없음.',  kiCost:1, rarity:'rare',   effect:{type:'react_dodge', value:0}, isReactive:true, reactCond:'enemy_energy_attack', tags:['MOVE'] },
  sense:            { id:'sense',            name:'감지',          desc:'적 3슬롯 전체 공개.\n단, 이번 턴 슬롯 2개만 사용 가능.', kiCost:1, rarity:'uncommon', effect:{type:'reveal_all', value:0}, tags:[] },
};

const STARTER_DECK = ['ki_gather','ki_gather','ki_gather','energy_wave','energy_wave','block','block'];
const REWARD_POOL = ['energy_wave_l','steal','mark','teleport','scout','passive_parry','passive_rapid','passive_meditate','counter_stance','ki_shield','ambush_counter','reactive_teleport','sense'];
const CARD_USE_LIMITS = { energy_wave_l:3, steal:3, mark:3, teleport:1, scout:2, counter_stance:3, ki_shield:3, ambush_counter:2, reactive_teleport:2, sense:2 };

let _instanceCounter = 0;
function createCardInstance(cardId) {
  return {
    instanceId: `card_${cardId}_${++_instanceCounter}`,
    data: CARD_DB[cardId],
    usesLeft: CARD_USE_LIMITS[cardId] ?? null,
  };
}

// ============================================================
// ENEMY DATA
// ============================================================
const E_KI_GATHER    = { type:'ki_gather',     name:'기모으기',   desc:'기를 1 충전한다',                 kiCost:0, kiGain:1,  damage:0 };
const E_ATTACK_S     = { type:'attack_s',       name:'에네르기파', desc:'플레이어에게 2 피해',              kiCost:1, kiGain:0,  damage:2 };
const E_ATTACK_L     = { type:'attack_l',       name:'강력한 파',  desc:'플레이어에게 4 피해',              kiCost:2, kiGain:0,  damage:4 };
const E_DEFEND       = { type:'defend',         name:'막기',       desc:'파 공격을 완전히 상쇄한다',        kiCost:0, kiGain:0,  damage:0 };
const E_ATTACK_ELITE = { type:'attack_l',       name:'에네르기파(대)', desc:'플레이어에게 6 피해',           kiCost:3, kiGain:0,  damage:6 };
const E_SPECIAL_BOSS = { type:'special',        name:'마안광선',   desc:'플레이어에게 8 피해 (기 4 필요)', kiCost:4, kiGain:0,  damage:8 };
const E_REGENERATE   = { type:'regenerate',     name:'재생집중',   desc:'이번 턴 HP +2 회복 (강한 공격에 취약)', kiCost:0, kiGain:0, damage:0 };
const E_COMMAND      = { type:'command',        name:'명령 하달',  desc:'다음 슬롯 공격에 관통 속성 부여', kiCost:0, kiGain:0,  damage:0 };
const E_ATK_PIERCE   = { type:'attack_pierce',  name:'관통 공격',  desc:'플레이어에게 5 피해 (명령 활성 시 막기로 막히지 않음)', kiCost:0, kiGain:0, damage:5 };

const PIRAFU_PATTERNS = [
  { cond:(hp,maxHp)=>hp/maxHp>0.5,        seq:['ki_gather','ki_gather','attack_l'],  telegraphs:['기를 모은다...','기를 모은다...',null] },
  { cond:(hp,maxHp)=>hp/maxHp<=0.5,       seq:['ki_gather','attack_l','attack_l'],   telegraphs:['분노하며 기를 모은다!',null,null] },
];
const COLONEL_PATTERNS = [
  { cond:()=>true, seq:['command','attack_pierce','defend'], telegraphs:['명령을 내린다!',null,null] },
];
const PICCOLO_PATTERNS = [
  { cond:(hp,maxHp)=>hp/maxHp>0.6,                              seq:['ki_gather','attack_s','ki_gather'], telegraphs:['기를 끌어모은다...',null,'기를 끌어모은다...'] },
  { cond:(hp,maxHp,ki)=>hp/maxHp<=0.6&&hp/maxHp>=0.3&&ki>=3,   seq:['ki_gather','ki_gather','special'],  telegraphs:['기를 끌어모은다...','눈에서 빛이 모인다...','마안광선 발사!!'] },
  { cond:(hp,maxHp,ki)=>hp/maxHp<=0.6&&hp/maxHp>=0.3&&ki<3,    seq:['attack_l','ki_gather','attack_s'],  telegraphs:[null,'기를 끌어모은다...',null] },
  { cond:(hp,maxHp)=>hp/maxHp<0.3,                              seq:['special','regenerate','defend'],    telegraphs:['눈에서 빛이 모인다...','⚠️ 재생 집중 중...',null] },
];

const ACTION_MAPS = {
  normal:   { ki_gather:E_KI_GATHER, attack_s:E_ATTACK_S, attack_l:E_ATTACK_L, defend:E_DEFEND, special:E_ATTACK_ELITE, regenerate:E_REGENERATE, command:E_COMMAND, attack_pierce:E_ATK_PIERCE },
  pirafu:   { ki_gather:E_KI_GATHER, attack_s:E_ATTACK_S, attack_l:E_ATTACK_L, defend:E_DEFEND, special:E_ATTACK_ELITE, regenerate:E_REGENERATE, command:E_COMMAND, attack_pierce:E_ATK_PIERCE },
  colonel:  { ki_gather:E_KI_GATHER, attack_s:E_ATTACK_S, attack_l:E_ATTACK_L, defend:E_DEFEND, special:E_ATTACK_ELITE, regenerate:E_REGENERATE, command:E_COMMAND, attack_pierce:E_ATK_PIERCE },
  piccolo:  { ki_gather:E_KI_GATHER, attack_s:E_ATTACK_S, attack_l:E_ATTACK_L, defend:E_DEFEND, special:E_SPECIAL_BOSS, regenerate:E_REGENERATE, command:E_COMMAND, attack_pierce:E_ATK_PIERCE },
};

const ENEMY_PASSIVES_DATA = {
  regenerate_passive: { id:'regenerate_passive', name:'신진대사 재생', desc:'매 턴 시작 HP +1' },
  infinite_cloak:     { id:'infinite_cloak',     name:'무한의 망토',  desc:'플레이어가 막기 사용 시 기 +1' },
};

// ============================================================
// PLAYER CLASS
// ============================================================
class Player {
  constructor() {
    this.maxHp = 20; this.hp = 20;
    this.maxKi = 5;  this.ki = 0;
    this.isBlocking = false; this.isDodging = false;
    this.mark = 0;
  }
  gainKi(n) { const b=this.ki; this.ki=Math.min(this.maxKi,this.ki+n); return this.ki-b; }
  spendKi(n) { if(this.ki<n)return false; this.ki-=n; return true; }
  hasKi(n) { return this.ki>=n; }
  takeDamage(n) { const d=Math.max(0,n); this.hp=Math.max(0,this.hp-d); return d; }
  heal(n) { this.hp=Math.min(this.maxHp,this.hp+n); }
  onTurnStart() { this.isBlocking=false; this.isDodging=false; }
  isDead() { return this.hp<=0; }
  addMark(n) { this.mark=Math.max(0,this.mark+n); }
  consumeMark() { const m=this.mark; if(m>0)this.mark=Math.max(0,this.mark-1); return m; }
}

// ============================================================
// ENEMY CLASS
// ============================================================
class Enemy {
  constructor(type) {
    this.type = type;
    this._init(type);
    this.generateIntent();
  }
  _init(type) {
    this.mark=0; this.patternIndex=0;
    this.passives=[]; this.commandActive=false;
    this.regenerationCancelled=false;
    if(type==='normal') {
      this.name='레드리본 병사';
      const hp=Math.floor(Math.random()*5)+8;
      this.maxHp=hp; this.hp=hp;
      this.maxKi=3; this.ki=0;
      this.variant='normal';
    } else if(type==='elite') {
      const isColonel=Math.random()<0.5;
      if(isColonel) {
        this.name='레드리본 대령';
        const hp=Math.floor(Math.random()*5)+18;
        this.maxHp=hp; this.hp=hp;
        this.maxKi=4; this.ki=0;
        this.variant='colonel';
      } else {
        this.name='피라프단';
        const hp=Math.floor(Math.random()*6)+15;
        this.maxHp=hp; this.hp=hp;
        this.maxKi=5; this.ki=0;
        this.variant='pirafu';
      }
    } else {
      this.name='피콜로';
      this.maxHp=25; this.hp=25;
      this.maxKi=5; this.ki=0;
      this.variant='piccolo';
      this.passives=['regenerate_passive','infinite_cloak'];
    }
  }
  generateIntent() {
    this.regenerationCancelled=false;
    if(this.variant==='normal') this._normalIntent();
    else if(this.variant==='pirafu') this._patternIntent(PIRAFU_PATTERNS, ACTION_MAPS.pirafu);
    else if(this.variant==='colonel') this._patternIntent(COLONEL_PATTERNS, ACTION_MAPS.colonel);
    else this._patternIntent(PICCOLO_PATTERNS, ACTION_MAPS.piccolo);
  }
  _normalIntent() {
    const choose=(ki)=>{
      if(Math.random()<0.25) return E_DEFEND;
      if(ki>=E_ATTACK_S.kiCost) return E_ATTACK_S;
      return E_KI_GATHER;
    };
    const k0=this.ki;
    const a1=choose(k0);
    const k1=Math.min(this.maxKi,k0+(a1.kiGain||0)-a1.kiCost);
    const a2=choose(k1);
    const k2=Math.min(this.maxKi,k1+(a2.kiGain||0)-a2.kiCost);
    const a3=choose(k2);
    this.intent=[a1,a2,a3];
    this.telegraphs=[null,null,null];
  }
  _patternIntent(patterns, actionMap) {
    const sel=patterns.find(p=>p.cond(this.hp,this.maxHp,this.ki))||patterns[patterns.length-1];
    const seqLen=sel.seq.length;
    const actions=[]; const telegraphs=[];
    let simKi=this.ki;
    const noFallback=['command','regenerate','attack_pierce','defend'];
    for(let i=0;i<3;i++) {
      const si=(this.patternIndex+i)%seqLen;
      let aType=sel.seq[si];
      let tel=sel.telegraphs[si];
      const intended=actionMap[aType];
      if(!noFallback.includes(aType)&&simKi<intended.kiCost) { aType='ki_gather'; tel=null; }
      const finalA=actionMap[aType];
      actions.push(finalA); telegraphs.push(tel);
      simKi=Math.min(this.maxKi,simKi+(finalA.kiGain||0)-finalA.kiCost);
    }
    this.intent=actions;
    this.telegraphs=telegraphs;
    this.patternIndex=(this.patternIndex+1)%seqLen;
  }
  executeAction(action) {
    if(this.ki<action.kiCost) return {damage:0,kiGained:0,skipped:true,healed:0};
    this.ki-=action.kiCost;
    let damage=0,kiGained=0,healed=0;
    switch(action.type) {
      case 'ki_gather': kiGained=action.kiGain||1; this.ki=Math.min(this.maxKi,this.ki+kiGained); break;
      case 'attack_s': case 'attack_l': case 'special': case 'attack_pierce': damage=action.damage||0; break;
      case 'regenerate':
        if(!this.regenerationCancelled) { healed=2; this.hp=Math.min(this.maxHp,this.hp+healed); }
        break;
      case 'command': this.commandActive=true; break;
      case 'defend': break;
    }
    return {damage,kiGained,skipped:false,healed};
  }
  stealKi(n) { const s=Math.min(this.ki,n); this.ki-=s; return s; }
  addKi(n) { this.ki=Math.min(this.maxKi,this.ki+n); }
  takeDamage(n) { const d=Math.max(0,n); this.hp=Math.max(0,this.hp-d); return d; }
  isDead() { return this.hp<=0; }
  addMark(n) { this.mark=Math.max(0,this.mark+n); }
  consumeMark() { const m=this.mark; if(m>0)this.mark=Math.max(0,this.mark-1); return m; }
  cancelRegeneration() { this.regenerationCancelled=true; }
  cancelCommand() { this.commandActive=false; }
  regeneratePassive() { if(this.passives.includes('regenerate_passive')) this.hp=Math.min(this.maxHp,this.hp+1); }
}

// ============================================================
// DECK CLASS
// ============================================================
class Deck {
  constructor(cardIds) {
    this.cards = cardIds.map(id=>createCardInstance(id));
    this._shuffle();
  }
  _shuffle() { for(let i=this.cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];} }
  addCard(cardId) {
    const c=createCardInstance(cardId);
    const idx=Math.floor(Math.random()*(this.cards.length+1));
    this.cards.splice(idx,0,c);
  }
  getAllCards() { return this.cards; }
  getAvailableCards() {
    const seen=new Set();
    return this.cards.filter(c=>{
      if(seen.has(c.data.id))return false;
      if(c.usesLeft!==null&&c.usesLeft<=0)return false;
      if(c.data.isPassive)return false;
      seen.add(c.data.id);
      return true;
    });
  }
  getPassiveCards() {
    return this.cards.filter(c=>c.data.isPassive);
  }
  serialize() { return this.cards.map(c=>c.data.id); }
}

// ============================================================
// GAME STATE
// ============================================================
class GameState {
  constructor() { this._reset(); }
  _reset() {
    this.currentFloor=1;
    this.player=new Player();
    this.deck=new Deck(STARTER_DECK);
    this.isRunActive=false;
    this.runResult=null;
    this.totalDamageDealt=0;
    this.totalDamageTaken=0;
    this.floors=this._initFloors();
  }
  _initFloors() {
    const types=['normal','normal','normal','elite','normal','normal','normal','elite','normal','boss'];
    return types.map((t,i)=>({floor:i+1,enemyType:t,completed:false}));
  }
  startNewRun() {
    this._reset();
    this.isRunActive=true;
  }
  getCurrentFloor() { return this.floors[this.currentFloor-1]; }
  completeCurrentFloor() {
    this.floors[this.currentFloor-1].completed=true;
    this.player.heal(2);
  }
  advanceFloor() {
    if(this.currentFloor<10) this.currentFloor++;
    else this.endRun(true);
  }
  endRun(won) {
    this.isRunActive=false;
    this.runResult={ won, floorsCleared:won?10:this.currentFloor-1, totalDamageDealt:this.totalDamageDealt, totalDamageTaken:this.totalDamageTaken };
  }
  addCardToDeck(cardId) { this.deck.addCard(cardId); }
  recordDamageDealt(n) { this.totalDamageDealt+=n; }
  recordDamageTaken(n) { this.totalDamageTaken+=n; }
}

// ============================================================
// GLOBAL STATE
// ============================================================
let gs = new GameState();
let battle = null; // current BattleGame instance

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
}

// ============================================================
// MAP SCREEN
// ============================================================
function initMapScreen() {
  showScreen('map');
  const p=gs.player;
  document.getElementById('map-player-status').textContent=
    `HP: ${p.hp} / ${p.maxHp}  |  기(氣): ${p.ki} / ${p.maxKi}`;

  const fl=document.getElementById('floor-list');
  fl.innerHTML='';
  for(let i=10;i>=1;i--) {
    const f=gs.floors[i-1];
    const isCurrent=i===gs.currentFloor;
    const isCompleted=f.completed;
    const row=document.createElement('div');
    row.className='floor-row'+(isCurrent?' current':isCompleted?' completed':'')+(f.enemyType==='boss'?' boss':f.enemyType==='elite'?' elite':'');
    const enemyLabels={normal:'⚔️ 레드리본 병사',elite:'⚡ 엘리트 (피라프단/대령)',boss:'💀 피콜로 - BOSS'};
    const statusText=isCompleted?'✅':isCurrent?'▶':'🔒';
    const statusColor=isCompleted?'#44aa44':isCurrent?'var(--blue)':'#333355';
    row.innerHTML=`<span class="floor-num">${i===10?'10F 🏆':`${i}F`}</span><span class="floor-enemy">${enemyLabels[f.enemyType]}</span><span class="floor-status" style="color:${statusColor}">${statusText}</span>`;
    fl.appendChild(row);
  }

  const fi=gs.getCurrentFloor();
  const typeLabel={normal:'⚔️ 일반 전투',elite:'⚡ 엘리트 전투',boss:'💀 보스 전투!'}[fi.enemyType];
  const btn=document.getElementById('map-enter-btn');
  btn.textContent=`▶ ${gs.currentFloor}층 진입: ${typeLabel}`;
  btn.onclick=()=>{ battle=new BattleGame(); battle.init(); };
}

// ============================================================
// BATTLE GAME CLASS
// ============================================================
class BattleGame {
  constructor() {
    this.enemy = new Enemy(gs.getCurrentFloor().enemyType);
    this.playerSlots = [null, null, null]; // CardInstance | null
    this.enemySlotsRevealed = [false, false, false];
    this.selectedCard = null;
    this.phase = 'placement';
    this.senseActive = false;
    this.kiShieldBonus = 0;
    this.consecutiveAttackCount = 0;
    this.infoPopupOpen = false;
  }

  init() {
    showScreen('battle');
    this._setupEventListeners();
    this._updateAllUI();
    this._renderEnemySlots();
    this.addLog('── 전투 시작 ──', 'system');
    this.addLog(`적: ${this.enemy.name} (HP ${this.enemy.hp})`, 'enemy');
    this._updatePassivePanel();
    this._setPhase('placement');
  }

  _setupEventListeners() {
    // Player slots
    for(let i=0;i<3;i++) {
      const slot=document.getElementById(`player-slot-${i}`);
      slot.onclick=()=>this._onSlotClicked(i);
    }
    // Execute button
    const execBtn=document.getElementById('execute-btn');
    execBtn.onclick=()=>this._onExecuteClicked();
    // Enemy info button
    document.getElementById('enemy-info-btn').onclick=()=>this._toggleInfoPopup();
  }

  // ─── PHASE MANAGEMENT ───
  _setPhase(phase) {
    this.phase=phase;
    const executing = phase==='executing';
    document.getElementById('execute-btn').disabled=executing;
    if(phase==='placement') {
      document.getElementById('phase-text').textContent='배치 단계 - 슬롯에 카드를 배치하세요';
      document.getElementById('execute-hint').textContent='카드 선택 후 슬롯을 클릭하거나 빈 슬롯에 자동 배치됩니다';
    } else if(phase==='executing') {
      document.getElementById('phase-text').textContent='⚡ 실행 중...';
    }
    this._renderHand();
    this._renderPlayerSlots();
  }

  // ─── LOGGING ───
  addLog(msg, type='') {
    const logEl=document.getElementById('battle-log');
    const entry=document.createElement('div');
    entry.className='log-entry fade-in'+(type?` log-${type}`:'');
    entry.textContent=msg;
    logEl.appendChild(entry);
    logEl.scrollTop=logEl.scrollHeight;
    // Limit to 80 entries
    while(logEl.children.length>80) logEl.removeChild(logEl.firstChild);
  }

  // ─── CARD SELECTION ───
  _onCardSelected(card) {
    if(this.phase!=='placement') return;
    if(this.selectedCard?.instanceId===card.instanceId) {
      this.selectedCard=null;
      this._renderHand();
      return;
    }
    this.selectedCard=card;
    this._renderHand();
    // Auto-place in first empty slot
    const maxSlots=this.senseActive?2:3;
    for(let i=0;i<maxSlots;i++) {
      if(!this.playerSlots[i]) { this._placeCard(card,i); return; }
    }
  }

  _placeCard(card, slotIdx) {
    if(this.phase!=='placement') return;
    const maxSlots=this.senseActive?2:3;
    if(slotIdx>=maxSlots) { this.addLog(`❌ 감지 효과: 슬롯 ${slotIdx+1} 사용 불가`,'system'); return; }
    if(this.playerSlots[slotIdx]) {
      const old=this.playerSlots[slotIdx];
      if(old.data.id==='sense') { this.senseActive=false; this._hideAllEnemySlots(); }
    }
    this.playerSlots[slotIdx]=card;
    this.selectedCard=null;
    this.addLog(`슬롯 ${slotIdx+1}: [${card.data.name}] 배치`,'player');
    // Handle special placement effects
    if(card.data.id==='sense') {
      this.senseActive=true;
      this._revealEnemySlot(0); this._revealEnemySlot(1); this._revealEnemySlot(2);
      this.addLog('🔍 [감지]: 적 3슬롯 전체 공개! (이번 턴 슬롯 2개 제한)','system');
      if(this.playerSlots[2]) {
        this.addLog('슬롯 3: 감지 효과로 제거됨','system');
        this.playerSlots[2]=null;
      }
    }
    if(card.data.id==='scout') {
      const nextIdx=slotIdx+1;
      if(nextIdx<3) {
        this._revealEnemySlot(nextIdx);
        this.addLog(`👁 [눈치보기]: 적 슬롯 ${nextIdx+1} 행동 공개!`,'system');
      }
    }
    this._renderHand();
    this._renderPlayerSlots();
    this._updateAffordability();
  }

  _onSlotClicked(slotIdx) {
    if(this.phase!=='placement') return;
    if(this.selectedCard) {
      this._placeCard(this.selectedCard,slotIdx);
    } else if(this.playerSlots[slotIdx]) {
      // Remove card from slot
      const removed=this.playerSlots[slotIdx];
      this.playerSlots[slotIdx]=null;
      if(removed.data.id==='sense') { this.senseActive=false; this._hideAllEnemySlots(); }
      this.addLog(`슬롯 ${slotIdx+1}: ${removed.data.name} 제거됨`,'system');
      this._renderPlayerSlots();
      this._renderHand();
      this._updateAffordability();
    }
  }

  // ─── ENEMY SLOT REVEAL ───
  _revealEnemySlot(idx) {
    this.enemySlotsRevealed[idx]=true;
    this._renderEnemySlot(idx);
  }
  _hideAllEnemySlots() {
    this.enemySlotsRevealed=[false,false,false];
    this._renderEnemySlots();
  }
  _renderEnemySlots() {
    for(let i=0;i<3;i++) this._renderEnemySlot(i);
  }
  _renderEnemySlot(idx) {
    const slot=document.getElementById(`enemy-slot-${idx}`);
    const action=this.enemy.intent[idx];
    const tel=this.enemy.telegraphs[idx];
    if(this.enemySlotsRevealed[idx]&&action) {
      slot.className='enemy-slot revealed';
      const isAttack=['attack_s','attack_l','special','attack_pierce'].includes(action.type);
      const isDef=action.type==='defend';
      const isRegen=action.type==='regenerate';
      slot.innerHTML=`<span class="slot-num">${idx+1}</span><span class="slot-action-name">${action.name}</span><span class="slot-action-desc">${action.desc}</span>${tel?`<span class="telegraph-text">${tel}</span>`:''}`;
      slot.style.borderColor=isAttack?'#cc2222':isDef?'#2244aa':isRegen?'#22aa44':'#555577';
    } else {
      slot.className='enemy-slot hidden';
      slot.innerHTML=`<span class="slot-num">${idx+1}</span><span style="font-size:22px;color:#333355">???</span>`;
    }
  }

  // ─── EXECUTE ───
  async _onExecuteClicked() {
    if(this.phase!=='executing') {
      const maxSlots=this.senseActive?2:3;
      const hasAny=this.playerSlots.slice(0,maxSlots).some(c=>c!==null);
      if(!hasAny) { this.addLog('❌ 슬롯에 카드를 배치하세요!','system'); return; }
      if(this.senseActive&&this.playerSlots[2]) {
        this.playerSlots[2]=null;
        this.addLog('🔍 감지 효과: 슬롯 3 제거됨','system');
      }
      await this._executeTurn();
    }
  }

  async _executeTurn() {
    this._setPhase('executing');

    // Piccolo regen passive (turn start)
    if(this.enemy.type==='boss'&&this.enemy.passives.includes('regenerate_passive')) {
      this.enemy.regeneratePassive();
      this.addLog('💚 [신진대사 재생] 피콜로 HP +1!','passive');
      this._updateHpBars();
    }

    // Reveal all enemy slots
    this._revealEnemySlot(0); this._revealEnemySlot(1); this._revealEnemySlot(2);
    await this._wait(500);

    this.gs_player_turnstart=true;
    gs.player.onTurnStart();

    // Execute slots 1→2→3
    for(let i=0;i<3;i++) {
      if(gs.player.isDead()||this.enemy.isDead()) break;
      this._setActiveSlot(i);
      await this._executeSlot(i);
      this._clearActiveSlot();
      this._updateAllUI();
      await this._wait(400);
    }

    this._checkBattleResult();
  }

  _setActiveSlot(idx) {
    for(let i=0;i<3;i++) {
      document.getElementById(`enemy-slot-${i}`).classList.toggle('active-slot',i===idx);
      document.getElementById(`player-slot-${i}`).classList.toggle('active-slot',i===idx);
    }
  }
  _clearActiveSlot() {
    for(let i=0;i<3;i++) {
      document.getElementById(`enemy-slot-${i}`).classList.remove('active-slot');
      document.getElementById(`player-slot-${i}`).classList.remove('active-slot');
    }
  }

  async _executeSlot(slotIdx) {
    const playerCard=this.playerSlots[slotIdx];
    const enemyAction=this.enemy.intent[slotIdx];

    this.addLog(`── 슬롯 ${slotIdx+1} ──`,'divider');

    gs.player.isBlocking=false; gs.player.isDodging=false;

    // Validate player card
    const kiShieldBon=this.kiShieldBonus;
    if(kiShieldBon>0) this.kiShieldBonus=0;

    let playerKiCost=0;
    let playerValid=false;
    let playerEffType='none';

    if(playerCard) {
      playerKiCost=Math.max(playerCard.data.kiCost>0?1:0, playerCard.data.kiCost-kiShieldBon);
      if(playerCard.usesLeft!==null&&playerCard.usesLeft<=0) {
        this.addLog(`❌ [${playerCard.data.name}]: 사용 횟수 소진 → 무효`,'system');
        await this._flashSlot(slotIdx,'red');
      } else if(!gs.player.hasKi(playerKiCost)) {
        this.addLog(`❌ [${playerCard.data.name}]: 기 부족 → 무효 (필요: ${playerKiCost})`,'system');
        await this._flashSlot(slotIdx,'red');
      } else {
        playerValid=true;
        playerEffType=playerCard.data.effect.type;
      }
    }

    const enemyKiCost=enemyAction.kiCost;
    let priority;
    if(playerKiCost>enemyKiCost) priority='player_first';
    else if(enemyKiCost>playerKiCost) priority='enemy_first';
    else priority='simultaneous';

    const isPlayerBlock=playerValid&&playerEffType==='block';
    const isPlayerDodge=playerValid&&playerEffType==='dodge';
    const isEnemyAttack=['attack_s','attack_l','special','attack_pierce'].includes(enemyAction.type);

    // Pre-set defensive state
    if(isPlayerBlock) gs.player.isBlocking=true;
    if(isPlayerDodge) gs.player.isDodging=true;

    // Handle reactive skills
    if(playerValid&&playerCard&&playerCard.data.isReactive) {
      await this._executeReactive(playerCard, slotIdx, enemyAction, playerKiCost);
      return;
    }

    // Dodge logic: only succeeds if player_first or simultaneous
    const dodgeSucceeds=isPlayerDodge&&isEnemyAttack&&(priority==='player_first'||priority==='simultaneous');

    if(priority==='player_first') {
      await this._doPlayerAction(playerCard, playerValid, playerEffType, slotIdx, enemyAction, playerKiCost);
      await this._doEnemyAction(enemyAction, slotIdx, playerEffType, playerValid, false);
    } else if(priority==='enemy_first') {
      await this._doEnemyAction(enemyAction, slotIdx, playerEffType, playerValid, false);
      const dodgeFail=isPlayerDodge&&isEnemyAttack; // dodge after enemy attack = fail
      await this._doPlayerAction(playerCard, playerValid&&!dodgeFail, playerEffType, slotIdx, enemyAction, playerKiCost);
    } else {
      await this._doSimultaneous(playerCard, playerValid, playerEffType, slotIdx, enemyAction, playerKiCost, dodgeSucceeds);
    }
  }

  async _executeReactive(card, slotIdx, enemyAction, actualKiCost) {
    const effectType=card.data.effect.type;
    const reactCond=card.data.reactCond;
    const enemyType=enemyAction.type;
    const isEnemyAttack=['attack_s','attack_l','special','attack_pierce'].includes(enemyType);
    const isEnemyKiGather=enemyType==='ki_gather';
    const isEnemyDefend=enemyType==='defend';

    let condMet=false;
    if(reactCond==='enemy_attack') condMet=isEnemyAttack;
    else if(reactCond==='enemy_ki_gather') condMet=isEnemyKiGather;
    else if(reactCond==='enemy_defend') condMet=isEnemyDefend;
    else if(reactCond==='enemy_energy_attack') condMet=isEnemyAttack;

    if(!gs.player.hasKi(actualKiCost)) {
      this.addLog(`❌ [${card.data.name}]: 기 부족 → 무효`,'system');
      await this._flashSlot(slotIdx,'red');
      await this._doEnemyAction(enemyAction,slotIdx,'none',false,false);
      return;
    }

    gs.player.spendKi(actualKiCost);
    if(card.usesLeft!==null) card.usesLeft-=1;
    this._updateKiDots();

    if(!condMet) {
      this.addLog(`⚪ [${card.data.name}]: 조건 불충족 → 효과 없음`,'system');
      await this._doEnemyAction(enemyAction,slotIdx,'none',false,false);
      return;
    }

    this.addLog(`⚡ [${card.data.name}]: 반응 발동!`,'player');

    switch(effectType) {
      case 'counter': {
        const enemyRes=this.enemy.executeAction(enemyAction);
        this._updateKiDots();
        if(!enemyRes.skipped&&enemyRes.damage>0) {
          const reduced=Math.max(0,enemyRes.damage-2);
          if(reduced>0) { const d=gs.player.takeDamage(reduced); gs.recordDamageTaken(d); this.addLog(`💥 적 ${enemyAction.name}: ${d} 피해 (경감 적용)`,'enemy'); }
          else this.addLog('🛡 카운터 자세로 피해 완전 경감!','player');
        }
        const ctrDmg=card.data.effect.value;
        const ctrActual=this.enemy.takeDamage(ctrDmg); gs.recordDamageDealt(ctrActual);
        this.addLog(`⚡ 반격: 적에게 ${ctrActual} 피해!`,'player');
        break;
      }
      case 'ki_block': {
        const blockAmt=card.data.effect.value;
        const eRes=this.enemy.executeAction(enemyAction); this._updateKiDots();
        if(!eRes.skipped&&eRes.kiGained>0) {
          const blk=Math.min(eRes.kiGained,blockAmt); this.enemy.stealKi(blk);
          this.addLog(`🔰 적 기 +${eRes.kiGained} → ${blk} 차단됨`,'player');
        }
        this.kiShieldBonus=1;
        this.addLog('🔰 다음 슬롯 기소모 -1 적용 예약','system');
        break;
      }
      case 'ambush': {
        const ambDmg=card.data.effect.value;
        this.enemy.executeAction(enemyAction); this._updateKiDots();
        const ambActual=this.enemy.takeDamage(ambDmg); gs.recordDamageDealt(ambActual);
        this.addLog(`⚔️ 관통 피해: 적에게 ${ambActual} 피해!`,'player');
        break;
      }
      case 'react_dodge': {
        const eRes=this.enemy.executeAction(enemyAction); this._updateKiDots();
        this.addLog(`💨 반응 순간이동: ${eRes.damage>0?`${eRes.damage}뎀 회피 성공!`:'회피!'}`, 'player');
        break;
      }
    }
  }

  async _doPlayerAction(card, valid, effType, slotIdx, enemyAction, kiCost) {
    if(!card||!valid) return;

    const isEnemyAttack=['attack_s','attack_l','special','attack_pierce'].includes(enemyAction.type);
    gs.player.spendKi(kiCost);
    if(card.usesLeft!==null) card.usesLeft-=1;
    this._updateKiDots();

    switch(effType) {
      case 'ki_gain': {
        const atMax=gs.player.ki>=gs.player.maxKi;
        if(atMax) {
          this.addLog('🔋 기 과부하! 기모으기 실패','system');
        } else {
          const gained=gs.player.gainKi(card.data.effect.value);
          this.addLog(`✨ [${card.data.name}]: 기 +${gained}`,'player');
          // Passive meditate
          if(isEnemyAttack) {
            if(this._hasPassive('passive_meditate')) {
              this.addLog('💥 [명상] 기모으기 중 피격 피해 +1!','passive');
              // This is handled in enemy action phase but flag it
            }
          } else {
            if(this._hasPassive('passive_meditate')) {
              gs.player.gainKi(1); this._updateKiDots();
              this.addLog('🧘 [명상] 기모으기 기 +1 추가!','passive');
            }
          }
          this._updateKiDots();
        }
        break;
      }
      case 'block': {
        gs.player.isBlocking=true;
        this.addLog(`🛡 [${card.data.name}]: 막기 준비!`,'player');
        // infinite_cloak passive
        if(this.enemy.type==='boss'&&this.enemy.passives.includes('infinite_cloak')) {
          this.enemy.addKi(1);
          this.addLog('🌀 [무한의 망토] 발동! 적 기+1','passive');
          this._updateKiDots();
        }
        // Parry passive - triggers if enemy is attacking
        if(isEnemyAttack&&this._hasPassive('passive_parry')) {
          gs.player.gainKi(1); this._updateKiDots();
          this.addLog('⚔️ [패링] 막기 성공! 기 +1','passive');
        }
        break;
      }
      case 'dodge': {
        gs.player.isDodging=true;
        if(isEnemyAttack) this.addLog(`💨 [${card.data.name}]: 선공 순간이동 → 적 공격 회피!`,'player');
        else this.addLog(`💨 [${card.data.name}]: 회피 준비!`,'player');
        break;
      }
      case 'damage': {
        await this._applyAttack(card, slotIdx, enemyAction);
        break;
      }
      case 'steal_ki': {
        const eAttacking=isEnemyAttack;
        if(eAttacking) {
          this.addLog(`❌ [${card.data.name}]: 공격받아 강탈 실패!`,'system');
        } else {
          const stolen=this.enemy.stealKi(card.data.effect.value);
          if(stolen>0) {
            gs.player.gainKi(stolen); this._updateKiDots();
            this.addLog(`💰 [${card.data.name}]: 적에게서 기 ${stolen} 강탈!`,'player');
            if(this.enemy.commandActive) { this.enemy.cancelCommand(); this.addLog('💰 강탈로 명령 무효화!','system'); }
          } else {
            this.addLog(`💰 [${card.data.name}]: 강탈했지만 적의 기가 없었다.`,'player');
          }
        }
        break;
      }
      case 'mark': {
        this.enemy.addMark(card.data.effect.value);
        this.addLog(`🎯 [${card.data.name}]: 적에게 표식 +${card.data.effect.value} (누적: ${this.enemy.mark})`,'player');
        break;
      }
      case 'swap_next': {
        const eAttacking=isEnemyAttack;
        if(eAttacking) {
          this.addLog(`❌ [${card.data.name}]: 공격받아 눈치보기 실패!`,'system');
        } else {
          const nextIdx=slotIdx+1;
          if(nextIdx<3) {
            this._revealEnemySlot(nextIdx);
            this.addLog(`👁 [눈치보기]: 적 슬롯 ${nextIdx+1} 공개!`,'player');
            if(this.playerSlots[nextIdx]) {
              this.addLog(`슬롯 ${nextIdx+1}: 교체 가능 (기존 카드 제거)`,'system');
              this.playerSlots[nextIdx]=null;
            }
          }
          if(this.enemy.commandActive) { this.enemy.cancelCommand(); this.addLog('👁 눈치보기로 명령 무효화!','system'); }
        }
        break;
      }
      case 'reveal_all': {
        this.addLog('🔍 [감지]: 적 전략 분석 완료','player');
        if(this.enemy.commandActive) { this.enemy.cancelCommand(); this.addLog('🔍 감지로 명령 무효화!','system'); }
        break;
      }
    }
    await this._flashSlot(slotIdx,'blue');
  }

  async _applyAttack(card, slotIdx, enemyAction) {
    const enemyIsDefend=enemyAction.type==='defend';
    const enemyIsRegen=enemyAction.type==='regenerate';
    const baseDmg=card.data.effect.value;
    const mark=this.enemy.consumeMark();
    const markMult=1+mark;
    let dmg=Math.floor(baseDmg*markMult);
    if(mark>0) this.addLog(`🎯 표식 ${mark}중첩! 데미지 ×${markMult}`,'player');

    // Regen cancel
    if(enemyIsRegen&&dmg>=3) {
      this.enemy.cancelRegeneration();
      this.addLog('⚡ 강한 공격으로 피콜로 재생 효과 무효화!','system');
    }

    if(enemyIsDefend&&!false/*bypassDefend*/) {
      this.addLog(`🛡 적이 막기로 [${card.data.name}]을 막았다!`,'enemy');
    } else {
      const actual=this.enemy.takeDamage(dmg); gs.recordDamageDealt(actual);
      this.addLog(`⚡ [${card.data.name}]: 적에게 ${actual} 피해!`,'player');
      // Consecutive attack passive
      if(this._hasPassive('passive_rapid')) {
        this.consecutiveAttackCount++;
        if(this.consecutiveAttackCount>1) {
          const bonus=this.consecutiveAttackCount-1;
          const bonusActual=this.enemy.takeDamage(bonus); gs.recordDamageDealt(bonusActual);
          this.addLog(`⚡ [연속파] 연속 공격 +${bonus} 추가 데미지!`,'passive');
        }
      } else {
        this.consecutiveAttackCount=0;
      }
    }
  }

  async _doEnemyAction(enemyAction, slotIdx, playerEffType, playerValid, alreadyDone) {
    const res=this.enemy.executeAction(enemyAction);
    if(res.skipped) { this.addLog(`❌ 적 [${enemyAction.name}]: 기 부족 → 무효`,'system'); return; }
    if(res.kiGained>0) { this.addLog(`⚡ 적 기모으기: +${res.kiGained}`,'enemy'); }
    this._updateKiDots();

    if(enemyAction.type==='regenerate') {
      if(this.enemy.regenerationCancelled) this.addLog('💔 [재생집중] 강한 공격으로 재생 무효화됨!','system');
      else this.addLog(`💚 [재생집중] 피콜로 HP +2 회복!`,'passive');
      this._updateHpBars(); return;
    }
    if(enemyAction.type==='command') {
      this.addLog(this.enemy.commandActive?'📢 [명령 하달] 다음 슬롯 공격에 관통 속성 부여!':'📢 [명령 하달] 명령이 무효화되었다!','enemy'); return;
    }

    if(['attack_s','attack_l','special','attack_pierce'].includes(enemyAction.type)&&res.damage>0) {
      const isPierce=enemyAction.type==='attack_pierce'&&this.enemy.commandActive;
      const playerBlocking=gs.player.isBlocking;
      const playerDodging=gs.player.isDodging;

      if(playerDodging) {
        this.addLog(`💨 순간이동으로 [${enemyAction.name}] 회피!`,'player');
        if(isPierce) this.enemy.cancelCommand();
      } else if(playerBlocking&&!isPierce) {
        this.addLog(`🛡 막기로 [${enemyAction.name}] 상쇄!`,'player');
      } else {
        if(isPierce&&playerBlocking) {
          this.addLog(`⚔️ [관통 공격] 막기를 무시하고 관통!`,'enemy');
          this.enemy.cancelCommand();
        }
        let finalDmg=res.damage;
        // Meditate penalty
        if(playerEffType==='ki_gain'&&playerValid&&this._hasPassive('passive_meditate')) finalDmg+=1;
        const actualDmg=gs.player.takeDamage(finalDmg); gs.recordDamageTaken(actualDmg);
        this.addLog(`💥 적 [${enemyAction.name}]: ${actualDmg} 피해!`,'enemy');
      }
      this._updateHpBars();
    }
  }

  async _doSimultaneous(playerCard, playerValid, effType, slotIdx, enemyAction, kiCost, playerDodgeSuccess) {
    const playerIsAttack=playerValid&&effType==='damage';
    const enemyIsAttack=['attack_s','attack_l','special','attack_pierce'].includes(enemyAction.type);

    if(playerIsAttack&&enemyIsAttack) {
      // Damage cancellation
      const mark=this.enemy.consumeMark();
      const markMult=1+mark;
      let playerDmg=Math.floor(playerCard.data.effect.value*markMult);
      if(mark>0) this.addLog(`🎯 표식 ${mark}중첩! ×${markMult}`,'player');
      const enemyDmg=enemyAction.damage||0;
      const netPlayerDmg=Math.max(0,playerDmg-enemyDmg);
      const netEnemyDmg=Math.max(0,enemyDmg-playerDmg);

      gs.player.spendKi(kiCost);
      if(playerCard.usesLeft!==null) playerCard.usesLeft-=1;
      const res=this.enemy.executeAction(enemyAction);
      this._updateKiDots();

      // Regen cancel check
      if(enemyAction.type==='regenerate'&&playerDmg>=3) this.enemy.cancelRegeneration();

      if(netPlayerDmg>0) {
        const actual=this.enemy.takeDamage(netPlayerDmg); gs.recordDamageDealt(actual);
        this.addLog(`⚡ [${playerCard.data.name}]: 상쇄 후 적에게 ${actual} 피해!`,'player');
      } else if(playerDmg>0) {
        this.addLog(`💥 동시 공격: 데미지 완전 상쇄! (플레이어 ${playerDmg} vs 적 ${enemyDmg})`,'system');
      }
      if(netEnemyDmg>0&&!gs.player.isDodging) {
        const actualDmg=gs.player.takeDamage(netEnemyDmg); gs.recordDamageTaken(actualDmg);
        this.addLog(`💥 상쇄 후 ${actualDmg} 피해 받음!`,'enemy');
      }
      this._updateHpBars();
    } else {
      await this._doPlayerAction(playerCard, playerValid, effType, slotIdx, enemyAction, kiCost);
      await this._doEnemyAction(enemyAction, slotIdx, effType, playerValid, false);
    }
  }

  // ─── BATTLE RESULT CHECK ───
  _checkBattleResult() {
    if(this.enemy.isDead()) {
      this.addLog(`🏆 ${this.enemy.name} 격파!`,'system');
      gs.completeCurrentFloor();
      setTimeout(()=>{ initRewardScreen(); },800);
    } else if(gs.player.isDead()) {
      this.addLog('💀 패배...','system');
      gs.endRun(false);
      setTimeout(()=>{ initResultScreen(); },1000);
    } else {
      // Next turn
      this.enemy.generateIntent();
      this._hideAllEnemySlots();
      this.playerSlots=[null,null,null];
      this.senseActive=false;
      this.consecutiveAttackCount=0;
      gs.player.onTurnStart();
      this._setPhase('placement');
      this.addLog('── 새 턴 ──','divider');
    }
  }

  // ─── PASSIVE HELPERS ───
  _hasPassive(id) {
    return gs.deck.getAllCards().some(c=>c.data.id===id);
  }

  // ─── UI UPDATES ───
  _updateAllUI() {
    this._updateHpBars();
    this._updateKiDots();
    this._renderPlayerSlots();
    this._renderHand();
    this._updateMarkDisplay();
  }

  _updateHpBars() {
    const p=gs.player; const e=this.enemy;
    document.getElementById('player-hp-fill').style.width=`${(p.hp/p.maxHp)*100}%`;
    document.getElementById('player-hp-text').textContent=`${p.hp}/${p.maxHp}`;
    document.getElementById('enemy-hp-fill').style.width=`${(e.hp/e.maxHp)*100}%`;
    document.getElementById('enemy-hp-text').textContent=`${e.hp}/${e.maxHp}`;
  }

  _updateKiDots() {
    const renderDots=(dotsEl, textEl, cur, max, isEnemy)=>{
      dotsEl.innerHTML='';
      for(let i=0;i<max;i++) {
        const d=document.createElement('div');
        d.className='ki-dot'+(i<cur?' filled'+(i===max-1&&cur===max?' max':''):'');
        dotsEl.appendChild(d);
      }
      textEl.textContent=`${cur}/${max}`;
    };
    renderDots(document.getElementById('player-ki-dots'),document.getElementById('player-ki-text'),gs.player.ki,gs.player.maxKi,false);
    renderDots(document.getElementById('enemy-ki-dots'),document.getElementById('enemy-ki-text'),this.enemy.ki,this.enemy.maxKi,true);
  }

  _updateMarkDisplay() {
    const markEl=document.getElementById('mark-display');
    if(this.enemy.mark>0) {
      markEl.style.display='inline'; markEl.textContent=`🎯 표식 ${this.enemy.mark}중첩`;
    } else {
      markEl.style.display='none';
    }
  }

  _renderPlayerSlots() {
    for(let i=0;i<3;i++) {
      const slot=document.getElementById(`player-slot-${i}`);
      const card=this.playerSlots[i];
      const maxSlots=this.senseActive?2:3;
      const isDisabled=i>=maxSlots&&this.senseActive;
      slot.className='player-slot'+(card?' occupied':'')+(isDisabled?' sense-disabled':'');
      if(isDisabled) {
        slot.innerHTML=`<span class="slot-num">${i+1}</span><span style="color:#333;font-size:12px">감지 제한</span>`;
      } else if(card) {
        const kiColor=card.data.kiCost===0?'var(--green)':card.data.kiCost<=2?'var(--yellow)':'var(--red)';
        slot.innerHTML=`<span class="slot-num">${i+1}</span><button class="remove-btn" onclick="battle._removeSlotCard(${i});event.stopPropagation()">✕</button><span class="slot-card-name">${card.data.name}</span><span class="slot-card-ki" style="color:${kiColor}">기 ${card.data.kiCost}</span><span class="slot-card-desc">${card.data.desc.replace(/\n/g,' ').substring(0,40)}</span>`;
      } else {
        slot.innerHTML=`<span class="slot-num">${i+1}</span><span class="slot-empty-text" style="color:#333">빈 슬롯</span>`;
      }
    }
  }

  _removeSlotCard(idx) {
    if(this.phase!=='placement') return;
    const card=this.playerSlots[idx];
    if(!card) return;
    this.playerSlots[idx]=null;
    if(card.data.id==='sense') { this.senseActive=false; this._hideAllEnemySlots(); }
    this.addLog(`슬롯 ${idx+1}: ${card.data.name} 제거됨`,'system');
    this._renderPlayerSlots(); this._renderHand(); this._updateAffordability();
  }

  _renderHand() {
    const handEl=document.getElementById('hand-cards');
    handEl.innerHTML='';
    const available=gs.deck.getAvailableCards();
    available.forEach(card=>{
      const el=document.createElement('div');
      const rar=card.data.rarity;
      const isSelected=this.selectedCard?.instanceId===card.instanceId;
      const insufficient=this.phase==='placement'&&!gs.player.hasKi(card.data.kiCost);
      el.className=`card ${rar}${isSelected?' selected':''}${insufficient?' insufficient':''}`;
      const kiColor=card.data.kiCost===0?'free':card.data.kiCost<=2?'cheap':'costly';
      const usesHtml=card.usesLeft!==null?`<div class="card-uses">${card.usesLeft}회 남음</div>`:'';
      const reactHtml=card.data.isReactive?`<div class="card-reactive-badge">반응</div>`:'';
      el.innerHTML=`
        <div class="card-ki-cost ${kiColor}">${card.data.kiCost}</div>
        <div class="card-name">${card.data.name}</div>
        <div class="card-rarity-bar"></div>
        <div class="card-desc">${card.data.desc.replace(/\n/g,'<br>')}</div>
        ${usesHtml}${reactHtml}
      `;
      if(this.phase==='placement') el.onclick=()=>this._onCardSelected(card);
      handEl.appendChild(el);
    });
    // Update deck info
    const allCards=gs.deck.getAllCards();
    document.getElementById('deck-info').textContent=`(덱 ${allCards.length}장)`;
  }

  _updateAffordability() {
    const cards=document.getElementById('hand-cards').querySelectorAll('.card');
    const available=gs.deck.getAvailableCards();
    available.forEach((card,i)=>{
      if(cards[i]) cards[i].classList.toggle('insufficient',!gs.player.hasKi(card.data.kiCost));
    });
  }

  _updatePassivePanel() {
    const passives=gs.deck.getPassiveCards();
    const panel=document.getElementById('passive-panel');
    if(passives.length===0) { panel.style.display='none'; return; }
    panel.style.display='inline-flex';
    panel.innerHTML='패시브: '+passives.map(c=>`<span class="passive-tag" id="ptag_${c.data.id}">${c.data.name.replace(' (패시브)','')}</span>`).join('');
    const regenInd=document.getElementById('regen-indicator');
    if(this.enemy.type==='boss'&&this.enemy.passives.includes('regenerate_passive')) regenInd.style.display='inline';
    else regenInd.style.display='none';
  }

  _initBattleUI() {
    const e=this.enemy;
    document.getElementById('enemy-name').textContent=e.name;
    const badge=document.getElementById('enemy-badge');
    badge.textContent={normal:'일반',elite:'엘리트',boss:'BOSS'}[e.type];
    badge.className='enemy-type-badge badge-'+e.type;
  }

  // ─── INFO POPUP ───
  _toggleInfoPopup() {
    if(this.infoPopupOpen) { this._closeInfoPopup(); return; }
    this.infoPopupOpen=true;
    const e=this.enemy;
    const popup=document.createElement('div');
    popup.className='info-popup fade-in';
    popup.id='enemy-info-popup';
    let html=`<button class="info-popup-close" onclick="battle._closeInfoPopup()">✕</button><div class="info-popup-title">📋 ${e.name}</div><div class="info-section"><div class="info-section-label">상태</div><div class="info-item">HP: ${e.hp} / ${e.maxHp} | 기: ${e.ki} / ${e.maxKi}</div></div>`;
    if(e.passives.length>0) {
      html+=`<div class="info-section"><div class="info-section-label">패시브</div>`;
      e.passives.forEach(pid=>{ const p=ENEMY_PASSIVES_DATA[pid]; if(p) html+=`<div class="info-item">• ${p.name}: ${p.desc}</div>`; });
      html+='</div>';
    }
    html+=`<div class="info-section"><div class="info-section-label">스킬</div>`;
    // Show intent
    e.intent.forEach((action,i)=>{ html+=`<div class="info-item">슬롯${i+1}: ${action.name} (기${action.kiCost}) - ${action.desc}</div>`; });
    html+='</div>';
    popup.innerHTML=html;
    document.body.appendChild(popup);
  }
  _closeInfoPopup() {
    this.infoPopupOpen=false;
    const p=document.getElementById('enemy-info-popup');
    if(p) p.remove();
  }

  // ─── HELPERS ───
  async _wait(ms) { return new Promise(r=>setTimeout(r,ms)); }
  async _flashSlot(idx, color) {
    const slot=document.getElementById(`player-slot-${idx}`);
    const cls=color==='red'?'flash-red':'active-slot';
    slot.classList.add(cls);
    await this._wait(300);
    slot.classList.remove(cls);
  }
}

// Override BattleGame.init to also call _initBattleUI + setup
const _origInit = BattleGame.prototype.init;
BattleGame.prototype.init = function() {
  // Clear log
  document.getElementById('battle-log').innerHTML='';
  // Clear player slots UI
  for(let i=0;i<3;i++) {
    const s=document.getElementById(`player-slot-${i}`);
    s.className='player-slot'; s.innerHTML=`<span class="slot-num">${i+1}</span><span class="slot-empty-text" style="color:#333">빈 슬롯</span>`;
  }
  _origInit.call(this);
  this._initBattleUI();
  this._updateAllUI();
  this._updatePassivePanel();
};

// ============================================================
// REWARD SCREEN
// ============================================================
function initRewardScreen() {
  showScreen('reward');
  const fl=gs.currentFloor;
  document.getElementById('reward-subtitle').textContent=`${fl}층 클리어! 카드 1개를 선택해 덱에 추가하세요`;

  // Pick 3 reward cards (exclude owned)
  const owned=new Set(gs.deck.getAllCards().map(c=>c.data.id));
  const pool=REWARD_POOL.filter(id=>!owned.has(id));
  const picks=[];
  const poolCopy=[...pool];
  for(let i=0;i<3&&poolCopy.length>0;i++) {
    const idx=Math.floor(Math.random()*poolCopy.length);
    picks.push(poolCopy.splice(idx,1)[0]);
  }

  const container=document.getElementById('reward-cards');
  container.innerHTML='';

  if(picks.length===0) {
    container.innerHTML='<div style="color:#666;font-size:16px;">모든 카드를 이미 보유하고 있습니다!</div>';
  } else {
    picks.forEach(cardId=>{
      const data=CARD_DB[cardId];
      const wrap=document.createElement('div');
      wrap.className='reward-card-wrap';
      const kiColor=data.kiCost===0?'var(--green)':data.kiCost<=2?'var(--yellow)':'var(--red)';
      const usesText=CARD_USE_LIMITS[cardId]?`사용 ${CARD_USE_LIMITS[cardId]}회`:'무제한';
      const cardEl=document.createElement('div');
      cardEl.className=`reward-card ${data.rarity}`;
      cardEl.innerHTML=`
        <div class="card-ki-cost" style="color:${kiColor}">${data.kiCost}</div>
        <div class="card-name">${data.name}</div>
        <div class="card-rarity-bar"></div>
        <div class="card-desc">${data.desc.replace(/\n/g,'<br>')}</div>
      `;
      cardEl.onclick=()=>_onRewardCardSelected(cardId, cardEl, container);
      const label=document.createElement('div');
      label.className='reward-effect-label';
      label.textContent=`${{'common':'일반','uncommon':'고급','rare':'희귀'}[data.rarity]} | ${usesText}`;
      wrap.appendChild(cardEl); wrap.appendChild(label);
      container.appendChild(wrap);
    });
  }

  document.getElementById('reward-skip-btn').onclick=()=>_proceedFromReward();
}

function _onRewardCardSelected(cardId, cardEl, container) {
  gs.addCardToDeck(cardId);
  container.querySelectorAll('.reward-card').forEach(c=>c.style.pointerEvents='none');
  const feedback=document.createElement('div');
  feedback.style.cssText='color:var(--green);font-size:18px;font-weight:bold;margin-top:20px;';
  feedback.textContent=`✅ ${CARD_DB[cardId].name}을 덱에 추가했습니다!`;
  container.parentElement.insertBefore(feedback,document.getElementById('reward-skip-btn'));
  setTimeout(_proceedFromReward, 1200);
}

function _proceedFromReward() {
  gs.advanceFloor();
  if(!gs.isRunActive) initResultScreen();
  else initMapScreen();
}

// ============================================================
// RESULT SCREEN
// ============================================================
function initResultScreen() {
  showScreen('result');
  const r=gs.runResult;
  if(!r) return;
  const titleEl=document.getElementById('result-title');
  const subtitleEl=document.getElementById('result-subtitle');
  const statsEl=document.getElementById('result-stats');

  if(r.won) {
    titleEl.textContent='🏆 런 클리어!'; titleEl.style.color='var(--yellow)';
    subtitleEl.textContent='피콜로를 쓰러뜨렸다!'; subtitleEl.style.color='var(--red)';
  } else {
    titleEl.textContent='💀 패배...'; titleEl.style.color='var(--red)';
    subtitleEl.textContent='다시 도전하라!'; subtitleEl.style.color='var(--text-dim)';
  }

  statsEl.innerHTML=`
    <div class="stat-row"><span class="stat-label">클리어한 층</span><span class="stat-value">${r.floorsCleared}층</span></div>
    <div class="stat-row"><span class="stat-label">준 피해 합계</span><span class="stat-value">${r.totalDamageDealt}</span></div>
    <div class="stat-row"><span class="stat-label">받은 피해 합계</span><span class="stat-value">${r.totalDamageTaken}</span></div>
  `;

  document.getElementById('result-restart-btn').onclick=()=>{
    gs=new GameState(); gs.startNewRun();
    battle=null;
    initMapScreen();
  };
}

// ============================================================
// INIT
// ============================================================
gs.startNewRun();
initMapScreen();
