/**
 * music.js - Original NES chiptune compositions & music sequencer
 */

import { APU } from './soundChip.js';

// Note frequency lookup table
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
  REST: 0
};

// Original Title Theme
const TITLE_TRACK = {
  bpm: 144,
  loop: true,
  lead: [
    N.C5, N.REST, N.E5, N.G5, N.A5, N.G5, N.E5, N.C5,
    N.D5, N.REST, N.F5, N.A5, N.G5, N.F5, N.D5, N.REST,
    N.E5, N.E5, N.G5, N.C6, N.B5, N.A5, N.G5, N.E5,
    N.D5, N.E5, N.F5, N.D5, N.C5, N.REST, N.G4, N.C5
  ],
  bass: [
    N.C3, N.G3, N.C3, N.G3, N.F3, N.C4, N.F3, N.C4,
    N.G3, N.D4, N.G3, N.D4, N.C3, N.G3, N.C3, N.G3,
    N.C3, N.G3, N.C3, N.G3, N.F3, N.C4, N.F3, N.C4,
    N.G3, N.G3, N.G3, N.G3, N.C3, N.REST, N.C3, N.C3
  ],
  drums: [
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'kick', 'snare', 'snare', 'kick', 'hat', 'kick', 'rest'
  ]
};

// Original Mountain Climbing Theme
const MOUNTAIN_TRACK = {
  bpm: 152,
  loop: true,
  lead: [
    N.E5, N.G5, N.C5, N.D5, N.E5, N.REST, N.E5, N.G5,
    N.A5, N.C6, N.A5, N.G5, N.E5, N.G5, N.D5, N.REST,
    N.F5, N.A5, N.D5, N.E5, N.F5, N.REST, N.F5, N.A5,
    N.B5, N.D6, N.B5, N.G5, N.C5, N.E5, N.C5, N.REST,
    N.G5, N.E5, N.C5, N.E5, N.G5, N.A5, N.G5, N.E5,
    N.A5, N.F5, N.D5, N.F5, N.A5, N.B5, N.A5, N.F5,
    N.G5, N.REST, N.G5, N.A5, N.B5, N.REST, N.B5, N.C6,
    N.C6, N.G5, N.E5, N.D5, N.C5, N.REST, N.REST, N.REST
  ],
  bass: [
    N.C3, N.C4, N.G3, N.C4, N.C3, N.C4, N.G3, N.C4,
    N.F3, N.F4, N.C4, N.F4, N.C3, N.C4, N.G3, N.C4,
    N.D3, N.D4, N.A3, N.D4, N.D3, N.D4, N.A3, N.D4,
    N.G3, N.G4, N.D4, N.G4, N.C3, N.G3, N.C3, N.REST,
    N.C3, N.G3, N.C3, N.G3, N.C3, N.G3, N.C3, N.G3,
    N.F3, N.C4, N.F3, N.C4, N.F3, N.C4, N.F3, N.C4,
    N.G3, N.D4, N.G3, N.D4, N.G3, N.D4, N.G3, N.D4,
    N.C3, N.G3, N.E3, N.G3, N.C3, N.REST, N.C3, N.REST
  ],
  drums: [
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'snare', 'kick', 'rest',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
    'kick', 'kick', 'snare', 'hat', 'kick', 'snare', 'kick', 'rest'
  ]
};

// Original Bonus Stage Theme (Frantic & Upbeat)
const BONUS_TRACK = {
  bpm: 180,
  loop: true,
  lead: [
    N.C5, N.E5, N.G5, N.C6, N.B5, N.G5, N.E5, N.C5,
    N.D5, N.F5, N.A5, N.D6, N.C6, N.A5, N.F5, N.D5,
    N.E5, N.G5, N.C6, N.E6, N.D6, N.B5, N.G5, N.F5,
    N.E5, N.C5, N.D5, N.B4, N.C5, N.REST, N.C5, N.REST
  ],
  bass: [
    N.C3, N.E3, N.G3, N.C3, N.D3, N.F3, N.A3, N.D3,
    N.E3, N.G3, N.C4, N.G3, N.C3, N.G3, N.C3, N.REST
  ],
  drums: [
    'kick', 'snare', 'kick', 'snare', 'kick', 'snare', 'kick', 'snare',
    'kick', 'snare', 'kick', 'snare', 'kick', 'snare', 'kick', 'snare'
  ]
};

// Victory Fanfare
const VICTORY_TRACK = {
  bpm: 150,
  loop: false,
  lead: [
    N.C5, N.E5, N.G5, N.C6, N.REST, N.G5, N.C6, N.REST,
    N.C6, N.C6, N.C6, N.C6, N.REST, N.REST, N.REST, N.REST
  ],
  bass: [
    N.C3, N.C3, N.G3, N.C4, N.REST, N.G3, N.C4, N.REST,
    N.C3, N.C3, N.C3, N.C3, N.REST, N.REST, N.REST, N.REST
  ],
  drums: [
    'kick', 'kick', 'snare', 'kick', 'rest', 'kick', 'snare', 'rest',
    'snare', 'snare', 'snare', 'kick', 'rest', 'rest', 'rest', 'rest'
  ]
};

// Game Over Jingle
const GAMEOVER_TRACK = {
  bpm: 110,
  loop: false,
  lead: [
    N.C5, N.B4, N.A4, N.G4, N.F4, N.E4, N.D4, N.REST,
    N.C4, N.REST, N.REST, N.REST
  ],
  bass: [
    N.C3, N.B2, N.A2, N.G2, N.F2, N.E2, N.D2, N.REST,
    N.C2, N.REST, N.REST, N.REST
  ],
  drums: [
    'kick', 'snare', 'kick', 'snare', 'kick', 'snare', 'kick', 'rest',
    'kick', 'rest', 'rest', 'rest'
  ]
};

class MusicPlayer {
  constructor() {
    this.currentTrack = null;
    this.trackName = null;
    this.stepIndex = 0;
    this.timerId = null;
    this.isPlaying = false;
  }

  play(trackName) {
    if (this.trackName === trackName && this.isPlaying) return;
    this.stop();

    let track = null;
    switch (trackName) {
      case 'title': track = TITLE_TRACK; break;
      case 'mountain': track = MOUNTAIN_TRACK; break;
      case 'bonus': track = BONUS_TRACK; break;
      case 'victory': track = VICTORY_TRACK; break;
      case 'gameover': track = GAMEOVER_TRACK; break;
      default: return;
    }

    this.currentTrack = track;
    this.trackName = trackName;
    this.stepIndex = 0;
    this.isPlaying = true;

    const stepInterval = (60 / track.bpm / 4) * 1000; // 16th notes
    this.timerId = setInterval(() => this.step(), stepInterval);
  }

  step() {
    if (!this.isPlaying || !this.currentTrack) return;
    APU.unlock();

    const track = this.currentTrack;
    const len = track.lead.length;

    if (this.stepIndex >= len) {
      if (track.loop) {
        this.stepIndex = 0;
      } else {
        this.stop();
        return;
      }
    }

    // Lead Pulse 1
    const leadFreq = track.lead[this.stepIndex];
    if (leadFreq && leadFreq > 0) {
      APU.playPulse({
        freq: leadFreq,
        duration: (60 / track.bpm / 4) * 0.85,
        volume: 0.22,
        attack: 0.003,
        decay: 0.06
      });
    }

    // Bass Triangle
    const bassLen = track.bass.length;
    const bassFreq = track.bass[this.stepIndex % bassLen];
    if (bassFreq && bassFreq > 0) {
      APU.playTriangle({
        freq: bassFreq,
        duration: (60 / track.bpm / 4) * 0.9,
        volume: 0.38
      });
    }

    // Noise Drums
    const drumLen = track.drums.length;
    const drum = track.drums[this.stepIndex % drumLen];
    if (drum === 'kick') {
      APU.playNoise({ duration: 0.06, volume: 0.35, playbackRate: 0.5, filterFreq: 300 });
      APU.playTriangle({ freq: 80, slideTo: 30, duration: 0.06, volume: 0.45 });
    } else if (drum === 'snare') {
      APU.playNoise({ duration: 0.08, volume: 0.25, playbackRate: 1.2, filterFreq: 2200 });
    } else if (drum === 'hat') {
      APU.playNoise({ duration: 0.03, volume: 0.12, playbackRate: 2.5, filterFreq: 5000 });
    }

    this.stepIndex++;
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
    this.currentTrack = null;
    this.trackName = null;
    this.stepIndex = 0;
  }
}

export const Music = new MusicPlayer();
