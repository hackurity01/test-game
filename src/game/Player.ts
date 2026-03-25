// 플레이어 상태 관리

/** 플레이어 상태 인터페이스 */
export interface PlayerState {
  maxHp: number;
  currentHp: number;
  maxKi: number;
  currentKi: number;
  isBlocking: boolean;  // 이번 슬롯에서 막기 상태
  isDodging: boolean;   // 이번 슬롯에서 회피 상태
  mark: number;         // 표식 중첩 수
}

/** 플레이어 클래스 */
export class Player {
  private state: PlayerState;

  constructor() {
    this.state = {
      maxHp: 20,
      currentHp: 10,
      maxKi: 5,
      currentKi: 0,
      isBlocking: false,
      isDodging: false,
      mark: 0,
    };
  }

  /** 기 획득 */
  gainKi(amount: number): number {
    const before = this.state.currentKi;
    this.state.currentKi = Math.min(this.state.maxKi, this.state.currentKi + amount);
    return this.state.currentKi - before;
  }

  /** 기 소모 - 성공 여부 반환 */
  spendKi(amount: number): boolean {
    if (this.state.currentKi < amount) return false;
    this.state.currentKi -= amount;
    return true;
  }

  /** 기 충분한지 확인 */
  hasEnoughKi(amount: number): boolean {
    return this.state.currentKi >= amount;
  }

  /** 막기 상태 설정 */
  setBlocking(value: boolean): void {
    this.state.isBlocking = value;
  }

  /** 회피 상태 설정 */
  setDodging(value: boolean): void {
    this.state.isDodging = value;
  }

  /** 표식 추가 */
  addMark(amount: number): void {
    this.state.mark = Math.max(0, this.state.mark + amount);
  }

  /** 표식 1 소비 - 현재 중첩 수 반환 */
  consumeMark(): number {
    const m = this.state.mark;
    if (m > 0) this.state.mark = Math.max(0, this.state.mark - 1);
    return m;
  }

  /** 피해 받기 - 실제로 받은 피해 반환 */
  takeDamage(amount: number): number {
    const actualDamage = Math.max(0, amount);
    this.state.currentHp = Math.max(0, this.state.currentHp - actualDamage);
    return actualDamage;
  }

  /** HP 회복 */
  heal(amount: number): void {
    this.state.currentHp = Math.min(this.state.maxHp, this.state.currentHp + amount);
  }

  /** 턴 시작 시 상태 초기화 */
  onTurnStart(): void {
    this.state.isBlocking = false;
    this.state.isDodging = false;
  }

  /** 사망 여부 */
  isDead(): boolean {
    return this.state.currentHp <= 0;
  }

  // === Getters ===
  get hp(): number { return this.state.currentHp; }
  get maxHp(): number { return this.state.maxHp; }
  get ki(): number { return this.state.currentKi; }
  get maxKi(): number { return this.state.maxKi; }
  get isBlocking(): boolean { return this.state.isBlocking; }
  get isDodging(): boolean { return this.state.isDodging; }
  get mark(): number { return this.state.mark; }

  /** 상태 스냅샷 반환 */
  getState(): Readonly<PlayerState> {
    return { ...this.state };
  }
}
