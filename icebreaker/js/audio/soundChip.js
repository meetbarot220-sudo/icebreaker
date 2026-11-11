/**
 * soundChip.js - NES 2A03 APU emulator using Web Audio API
 * Provides 2 Pulse (Square) channels, 1 Triangle channel, and 1 Noise channel.
 */

export class SoundChip {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.4;
    this.isUnlocked = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Generate authentic 1-bit NES LFSR noise buffer
      this.generateNoiseBuffer();
      this.isUnlocked = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  unlock() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Pre-generate 1-second looping NES pseudo-random noise
  generateNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // 15-bit Galois LFSR as in NES APU
    let shiftReg = 1;
    for (let i = 0; i < bufferSize; i++) {
      // Feedback bit = bit 0 ^ bit 1 (or bit 6 for short mode)
      const feedback = (shiftReg & 1) ^ ((shiftReg >> 1) & 1);
      shiftReg = (shiftReg >> 1) | (feedback << 14);
      // NES noise is 1-bit output
      output[i] = (shiftReg & 1) ? 0.35 : -0.35;
    }
    this.noiseBuffer = buffer;
  }

  // Play a Pulse note (Square wave)
  playPulse({ freq = 440, duration = 0.1, duty = 'square', attack = 0.005, decay = 0.08, volume = 0.3, slideTo = null, vibrato = false }) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(freq * 0.03, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);
    }

    // Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Play a Triangle note (Bass)
  playTriangle({ freq = 110, duration = 0.15, volume = 0.45, slideTo = null }) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    // NES triangle channel has no volume envelope (it is on or off), but we soften click with 3ms ramp
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.setValueAtTime(volume, now + duration - 0.005);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Play Noise burst (Drums, hit, crash)
  playNoise({ duration = 0.1, volume = 0.35, playbackRate = 1.0, decay = true, filterFreq = null }) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.setValueAtTime(playbackRate, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);

    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else {
      gain.gain.setValueAtTime(volume, now + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);
    }

    let targetNode = gain;
    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.02);
  }
}

export const APU = new SoundChip();
