// src/soundSystem.js
// Система звукових ефектів для гри

/**
 * Простий синтезатор звуків за допомогою Web Audio API
 */
export class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = false;
    this.masterVolume = 0.3;

    // Ініціалізуємо при першій взаємодії користувача
    this.initPromise = null;
  }

  /**
   * Ініціалізація AudioContext (потрібна взаємодія користувача)
   */
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
        console.log('🔊 Sound system initialized');
        resolve();
      } catch (error) {
        console.warn('Sound system not available:', error);
        this.enabled = false;
        resolve();
      }
    });

    return this.initPromise;
  }

  /**
   * Відтворює звук зіткнення
   * @param {number} intensity - Інтенсивність (0-1)
   */
  playCollision(intensity = 0.5) {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Oscillator для удару
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Частота залежить від інтенсивності
    const frequency = 100 + intensity * 200;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    // Гучність
    const volume = Math.min(intensity * this.masterVolume * 0.3, 0.2);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.type = 'sine';
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Звук телепортації
   */
  playTeleport() {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Зростаючий тон
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.type = 'sine';
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Звук фінішу
   * @param {number} multiplier - Множник для визначення тону
   */
  playFinish(multiplier = 1) {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Акорд з кількох нот
    const frequencies = multiplier >= 5
      ? [523.25, 659.25, 783.99] // C major chord (високий приз)
      : [392.00, 493.88, 587.33]; // G major chord (звичайний)

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, now);

      const volume = this.masterVolume * 0.15;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.type = 'sine';
      osc.start(now + i * 0.05);
      osc.stop(now + 0.5);
    });
  }

  /**
   * Звук вентилятора (постійний шум)
   */
  playFanSound() {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // White noise для вентилятора
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  /**
   * Звук руйнування цегли
   */
  playBrickBreak() {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Різкий шум
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);
  }

  /**
   * Звук проходження через обертові кола
   */
  playRotatingCircle() {
    if (!this.enabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Модульована частота
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(250, now + 0.05);
    osc.frequency.setValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.type = 'triangle';
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Вмикає/вимикає звук
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Встановлює гучність (0-1)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Перевіряє чи ініціалізована система
   */
  isEnabled() {
    return this.enabled && this.audioContext !== null;
  }
}

/**
 * Глобальний інстанс звукової системи
 */
export const soundSystem = new SoundSystem();
