/**
 * SoundManager - Web Audio API 기반 절차적 사운드 생성
 * 외부 음원 파일 없이 즉시 사용 가능한 임시 사운드 시스템
 *
 * 4가지 핵심 상황:
 * 1. attackHit    - 플레이어 공격 성공 (강렬한 펀치음)
 * 2. kiGather     - 기 모으기 성공 (상승하는 에너지음)
 * 3. blockSuccess - 막기 성공 (금속성 클링음)
 * 4. kiInterrupt  - 기 모으다 공격당함 (끊기는 하강음)
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[SoundManager] Web Audio API 초기화 실패:', e);
      this.enabled = false;
    }
  }

  private resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** 플레이어 공격이 적에게 성공적으로 히트 */
  playAttackHit(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 노이즈 기반 펀치 임팩트
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.5);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    noiseFilter.Q.value = 1.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // 저음 임팩트 신호
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    // 연결
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.15);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** 기 모으기 성공 (에너지 충전 완료) */
  playKiGather(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 상승하는 에너지 톤 (두 오실레이터 화음)
    const freqs = [220, 330];
    freqs.forEach((baseFreq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 0.7, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.35);

      const gainNode = this.ctx!.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.45 - idx * 0.1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain!);

      osc.start(now + idx * 0.03);
      osc.stop(now + 0.5);
    });

    // 가볍게 반짝이는 고음 "팅"
    const tingOsc = this.ctx.createOscillator();
    tingOsc.type = 'triangle';
    tingOsc.frequency.setValueAtTime(1800, now + 0.2);
    tingOsc.frequency.exponentialRampToValueAtTime(2200, now + 0.4);

    const tingGain = this.ctx.createGain();
    tingGain.gain.setValueAtTime(0.25, now + 0.2);
    tingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    tingOsc.connect(tingGain);
    tingGain.connect(this.masterGain);

    tingOsc.start(now + 0.2);
    tingOsc.stop(now + 0.55);
  }

  /** 막기 성공 - 적 공격을 방어 (금속성 클링음) */
  playBlockSuccess(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 금속 충돌 노이즈
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 클링 톤 (금속 배음)
    const clingFreqs = [800, 1600, 2400];
    clingFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0.3 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25 - idx * 0.04);

      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.3);
    });

    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** 기 모으다 공격당함 - 집중 방해 (끊기는 하강음) */
  playKiInterrupt(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 하강하는 에너지 소실음
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // 저역 필터 (탁한 소리)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    // 임팩트 노이즈 (맞는 순간)
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 500;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.38);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** 적 공격 (플레이어 피해) - 무거운 둔탁음 */
  playEnemyHit(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.9, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    // 노이즈 레이어
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 600;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
    noise.start(now);
    noise.stop(now + 0.12);
  }
}
