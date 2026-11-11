/**
 * sfx.js - Authentic NES 8-bit sound effects
 */

import { APU } from './soundChip.js';

export const SFX = {
  // Jump: Fast upward frequency sweep
  jump() {
    APU.unlock();
    APU.playPulse({
      freq: 150,
      slideTo: 420,
      duration: 0.12,
      volume: 0.28
    });
  },

  // Hammer swing (whoosh)
  hammer() {
    APU.unlock();
    APU.playNoise({
      duration: 0.08,
      volume: 0.25,
      playbackRate: 0.8,
      filterFreq: 1200
    });
    APU.playPulse({
      freq: 180,
      slideTo: 90,
      duration: 0.08,
      volume: 0.2
    });
  },

  // Ice break: Crisp crunching noise burst + high tonal pop
  iceBreak() {
    APU.unlock();
    APU.playNoise({
      duration: 0.15,
      volume: 0.35,
      playbackRate: 1.4,
      filterFreq: 3200
    });
    APU.playPulse({
      freq: 520,
      slideTo: 120,
      duration: 0.1,
      volume: 0.25
    });
  },

  // Enemy hit (whack!)
  enemyHit() {
    APU.unlock();
    APU.playNoise({
      duration: 0.1,
      volume: 0.32,
      playbackRate: 0.6,
      filterFreq: 1800
    });
    APU.playTriangle({
      freq: 180,
      slideTo: 60,
      duration: 0.12,
      volume: 0.4
    });
  },

  // Enemy defeat: Classic descending arcade trill
  enemyDefeat() {
    APU.unlock();
    const notes = [440, 370, 311, 261];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        APU.playPulse({
          freq: freq,
          duration: 0.06,
          volume: 0.26
        });
      }, idx * 45);
    });
  },

  // Collectible pickup: High two-tone chime
  collectible() {
    APU.unlock();
    APU.playPulse({
      freq: 587.33, // D5
      duration: 0.08,
      volume: 0.28
    });
    setTimeout(() => {
      APU.playPulse({
        freq: 880, // A5
        duration: 0.16,
        volume: 0.32
      });
    }, 70);
  },

  // Damage / Hurt
  damage() {
    APU.unlock();
    APU.playNoise({
      duration: 0.18,
      volume: 0.4,
      playbackRate: 0.5
    });
    APU.playPulse({
      freq: 140,
      slideTo: 60,
      duration: 0.18,
      volume: 0.3
    });
  },

  // Death Jingle
  death() {
    APU.unlock();
    const deathNotes = [
      { f: 293.66, d: 0.12 }, // D4
      { f: 277.18, d: 0.12 }, // C#4
      { f: 261.63, d: 0.12 }, // C4
      { f: 246.94, d: 0.12 }, // B3
      { f: 220.00, d: 0.25 }, // A3
      { f: 196.00, d: 0.35 }  // G3
    ];
    let offset = 0;
    deathNotes.forEach(n => {
      setTimeout(() => {
        APU.playPulse({ freq: n.f, duration: n.d, volume: 0.32 });
        APU.playTriangle({ freq: n.f / 2, duration: n.d, volume: 0.4 });
      }, offset);
      offset += n.d * 1000 * 0.9;
    });
  },

  // Icicle warning rumble
  icicleWarn() {
    APU.unlock();
    APU.playPulse({
      freq: 800,
      duration: 0.04,
      volume: 0.15
    });
  },

  // Icicle smash
  icicleSmash() {
    APU.unlock();
    APU.playNoise({
      duration: 0.12,
      volume: 0.3,
      playbackRate: 2.0,
      filterFreq: 4000
    });
  },

  // Large Pursuer Stomp (Deep mountain shake)
  bearStomp() {
    APU.unlock();
    APU.playTriangle({
      freq: 85,
      slideTo: 35,
      duration: 0.3,
      volume: 0.55
    });
    APU.playNoise({
      duration: 0.2,
      volume: 0.4,
      playbackRate: 0.4,
      filterFreq: 800
    });
  },

  // Summit Eagle Catch: Majestic ascending arpeggio
  summitCatch() {
    APU.unlock();
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    fanfare.forEach((freq, idx) => {
      setTimeout(() => {
        APU.playPulse({
          freq: freq,
          duration: 0.14,
          volume: 0.35
        });
      }, idx * 60);
    });
  },

  // UI menu select / blip
  menuSelect() {
    APU.unlock();
    APU.playPulse({
      freq: 440,
      duration: 0.05,
      volume: 0.2
    });
  },

  // UI menu confirm
  menuConfirm() {
    APU.unlock();
    APU.playPulse({
      freq: 440,
      duration: 0.06,
      volume: 0.25
    });
    setTimeout(() => {
      APU.playPulse({
        freq: 659.25,
        duration: 0.1,
        volume: 0.28
      });
    }, 60);
  }
};
