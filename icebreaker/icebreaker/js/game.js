/**
 * game.js - ICE BREAKER: PEAK CLIMBERS (Cross-Platform Cartoon Edition)
 * High-resolution 2D cartoon platformer engine with smooth rendering,
 * Mario-inspired cartoon hero, Duck ice-repair AI, Penguin chasers,
 * touch controls, Gamepad API, and responsive 19:6 / mobile layouts.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONFIGURATION & CONSTANTS
  // =========================================================================
  const CONFIG = {
    CANVAS_WIDTH: 1140,
    CANVAS_HEIGHT: 360,
    FPS: 60,
    FRAME_TIME: 1000 / 60,

    // Platform & Floor Geometry (Full 19:6 widescreen)
    BLOCK_WIDTH: 38,     // 30 blocks per floor = 1140px width
    BLOCK_HEIGHT: 14,
    TILES_X: 30,
    FLOOR_HEIGHT: 84,    // Broad spacious vertical clearance so you can clearly see him jump
    FLOORS_PER_MOUNTAIN: 8,
    TOTAL_FLOORS: 12,
    MOUNTAIN_HEIGHT: 1100,

    STARTING_LIVES: 3,

    SCORE: {
      BREAK_ICE: 100,
      DEFEAT_DUCK: 500,
      DEFEAT_DUCK_GOLDEN: 1000,
      DEFEAT_PENGUIN: 750,
      DEFEAT_BIRD: 500,
      COLLECT_VEGGIE_BASE: 500,
      REACH_SUMMIT: 10000,
      MOUNTAIN_CLEAR: 3000
    },

    PHYSICS: {
      GRAVITY: 0.28,
      MAX_FALL_SPEED: 6.8,
      WALK_ACCEL: 0.38,
      WALK_MAX_SPEED: 2.8,
      ICE_FRICTION: 0.94,
      GROUND_FRICTION: 0.86,
      JUMP_SPEED: -6.80, // Broad soaring jump arc (~82px height) clearly visible across 84px gaps
      AIR_STEER_ACCEL: 0.26,
      AIR_MAX_SPEED: 2.8,
      HEAD_BUMP_REBOUND: 0.8
    },

    TIMINGS: {
      HAMMER_COOLDOWN: 16,
      HAMMER_ACTIVE_FRAMES: 10,
      INVULNERABLE_FRAMES: 100,
      BONUS_STAGE_SECONDS: 45,
      BEAR_SPAWN_SECONDS: 26,
      ICICLE_WARN_FRAMES: 45,
      ICICLE_DROP_SPEED: 4.2,
      DUCK_REPAIR_BASE_DELAY_FRAMES: 50  // Fast responsive repair: ~0.8s reaction
    }
  };

  // =========================================================================
  // 2. MODERN CARTOON PALETTES & THEMES
  // =========================================================================
  const THEMES = [
    {
      name: 'Glacier Crest',
      skyTop: '#0a1638',
      skyBottom: '#42a5f5',
      mountainFar: '#1c2e56',
      mountainMid: '#28467e',
      mountainNear: '#3d6cb5',
      iceBase: '#26c6da',
      iceHighlight: '#e0f7fa',
      iceShadow: '#00838f',
      solidBase: '#1565c0',
      solidHighlight: '#90caf9',
      solidShadow: '#0d47a1',
      cloud: '#ffffff',
      cloudShadow: '#b0bec5'
    },
    {
      name: 'Crystal Cavern',
      skyTop: '#240046',
      skyBottom: '#7b2cbf',
      mountainFar: '#3c096c',
      mountainMid: '#5a189a',
      mountainNear: '#7b2cbf',
      iceBase: '#ba68c8',
      iceHighlight: '#f3e5f5',
      iceShadow: '#7b1fa2',
      solidBase: '#4a148c',
      solidHighlight: '#ce93d8',
      solidShadow: '#311b92',
      cloud: '#f8bbd0',
      cloudShadow: '#ad1457'
    },
    {
      name: 'Aurora Ridge',
      skyTop: '#002b36',
      skyBottom: '#00b4d8',
      mountainFar: '#023e8a',
      mountainMid: '#0077b6',
      mountainNear: '#0096c7',
      iceBase: '#48cae4',
      iceHighlight: '#caf0f8',
      iceShadow: '#03045e',
      solidBase: '#0077b6',
      solidHighlight: '#90e0ef',
      solidShadow: '#023e8a',
      cloud: '#e0f7fa',
      cloudShadow: '#80deea'
    },
    {
      name: 'Volcanic Peak',
      skyTop: '#1a0000',
      skyBottom: '#d84315',
      mountainFar: '#3e2723',
      mountainMid: '#5d4037',
      mountainNear: '#8d6e63',
      iceBase: '#ff8a65',
      iceHighlight: '#fbe9e7',
      iceShadow: '#bf360c',
      solidBase: '#4e342e',
      solidHighlight: '#bcaaa4',
      solidShadow: '#271915',
      cloud: '#ffebee',
      cloudShadow: '#ffcdd2'
    }
  ];

  // Helper: Axis-Aligned Bounding Box Intersect
  function aabbIntersect(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  // =========================================================================
  // 3. SOUND SYNTHESIZER (WEB AUDIO API)
  // =========================================================================
  class SoundChip {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
      this.muted = false;
      this.volume = 0.65;
      this.unlocked = false;
      this.init();
    }

    init() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.createNoiseBuffer();
      } catch (e) {
        console.warn("Web Audio init postponed:", e);
      }
    }

    createNoiseBuffer() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    unlock() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      }
      return this.muted;
    }

    playTone({ freq = 440, type = 'square', duration = 0.1, attack = 0.005, decay = 0.08, volume = 0.3, slideTo = null }) {
      if (!this.ctx || this.muted || !this.unlocked) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playNoise({ duration = 0.1, volume = 0.35, playbackRate = 1.0, filterFreq = null }) {
      if (!this.ctx || this.muted || !this.noiseBuffer || !this.unlocked) return;
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.playbackRate.setValueAtTime(playbackRate, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

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

  const APU = new SoundChip();

  const SFX = {
    shinchanStart() {
      APU.unlock();
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        setTimeout(() => APU.playTone({ freq, duration: 0.14, volume: 0.32, type: 'triangle' }), idx * 70);
        setTimeout(() => APU.playTone({ freq: freq * 0.5, duration: 0.12, volume: 0.2, type: 'square' }), idx * 70);
      });
    },
    footstep() {
      if (!APU.unlocked) return;
      APU.playNoise({ duration: 0.032, volume: 0.075, playbackRate: 1.9, filterFreq: 1850 });
    },
    sockSwing() {
      APU.unlock();
      APU.playNoise({ duration: 0.12, volume: 0.28, playbackRate: 1.4, filterFreq: 2800 });
      APU.playTone({ freq: 380, slideTo: 160, duration: 0.1, volume: 0.22, type: 'sine' });
    },
    electricShock() {
      APU.unlock();
      [0, 25, 50, 75].forEach(delay => {
        setTimeout(() => {
          APU.playNoise({ duration: 0.05, volume: 0.35, playbackRate: 2.2, filterFreq: 4200 });
          APU.playTone({ freq: 720 + Math.random() * 200, slideTo: 220, duration: 0.06, volume: 0.35, type: 'sawtooth' });
        }, delay);
      });
    },
    jump() {
      APU.unlock();
      APU.playTone({ freq: 160, slideTo: 480, duration: 0.14, volume: 0.28, type: 'triangle' });
      APU.playTone({ freq: 220, slideTo: 520, duration: 0.12, volume: 0.18, type: 'square' });
    },
    hammer() {
      this.sockSwing();
      this.electricShock();
    },
    iceBreak() {
      APU.unlock();
      APU.playNoise({ duration: 0.2, volume: 0.45, playbackRate: 1.6, filterFreq: 4500 });
      APU.playTone({ freq: 650, slideTo: 140, duration: 0.12, volume: 0.3, type: 'triangle' });
    },
    rumble() {
      APU.unlock();
      APU.playNoise({ duration: 0.35, volume: 0.28, playbackRate: 0.55, filterFreq: 700 });
      APU.playTone({ freq: 95, slideTo: 45, duration: 0.28, volume: 0.3, type: 'triangle' });
    },
    icePlace() {
      // Ice repair completely removed per user request
    },
    enemyHit() {
      APU.unlock();
      APU.playNoise({ duration: 0.12, volume: 0.35, playbackRate: 0.7, filterFreq: 1600 });
      APU.playTone({ freq: 240, slideTo: 60, duration: 0.15, volume: 0.4, type: 'square' });
    },
    quack() {
      APU.unlock();
      APU.playTone({ freq: 380, slideTo: 280, duration: 0.12, volume: 0.3, type: 'sawtooth' });
      setTimeout(() => {
        APU.playTone({ freq: 360, slideTo: 260, duration: 0.1, volume: 0.25, type: 'sawtooth' });
      }, 70);
    },
    slide() {
      APU.unlock();
      APU.playNoise({ duration: 0.25, volume: 0.2, playbackRate: 1.8, filterFreq: 3000 });
    },
    stomp() {
      APU.unlock();
      APU.playNoise({ duration: 0.12, volume: 0.45, playbackRate: 1.2, filterFreq: 1200 });
      APU.playTone({ freq: 220, slideTo: 580, duration: 0.18, volume: 0.38, type: 'triangle' });
    },
    enemyDefeat() {
      APU.unlock();
      [520, 440, 350, 260].forEach((freq, idx) => {
        setTimeout(() => APU.playTone({ freq, duration: 0.08, volume: 0.28, type: 'square' }), idx * 50);
      });
    },
    collectible() {
      APU.unlock();
      APU.playTone({ freq: 659.25, duration: 0.08, volume: 0.3, type: 'triangle' });
      setTimeout(() => APU.playTone({ freq: 987.77, duration: 0.18, volume: 0.35, type: 'triangle' }), 70);
    },
    damage() {
      APU.unlock();
      APU.playNoise({ duration: 0.25, volume: 0.5, playbackRate: 0.6, filterFreq: 800 });
      APU.playTone({ freq: 120, slideTo: 40, duration: 0.2, volume: 0.45, type: 'sawtooth' });
    },
    death() {
      APU.unlock();
      [300, 250, 200, 150, 100].forEach((freq, idx) => {
        setTimeout(() => APU.playTone({ freq, duration: 0.12, volume: 0.35, type: 'sawtooth' }), idx * 70);
      });
    },
    menuSelect() {
      APU.unlock();
      APU.playTone({ freq: 440, duration: 0.06, volume: 0.2, type: 'sine' });
    },
    menuConfirm() {
      APU.unlock();
      APU.playTone({ freq: 523.25, duration: 0.08, volume: 0.25, type: 'triangle' });
      setTimeout(() => APU.playTone({ freq: 783.99, duration: 0.14, volume: 0.3, type: 'triangle' }), 60);
    },
    doorOpen() {
      APU.unlock();
      [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
        setTimeout(() => APU.playTone({ freq, duration: 0.16, volume: 0.28, type: 'triangle' }), idx * 60);
      });
      APU.playNoise({ duration: 0.35, volume: 0.16, playbackRate: 2.2, filterFreq: 5000 });
    },
    stageClear() {
      APU.unlock();
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => APU.playTone({ freq, duration: 0.22, volume: 0.32, type: 'triangle' }), idx * 110);
      });
    },
    duckHop() {
      APU.unlock();
      APU.playTone({ freq: 320, slideTo: 480, duration: 0.09, volume: 0.2, type: 'triangle' });
    }
  };

  // Background Music Synthesizer
  class MusicSequencer {
    constructor() {
      this.timer = null;
      this.step = 0;
      this.currentTrack = null;
      this.isPlaying = false;
    }

    play(track) {
      this.stop();
      this.currentTrack = track;
      this.step = 0;
      this.isPlaying = true;
      this.tick();
    }

    stop() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.isPlaying = false;
    }

    tick() {
      if (!this.isPlaying) return;
      APU.unlock();

      if (this.currentTrack === 'mountain') {
        const bassLine = [130.81, 130.81, 164.81, 196.00, 146.83, 146.83, 174.61, 220.00];
        const melody = [523.25, 0, 587.33, 659.25, 0, 523.25, 659.25, 783.99];
        const idx = this.step % 8;

        if (bassLine[idx] > 0) {
          APU.playTone({ freq: bassLine[idx], duration: 0.12, volume: 0.14, type: 'triangle' });
        }
        if (melody[idx] > 0) {
          APU.playTone({ freq: melody[idx], duration: 0.10, volume: 0.12, type: 'square' });
        }
        this.step++;
        this.timer = setTimeout(() => this.tick(), 140);

      } else if (this.currentTrack === 'bonus') {
        const melody = [659.25, 783.99, 880.00, 987.77, 1046.50, 987.77, 880.00, 783.99];
        const idx = this.step % 8;
        APU.playTone({ freq: melody[idx], duration: 0.08, volume: 0.15, type: 'triangle' });
        this.step++;
        this.timer = setTimeout(() => this.tick(), 105);

      } else if (this.currentTrack === 'victory') {
        const fanfare = [523.25, 659.25, 783.99, 1046.50];
        fanfare.forEach((f, i) => {
          setTimeout(() => APU.playTone({ freq: f, duration: 0.25, volume: 0.3, type: 'triangle' }), i * 110);
        });
        this.isPlaying = false;

      } else if (this.currentTrack === 'gameover') {
        const sad = [392.00, 369.99, 349.23, 311.13];
        sad.forEach((f, i) => {
          setTimeout(() => APU.playTone({ freq: f, duration: 0.3, volume: 0.3, type: 'sawtooth' }), i * 180);
        });
        this.isPlaying = false;
      }
    }
  }

  const Music = new MusicSequencer();

  // =========================================================================
  // 4. PARTICLE EFFECTS & ENVIRONMENTAL PARTICLES (OPTIMIZED OBJECT POOL)
  // =========================================================================
  class ParticleSystem {
    constructor() {
      // Pre-allocated object pools (zero per-frame GC allocations)
      this.maxParticles = 120;
      this.particles = new Array(this.maxParticles).fill(null).map(() => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#ffffff',
        radius: 2,
        life: 0,
        maxLife: 30
      }));

      this.maxShards = 48;
      this.iceShards = new Array(this.maxShards).fill(null).map(() => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        rotSpeed: 0,
        size: 5,
        color: '#e0f7fa',
        life: 0,
        gravity: 0.24
      }));

      this.maxPopups = 10;
      this.popups = new Array(this.maxPopups).fill(null).map(() => ({
        active: false,
        x: 0,
        y: 0,
        text: '',
        vy: -1.2,
        life: 0,
        maxLife: 45
      }));

      this.snowflakes = [];
      this.initSnow();
    }

    initSnow() {
      this.snowflakes = [];
      for (let i = 0; i < 40; i++) {
        this.snowflakes.push({
          x: Math.random() * CONFIG.CANVAS_WIDTH,
          y: Math.random() * CONFIG.CANVAS_HEIGHT,
          radius: 1.2 + Math.random() * 2.0,
          speed: 0.4 + Math.random() * 0.7,
          drift: (Math.random() - 0.5) * 0.35,
          alpha: 0.3 + Math.random() * 0.5
        });
      }
    }

    reset() {
      for (const p of this.particles) p.active = false;
      for (const s of this.iceShards) s.active = false;
      for (const pop of this.popups) pop.active = false;
    }

    // Ice Block Shatter (Polygonal crystal fragments)
    spawnIceShatter(x, y, w = 38, h = 14) {
      const colors = ['#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#ffffff'];
      let count = 0;
      for (const s of this.iceShards) {
        if (!s.active) {
          s.active = true;
          s.x = x + Math.random() * w;
          s.y = y + Math.random() * h;
          s.vx = (Math.random() - 0.5) * 4.8;
          s.vy = -Math.random() * 3.8 - 1.2;
          s.rot = Math.random() * Math.PI * 2;
          s.rotSpeed = (Math.random() - 0.5) * 0.25;
          s.size = 4 + Math.random() * 5;
          s.color = colors[Math.floor(Math.random() * colors.length)];
          s.life = 25 + Math.floor(Math.random() * 12);
          s.gravity = 0.22;
          count++;
          if (count >= 6) break;
        }
      }
    }

    // Ice Block Repair Placement Sparkles - REMOVED
    spawnIceRepairParticles(x, y) {
      // Completely removed per user request
    }

    spawnDuckFeathers(x, y) {
      const colors = ['#2e7d32', '#ff9800', '#ffffff', '#8d5b2d'];
      let count = 0;
      for (const p of this.particles) {
        if (!p.active) {
          p.active = true;
          p.x = x + 16;
          p.y = y + 16;
          p.vx = (Math.random() - 0.5) * 3.8;
          p.vy = -Math.random() * 2.8 - 1.0;
          p.color = colors[Math.floor(Math.random() * colors.length)];
          p.radius = 3 + Math.random() * 2;
          p.life = 22;
          p.maxLife = 22;
          count++;
          if (count >= 5) break;
        }
      }
    }

    spawnStompImpact(x, y) {
      const colors = ['#fff176', '#ffffff', '#00e5ff', '#ffeb3b', '#ffd54f'];
      let count = 0;
      for (const p of this.particles) {
        if (!p.active) {
          p.active = true;
          p.x = x + (Math.random() - 0.5) * 16;
          p.y = y;
          const angle = (Math.PI * 2 * count) / 8;
          p.vx = Math.cos(angle) * (3.0 + Math.random() * 1.5);
          p.vy = -Math.abs(Math.sin(angle)) * 2.8 - 0.8;
          p.color = colors[count % colors.length];
          p.radius = 2.5 + Math.random() * 2.0;
          p.life = 18;
          p.maxLife = 18;
          count++;
          if (count >= 8) break;
        }
      }
    }

    spawnSlideSpray(x, y, dir) {
      for (const p of this.particles) {
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = -dir * (1.2 + Math.random());
          p.vy = -0.8 - Math.random() * 1.2;
          p.color = '#e0f7fa';
          p.radius = 1.8;
          p.life = 12;
          p.maxLife = 12;
          break;
        }
      }
    }

    spawnElectricSparks(x, y, count = 10) {
      const colors = ['#00e5ff', '#ffea00', '#ffffff', '#76ff03', '#40c4ff'];
      let spawned = 0;
      for (const p of this.particles) {
        if (!p.active) {
          p.active = true;
          p.x = x + (Math.random() - 0.5) * 16;
          p.y = y + (Math.random() - 0.5) * 16;
          p.vx = (Math.random() - 0.5) * 6.5;
          p.vy = (Math.random() - 0.5) * 6.5 - 1.2;
          p.color = colors[Math.floor(Math.random() * colors.length)];
          p.radius = 2.5 + Math.random() * 2.5;
          p.life = 18 + Math.floor(Math.random() * 10);
          p.maxLife = 28;
          spawned++;
          if (spawned >= count) break;
        }
      }
    }

    spawnScorePopup(x, y, text) {
      for (const pop of this.popups) {
        if (!pop.active) {
          pop.active = true;
          pop.x = x;
          pop.y = y;
          pop.text = text;
          pop.vy = -1.2;
          pop.life = 45;
          pop.maxLife = 45;
          break;
        }
      }
    }

    update() {
      // Snowflakes
      for (const s of this.snowflakes) {
        s.y += s.speed;
        s.x += s.drift;
        if (s.y > CONFIG.CANVAS_HEIGHT) {
          s.y = -5;
          s.x = Math.random() * CONFIG.CANVAS_WIDTH;
        }
        if (s.x < 0) s.x = CONFIG.CANVAS_WIDTH;
        if (s.x > CONFIG.CANVAS_WIDTH) s.x = 0;
      }

      // Ice Shards
      for (const shard of this.iceShards) {
        if (!shard.active) continue;
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += shard.gravity;
        shard.rot += shard.rotSpeed;
        shard.life--;
        if (shard.life <= 0) shard.active = false;
      }

      // Particles
      for (const p of this.particles) {
        if (!p.active) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) p.active = false;
      }

      // Popups
      for (const pop of this.popups) {
        if (!pop.active) continue;
        pop.y += pop.vy;
        pop.life--;
        if (pop.life <= 0) pop.active = false;
      }
    }

    draw(ctx, cameraY) {
      // Snow (Screen-relative)
      for (const s of this.snowflakes) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ice Shards (World-relative)
      for (const shard of this.iceShards) {
        if (!shard.active) continue;
        const screenY = shard.y - cameraY;
        if (screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) continue;
        ctx.save();
        ctx.translate(shard.x, screenY);
        ctx.rotate(shard.rot);
        ctx.fillStyle = shard.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-shard.size / 2, -shard.size / 2);
        ctx.lineTo(shard.size / 2, -shard.size / 3);
        ctx.lineTo(shard.size / 3, shard.size / 2);
        ctx.lineTo(-shard.size / 3, shard.size / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Particles (World-relative)
      for (const p of this.particles) {
        if (!p.active) continue;
        const screenY = p.y - cameraY;
        if (screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, screenY, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Popups (World-relative)
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      for (const pop of this.popups) {
        if (!pop.active) continue;
        const screenY = pop.y - cameraY;
        const alpha = Math.max(0, pop.life / pop.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffd54f';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.strokeText(pop.text, pop.x, screenY);
        ctx.fillText(pop.text, pop.x, screenY);
        ctx.restore();
      }
    }
  }

  // =========================================================================
  // 5. CARTOON ARTIST (PROCEDURAL 2D VECTOR RENDERING)
  // =========================================================================
  class CartoonArtist {
    // 1. Draw Redesigned Shinchan Cartoon Hero (Normal Platformer Animation & Authentic Reference Look)
    static drawShinchan(ctx, p, screenY) {
      ctx.save();
      const centerX = p.x + p.width / 2;
      const groundY = screenY + p.height;
      ctx.translate(centerX, groundY);

      // Mirror cleanly horizontally when facing left (-1)
      if (p.facing < 0 && p.state !== 'victory') {
        ctx.scale(-1, 1);
      }

      // Animation state & smooth continuous blend weights (0..1)
      const isSwinging = !!p.isSwinging || p.state === 'swing';
      const isHurt = (p.state === 'hurt') || (p.state === 'dead' && p.deathTimer > 68);
      const isDeadFall = (p.state === 'dead' && p.deathTimer <= 68);

      const mw = (p.moveWeight !== undefined) ? p.moveWeight : ((p.state === 'walk' || p.state === 'run') ? 1.0 : 0.0);
      const rw = (p.runWeight !== undefined) ? p.runWeight : (p.state === 'run' ? 1.0 : 0.0);
      const jw = (p.jumpWeight !== undefined) ? p.jumpWeight : (p.state === 'jump' ? 1.0 : 0.0);
      const fw = (p.fallWeight !== undefined) ? p.fallWeight : (p.state === 'fall' ? 1.0 : 0.0);
      const lw = (p.landWeight !== undefined) ? p.landWeight : (p.state === 'land' ? 1.0 : 0.0);
      const sw = (p.swingWeight !== undefined) ? p.swingWeight : (isSwinging ? 1.0 : 0.0);
      const airW = Math.min(1.0, jw + fw);

      const phase = (p.walkPhase !== undefined) ? p.walkPhase : 0;
      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);

      // Gentle idle breathing + subtle natural vertical step bounce
      const idleBreath = Math.sin(p.animTimer * 0.075) * 0.55 * (1.0 - mw) * (1.0 - airW);
      const stepBob = -Math.abs(sinP) * mw * (1.1 + rw * 1.1) * (1.0 - airW);
      const headBumpSquash = (p.headBumpTimer && p.headBumpTimer > 0) ? -2.2 : 0;
      const landDrop = lw * 2.6;
      const bodyBob = idleBreath + stepBob + landDrop + headBumpSquash;

      // Forward body lean when running; slight backward lean when hurt/falling defeated
      let bodyLean = (mw * (0.02 + rw * 0.11) * (1.0 - airW)) + (-0.06 * jw) + (0.06 * fw);
      if (isHurt) bodyLean = -0.22;
      if (isDeadFall) bodyLean = -0.35;

      // Crisp landing squash & stretch
      if (lw > 0.01) {
        ctx.scale(1.0 + lw * 0.08, 1.0 - lw * 0.08);
      }

      // Consistent palette matching Shinchan reference
      const outline = '#231411';
      const skinLight = '#ffe3ca';
      const skinBase = '#fed3b1';
      const skinShadow = '#e7ad86';
      const skinBack = '#efbe9b';
      const shirtLight = '#ff5252';
      const shirtBase = '#e53935';
      const shirtDark = '#b71c1c';
      const shortsLight = '#fff066';
      const shortsBase = '#fdd835';
      const shortsDark = '#f5a623';
      const sockWhite = '#ffffff';
      const sockShadow = '#dfe6ea';
      const shoeBase = '#d32f2f';
      const shoeDark = '#8e1414';
      const shoeHighlight = '#ff6b6b';

      // --- 1. GROUND DROP SHADOW ---
      const shadowScale = isDeadFall ? 0 : (1.0 - airW * 0.35);
      if (shadowScale > 0.05) {
        ctx.fillStyle = 'rgba(0, 14, 38, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12.5 * shadowScale, 3.6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Helper for connected toddler leg + bare knee + white crew sock + red shoe
      const drawLeg = (hipX, hipY, footX, footY, toeTilt, isBack) => {
        ctx.save();
        // Bare toddler upper calf/knee segment connecting shorts cuff to white sock
        ctx.strokeStyle = outline;
        ctx.lineWidth = 4.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(footX, footY - 5.2);
        ctx.stroke();

        ctx.strokeStyle = isBack ? skinBack : skinBase;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(footX, footY - 5.2);
        ctx.stroke();

        // Pivoted ankle / white sock + red cartoon shoe
        ctx.translate(footX, footY - 3.0);
        ctx.rotate(toeTilt);

        // White crew sock
        ctx.fillStyle = isBack ? sockShadow : sockWhite;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(-3.0, -4.6, 6.0, 5.2, 1.8);
        ctx.fill();
        ctx.stroke();

        // Rounded Red Shoe
        ctx.fillStyle = isBack ? '#b71c1c' : shoeBase;
        ctx.beginPath();
        ctx.roundRect(-4.0, -0.8, 9.2, 4.2, [2.2, 3.6, 1.5, 1.5]);
        ctx.fill();
        ctx.stroke();

        // Glossy toe cap highlight
        if (!isBack) {
          ctx.fillStyle = shoeHighlight;
          ctx.beginPath();
          ctx.ellipse(2.2, 0.5, 2.0, 0.9, 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dark shoe sole
        ctx.fillStyle = shoeDark;
        ctx.fillRect(-3.6, 2.3, 8.4, 1.2);
        ctx.restore();
      };

      // --- 2. ARTICULATED LEGS KINEMATICS (NO SLIDING / CLEAN STRIDE CYCLE) ---
      const strideAmp = mw * (5.2 + rw * 2.8) * (1.0 - airW);
      const liftAmp = mw * (3.8 + rw * 2.2) * (1.0 - airW);

      // Walk/Run grounded foot positions (back leg = phase + PI, front leg = phase)
      const gBackX = -4.2 - sinP * strideAmp;
      const gBackY = -Math.max(0, -cosP) * liftAmp - lw * 0.5;
      const gBackTilt = -cosP * mw * (0.22 + rw * 0.18) * (1.0 - airW);

      const gFrontX = 4.2 + sinP * strideAmp;
      const gFrontY = -Math.max(0, cosP) * liftAmp - lw * 0.5;
      const gFrontTilt = cosP * mw * (0.22 + rw * 0.18) * (1.0 - airW);

      // Jump / Fall / Hurt blended leg poses
      const jBackX = -5.0, jBackY = -2.2, jBackTilt = 0.36;
      const jFrontX = 5.4, jFrontY = -5.8, jFrontTilt = -0.32;

      const fBackX = -5.5, fBackY = -3.4, fBackTilt = 0.25;
      const fFrontX = 4.8, fFrontY = -1.6, fFrontTilt = -0.18;

      const groundMix = Math.max(0, 1.0 - airW);
      let backFootX = gBackX * groundMix + jBackX * jw + fBackX * fw;
      let backFootY = gBackY * groundMix + jBackY * jw + fBackY * fw;
      let backTilt  = gBackTilt * groundMix + jBackTilt * jw + fBackTilt * fw;

      let frontFootX = gFrontX * groundMix + jFrontX * jw + fFrontX * fw;
      let frontFootY = gFrontY * groundMix + jFrontY * jw + fFrontY * fw;
      let frontTilt  = gFrontTilt * groundMix + jFrontTilt * jw + fFrontTilt * fw;

      if (isHurt || isDeadFall) {
        backFootX = -5.5; backFootY = -4.5; backTilt = 0.45;
        frontFootX = 5.5; frontFootY = -3.0; frontTilt = -0.35;
      }

      const hipAnchorY = -10.5 + bodyBob;
      const hipShiftX = bodyLean * 2.5;

      // Draw Back Leg first
      drawLeg(-4.2 + hipShiftX, hipAnchorY, backFootX, backFootY, backTilt, true);

      // --- 3. BACK ARM (SWINGS OPPOSITE TO BACK LEG; RAISED IN JUMP/FALL) ---
      const armAmp = mw * (0.54 + rw * 0.36) * (1.0 - airW);
      let backArmAngle = (-sinP * armAmp) + (0.14 * (1.0 - mw) * (1.0 - airW));
      backArmAngle += (1.75 * jw) + (1.30 * fw) + (0.55 * sw);
      if (isHurt || isDeadFall) backArmAngle = 1.95;

      ctx.save();
      const backShoulderX = -5.8 + bodyLean * 8.0;
      const backShoulderY = -20.5 + bodyBob;
      ctx.translate(backShoulderX, backShoulderY);
      ctx.rotate(bodyLean + backArmAngle);

      // Darker shaded crimson sleeve behind torso
      ctx.fillStyle = shirtDark;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-2.4, -1.0, 4.8, 8.6, 2.3);
      ctx.fill();
      ctx.stroke();

      // Chubby far skin hand
      ctx.fillStyle = skinBack;
      ctx.beginPath();
      ctx.arc(0, 8.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- 4. CHUBBY TORSO: YELLOW SHORTS & RED SHIRT ---
      ctx.save();
      ctx.translate(0, -10.0 + bodyBob);
      ctx.rotate(bodyLean);

      // Yellow Puffy Shorts (from local y=-4.5 down to +1.8)
      const shortsGrad = ctx.createLinearGradient(-9, -4, 9, 2);
      shortsGrad.addColorStop(0, shortsLight);
      shortsGrad.addColorStop(0.65, shortsBase);
      shortsGrad.addColorStop(1, shortsDark);
      ctx.fillStyle = shortsGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.roundRect(-9.5, -4.5, 19.0, 6.8, [2.0, 2.0, 3.8, 3.8]);
      ctx.fill();
      ctx.stroke();

      // Clean shorts leg notch / inseam line
      ctx.strokeStyle = '#d48b0c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-0.5, -0.8);
      ctx.lineTo(-0.5, 2.1);
      ctx.stroke();

      // Chubby Red Shirt (from local y=-13.2 down to -3.6 overlapping shorts slightly)
      const shirtGrad = ctx.createLinearGradient(-8, -13, 9, -4);
      shirtGrad.addColorStop(0, shirtLight);
      shirtGrad.addColorStop(0.55, shirtBase);
      shirtGrad.addColorStop(1, shirtDark);
      ctx.fillStyle = shirtGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      // Slightly barrel/toddler tummy curve bulging gently forward on chest/tummy
      ctx.moveTo(-7.8, -12.6);
      ctx.quadraticCurveTo(0, -13.6, 8.0, -12.2);
      ctx.bezierCurveTo(10.2, -9.0, 10.6, -5.0, 9.2, -3.5);
      ctx.lineTo(-9.0, -3.5);
      ctx.bezierCurveTo(-10.0, -6.0, -9.2, -10.0, -7.8, -12.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red collar trim
      ctx.fillStyle = shirtDark;
      ctx.beginPath();
      ctx.arc(0.8, -12.6, 3.6, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.fill();

      ctx.restore();

      // Draw Front Leg (after shorts so torso overlaps hip cleanly!)
      drawLeg(4.0 + hipShiftX, hipAnchorY, frontFootX, frontFootY, frontTilt, false);

      // --- 5. ICONIC LARGE ROUND SHINCHAN HEAD (STABLE, UNOBSTRUCTED, REFERENCE ACCURATE) ---
      ctx.save();
      const headX = 1.0 + bodyLean * 12.5;
      const headY = -32.2 + bodyBob;
      ctx.translate(headX, headY);
      // Stable upright head with subtle natural sprint tilt
      ctx.rotate(bodyLean * 0.30);

      // Chubby Protruding Ear on back side of head
      ctx.fillStyle = skinBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(-11.2, 0.8, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Delicate inner ear curve
      ctx.strokeStyle = '#c58662';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(-11.2, 0.8, 1.9, -Math.PI * 0.35, Math.PI * 0.45);
      ctx.stroke();

      // Shinchan Signature Head Shape:
      // Narrower bowl crown tapering down into signature wide puffed toddler cheeks!
      const faceGrad = ctx.createRadialGradient(2.5, -2.5, 2.0, 1.5, 1.0, 16.0);
      faceGrad.addColorStop(0, skinLight);
      faceGrad.addColorStop(0.68, skinBase);
      faceGrad.addColorStop(1, skinShadow);
      ctx.fillStyle = faceGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.85;

      ctx.beginPath();
      ctx.moveTo(-10.6, -2.5);
      // Rounded dome top
      ctx.bezierCurveTo(-10.8, -14.2, 6.2, -14.5, 9.6, -5.8);
      // Forehead into bulbous puffed front cheek
      ctx.bezierCurveTo(13.2, -3.5, 15.6, 2.5, 13.6, 6.8);
      // Wide soft cheek-jaw curve across chin
      ctx.bezierCurveTo(11.4, 10.6, 3.5, 11.2, -2.2, 10.6);
      // Plump rear jaw curving back up to ear
      ctx.bezierCurveTo(-8.8, 9.8, -11.4, 4.5, -10.6, -2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Distinctive Short Black Bowl-Shaped Hair (matches shinchan_ref.png hairline & sideburn)
      ctx.fillStyle = '#141414';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10.8, -1.8);
      ctx.bezierCurveTo(-10.8, -14.2, 6.2, -14.5, 9.6, -5.8);
      // Neat cropped bowl hairline across forehead with slight curve down to temple sideburn
      ctx.bezierCurveTo(4.0, -7.8, -3.0, -8.2, -6.8, -4.6);
      ctx.bezierCurveTo(-7.2, -1.0, -8.2, 1.5, -10.0, 1.0);
      ctx.bezierCurveTo(-10.6, 0.2, -10.8, -0.8, -10.8, -1.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle glossy hair reflection arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-1.0, -6.5, 5.2, 1.25 * Math.PI, 1.75 * Math.PI);
      ctx.stroke();

      // Warm rosy cheek blushes
      ctx.fillStyle = 'rgba(255, 116, 116, 0.36)';
      ctx.beginPath();
      ctx.ellipse(9.4, 4.8, 3.2, 2.0, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-4.6, 4.6, 2.4, 1.6, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Eye positions (large expressive oval eyes!)
      const eyeLX = 1.4, eyeLY = -0.8;
      const eyeRX = 8.8, eyeRY = -0.6;
      const isBlinking = !isHurt && !isDeadFall && !isSwinging && (p.animTimer % 165 >= 159);

      if (isHurt || isDeadFall) {
        // Hurt / Defeat squeezed shock eyes (> <) & raised brows
        ctx.strokeStyle = '#0e0e0e';
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.5, -2.5); ctx.lineTo(3.2, -0.8); ctx.lineTo(-0.5, 1.2);
        ctx.moveTo(10.5, -2.3); ctx.lineTo(7.2, -0.6); ctx.lineTo(10.5, 1.4);
        ctx.stroke();
      } else if (isBlinking) {
        // Natural closed eyelid blink line
        ctx.strokeStyle = '#14100e';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeLX - 2.8, eyeLY + 0.4); ctx.quadraticCurveTo(eyeLX, eyeLY + 1.4, eyeLX + 2.8, eyeLY + 0.4);
        ctx.moveTo(eyeRX - 2.6, eyeRY + 0.4); ctx.quadraticCurveTo(eyeRX, eyeRY + 1.4, eyeRX + 2.6, eyeRY + 0.4);
        ctx.stroke();
      } else {
        // --- REFERENCE-ACCURATE LARGE GLOSSY BLACK OVAL EYES + UPPER CREASE + WHITE DOT ---
        // Thin curved upper eyelid creases above each eye
        ctx.strokeStyle = '#18110e';
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(eyeLX, eyeLY - 0.5, 3.9, 1.14 * Math.PI, 1.86 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(eyeRX, eyeRY - 0.5, 3.7, 1.14 * Math.PI, 1.86 * Math.PI); ctx.stroke();

        // Large pitch-black expressive oval eyes
        ctx.fillStyle = '#0d0d0d';
        ctx.beginPath(); ctx.ellipse(eyeLX, eyeLY, 3.1, 3.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(eyeRX, eyeRY, 2.9, 3.8, 0, 0, Math.PI * 2); ctx.fill();

        // Crisp white circular pupil reflection (looking slightly toward facing/motion)
        const lookY = (jw > 0.3) ? -0.9 : (fw > 0.3 ? 0.2 : -0.5);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeLX + 0.35, eyeLY + lookY, 1.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeRX + 0.35, eyeRY + lookY, 1.25, 0, Math.PI * 2); ctx.fill();
      }

      // --- SIGNATURE THICK ARCHED BLACK EYEBROWS (ALWAYS CRISP & PROMINENT!) ---
      const browLift = (isHurt || jw > 0.3) ? -1.1 : 0;
      ctx.strokeStyle = '#090909';
      ctx.lineWidth = 2.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeLX, eyeLY - 3.6 + browLift, 3.9, 1.15 * Math.PI, 1.90 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeRX, eyeRY - 3.5 + browLift, 3.7, 1.15 * Math.PI, 1.90 * Math.PI);
      ctx.stroke();

      // --- SMALL ROUNDED NOSE ---
      ctx.fillStyle = '#df9770';
      ctx.beginPath();
      ctx.ellipse(5.8, 2.9, 1.45, 0.95, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // --- RECOGNIZABLE WIDE SHINCHAN MOUTH ---
      if (isHurt || isDeadFall) {
        // Wavy shocked O mouth
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(6.0, 7.0, 2.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (isSwinging || jw > 0.4) {
        // Energetic wide open shout/exclamation mouth
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(6.0, 6.8, 2.9, 2.3, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Coral tongue hint
        ctx.fillStyle = '#ff8a80';
        ctx.beginPath();
        ctx.ellipse(6.0, 7.9, 1.7, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Iconic wide rounded 'O' / cheeky expression matching shinchan_ref.png!
        ctx.fillStyle = '#7a1512';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(5.8, 6.9, 2.4, 1.85, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cute coral inner tongue
        ctx.fillStyle = '#ff8a80';
        ctx.beginPath();
        ctx.ellipse(5.8, 7.7, 1.4, 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // --- 6. FRONT ARM & ELECTRIC SHOCK SOCK WEAPON ---
      // Natural opposite arm swing in walk/run, raised arms in jump/fall, full shock sock on attack!
      ctx.save();
      const frontShoulderX = 0.2 + bodyLean * 7.5;
      const frontShoulderY = -20.2 + bodyBob;

      let frontArmAngle = (+sinP * armAmp) + (-0.08 * (1.0 - mw) * (1.0 - airW));
      frontArmAngle += (-2.05 * jw) + (-1.55 * fw);
      if (isHurt || isDeadFall) frontArmAngle = -1.95;

      if (isSwinging) {
        const swingProg = (CONFIG.TIMINGS.HAMMER_COOLDOWN - p.hammerTimer) / CONFIG.TIMINGS.HAMMER_COOLDOWN;
        // Dramatic overhead-to-forward electric sock swing!
        frontArmAngle = -Math.PI * 0.85 + swingProg * Math.PI * 1.15;

        // Lightning arc swoosh trail around forward swing arc
        const arcEnd = Math.min(0.45, -Math.PI * 0.42 + swingProg * Math.PI * 0.95);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY + 2, 24, -Math.PI * 0.42, arcEnd);
        ctx.stroke();

        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(frontShoulderX + 6, frontShoulderY + 2, 24, -Math.PI * 0.42, arcEnd);
        ctx.stroke();
      }

      ctx.translate(frontShoulderX, frontShoulderY);
      ctx.rotate(bodyLean + frontArmAngle);

      // Front shaded red sleeve (highlighted)
      const fArmGrad = ctx.createLinearGradient(-2, 0, 3, 9);
      fArmGrad.addColorStop(0, shirtLight);
      fArmGrad.addColorStop(1, shirtBase);
      ctx.fillStyle = fArmGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-2.5, -1.0, 5.0, 8.8, 2.4);
      ctx.fill();
      ctx.stroke();

      // Attack Sock or compact waist-clear grip accent (keeps white socks & red shoes 100% clear during walk/idle/jump!)
      if (isSwinging) {
        ctx.save();
        ctx.translate(0, 8.8);
        ctx.rotate(-0.35);
        ctx.scale(0.95, 0.95);
        ctx.translate(0, 15);
        CartoonArtist.drawHairyElectricSock(ctx, true);
        ctx.restore();
      }

      // Front chubby hand (clean toddler hand silhouette!)
      ctx.fillStyle = skinBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 8.8, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Subtle compact tucked electric sock cuff peeking beside knuckles when not actively swinging
      if (!isSwinging && !isHurt && !isDeadFall) {
        ctx.save();
        ctx.translate(1.5, 9.2);
        ctx.rotate(-0.2);
        ctx.fillStyle = '#eceff1';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(-2.0, -1.2, 4.4, 3.2, 1.2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(-1.4, -0.4, 3.2, 1.0);
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();
    }

    static drawClimber(ctx, p, screenY) {
      this.drawShinchan(ctx, p, screenY);
    }

    // Oversized Hairy Electric Shock Sock Weapon
    static drawHairyElectricSock(ctx, isCharged = false) {
      ctx.save();
      // Sock cuff (striped with electric cyan & yellow)
      ctx.fillStyle = '#f5f5f5';
      ctx.strokeStyle = '#271915';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-4, -18, 9, 6, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-3, -17, 7, 2);
      ctx.fillStyle = '#ffea00';
      ctx.fillRect(-3, -14, 7, 1.5);

      // Oversized Floppy Sock Body
      ctx.fillStyle = '#e8eaed';
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(-4, -2);
      // Curved bulbous heel
      ctx.bezierCurveTo(-10, 4, -8, 12, -2, 14);
      // Floppy foot extending to toe
      ctx.bezierCurveTo(4, 15, 14, 16, 20, 10);
      // Round cartoon toe
      ctx.bezierCurveTo(24, 6, 22, -1, 16, 0);
      // Top of foot into ankle
      ctx.bezierCurveTo(8, 2, 4, -4, 4, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dirty / gray toe patch
      ctx.fillStyle = '#b0bec5';
      ctx.beginPath();
      ctx.ellipse(17, 5, 4.5, 4.5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // --- VISIBLE FUZZY HAIR TEXTURE ---
      // Funny cartoon coarse hairs sticking out from the sock!
      ctx.strokeStyle = '#1a237e';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';

      const hairs = [
        [-5, -8, -10, -11],
        [-7, 1, -12, 0],
        [-8, 7, -13, 9],
        [-4, 13, -7, 18],
        [4, 15, 6, 20],
        [12, 14, 15, 19],
        [21, 9, 26, 12],
        [19, 1, 25, 0],
        [10, 0, 12, -5]
      ];

      for (const [x1, y1, x2, y2] of hairs) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2 + 1.5, (y1 + y2) / 2 - 1.5, x2, y2);
        ctx.stroke();
      }

      // --- ELECTRIC SHOCK SPARKS & LIGHTNING EFFECTS ---
      const sparkTime = performance.now() * 0.02;
      const sparkColor = (Math.sin(sparkTime) > 0) ? '#00e5ff' : '#ffea00';

      ctx.strokeStyle = sparkColor;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = isCharged ? 14 : 6;

      // Crackling zig-zag lightning sparks
      ctx.beginPath();
      ctx.moveTo(20, 6);
      ctx.lineTo(25 + Math.sin(sparkTime) * 3, 2 + Math.cos(sparkTime) * 3);
      ctx.lineTo(29, 7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(-11 + Math.cos(sparkTime) * 3, 11 + Math.sin(sparkTime) * 3);
      ctx.lineTo(-14, 7);
      ctx.stroke();

      if (isCharged) {
        // High voltage electric sparks dancing around sock
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(10, 16);
        ctx.lineTo(14, 23);
        ctx.lineTo(18, 20);
        ctx.stroke();

        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(26, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(-10, 13, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    // 2. Draw +40% Larger Cartoon Duck Enemy (Supports Carrying & Placing Ice)
    static drawDuck(ctx, duck, screenY) {
      ctx.save();
      const x = duck.x + duck.width / 2;
      const y = screenY + duck.height;
      ctx.translate(x, y);

      if (duck.dir < 0) ctx.scale(-1, 1);

      // Mario-style Flattened Squash animation
      if (duck.isFlattened) {
        ctx.scale(1.38, 0.28);
      }

      if (duck.isShocked) {
        ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      }

      // Bobbing walk & waddle
      const bob = Math.sin(duck.animTimer * 0.25) * 2;
      const waddle = Math.sin(duck.animTimer * 0.25) * 0.14;
      ctx.rotate(waddle);

      // Colors by variant
      let headColor = '#1b5e20'; // Mallard green
      let bodyColor = '#8d5b2d';
      let wingColor = '#2e7d32';
      let scarfColor = '#d32f2f';

      if (duck.variant === 'blizzard') {
        headColor = '#00acc1';
        bodyColor = '#e0f7fa';
        wingColor = '#80deea';
        scarfColor = '#1565c0';
      } else if (duck.variant === 'golden') {
        headColor = '#fbc02d';
        bodyColor = '#fff59d';
        wingColor = '#f57f17';
        scarfColor = '#8e24aa';
      }

      // --- DROP SHADOW ---
      ctx.fillStyle = 'rgba(0, 20, 50, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- WEBBED ORANGE FEET ---
      const footStep = Math.sin(duck.animTimer * 0.3) * 5;
      ctx.fillStyle = '#ff9800';
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.ellipse(-8 - footStep, -2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(8 + footStep, -2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // --- PLUMP BODY ---
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#271915';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -16 + bob, 17, 13, -0.08, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // --- WING ---
      const wingFlap = duck.isCharging ? Math.sin(duck.animTimer * 0.5) * 8 : 0;
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.ellipse(-3, -18 + bob - wingFlap, 11, 7, 0.2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // --- HEAD ---
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(8, -28 + bob, 12, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // --- ORANGE BILL ---
      ctx.fillStyle = '#ff9800';
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(19, -26 + bob, 9, 4.5, 0.08, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Nostril dot
      ctx.fillStyle = '#d84315';
      ctx.beginPath(); ctx.arc(16, -27 + bob, 1, 0, Math.PI * 2); ctx.fill();

      // --- BIG EXPRESSIVE CARTOON EYE ---
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, -31 + bob, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(11.5, -31 + bob, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10.8, -32 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // --- FLUTTERING WINTER SCARF ---
      ctx.fillStyle = scarfColor;
      ctx.beginPath();
      ctx.roundRect(1, -21 + bob, 13, 5, 2.5);
      ctx.fill();

      const scarfWave = Math.sin(duck.animTimer * 0.3) * 4;
      ctx.beginPath();
      ctx.roundRect(-9, -20 + bob + scarfWave, 9, 5, 2);
      ctx.fill();

      // Ice block carrying completely removed per user request


      if (duck.isShocked) {
        ctx.save();
        ctx.strokeStyle = (Math.random() > 0.5) ? '#00e5ff' : '#ffea00';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-16, -10); ctx.lineTo(-8, -26); ctx.lineTo(2, -18); ctx.lineTo(14, -32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8, -4); ctx.lineTo(16, -16); ctx.lineTo(10, -22); ctx.lineTo(20, -26);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // 3. Draw +30% Larger Cartoon Penguin Enemy
    static drawPenguin(ctx, penguin, screenY) {
      ctx.save();
      const x = penguin.x + penguin.width / 2;
      const y = screenY + penguin.height;
      ctx.translate(x, y);

      if (penguin.dir < 0) ctx.scale(-1, 1);

      // Mario-style Flattened Squash animation
      if (penguin.isFlattened) {
        ctx.scale(1.38, 0.28);
      }

      if (penguin.isShocked) {
        ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      }

      const bob = Math.sin(penguin.animTimer * 0.2) * 1.5;
      const waddle = Math.sin(penguin.animTimer * 0.2) * 0.12;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 20, 50, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (penguin.isSliding) {
        // --- BELLY SLIDE POSE ---
        ctx.translate(0, -3);
        ctx.rotate(0.12);

        // Dark sleek back
        ctx.fillStyle = '#0d1b2a';
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, -8, 20, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White sliding belly
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(3, -5, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden neck patch
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(10, -8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#fb8500';
        ctx.beginPath();
        ctx.moveTo(17, -9); ctx.lineTo(26, -6); ctx.lineTo(17, -3); ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(14, -11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(14.8, -11.5, 0.8, 0, Math.PI * 2); ctx.fill();

        // Ice spray particles shooting out behind tail
        ctx.fillStyle = '#e0f7fa';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-22 - i * 5, -2 + (i % 2) * 3, 2, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // --- STANDING WADDLE POSE ---
        ctx.rotate(waddle);

        // Orange feet
        const foot = Math.sin(penguin.animTimer * 0.25) * 4;
        ctx.fillStyle = '#fb8500';
        ctx.strokeStyle = '#d84315';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(-7 - foot, -2, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(7 + foot, -2, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Body
        ctx.fillStyle = '#0d1b2a';
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, -18 + bob, 15, 17, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // White belly
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(3, -15 + bob, 10, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden collar patch
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(8, -25 + bob, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#fb8500';
        ctx.beginPath();
        ctx.moveTo(10, -25 + bob); ctx.lineTo(20, -22 + bob); ctx.lineTo(10, -19 + bob); ctx.closePath();
        ctx.fill();

        // Big eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(6, -27 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(7.2, -27 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(6.8, -27.8 + bob, 0.8, 0, Math.PI * 2); ctx.fill();

        // Flipper
        ctx.fillStyle = '#0d1b2a';
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(-5, -16 + bob, 5, 10, 0.3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }


      if (penguin.isShocked) {
        ctx.save();
        ctx.strokeStyle = (Math.random() > 0.5) ? '#00e5ff' : '#ffea00';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-14, -8); ctx.lineTo(-6, -24); ctx.lineTo(2, -16); ctx.lineTo(12, -28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -2); ctx.lineTo(14, -14); ctx.lineTo(8, -20); ctx.lineTo(18, -24);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // 4. Draw Cartoon Breakable & Solid Ice Blocks
    static drawIceBlock(ctx, x, y, type, theme, damage = 0) {
      const w = CONFIG.BLOCK_WIDTH;
      const h = CONFIG.BLOCK_HEIGHT;

      if (type === 1) { // Breakable Ice
        ctx.fillStyle = theme.iceBase;
        ctx.fillRect(x, y, w, h);

        // Specular top highlight
        ctx.fillStyle = theme.iceHighlight;
        ctx.fillRect(x, y, w, 2.5);

        // Dark bottom shadow
        ctx.fillStyle = theme.iceShadow;
        ctx.fillRect(x, y + h - 2.5, w, 2.5);

        // Side borders
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x, y, 1.5, h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + w - 1.5, y, 1.5, h);

        // Crack lines if damaged
        if (damage > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 2);
          ctx.lineTo(x + 18, y + 8);
          ctx.lineTo(x + 28, y + 12);
          if (damage > 1) {
            ctx.moveTo(x + 18, y + 8);
            ctx.lineTo(x + 12, y + 12);
          }
          ctx.stroke();
        }

      } else if (type === 2) { // Solid Stone/Permafrost (Visually Unbreakable)
        ctx.fillStyle = theme.solidBase;
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = theme.solidHighlight;
        ctx.fillRect(x, y, w, 2.5);

        ctx.fillStyle = theme.solidShadow;
        ctx.fillRect(x, y + h - 2.5, w, 2.5);

        // Reinforced steel bands & cross-trim
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(x + 2, y + 2, w - 4, 1.5);
        ctx.fillRect(x + 2, y + h - 3.5, w - 4, 1.5);

        // Indestructible steel rivets
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 6, y + 7, 2.2, 0, Math.PI * 2);
        ctx.arc(x + w - 6, y + 7, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#102027';
        ctx.lineWidth = 1.0;
        ctx.stroke();

      } else if (type === 3 || type === 4) { // Moving Conveyor Ice
        ctx.fillStyle = '#00acc1';
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = '#e0f7fa';
        ctx.fillRect(x, y, w, 2);

        // Animated direction arrows
        const dir = type === 4 ? 1 : -1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const cx = x + w / 2;
        const cy = y + h / 2;
        if (dir > 0) {
          ctx.moveTo(cx - 5, cy - 4);
          ctx.lineTo(cx + 4, cy);
          ctx.lineTo(cx - 5, cy + 4);
        } else {
          ctx.moveTo(cx + 5, cy - 4);
          ctx.lineTo(cx - 4, cy);
          ctx.lineTo(cx + 5, cy + 4);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // 5. Draw Cartoon Cloud Platform
    static drawCloud(ctx, x, y, width, height) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#b0bec5';
      ctx.lineWidth = 2;

      ctx.beginPath();
      const r = height / 2;
      ctx.roundRect(x, y, width, height, r);
      ctx.fill();
      ctx.stroke();

      // Cloud puffs
      ctx.beginPath();
      ctx.arc(x + width * 0.25, y + 2, 10, Math.PI, 2 * Math.PI);
      ctx.arc(x + width * 0.5, y - 2, 13, Math.PI, 2 * Math.PI);
      ctx.arc(x + width * 0.75, y + 2, 10, Math.PI, 2 * Math.PI);
      ctx.fill();

      // Bottom shadow
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.roundRect(x + 6, y + height - 4, width - 12, 3, 1.5);
      ctx.fill();

      ctx.restore();
    }

    // 6. Draw Bonus Vegetable Pickups
    static drawCollectible(ctx, c, screenY) {
      ctx.save();
      ctx.translate(c.x + 12, screenY + 12);
      const bob = Math.sin(c.animTimer * 0.15) * 3;
      ctx.translate(0, bob);

      if (c.type === 'eggplant') {
        // Deep purple body
        ctx.fillStyle = '#4a148c';
        ctx.beginPath();
        ctx.ellipse(0, 2, 9, 12, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Green calyx/stalk
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(0, -9, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-1.5, -14, 3, 6);

      } else if (c.type === 'carrot') {
        // Orange carrot
        ctx.fillStyle = '#ff6d00';
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, -6);
        ctx.lineTo(0, 14);
        ctx.closePath();
        ctx.fill();
        // Green fronds
        ctx.fillStyle = '#43a047';
        ctx.fillRect(-2, -12, 4, 6);

      } else if (c.type === 'turnip') {
        // White & pink turnip
        ctx.fillStyle = '#f8bbd0';
        ctx.beginPath();
        ctx.arc(0, 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 6, 8, 0, Math.PI);
        ctx.fill();
        // Green leaves
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(-2, -12, 4, 6);
      }

      ctx.restore();
    }

    // 7. Draw Summit Glowing Exit Gate & Floating Arrow
    static drawExitGate(ctx, gate, screenY, isNear = false) {
      ctx.save();
      const x = gate.x;
      const y = screenY;
      const w = gate.width;
      const h = gate.height;
      const anim = gate.animTimer;

      // 1. Magical Glowing Radial Aura
      const pulse = Math.sin(anim * 0.08) * 0.25 + 0.75;
      const gradAura = ctx.createRadialGradient(x + w / 2, y + h / 2, 8, x + w / 2, y + h / 2, 64);
      gradAura.addColorStop(0, `rgba(0, 229, 255, ${0.55 * pulse})`);
      gradAura.addColorStop(0.5, `rgba(124, 77, 255, ${0.35 * pulse})`);
      gradAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradAura;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 64, 0, Math.PI * 2);
      ctx.fill();

      // 2. Ornate Ancient Stone Arch Outer Frame
      ctx.fillStyle = '#1c2538';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 6, w + 12, h + 8, [20, 20, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // 3. Inner Arch Frame
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h + 2, [14, 14, 0, 0]);
      ctx.fill();

      // 4. Glowing Cyan Rune Pillars flanking the portal
      for (let py = y + 14; py < y + h - 8; py += 12) {
        const runeA = 0.5 + Math.sin(anim * 0.12 + py) * 0.45;
        ctx.fillStyle = `rgba(0, 229, 255, ${runeA})`;
        ctx.fillRect(x + 2, py, 4, 6);
        ctx.fillRect(x + w - 6, py, 4, 6);
      }

      // 5. Swirling Cosmic Vortex Interior
      const gradVortex = ctx.createLinearGradient(x, y, x, y + h);
      gradVortex.addColorStop(0, '#00e5ff');
      gradVortex.addColorStop(0.4, '#7c4dff');
      gradVortex.addColorStop(0.8, '#d500f9');
      gradVortex.addColorStop(1, '#ffea00');
      ctx.fillStyle = gradVortex;
      ctx.fillRect(x + 8, y + 6, w - 16, h - 6);

      // Rotating spiral vortex particles
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const angle = anim * 0.08 + (i * Math.PI / 3);
        const radius = 10 + Math.sin(anim * 0.05 + i) * 8;
        const px = x + w / 2 + Math.cos(angle) * radius;
        const py = y + h / 2 + 4 + Math.sin(angle) * (radius * 1.2);
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Double portal doors sliding open if openProgress > 0
      if (gate.openProgress < 0.95) {
        const halfW = (w - 16) / 2;
        const openOffset = gate.openProgress * halfW;

        // Left Door Panel
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 8, y + 6, halfW, h - 6);
        ctx.clip();
        ctx.translate(-openOffset, 0);
        ctx.fillStyle = '#0277bd';
        ctx.strokeStyle = '#81d4fa';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x + 8, y + 6, halfW, h - 6);
        ctx.strokeRect(x + 8, y + 6, halfW, h - 6);
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(x + 8 + halfW - 4, y + h / 2 + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right Door Panel
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 8 + halfW, y + 6, halfW, h - 6);
        ctx.clip();
        ctx.translate(openOffset, 0);
        ctx.fillStyle = '#0277bd';
        ctx.strokeStyle = '#81d4fa';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x + 8 + halfW, y + 6, halfW, h - 6);
        ctx.strokeRect(x + 8 + halfW, y + 6, halfW, h - 6);
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(x + 8 + halfW + 4, y + h / 2 + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Snow Dusting on Top of Arch
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y - 6, w / 2 + 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 7. Golden Peak Crown on Arch
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 10, y - 6);
      ctx.lineTo(x + w / 2, y - 18);
      ctx.lineTo(x + w / 2 + 10, y - 6);
      ctx.closePath();
      ctx.fill();

      // 8. CLEARLY VISIBLE PROMINENT FLOATING INDICATOR & ARROW:
      // "▼ NEXT LEVEL ▼"
      const bounce = Math.sin(anim * 0.12) * 5;
      const promptY = y - 36 + bounce;

      // Glow shadow
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 12;

      // Indicator pill background
      ctx.fillStyle = 'rgba(10, 25, 55, 0.95)';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(x + w / 2 - 58, promptY, 116, 22, 11);
      ctx.fill();
      ctx.stroke();

      // Indicator text
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('▼ NEXT LEVEL ▼', x + w / 2, promptY + 11);

      // Animated downward arrow pointing straight into the gateway
      const arrowY = y - 8 + (bounce * 0.6);
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 7, arrowY);
      ctx.lineTo(x + w / 2 + 7, arrowY);
      ctx.lineTo(x + w / 2, arrowY + 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    static drawSummitDoor(ctx, door, screenY, isNear = false) {
      CartoonArtist.drawExitGate(ctx, door, screenY, isNear);
    }
  }

  // =========================================================================
  // 6. PLAYER ENTITY
  // =========================================================================
  class Player {
    constructor(id = 1, startX = 240, startY = 480) {
      this.id = id;
      this.startX = startX;
      this.startY = startY;
      this.x = startX;
      this.y = startY;
      this.prevX = startX;
      this.prevY = startY;
      this.width = 28;
      this.height = 38;

      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.isGrounded = true;
      this.ridingPlatform = null;
      this.conveyorVx = 0;

      this.state = 'idle'; // 'idle' | 'walk' | 'jump' | 'fall' | 'land' | 'swing' | 'hurt' | 'dead' | 'victory'
      this.animTimer = 0;
      this.sockTimer = 0;
      this.hammerTimer = 0; // backward compatibility alias
      this.isSwinging = false;
      this.landSquashTimer = 0;

      this.lives = CONFIG.STARTING_LIVES;
      this.score = 0;
      this.veggiesCollected = 0;
      this.isAlive = true;
      this.isInvulnerable = false;
      this.invulnerableTimer = 0;

      this.jumpButtonHeld = false;
      this.attackButtonHeld = false;
      this.hammerButtonHeld = false;
      this.wantsEnterDoor = false;
      this.standingTier = -1;
      this.standingY = startY;
      this.deathTimer = 0;
      this.deathVy = 0;

      // Smooth Platformer Animation Blending Properties (60 FPS LERP)
      this.moveWeight = 0;    // 0 (idle) to 1 (walking / running)
      this.runWeight = 0;     // 0 (walk speed) to 1 (sprint run speed)
      this.walkPhase = 0;     // Continuous alternating stride accumulator
      this.jumpWeight = 0;    // 0 (grounded) to 1 (rising jump)
      this.fallWeight = 0;    // 0 (grounded) to 1 (falling downward)
      this.swingWeight = 0;   // 0 (not swinging) to 1 (swinging)
      this.landWeight = 0;    // 0 to 1 squash on landing
      this.headBumpTimer = 0; // Head-impact reaction when hitting blocks from below
      this.stompTimer = 0;    // Stomp bounce visual reaction
    }

    resetPosition(x, y) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;
      this.ridingPlatform = null;
      this.conveyorVx = 0;
      this.state = 'idle';
      this.animTimer = 0;
      this.sockTimer = 0;
      this.hammerTimer = 0;
      this.isSwinging = false;
      this.landSquashTimer = 0;
      this.jumpButtonHeld = false;
      this.attackButtonHeld = false;
      this.hammerButtonHeld = false;
      this.moveWeight = 0;
      this.runWeight = 0;
      this.walkPhase = 0;
      this.jumpWeight = 0;
      this.fallWeight = 0;
      this.swingWeight = 0;
      this.landWeight = 0;
      this.headBumpTimer = 0;
      this.stompTimer = 0;
    }

    addScore(points) {
      this.score += points;
    }

    getBounds() {
      return {
        x: this.x + 3,
        y: this.y + 4,
        w: this.width - 6,
        h: this.height - 4
      };
    }

    // Upward Shock Sock Swing Hitbox (detects overhead ceiling ice blocks directly above)
    getUpwardHitbox() {
      if (!this.isSwinging || this.sockTimer < 1) return null;
      return {
        x: this.x - 2,
        y: this.y - 24,
        w: this.width + 4,
        h: 28
      };
    }

    // Ice-Breaking Shock Sock Hitbox (strictly overhead & upper-body; stops well above feet so standing/walking never breaks floor underneath)
    getIceAttackHitbox() {
      if (!this.isSwinging || this.sockTimer < 1) return null;
      return {
        x: this.facing > 0 ? this.x - 2 : this.x - 28,
        y: this.y - 24,
        w: 58,
        h: 36 // top: y - 24, bottom: y + 12 (26px above Shinchan's feet)
      };
    }

    // Forward Shock Sock Enemy Hitbox (hits adjacent standing and sliding enemies reliably)
    getSockHitbox() {
      if (!this.isSwinging || this.sockTimer < 1) return null;
      return {
        x: this.facing > 0 ? this.x + 4 : this.x - 32,
        y: this.y - 8,
        w: 54,
        h: this.height + 4 // reaches down to feetY - 4 (hits ducks and sliding penguins cleanly)
      };
    }

    getHammerHitbox() {
      return this.getSockHitbox();
    }

    takeDamage() {
      if (!this.isAlive || this.isInvulnerable || this.state === 'victory') return;
      this.loseLife();
    }

    loseLife() {
      if (!this.isAlive) return;
      this.isAlive = false;
      this.state = 'dead';
      this.lives--;
      this.deathVy = -4.5;
      this.deathTimer = 85;
      SFX.damage();
      SFX.death();
    }

    respawn(safeX, safeY, tier = -1) {
      this.isAlive = true;
      this.state = 'idle';
      this.resetPosition(safeX, safeY);
      this.standingTier = tier;
      this.standingY = safeY;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;
      this.ridingPlatform = null;
      this.isInvulnerable = true;
      this.invulnerableTimer = 120; // 2s generous invulnerability
      this.jumpButtonHeld = true;
      this.wantsEnterDoor = false;
    }

    swingSock() {
      if (this.sockTimer === 0 && this.isAlive) {
        this.isSwinging = true;
        this.sockTimer = CONFIG.TIMINGS.HAMMER_COOLDOWN;
        this.hammerTimer = this.sockTimer;
        SFX.sockSwing();
        if (this.isGrounded && this.state !== 'jump' && this.state !== 'fall') {
          this.state = 'swing';
        }
      }
    }

    swingHammer() {
      this.swingSock();
    }

    handleInput(inputState) {
      if (!this.isAlive || this.state === 'victory') return;

      // 1. Hairy Electric Shock Sock Attack (Key X or Mobile Attack Button)
      const attackPressed = !!(inputState.attack || inputState.hammer);
      if (attackPressed && !this.attackButtonHeld) {
        this.swingSock();
      }
      this.attackButtonHeld = attackPressed;
      this.hammerButtonHeld = attackPressed;

      // 2. Jump (Controlled jump height with strict debouncing)
      const jumpPressed = !!inputState.jump;
      if (jumpPressed && !this.jumpButtonHeld && this.isGrounded) {
        this.vy = CONFIG.PHYSICS.JUMP_SPEED;
        this.isGrounded = false;
        this.ridingPlatform = null;
        this.state = 'jump';
        SFX.jump();
      }
      this.jumpButtonHeld = jumpPressed;

      // 3. Summit Door interaction
      if (inputState.up && this.isGrounded) {
        this.wantsEnterDoor = true;
      }

      // 4. Horizontal movement & normal platformer locomotion (walk -> run -> idle)
      if (this.isGrounded) {
        if (inputState.left) {
          // Brisk turn traction prevents sliding backward while facing left
          const accel = this.vx > 0.1 ? CONFIG.PHYSICS.WALK_ACCEL * 2.1 : CONFIG.PHYSICS.WALK_ACCEL;
          this.vx = Math.max(-CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx - accel);
          this.facing = (this.vx <= 0.05) ? -1 : 1;
          if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        } else if (inputState.right) {
          const accel = this.vx < -0.1 ? CONFIG.PHYSICS.WALK_ACCEL * 2.1 : CONFIG.PHYSICS.WALK_ACCEL;
          this.vx = Math.min(CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx + accel);
          this.facing = (this.vx >= -0.05) ? 1 : -1;
          if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        } else {
          this.vx *= CONFIG.PHYSICS.ICE_FRICTION;
          if (Math.abs(this.vx) < 0.14) {
            this.vx = 0;
            if (this.state !== 'swing' && this.state !== 'land') this.state = 'idle';
          } else if (this.state !== 'swing' && this.state !== 'land') {
            this.state = Math.abs(this.vx) >= 1.85 ? 'run' : 'walk';
          }
        }
      } else {
        // Air steering
        if (inputState.left) {
          this.vx = Math.max(-CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx - CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = -1;
        } else if (inputState.right) {
          this.vx = Math.min(CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx + CONFIG.PHYSICS.AIR_STEER_ACCEL);
          this.facing = 1;
        }
      }

      // Variable jump height
      if (!jumpPressed && this.vy < -2.6) {
        this.vy = Math.max(this.vy, -2.6);
      }
    }

    update(collisionSystem, cameraY) {
      this.prevX = this.x;
      this.prevY = this.y;
      this.animTimer++;

      // Smooth 60 FPS normal platformer animation blend weights
      const absVx = Math.abs(this.vx);
      const isMovingHoriz = this.isGrounded && absVx > 0.14;
      const targetMoveWeight = isMovingHoriz ? 1.0 : 0.0;
      this.moveWeight += (targetMoveWeight - this.moveWeight) * 0.28;

      const targetRunWeight = (isMovingHoriz && absVx >= 1.85) ? 1.0 : 0.0;
      this.runWeight += (targetRunWeight - this.runWeight) * 0.18;

      if (isMovingHoriz) {
        const prevSin = Math.sin(this.walkPhase);
        // Stride speed tied directly to velocity so ground-planted feet never slide
        this.walkPhase += 0.06 + absVx * 0.145;
        const currSin = Math.sin(this.walkPhase);
        if ((prevSin < 0 && currSin >= 0) || (prevSin > 0 && currSin <= 0)) {
          if (this.state === 'walk' || this.state === 'run') SFX.footstep();
        }
      } else if (this.isGrounded) {
        // Settle legs smoothly back to neutral standing stance
        const mod = ((this.walkPhase % Math.PI) + Math.PI) % Math.PI;
        if (mod > 0.16 && mod < Math.PI - 0.16) {
          this.walkPhase += (mod > Math.PI / 2 ? 0.16 : -0.16);
        }
      }

      const isJumpingAir = !this.isGrounded && (this.vy <= 0.4 || this.state === 'jump');
      const isFallingAir = !this.isGrounded && this.vy > 0.4;
      this.jumpWeight += ((isJumpingAir ? 1.0 : 0.0) - this.jumpWeight) * 0.28;
      this.fallWeight += ((isFallingAir ? 1.0 : 0.0) - this.fallWeight) * 0.26;

      const targetSwingWeight = this.isSwinging ? 1.0 : 0.0;
      this.swingWeight += (targetSwingWeight - this.swingWeight) * 0.28;

      if (this.landWeight > 0.01) {
        this.landWeight *= 0.72;
      } else {
        this.landWeight = 0;
      }

      if (this.headBumpTimer > 0) this.headBumpTimer--;
      if (this.stompTimer > 0) this.stompTimer--;

      if (this.isInvulnerable) {
        this.invulnerableTimer--;
        if (this.invulnerableTimer <= 0) this.isInvulnerable = false;
      }

      if (this.state === 'dead') {
        this.y += this.deathVy;
        this.deathVy += 0.22;
        this.deathTimer--;
        return;
      }

      // Generous pit check: only die if fallen far into the bottomless abyss below all intact platforms!
      const lowestIntactY = collisionSystem.getLowestIntactFloorY ? collisionSystem.getLowestIntactFloorY() : 570;
      const pitDeathLimit = Math.max(cameraY + CONFIG.CANVAS_HEIGHT + 75, lowestIntactY + 80);
      if (this.y > pitDeathLimit && this.isAlive) {
        this.loseLife();
        return;
      }

      if (this.state === 'victory') return;

      // Sock Attack Timer
      if (this.sockTimer > 0) {
        this.sockTimer--;
        this.hammerTimer = this.sockTimer;
        if (this.sockTimer === 0) {
          this.isSwinging = false;
          if (this.state === 'swing') this.state = this.isGrounded ? 'idle' : 'fall';
        }
      }

      if (this.landSquashTimer > 0) {
        this.landSquashTimer--;
        if (this.landSquashTimer === 0 && this.state === 'land') {
          const avx = Math.abs(this.vx);
          this.state = avx >= 1.85 ? 'run' : (avx > 0.14 ? 'walk' : 'idle');
        }
      }

      if (this.isGrounded && this.ridingPlatform) {
        this.x += this.ridingPlatform.vx;
        this.y = this.ridingPlatform.y - this.height;
        this.vy = 0;

        this.x += this.vx;
        // Firmly clamp player on cloud surface: facing/walking into wall never drops player into abyss!
        const minX = this.ridingPlatform.x - 2;
        const maxX = this.ridingPlatform.x + this.ridingPlatform.width - this.width + 2;
        this.x = Math.max(minX, Math.min(maxX, this.x));
      } else {
        if (this.isGrounded && this.conveyorVx !== 0) {
          this.x += this.conveyorVx;
        }
        this.x += this.vx;
        collisionSystem.handleScreenWrap(this);
        collisionSystem.checkSideCollision(this);
      }

      if (!this.isGrounded) {
        this.vy = Math.min(CONFIG.PHYSICS.MAX_FALL_SPEED, this.vy + CONFIG.PHYSICS.GRAVITY);
        this.y += this.vy;
        if (this.state !== 'swing') {
          this.state = this.vy < 0 ? 'jump' : 'fall';
        }
      }

      // Check head collision & ceiling ice breaking with electric socks
      collisionSystem.checkHeadCollision(this);

      // Check landing
      const prevGrounded = this.isGrounded;
      const grounded = collisionSystem.checkFloorCollision(this, cameraY);
      if (grounded && !prevGrounded) {
        this.landSquashTimer = 4;
        this.landWeight = 1.0;
        this.state = 'land';
        SFX.land ? SFX.land() : null;
      }

      // Pit check
      if (this.y > pitDeathLimit && this.isAlive) {
        this.loseLife();
      }
    }

    draw(ctx, cameraY) {
      if (!this.isAlive && this.state !== 'dead') return;
      if (this.isInvulnerable && Math.floor(this.animTimer / 4) % 2 === 0) return;

      const screenY = this.y - cameraY;
      if (screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) return;

      CartoonArtist.drawShinchan(ctx, this, screenY);
    }
  }
  // =========================================================================
  // 7. DUCK ENEMY (+40% LARGER, ICE REPAIR AI)
  // =========================================================================
  class DuckEnemy {
    constructor(x, y, floorIndex, variant = 'mallard', speed = 1.2, dir = 1) {
      this.x = x;
      this.y = y;
      this.floorIndex = floorIndex;
      this.variant = variant; // 'mallard' | 'blizzard' | 'golden'
      this.width = 34;       // +40% larger sprite
      this.height = 32;
      this.speed = speed;
      this.dir = dir;
      this.animTimer = 0;
      this.turnCooldown = 0;

      // Combat Health & Durability:
      this.maxHp = (this.variant === 'golden') ? 3 : (this.variant === 'blizzard' ? 2 : 1);
      this.hp = this.maxHp;
      this.invulnerableHitTimer = 0;

      // Stomp & defeat properties
      this.isFlattened = false;
      this.flattenTimer = 0;

      this.state = 'patrol';
      this.isCharging = false;

      this.isShocked = false;
      this.shockTimer = 0;
      this.shockFacing = 1;

      this.isActive = true;
      this.isDefeated = false;
      this.deadVy = 0;
      this.deadVx = 0;
      this.rot = 0;
    }

    getBounds() {
      return { x: this.x + 4, y: this.y + 4, w: this.width - 8, h: this.height - 4 };
    }

    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 24;
      this.isShocked = false;
      this.isCharging = false;
      this.hp = 0;

      const pts = (this.variant === 'golden') ? CONFIG.SCORE.DEFEAT_DUCK_GOLDEN : CONFIG.SCORE.DEFEAT_DUCK;
      player.addScore(pts);
      if (window.game && window.game.stats) {
        window.game.stats.ducksDefeated++;
        window.game.stats.totalDefeated++;
      }
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y - 12, `+${pts}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + 4);
      }
      SFX.stomp();
      SFX.quack();
    }

    hitByShockSock(player, level) {
      if (this.isDefeated || this.isFlattened || this.invulnerableHitTimer > 0) return;
      this.invulnerableHitTimer = 16;
      this.hp--;
      this.shockFacing = player.facing;

      if (level && level.particleSystem) {
        level.particleSystem.spawnElectricSparks(this.x + this.width / 2, this.y + this.height / 2, 8);
      }
      SFX.electricShock();
      SFX.quack();

      if (this.hp <= 0) {
        this.isShocked = true;
        this.shockTimer = 18;
        this.isDefeated = true;
        this.state = 'defeated';
        this.deadVx = (this.shockFacing || 1) * 4.2;
        this.deadVy = -5.0;
        const pts = (this.variant === 'golden') ? CONFIG.SCORE.DEFEAT_DUCK_GOLDEN : CONFIG.SCORE.DEFEAT_DUCK;
        player.addScore(pts);
        if (window.game && window.game.stats) {
          window.game.stats.ducksDefeated++;
          window.game.stats.totalDefeated++;
        }
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y, `+${pts}`);
        }
        SFX.enemyDefeat();
      } else {
        this.isShocked = true;
        this.shockTimer = 14;
        this.dir = -player.facing;
        this.turnCooldown = 25;
      }
    }

    hitByHammer(player, level) {
      this.hitByShockSock(player, level);
    }

    update(level, players) {
      if (!this.isActive) return;

      // 1. Mario-style Flattened Squash animation
      if (this.isFlattened) {
        this.flattenTimer--;
        if (this.flattenTimer <= 0) {
          this.isActive = false;
        }
        return;
      }

      if (this.invulnerableHitTimer > 0) this.invulnerableHitTimer--;

      // 2. Shocked reaction from Hairy Electric Shock Sock attack
      if (this.isShocked) {
        this.shockTimer--;
        level.particleSystem.spawnElectricSparks(this.x + this.width / 2, this.y + this.height / 2, 2);
        if (this.shockTimer <= 0) {
          this.isShocked = false;
          if (this.hp <= 0) {
            this.isDefeated = true;
            this.state = 'defeated';
          }
        }
        return;
      }

      // 3. Defeated Tumble Animation
      if (this.isDefeated) {
        this.x += this.deadVx;
        this.y += this.deadVy;
        this.deadVy += 0.25;
        this.rot += 0.22;
        if (this.y > level.baseGroundY + 120) this.isActive = false;
        return;
      }

      this.animTimer++;
      if (this.turnCooldown > 0) this.turnCooldown--;

      const floor = level.floors[this.floorIndex];
      if (!floor) return;

      // Safe floor collapse interaction
      if (floor.collapseState === 'collapsed') {
        this.y += 2.6;
        for (let f = this.floorIndex - 1; f >= 0; f--) {
          const lowerFloor = level.floors[f];
          if (lowerFloor && lowerFloor.collapseState !== 'collapsed' && Math.abs(this.y + this.height - lowerFloor.y) < 6) {
            this.floorIndex = f;
            this.y = lowerFloor.y - this.height;
            this.state = 'patrol';
            break;
          }
        }
        if (this.y > level.baseGroundY + 60) this.isActive = false;
        this.checkPlayerDamage(players);
        return;
      }

      // Check current foot position: fall through broken holes
      const footCol = Math.floor((this.x + this.width / 2) / CONFIG.BLOCK_WIDTH);
      if (footCol >= 0 && footCol < CONFIG.TILES_X && floor.blocks[footCol] === 0) {
        this.y += 3.2;
        for (let f = this.floorIndex - 1; f >= 0; f--) {
          const lowerFloor = level.floors[f];
          if (lowerFloor && lowerFloor.collapseState !== 'collapsed' && Math.abs(this.y + this.height - lowerFloor.y) < 6) {
            this.floorIndex = f;
            this.y = lowerFloor.y - this.height;
            break;
          }
        }
        if (this.y > level.baseGroundY + 60) this.isActive = false;
        this.checkPlayerDamage(players);
        return;
      }

      // Keep pinned to platform surface
      this.y = floor.y - this.height;

      // Charge AI toward nearby player
      if (this.animTimer % 8 === 0) {
        this.isCharging = false;
        for (const p of players) {
          if (p.isAlive && Math.abs(p.y + p.height - floor.y) < 20) {
            const dist = p.x - this.x;
            if (Math.abs(dist) < 220) {
              this.isCharging = true;
              if (this.turnCooldown <= 0) {
                this.dir = dist > 0 ? 1 : -1;
              }
              if (this.animTimer % 80 === 0) SFX.quack();
              break;
            }
          }
        }
      }

      // Move duck
      const moveSpeed = this.isCharging ? this.speed * 1.5 : this.speed;
      const targetX = this.x + moveSpeed * this.dir;
      const targetFootCol = Math.floor((targetX + (this.dir > 0 ? this.width : 0)) / CONFIG.BLOCK_WIDTH);

      // Edge & Hole detection: turn around at broken holes or edges
      if (targetFootCol < 0 || targetFootCol >= CONFIG.TILES_X || floor.blocks[targetFootCol] === 0) {
        this.dir = -this.dir;
        this.turnCooldown = 20;
      } else {
        this.x = targetX;
      }

      // Screen wrapping
      if (this.x < -this.width) {
        this.x = CONFIG.CANVAS_WIDTH;
      } else if (this.x > CONFIG.CANVAS_WIDTH) {
        this.x = -this.width;
      }

      this.checkPlayerDamage(players);
    }

    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = this.y;
      const enemyMidY = this.y + this.height * 0.65;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy >= -0.5 || p.state === 'fall' || playerFeetY >= prevFeetY);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 2;
        const pRight = p.x + p.width - 2;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const crossedHead = (prevFeetY <= enemyTopY + 12 && playerFeetY >= enemyTopY - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= enemyMidY && isFalling))) {
          // Stomp succeeds! Immediately defeat enemy and bounce player upward
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -6.2; // Mario upward bounce
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 16;
          p.invulnerableTimer = 16;
          return;
        }

        // 2. Airborne Overhead Clearance: if feet are above enemy, pass cleanly overhead
        if (playerFeetY <= enemyTopY + 4) {
          continue;
        }

        // 3. Ground / side collision: player takes damage only when feet are level with enemy body (not stomping)
        if (playerFeetY > enemyMidY && aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }

    draw(ctx, cameraY) {
      if (!this.isActive) return;
      const screenY = this.y - cameraY;
      if (screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) return;
      CartoonArtist.drawDuck(ctx, this, screenY);
    }
  }
  // =========================================================================
  // 8. PENGUIN ENEMY (+30% LARGER, SLIDING CHASER)
  // =========================================================================
  class PenguinEnemy {
    constructor(x, y, floorIndex, speed = 1.3, dir = -1) {
      this.x = x;
      this.y = y;
      this.floorIndex = floorIndex;
      this.width = 32;       // +30% larger sprite
      this.height = 31;
      this.speed = speed;
      this.dir = dir;
      this.animTimer = 0;
      this.isSliding = false;
      this.slideTimer = 0;
      this.slideCooldown = 60 + Math.floor(Math.random() * 80);
      this.turnCooldown = 0;

      // Combat Health & Durability:
      this.maxHp = 2;
      this.hp = this.maxHp;
      this.invulnerableHitTimer = 0;

      // Stomp & defeat properties
      this.isFlattened = false;
      this.flattenTimer = 0;

      this.isShocked = false;
      this.shockTimer = 0;
      this.shockFacing = -1;

      this.isActive = true;
      this.isDefeated = false;
      this.deadVy = 0;
      this.deadVx = 0;
    }

    getBounds() {
      if (this.isSliding) {
        return { x: this.x + 2, y: this.y + 14, w: this.width - 4, h: this.height - 14 };
      }
      return { x: this.x + 4, y: this.y + 4, w: this.width - 8, h: this.height - 4 };
    }

    // Mario-style Stomp Defeat
    stompDefeat(player, level) {
      if (this.isDefeated || this.isFlattened) return;
      this.isDefeated = true;
      this.isFlattened = true;
      this.flattenTimer = 24;
      this.isShocked = false;
      this.isSliding = false;
      this.hp = 0;

      const pts = CONFIG.SCORE.DEFEAT_PENGUIN;
      player.addScore(pts);
      if (window.game && window.game.stats) {
        window.game.stats.penguinsDefeated++;
        window.game.stats.totalDefeated++;
      }
      if (level && level.particleSystem) {
        level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y - 12, `+${pts}`);
        level.particleSystem.spawnStompImpact(this.x + this.width / 2, this.y + (this.isSliding ? 14 : 4));
      }
      SFX.stomp();
    }

    hitByShockSock(player, level) {
      if (this.isDefeated || this.isFlattened || this.invulnerableHitTimer > 0) return;
      this.invulnerableHitTimer = 16;
      this.hp--;
      this.shockFacing = player.facing;
      this.isSliding = false;

      if (level && level.particleSystem) {
        level.particleSystem.spawnElectricSparks(this.x + this.width / 2, this.y + this.height / 2, 8);
      }
      SFX.electricShock();

      if (this.hp <= 0) {
        this.isShocked = true;
        this.shockTimer = 18;
        this.isDefeated = true;
        this.deadVx = (this.shockFacing || 1) * 4.2;
        this.deadVy = -5.0;
        const pts = CONFIG.SCORE.DEFEAT_PENGUIN;
        player.addScore(pts);
        if (window.game && window.game.stats) {
          window.game.stats.penguinsDefeated++;
          window.game.stats.totalDefeated++;
        }
        if (level && level.particleSystem) {
          level.particleSystem.spawnScorePopup(this.x + this.width / 2, this.y, `+${pts}`);
        }
        SFX.enemyDefeat();
      } else {
        this.isShocked = true;
        this.shockTimer = 16;
        this.dir = -player.facing;
        this.slideCooldown = 80;
        this.turnCooldown = 30;
      }
    }

    hitByHammer(player, level) {
      this.hitByShockSock(player, level);
    }

    update(level, players) {
      if (!this.isActive) return;

      // 1. Mario-style Flattened Squash animation
      if (this.isFlattened) {
        this.flattenTimer--;
        if (this.flattenTimer <= 0) {
          this.isActive = false;
        }
        return;
      }

      if (this.invulnerableHitTimer > 0) this.invulnerableHitTimer--;

      // 2. Shocked reaction from Hairy Electric Shock Sock attack
      if (this.isShocked) {
        this.shockTimer--;
        level.particleSystem.spawnElectricSparks(this.x + this.width / 2, this.y + this.height / 2, 2);
        if (this.shockTimer <= 0) {
          this.isShocked = false;
          if (this.hp <= 0) {
            this.isDefeated = true;
          }
        }
        return;
      }

      // 3. Defeated Tumble Animation
      if (this.isDefeated) {
        this.x += this.deadVx;
        this.y += this.deadVy;
        this.deadVy += 0.25;
        if (this.y > level.baseGroundY + 120) this.isActive = false;
        return;
      }

      this.animTimer++;
      if (this.turnCooldown > 0) this.turnCooldown--;

      const floor = level.floors[this.floorIndex];
      if (!floor) return;

      // Safe floor collapse interaction
      if (floor.collapseState === 'collapsed') {
        this.y += 2.8;
        for (let f = this.floorIndex - 1; f >= 0; f--) {
          const lowerFloor = level.floors[f];
          if (lowerFloor && lowerFloor.collapseState !== 'collapsed' && Math.abs(this.y + this.height - lowerFloor.y) < 6) {
            this.floorIndex = f;
            this.y = lowerFloor.y - this.height;
            this.isSliding = false;
            break;
          }
        }
        if (this.y > level.baseGroundY + 60) this.isActive = false;
        this.checkPlayerDamage(players);
        return;
      }

      // Check current foot position: fall through broken holes
      const footCol = Math.floor((this.x + this.width / 2) / CONFIG.BLOCK_WIDTH);
      if (footCol >= 0 && footCol < CONFIG.TILES_X && floor.blocks[footCol] === 0) {
        this.y += 3.2;
        this.isSliding = false;
        for (let f = this.floorIndex - 1; f >= 0; f--) {
          const lowerFloor = level.floors[f];
          if (lowerFloor && lowerFloor.collapseState !== 'collapsed' && Math.abs(this.y + this.height - lowerFloor.y) < 6) {
            this.floorIndex = f;
            this.y = lowerFloor.y - this.height;
            break;
          }
        }
        if (this.y > level.baseGroundY + 60) this.isActive = false;
        this.checkPlayerDamage(players);
        return;
      }

      // Pin y to platform surface
      this.y = floor.y - this.height;

      // BROKEN SPACE / HOLE DETECTION:
      const currentSpeed = this.isSliding ? this.speed * 1.8 : this.speed;
      const targetX = this.x + currentSpeed * this.dir;
      const targetFootCol = Math.floor((targetX + (this.dir > 0 ? this.width : 0)) / CONFIG.BLOCK_WIDTH);

      if (targetFootCol < 0 || targetFootCol >= CONFIG.TILES_X || floor.blocks[targetFootCol] === 0) {
        this.dir = -this.dir;
        this.isSliding = false;
        this.turnCooldown = 20;
      } else {
        this.x = targetX;
      }

      // Aggressive Belly Slide toward nearby player
      if (!this.isSliding && this.animTimer % 10 === 0) {
        for (const p of players) {
          if (p.isAlive && Math.abs(p.y + p.height - floor.y) < 24) {
            const dist = p.x - this.x;
            if (Math.abs(dist) < 320) {
              const testDir = dist > 0 ? 1 : -1;
              const testCol = Math.floor((this.x + (testDir > 0 ? this.width + 12 : -12)) / CONFIG.BLOCK_WIDTH);
              if (testCol >= 0 && testCol < CONFIG.TILES_X && floor.blocks[testCol] > 0) {
                this.dir = testDir;
                this.isSliding = true;
                this.slideTimer = 65;
                SFX.slide();
                break;
              }
            }
          }
        }
      }

      // Natural sliding AI
      if (!this.isSliding) {
        this.slideCooldown--;
        if (this.slideCooldown <= 0) {
          if (targetFootCol >= 0 && targetFootCol < CONFIG.TILES_X && floor.blocks[targetFootCol] > 0) {
            this.isSliding = true;
            this.slideTimer = 55 + Math.floor(Math.random() * 40);
            SFX.slide();
          } else {
            this.slideCooldown = 30;
          }
        }
      } else {
        this.slideTimer--;
        if (this.slideTimer <= 0) {
          this.isSliding = false;
          this.slideCooldown = 80 + Math.floor(Math.random() * 90);
        }
      }

      // Screen wrapping
      if (this.x < -this.width) {
        this.x = CONFIG.CANVAS_WIDTH;
      } else if (this.x > CONFIG.CANVAS_WIDTH) {
        this.x = -this.width;
      }

      // Spawn ice spray particles while sliding
      if (this.isSliding && this.animTimer % 4 === 0) {
        level.particleSystem.spawnSlideSpray(this.x + (this.dir > 0 ? 0 : this.width), floor.y - 2, this.dir);
      }

      this.checkPlayerDamage(players);
    }

    checkPlayerDamage(players) {
      if (this.isShocked || this.isDefeated || this.isFlattened || this.hp <= 0) return;
      const myBox = this.getBounds();
      const enemyTopY = (this.isSliding) ? this.y + 14 : this.y;
      const enemyHeight = (this.isSliding) ? this.height - 14 : this.height;
      const enemyMidY = enemyTopY + enemyHeight * 0.65;

      for (const p of players) {
        if (!p.isAlive || p.isInvulnerable) continue;

        const playerFeetY = p.y + p.height;
        const prevFeetY = p.prevY + p.height;
        const isFalling = (p.vy >= -0.5 || p.state === 'fall' || playerFeetY >= prevFeetY);

        // 1. Mario-style Stomp Collision Check (Checked FIRST before any touch damage!)
        const pLeft = p.x + 2;
        const pRight = p.x + p.width - 2;
        const eLeft = this.x + 2;
        const eRight = this.x + this.width - 2;
        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const crossedHead = (prevFeetY <= enemyTopY + 12 && playerFeetY >= enemyTopY - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= enemyMidY && isFalling))) {
          // Stomp succeeds! Immediately defeat enemy and bounce player upward
          this.stompDefeat(p, window.game ? window.game.levelManager : null);
          p.y = enemyTopY - p.height;
          p.vy = -6.2; // Upward Mario bounce
          p.isGrounded = false;
          p.state = 'jump';
          p.stompTimer = 16;
          p.invulnerableTimer = 16;
          return;
        }

        // 2. Airborne Dodge Clearance: if feet are above enemy, pass cleanly overhead
        if (playerFeetY <= enemyTopY + 4) {
          continue;
        }

        // 3. Ground / side collision: player takes damage only when feet are level with enemy body (not stomping)
        if (playerFeetY > enemyMidY && aabbIntersect(myBox, p.getBounds())) {
          p.takeDamage();
        }
      }
    }

    draw(ctx, cameraY) {
      if (!this.isActive) return;
      const screenY = this.y - cameraY;
      if (screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) return;
      CartoonArtist.drawPenguin(ctx, this, screenY);
    }
  }
  // =========================================================================
  // 9. MOVING PLATFORMS, COLLECTIBLES & SUMMIT CONDOR
  // =========================================================================
  class MovingPlatform {
    constructor({ x, y, width = 80, height = 16, speed = 1.0, range = 180, pattern = 'horizontal', dir = 1 }) {
      this.startX = x;
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.speed = speed;
      this.dir = dir;
      this.range = range;
      this.pattern = pattern;
      this.vx = speed * dir;
      this.vy = 0;
    }

    update(players = []) {
      if (this.pattern === 'horizontal') {
        this.x += this.vx;
        if (this.x > this.startX + this.range) {
          this.vx = -Math.abs(this.speed);
        } else if (this.x < this.startX - this.range) {
          this.vx = Math.abs(this.speed);
        }
      } else if (this.pattern === 'wrap') {
        const oldX = this.x;
        this.x += this.speed * this.dir;
        let deltaX = 0;
        if (this.dir > 0 && this.x > CONFIG.CANVAS_WIDTH + 20) {
          const newX = -this.width - 20;
          deltaX = newX - oldX;
          this.x = newX;
        } else if (this.dir < 0 && this.x < -this.width - 20) {
          const newX = CONFIG.CANVAS_WIDTH + 20;
          deltaX = newX - oldX;
          this.x = newX;
        }
        this.vx = this.speed * this.dir;

        // When cloud wraps screen edges, seamlessly wrap player standing on it
        if (deltaX !== 0 && players) {
          for (const player of players) {
            if (player.isAlive && player.ridingPlatform === this) {
              player.x += deltaX;
              player.prevX += deltaX;
            }
          }
        }
      }
    }

    draw(ctx, cameraY) {
      const screenY = this.y - cameraY;
      if (screenY < -30 || screenY > CONFIG.CANVAS_HEIGHT + 30) return;
      CartoonArtist.drawCloud(ctx, this.x, screenY, this.width, this.height);
    }
  }

  class Collectible {
    constructor(x, y, type = 'eggplant', points = 500) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.points = points;
      this.animTimer = Math.floor(Math.random() * 60);
      this.isCollected = false;
    }

    getBounds() {
      return { x: this.x + 2, y: this.y + 2, w: 20, h: 20 };
    }

    collect(player) {
      if (this.isCollected) return;
      this.isCollected = true;
      player.addScore(this.points);
      player.veggiesCollected++;
      SFX.collectible();
    }

    update() {
      this.animTimer++;
    }

    draw(ctx, cameraY) {
      if (this.isCollected) return;
      const screenY = this.y - cameraY;
      if (screenY < -30 || screenY > CONFIG.CANVAS_HEIGHT + 30) return;
      CartoonArtist.drawCollectible(ctx, this, screenY);
    }
  }

  class ExitGate {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.width = 64;
      this.height = 76;
      this.isOpen = false;
      this.openProgress = 0;
      this.animTimer = 0;
    }

    getBounds() {
      return {
        x: this.x + 8,
        y: this.y + 8,
        width: this.width - 16,
        height: this.height - 8
      };
    }

    update() {
      this.animTimer++;
      if (this.isOpen) {
        this.openProgress = Math.min(1.0, this.openProgress + 0.05);
      }
    }

    isPlayerNear(player) {
      const pBounds = player.getBounds();
      const gBounds = this.getBounds();
      return aabbIntersect(pBounds, gBounds) ||
        (Math.abs((player.x + player.width / 2) - (this.x + this.width / 2)) < 52 &&
         Math.abs((player.y + player.height) - (this.y + this.height)) < 30);
    }

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      SFX.doorOpen();
    }

    draw(ctx, cameraY, isPlayerNear = false) {
      const screenY = this.y - cameraY;
      if (screenY < -120 || screenY > CONFIG.CANVAS_HEIGHT + 100) return;
      CartoonArtist.drawExitGate(ctx, this, screenY, isPlayerNear);
    }
  }
  const SummitDoor = ExitGate;

  // =========================================================================
  // 10. COLLISION SYSTEM
  // =========================================================================
  class CollisionSystem {
    constructor(level) {
      this.level = level;
    }

    getLowestIntactFloorY() {
      if (this.level.floors.length === 0 || this.level.floors[0].collapseState !== 'collapsed') {
        return this.level.baseGroundY;
      }
      for (let f = 0; f < this.level.floors.length; f++) {
        const fl = this.level.floors[f];
        if (fl.collapseState !== 'collapsed') return fl.y;
      }
      return this.level.baseGroundY;
    }

    handleScreenWrap(entity) {
      if (entity.x + entity.width < 0) {
        entity.x = CONFIG.CANVAS_WIDTH;
      } else if (entity.x > CONFIG.CANVAS_WIDTH) {
        entity.x = -entity.width;
      }
    }

    // Upward headbutt collision: strictly player head vs platform underside while moving upward
    checkHeadCollision(player) {
      if (player.isGrounded || player.vy >= 0) return false;

      const headY = player.y;
      const prevHeadY = player.prevY;
      const feetY = player.y + player.height;
      const feetX1 = player.x + 5;
      const feetX2 = player.x + player.width - 5;

      for (let f = 0; f < this.level.floors.length; f++) {
        const floor = this.level.floors[f];
        if (floor.collapseState === 'collapsed') continue;

        // Never headbutt any floor at or below the player's body/feet
        if (floor.y >= feetY - 14) continue;

        const blockBottomY = floor.y + CONFIG.BLOCK_HEIGHT;

        // Strictly detect upward underside crossing from below
        const crossedUnderside = (prevHeadY >= blockBottomY - 5 && headY <= blockBottomY + 2 && feetY > blockBottomY);
        if (!crossedUnderside) continue;

        const col1 = Math.floor(feetX1 / CONFIG.BLOCK_WIDTH);
        const col2 = Math.floor(feetX2 / CONFIG.BLOCK_WIDTH);
        let hitSolid = false;
        let brokeAny = false;

        for (let col = col1; col <= col2; col++) {
          if (col >= 0 && col < CONFIG.TILES_X) {
            const blockType = floor.blocks[col];
            if (blockType === 1) { // Breakable Ice!
              floor.blocks[col] = 0; // Shatter block permanently for this stage
              brokeAny = true;
              this.level.registerBrokenHole(f, col, floor.y);
              this.level.spawnIceDebris(col * CONFIG.BLOCK_WIDTH, floor.y);
              this.level.particleSystem.spawnIceShatter(col * CONFIG.BLOCK_WIDTH, floor.y);
              SFX.iceBreak();
              player.addScore(CONFIG.SCORE.BREAK_ICE);
            } else if (blockType === 2 || blockType === 3 || blockType === 4) {
              hitSolid = true; // Solid unbreakable ice/stone/conveyor
            }
          }
        }

        if (brokeAny || hitSolid) {
          // Stop upward movement immediately & rebound downward once (vy > 0 prevents repeated impacts)
          player.y = blockBottomY + 1;
          player.vy = Math.max(2.0, Math.abs(CONFIG.PHYSICS.HEAD_BUMP_REBOUND));
          player.headBumpTimer = 8;
          if (hitSolid && !brokeAny) {
            SFX.hammer();
          }
          return true;
        }
      }
      return false;
    }

    // Solid side collision: player body vs platform sides without damaging blocks
    checkSideCollision(player) {
      if (Math.abs(player.x - player.prevX) > CONFIG.BLOCK_WIDTH * 2) return false;

      const pTop = player.y + 4;
      const pBottom = player.y + player.height - 4;
      const prevTop = player.prevY + 4;
      const prevBottom = player.prevY + player.height - 4;
      const pLeft = player.x + 5;
      const pRight = player.x + player.width - 5;
      const prevLeft = player.prevX + 5;
      const prevRight = player.prevX + player.width - 5;

      for (let f = 0; f < this.level.floors.length; f++) {
        const floor = this.level.floors[f];
        if (floor.collapseState === 'collapsed') continue;

        const bandTop = floor.y + 3;
        const bandBottom = floor.y + CONFIG.BLOCK_HEIGHT - 3;
        if (pBottom <= bandTop || pTop >= bandBottom) continue;
        if (prevBottom <= bandTop || prevTop >= bandBottom) continue;

        if (player.x > player.prevX) {
          const col = Math.floor(pRight / CONFIG.BLOCK_WIDTH);
          if (col >= 0 && col < CONFIG.TILES_X && floor.blocks[col] > 0) {
            const blockLeft = col * CONFIG.BLOCK_WIDTH;
            if (prevRight <= blockLeft + 2) {
              player.x = blockLeft - (player.width - 5);
              player.vx = 0;
              return true;
            }
          }
        } else if (player.x < player.prevX) {
          const col = Math.floor(pLeft / CONFIG.BLOCK_WIDTH);
          if (col >= 0 && col < CONFIG.TILES_X && floor.blocks[col] > 0) {
            const blockRight = (col + 1) * CONFIG.BLOCK_WIDTH;
            if (prevLeft >= blockRight - 2) {
              player.x = blockRight - 5;
              player.vx = 0;
              return true;
            }
          }
        }
      }
      return false;
    }

    // Mario-style Enemy Stomp Check
    checkEnemyStomp(player, enemies) {
      if (!player.isAlive || player.isInvulnerable) return false;

      const playerFeetY = player.y + player.height;
      const prevFeetY = player.prevY + player.height;
      const pLeft = player.x + 2;
      const pRight = player.x + player.width - 2;

      for (const e of enemies) {
        if (!e.isActive || e.isDefeated || e.isFlattened || e.hp <= 0) continue;

        const eTop = (e.isSliding) ? e.y + 14 : e.y;
        const eHeight = (e.isSliding) ? e.height - 14 : e.height;
        const eMid = eTop + eHeight * 0.65;
        const eLeft = e.x + 2;
        const eRight = e.x + e.width - 2;

        const horizOverlap = (pRight >= eLeft && pLeft <= eRight);
        const isFalling = (player.vy >= -0.5 || player.state === 'fall' || playerFeetY >= prevFeetY);
        const crossedHead = (prevFeetY <= eTop + 12 && playerFeetY >= eTop - 6);

        if (horizOverlap && (crossedHead || (playerFeetY <= eMid && isFalling))) {
          e.stompDefeat(player, this.level);
          player.y = eTop - player.height;
          player.vy = -6.2; // Upward Mario bounce
          player.isGrounded = false;
          player.state = 'jump';
          player.stompTimer = 16;
          player.invulnerableTimer = 16;
          return true;
        }
      }
      return false;
    }

    // Downward landing collision
    checkFloorCollision(entity, cameraY) {
      if (entity.vy < 0) return false;

      const feetY = entity.y + entity.height;
      const prevFeetY = entity.prevY + entity.height;
      const feetX1 = entity.x + 5;
      const feetX2 = entity.x + entity.width - 5;

      // 1. Ice Floors
      for (const floor of this.level.floors) {
        if (floor.collapseState === 'collapsed') continue;
        const floorTopY = floor.y;
        if (prevFeetY <= floorTopY + 8 && feetY >= floorTopY - 6) {
          const col1 = Math.floor(feetX1 / CONFIG.BLOCK_WIDTH);
          const col2 = Math.floor(feetX2 / CONFIG.BLOCK_WIDTH);
          let canStand = false;
          let conveyorSpeed = 0;

          for (let col = col1; col <= col2; col++) {
            if (col >= 0 && col < CONFIG.TILES_X) {
              const b = floor.blocks[col];
              if (b > 0) {
                canStand = true;
                if (b === 3) conveyorSpeed = -1.2;
                if (b === 4) conveyorSpeed = 1.2;
              }
            }
          }

          if (canStand) {
            entity.y = floorTopY - entity.height;
            entity.vy = 0;
            entity.isGrounded = true;
            entity.conveyorVx = conveyorSpeed;
            entity.ridingPlatform = null;
            entity.standingTier = floor.tierIndex;
            entity.standingY = entity.y;
            return true;
          }
        }
      }

      // 2. Cloud Platforms
      for (const plat of this.level.movingPlatforms) {
        if (prevFeetY <= plat.y + 10 && feetY >= plat.y - 6) {
          if (feetX2 >= plat.x && feetX1 <= plat.x + plat.width) {
            entity.y = plat.y - entity.height;
            entity.vy = 0;
            entity.isGrounded = true;
            entity.conveyorVx = 0;
            entity.ridingPlatform = plat;
            entity.standingTier = 7;
            entity.standingY = entity.y;
            return true;
          }
        }
      }

      // 3. Ground Base (Solid starting platform, never drops player into air)
      const baseGroundY = this.level.baseGroundY;
      const isGroundCollapsed = (this.level.floors.length > 0 && this.level.floors[0].collapseState === 'collapsed');
      if (!isGroundCollapsed) {
        if (prevFeetY <= baseGroundY + 16 && feetY >= baseGroundY - 6) {
          entity.y = baseGroundY - entity.height;
          entity.vy = 0;
          entity.isGrounded = true;
          entity.conveyorVx = 0;
          entity.ridingPlatform = null;
          entity.standingTier = -1;
          entity.standingY = entity.y;
          return true;
        }
      }

      entity.isGrounded = false;
      entity.conveyorVx = 0;
      entity.ridingPlatform = null;
      return false;
    }

    // Intentional Shock Sock attack: breaks reachable overhead/upper breakable ice (never standing floor beneath feet) & hits enemies
    checkHammerAttack(player, enemies) {
      const enemyHitbox = player.getSockHitbox();
      const iceHitbox = player.getIceAttackHitbox();
      if (!enemyHitbox && !iceHitbox) return;

      if (iceHitbox) {
        const feetY = player.y + player.height;
        for (let f = 0; f < this.level.floors.length; f++) {
          const floor = this.level.floors[f];
          if (floor.collapseState === 'collapsed') continue;

          // Strictly forbid breaking the floor supporting or beneath the player's feet
          if (floor.y >= feetY - 14) continue;
          if (player.isGrounded && Math.abs(floor.y - feetY) <= 18) continue;

          if (iceHitbox.y + iceHitbox.h >= floor.y && iceHitbox.y <= floor.y + CONFIG.BLOCK_HEIGHT) {
            const col1 = Math.floor(iceHitbox.x / CONFIG.BLOCK_WIDTH);
            const col2 = Math.floor((iceHitbox.x + iceHitbox.w) / CONFIG.BLOCK_WIDTH);
            for (let col = col1; col <= col2; col++) {
              if (col >= 0 && col < CONFIG.TILES_X && floor.blocks[col] === 1) {
                floor.blocks[col] = 0;
                this.level.registerBrokenHole(f, col, floor.y);
                this.level.spawnIceDebris(col * CONFIG.BLOCK_WIDTH, floor.y);
                this.level.particleSystem.spawnIceShatter(col * CONFIG.BLOCK_WIDTH, floor.y);
                SFX.iceBreak();
                player.addScore(CONFIG.SCORE.BREAK_ICE);
              }
            }
          }
        }
      }

      if (enemyHitbox) {
        for (const e of enemies) {
          if (e.isActive && !e.isDefeated && aabbIntersect(enemyHitbox, e.getBounds())) {
            e.hitByShockSock(player, this.level);
          }
        }
      }
    }

    checkSockAttack(player, enemies) {
      this.checkHammerAttack(player, enemies);
    }
  }

  // =========================================================================
  // 11. LEVEL MANAGER (ICE REPAIR REGISTRY & MOUNTAINS)
  // =========================================================================
  class LevelManager {
    constructor() {
      this.currentMountainIndex = 0;
      this.theme = THEMES[0];
      this.floors = [];
      this.enemies = [];
      this.movingPlatforms = [];
      this.collectibles = [];
      this.icicles = [];
      this.exitGate = null;
      this.summitDoor = null;
      this.particleSystem = new ParticleSystem();
      this.baseGroundY = 640;
      this.mountainHeight = CONFIG.MOUNTAIN_HEIGHT;
      this.gameTime = 0;

      // Safe progression tracking
      this.highestTierReached = 0;
      this.highestEstablishedTier = 0;
      this.tierDwellTimers = {};

      this.brokenHoles = [];
      this.isBonusStage = false;
      this.bonusTimer = 0;
      this.summitAchieved = false;
      this.mountainCleared = false;
      this.clearTimer = 0;
    }

    registerBrokenHole(floorIndex, col, y) {
      const floor = this.floors[floorIndex];
      if (floor && floor.collapseState === 'collapsed') return;
      if (this.brokenHoles.some(h => h.floorIndex === floorIndex && h.col === col)) return;
      this.brokenHoles.push({
        floorIndex,
        col,
        x: col * CONFIG.BLOCK_WIDTH,
        y,
        brokenTime: this.gameTime
      });
    }

    getUnassignedHole(floorIndex) {
      return null; // Permanently removed: ducks never repair ice
    }

    repairHole(floorIndex, col) {
      // Permanently removed: broken ice blocks remain permanently broken for the stage
    }

    spawnIceRepairParticles(x, y) {
      // Permanently removed
    }

    getDifficultyForMountain(index) {
      const idx = index;
      return {
        duckCount: Math.min(6, 3 + Math.floor(idx * 0.6)),
        duckSpeed: 1.1 + Math.min(1.5, idx * 0.18),
        penguinSpeed: 1.35 + Math.min(1.6, idx * 0.22),
        repairDelay: Math.max(60, 210 - idx * 25),
        icicles: idx >= 1
      };
    }

    loadMountain(index) {
      this.currentMountainIndex = index;
      if (window.game && window.game.stats) {
        window.game.stats.mountainsReached = Math.max(window.game.stats.mountainsReached, index + 1);
      }
      this.theme = THEMES[this.currentMountainIndex % THEMES.length];
      const diff = this.getDifficultyForMountain(this.currentMountainIndex);

      this.floors = [];
      this.brokenHoles = [];
      this.gameTime = 0;
      this.highestTierReached = 0;
      this.highestEstablishedTier = 0;
      this.tierDwellTimers = {};

      // Build 7 climbable ice floors with BROAD 84px vertical spacing - 100% PROPER SOLID PLATFORMS (NO GAPS AT START)
      for (let f = 0; f < 7; f++) {
        const floorIdx = f + 2;
        const floorY = this.baseGroundY - ((f + 1) * CONFIG.FLOOR_HEIGHT);
        const blocks = [];

        for (let col = 0; col < CONFIG.TILES_X; col++) {
          if ((col === 2 || col === 17) && f >= 3) {
            blocks.push(3); // Left conveyor for gameplay variety on higher tiers
          } else if ((col === 12 || col === 26) && f >= 3) {
            blocks.push(4); // Right conveyor for gameplay variety on higher tiers
          } else if (col % 9 === 0 && f >= 2 && col > 2 && col < CONFIG.TILES_X - 3) {
            blocks.push(2); // Occasional solid stone block obstacle
          } else {
            blocks.push(1); // 100% solid breakable ice across the entire platform! NO GAPS AT START!
          }
        }

        this.floors.push({
          floorIndex: floorIdx,
          tierIndex: f,
          y: floorY,
          blocks,
          collapseState: 'intact',
          warningTimer: 0,
          collapseTimer: 0,
          shakeOffsetX: 0,
          shakeOffsetY: 0
        });
      }

      this.enemies = [];
      this.movingPlatforms = [];
      this.icicles = [];
      this.collectibles = [];
      this.particleSystem.reset();

      // Spawn bots from BOTH SIDES of every platform so they reach the player from both directions!
      const duckVariants = ['mallard', 'blizzard', 'golden'];
      for (let f = 0; f < 7; f++) {
        const fl = this.floors[f];
        if (f % 2 === 0) {
          // Left bot moving right, right bot moving left
          this.enemies.push(new DuckEnemy(180 + f * 12, fl.y - 32, f, duckVariants[f % 3], diff.duckSpeed, 1));
          this.enemies.push(new PenguinEnemy(940 - f * 12, fl.y - 31, f, diff.penguinSpeed, -1));
        } else {
          this.enemies.push(new PenguinEnemy(200 + f * 12, fl.y - 31, f, diff.penguinSpeed, 1));
          this.enemies.push(new DuckEnemy(920 - f * 12, fl.y - 32, f, duckVariants[(f + 1) % 3], diff.duckSpeed * 1.05, -1));
        }
      }

      // Summit Cloud Platforms (Tiers 7, 8, 9) - 80px vertical spacing with wide clouds
      const topIceY = this.baseGroundY - (7 * CONFIG.FLOOR_HEIGHT); // y = 52
      // Tier 7
      this.movingPlatforms.push(new MovingPlatform({
        x: 200, y: topIceY - 80, width: 130, speed: 1.2, pattern: 'wrap', dir: 1
      }));
      this.movingPlatforms.push(new MovingPlatform({
        x: 700, y: topIceY - 80, width: 130, speed: 1.2, pattern: 'wrap', dir: -1
      }));

      // Tier 8
      this.movingPlatforms.push(new MovingPlatform({
        x: 440, y: topIceY - 160, width: 130, speed: 1.4, range: 170, pattern: 'horizontal'
      }));

      // Tier 9
      this.movingPlatforms.push(new MovingPlatform({
        x: 220, y: topIceY - 240, width: 130, speed: 1.3, pattern: 'wrap', dir: 1
      }));
      this.movingPlatforms.push(new MovingPlatform({
        x: 760, y: topIceY - 240, width: 130, speed: 1.3, pattern: 'wrap', dir: -1
      }));

      // Summit Plateau (Tier 10: Solid apex plateau at y = topIceY - 320)
      const summitFloorY = topIceY - 320;
      this.summitPlatform = new MovingPlatform({
        x: CONFIG.CANVAS_WIDTH / 2 - 250,
        y: summitFloorY,
        width: 500,
        height: 24,
        speed: 0,
        pattern: 'horizontal'
      });
      this.movingPlatforms.push(this.summitPlatform);

      // Collectible Veggies
      const veggieTypes = ['eggplant', 'carrot', 'turnip'];
      this.collectibles.push(new Collectible(240, topIceY - 80 - 28, veggieTypes[0], 500));
      this.collectibles.push(new Collectible(740, topIceY - 80 - 28, veggieTypes[0], 500));
      this.collectibles.push(new Collectible(460, topIceY - 160 - 28, veggieTypes[1], 800));
      this.collectibles.push(new Collectible(260, topIceY - 240 - 28, veggieTypes[2], 1200));
      this.collectibles.push(new Collectible(780, topIceY - 240 - 28, veggieTypes[2], 1200));

      // Summit Interactive Glowing Exit Gate
      this.exitGate = new ExitGate(CONFIG.CANVAS_WIDTH / 2 - 32, summitFloorY - 76);
      this.summitDoor = this.exitGate;

      this.isBonusStage = false;
      this.bonusTimer = CONFIG.TIMINGS.BONUS_STAGE_SECONDS * 60;
      this.summitAchieved = false;
      this.mountainCleared = false;
      this.clearTimer = 0;

      Music.play('mountain');
    }

    // Find the TOP safe platform reached so player respawns on top rather than same platform
    findTopSafePlatform(highestTierReached, enemies = []) {
      const maxTier = Math.min(6, Math.max(0, highestTierReached));
      // Search from the highest reached tier down to tier 0
      for (let t = maxTier; t >= 0; t--) {
        const floor = this.floors[t];
        if (floor && floor.collapseState !== 'collapsed') {
          let bestX = null;
          let maxEnemyDist = -1;

          for (let col = 2; col < CONFIG.TILES_X - 3; col++) {
            if (floor.blocks[col] > 0 && floor.blocks[col + 1] > 0) {
              const candX = col * CONFIG.BLOCK_WIDTH + 4;
              let minDistToEnemy = Infinity;
              for (const e of enemies) {
                if (e.isActive && !e.isDefeated && e.floorIndex === floor.tierIndex) {
                  const dist = Math.abs(e.x - candX);
                  if (dist < minDistToEnemy) minDistToEnemy = dist;
                }
              }
              if (minDistToEnemy > 130) {
                return { x: candX, y: floor.y, tier: floor.tierIndex };
              }
              if (minDistToEnemy > maxEnemyDist) {
                maxEnemyDist = minDistToEnemy;
                bestX = candX;
              }
            }
          }
          if (bestX !== null) {
            return { x: bestX, y: floor.y, tier: floor.tierIndex };
          }
          return { x: CONFIG.CANVAS_WIDTH / 2, y: floor.y, tier: floor.tierIndex };
        }
      }
      return { x: 240, y: this.baseGroundY, tier: -1 };
    }

    findSafePlatform(targetY, enemies = []) {
      let bestY = this.baseGroundY;
      let bestX = 240;
      let minScore = 999999;

      for (const f of this.floors) {
        if (f.collapseState === 'collapsed') continue;
        const yDist = Math.abs(targetY - f.y);
        for (let col = 4; col < CONFIG.TILES_X - 5; col++) {
          if (f.blocks[col] > 0 && f.blocks[col + 1] > 0) {
            const candX = col * CONFIG.BLOCK_WIDTH + 4;
            let nearestEnemyDist = 9999;
            for (const e of enemies) {
              if (e.isActive && !e.isDefeated && e.floorIndex === f.floorIndex - 2) {
                const ed = Math.abs(e.x - candX);
                if (ed < nearestEnemyDist) nearestEnemyDist = ed;
              }
            }

            const enemyPenalty = nearestEnemyDist < 180 ? (180 - nearestEnemyDist) * 12 : 0;
            const score = yDist + enemyPenalty;

            if (score < minScore) {
              minScore = score;
              bestY = f.y;
              bestX = candX;
            }
          }
        }
      }

      if (minScore > 1200) {
        for (const plat of this.movingPlatforms) {
          const yDist = Math.abs(targetY - plat.y);
          if (yDist < minScore) {
            minScore = yDist;
            bestX = plat.x + plat.width / 2;
            bestY = plat.y;
          }
        }
      }

      return { x: bestX, y: bestY };
    }

    spawnIceDebris(x, y) {
      this.particleSystem.spawnIceShatter(x, y);
    }

    onSummitAchieved(player) {
      if (this.summitAchieved) return;
      this.summitAchieved = true;
      this.mountainCleared = true;
      this.clearTimer = 110;
      if (player) {
        player.state = 'victory';
        player.vx = 0;
        player.vy = 0;
        player.addScore(CONFIG.SCORE.REACH_SUMMIT);
        player.addScore(CONFIG.SCORE.MOUNTAIN_CLEAR);
      }
      this.particleSystem.spawnScorePopup(
        CONFIG.CANVAS_WIDTH / 2,
        this.exitGate ? this.exitGate.y - 16 : 80,
        '+10000 STAGE CLEAR!'
      );
      SFX.stageClear();
      Music.play('victory');
    }

    triggerBonusStage() {
      if (this.isBonusStage) return;
      this.isBonusStage = true;
      Music.play('bonus');
    }

    updateCollapsingFloors(players) {
      // 1. Calculate highest SAFE grounded tier
      // Immediately track the highest tier reached for safe top respawns!
      // A tier counts as permanently established for floor collapsing after dwelling 45 frames.
      for (const p of players) {
        if (!p.isAlive) continue;
        if (p.isGrounded && p.standingTier !== undefined && p.standingTier >= 0) {
          if (p.standingTier > this.highestTierReached) {
            this.highestTierReached = p.standingTier;
          }
          if (p.standingTier > this.highestEstablishedTier) {
            this.tierDwellTimers[p.standingTier] = (this.tierDwellTimers[p.standingTier] || 0) + 1;
            if (this.tierDwellTimers[p.standingTier] >= 45) {
              this.highestEstablishedTier = p.standingTier;
            }
          }
        }
      }

      // Platform stability preserved: no timed or random platform destruction; only explicit player headbutts/sock attacks break ice.
    }

    update(players, camera) {
      this.gameTime++;
      this.particleSystem.update();

      // Bonus stage trigger
      const summitY = this.baseGroundY - (7 * CONFIG.FLOOR_HEIGHT);
      if (!this.isBonusStage && camera.y < summitY + 50) {
        this.triggerBonusStage();
      }

      if (this.isBonusStage && !this.summitAchieved) {
        this.bonusTimer--;
        if (this.bonusTimer <= 0) {
          this.bonusTimer = 0;
        }
      }

      // Update Collapsing Platforms
      this.updateCollapsingFloors(players);

      // Update Moving Platforms
      for (const p of this.movingPlatforms) p.update(players);

      // Update Enemies
      for (const e of this.enemies) e.update(this, players);

      // Update Collectibles
      for (const c of this.collectibles) {
        c.update();
        for (const p of players) {
          if (p.isAlive && !c.isCollected && aabbIntersect(c.getBounds(), p.getBounds())) {
            c.collect(p);
            this.particleSystem.spawnScorePopup(c.x, c.y, `+${c.points}`);
          }
        }
      }

      // Summit Exit Gate & Stage Completion
      if (this.exitGate) {
        this.exitGate.update();
        if (!this.summitAchieved) {
          for (const p of players) {
            if (p.isAlive && (aabbIntersect(p.getBounds(), this.exitGate.getBounds()) || this.exitGate.isPlayerNear(p))) {
              this.exitGate.open();
              this.onSummitAchieved(p);
              break;
            }
          }
        }
      }

      // Stage Clear Transition
      if (this.mountainCleared) {
        this.clearTimer--;
        if (this.clearTimer <= 0) {
          this.loadMountain(this.currentMountainIndex + 1);
          camera.reset(this.mountainHeight);
          players[0].resetPosition(240, this.baseGroundY - 38);
          players[0].isInvulnerable = true;
          players[0].invulnerableTimer = 90;
          players[0].state = 'idle';
          if (players[1]) {
            players[1].resetPosition(340, this.baseGroundY - 38);
            players[1].isInvulnerable = true;
            players[1].invulnerableTimer = 90;
            players[1].state = 'idle';
          }
        }
      }
    }

    draw(ctx, cameraY) {
      // 1. Sky Gradient with deep atmospheric lighting
      const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
      grad.addColorStop(0, this.theme.skyTop);
      grad.addColorStop(1, this.theme.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      // 2. Multi-layered Parallax Mountains with Aurora Borealis & Snowy Ridges
      this.drawParallaxMountains(ctx, cameraY);

      // 3. Ice Floors & Conveyors with Depth Shadows and Highlights
      for (const floor of this.floors) {
        if (floor.collapseState === 'collapsed') continue;
        const offX = floor.shakeOffsetX || 0;
        const offY = floor.shakeOffsetY || 0;
        const screenY = floor.y - cameraY + offY;
        if (screenY < -30 || screenY > CONFIG.CANVAS_HEIGHT + 30) continue;

        // Platform drop shadow: separates platforms cleanly from background mountains
        ctx.fillStyle = 'rgba(2, 8, 25, 0.42)';
        ctx.fillRect(offX, screenY + CONFIG.BLOCK_HEIGHT, CONFIG.CANVAS_WIDTH, 8);

        for (let col = 0; col < CONFIG.TILES_X; col++) {
          const type = floor.blocks[col];
          if (type > 0) {
            CartoonArtist.drawIceBlock(ctx, col * CONFIG.BLOCK_WIDTH + offX, screenY, type, this.theme);

            // Warning fracture overlay
            if (floor.collapseState === 'warning') {
              const warnAlpha = 0.25 + Math.sin(floor.warningTimer * 0.25) * 0.2;
              ctx.fillStyle = `rgba(255, 100, 30, ${warnAlpha})`;
              ctx.fillRect(col * CONFIG.BLOCK_WIDTH + offX, screenY, CONFIG.BLOCK_WIDTH, CONFIG.BLOCK_HEIGHT);
            }
          }
        }
      }

      // 4. Ground Base Floor (Starting platform with snow crest)
      const baseScreenY = this.baseGroundY - cameraY;
      if (baseScreenY < CONFIG.CANVAS_HEIGHT + 20) {
        ctx.fillStyle = 'rgba(2, 8, 25, 0.5)';
        ctx.fillRect(0, baseScreenY + 120, CONFIG.CANVAS_WIDTH, 12);

        ctx.fillStyle = this.theme.solidBase;
        ctx.fillRect(0, baseScreenY, CONFIG.CANVAS_WIDTH, 120);

        ctx.fillStyle = this.theme.iceHighlight;
        ctx.fillRect(0, baseScreenY, CONFIG.CANVAS_WIDTH, 4);

        ctx.fillStyle = this.theme.solidShadow;
        ctx.fillRect(0, baseScreenY + 4, CONFIG.CANVAS_WIDTH, 8);
      }

      // 5. Cloud Platforms & Collectibles (with soft cloud drop shadows)
      for (const p of this.movingPlatforms) {
        const pScreenY = p.y - cameraY;
        if (pScreenY > -30 && pScreenY < CONFIG.CANVAS_HEIGHT + 30) {
          ctx.fillStyle = 'rgba(4, 12, 35, 0.35)';
          ctx.beginPath();
          ctx.ellipse(p.x + p.width / 2, pScreenY + p.height + 4, p.width / 2, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        p.draw(ctx, cameraY);
      }

      for (const c of this.collectibles) c.draw(ctx, cameraY);

      // 6. Summit Platform & Exit Gate
      const summitFloorY = this.baseGroundY - (11 * CONFIG.FLOOR_HEIGHT);
      const summitScreenY = summitFloorY - cameraY;
      if (summitScreenY < CONFIG.CANVAS_HEIGHT + 40 && summitScreenY > -100) {
        CartoonArtist.drawCloud(ctx, CONFIG.CANVAS_WIDTH / 2 - 240, summitScreenY, 480, 24);
      }
      if (this.exitGate) {
        let isNear = false;
        for (const p of (window.game ? window.game.players : [])) {
          if (p.isAlive && this.exitGate.isPlayerNear(p)) {
            isNear = true;
            break;
          }
        }
        this.exitGate.draw(ctx, cameraY, isNear);
      }

      // 7. Enemies
      for (const e of this.enemies) e.draw(ctx, cameraY);

      // 8. Particles & Snow
      this.particleSystem.draw(ctx, cameraY);

      // 9. Stage Clear Transition Banner
      if (this.mountainCleared) {
        ctx.save();
        ctx.fillStyle = 'rgba(6, 13, 36, 0.88)';
        ctx.fillRect(0, CONFIG.CANVAS_HEIGHT * 0.35, CONFIG.CANVAS_WIDTH, 110);
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, CONFIG.CANVAS_HEIGHT * 0.35, CONFIG.CANVAS_WIDTH, 110);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 28px -apple-system, sans-serif';
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 16;
        ctx.fillText(`★ STAGE ${this.currentMountainIndex + 1} CLEARED! ★`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.35 + 40);

        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(`GET READY FOR STAGE ${this.currentMountainIndex + 2}!`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.35 + 78);
        ctx.restore();
      }
    }

    drawParallaxMountains(ctx, cameraY) {
      const anim = this.gameTime;

      // 1. Shimmering Aurora Borealis ribbons across upper sky
      ctx.save();
      for (let a = 0; a < 2; a++) {
        const waveY = 60 + a * 35;
        const gradAurora = ctx.createLinearGradient(0, waveY - 40, 0, waveY + 50);
        gradAurora.addColorStop(0, 'rgba(0, 229, 255, 0)');
        gradAurora.addColorStop(0.5, a === 0 ? 'rgba(0, 229, 255, 0.18)' : 'rgba(124, 77, 255, 0.15)');
        gradAurora.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradAurora;
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += 60) {
          const cy = waveY + Math.sin(anim * 0.02 + x * 0.008 + a) * 22;
          ctx.lineTo(x, cy);
        }
        ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.lineTo(0, CONFIG.CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. Far Horizon Snowy Mountain Peaks (Parallax 0.08)
      ctx.fillStyle = this.theme.mountainFar;
      ctx.beginPath();
      const p1 = cameraY * 0.08;
      ctx.moveTo(0, CONFIG.CANVAS_HEIGHT);
      ctx.lineTo(0, 150 + p1);
      ctx.lineTo(160, 80 + p1);
      ctx.lineTo(340, 170 + p1);
      ctx.lineTo(520, 60 + p1);
      ctx.lineTo(700, 160 + p1);
      ctx.lineTo(900, 70 + p1);
      ctx.lineTo(1060, 150 + p1);
      ctx.lineTo(CONFIG.CANVAS_WIDTH, 100 + p1);
      ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Far Snow Caps
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const drawPeakCap = (px, py, w, h) => {
        ctx.beginPath();
        ctx.moveTo(px, py + p1);
        ctx.lineTo(px - w / 2, py + h + p1);
        ctx.lineTo(px + w / 2, py + h + p1);
        ctx.closePath();
        ctx.fill();
      };
      drawPeakCap(160, 80, 70, 35);
      drawPeakCap(520, 60, 80, 42);
      drawPeakCap(900, 70, 74, 38);

      // 3. Mid Alpine Ridges with Pine Forest Silhouettes (Parallax 0.18)
      ctx.fillStyle = this.theme.mountainMid;
      ctx.beginPath();
      const p2 = cameraY * 0.18;
      ctx.moveTo(0, CONFIG.CANVAS_HEIGHT);
      ctx.lineTo(0, 230 + p2);
      ctx.lineTo(140, 140 + p2);
      ctx.lineTo(300, 240 + p2);
      ctx.lineTo(460, 120 + p2);
      ctx.lineTo(620, 220 + p2);
      ctx.lineTo(780, 130 + p2);
      ctx.lineTo(960, 230 + p2);
      ctx.lineTo(CONFIG.CANVAS_WIDTH, 170 + p2);
      ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Mid Snow Slopes
      ctx.fillStyle = 'rgba(224, 247, 250, 0.75)';
      ctx.beginPath();
      ctx.moveTo(140, 140 + p2); ctx.lineTo(110, 185 + p2); ctx.lineTo(170, 185 + p2); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(460, 120 + p2); ctx.lineTo(420, 175 + p2); ctx.lineTo(500, 175 + p2); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(780, 130 + p2); ctx.lineTo(745, 180 + p2); ctx.lineTo(815, 180 + p2); ctx.closePath(); ctx.fill();

      // 4. Foreground Mountain Spires Framing the Pass (Parallax 0.32)
      ctx.fillStyle = this.theme.mountainNear;
      ctx.beginPath();
      const p3 = cameraY * 0.32;
      // Left Spire
      ctx.moveTo(0, CONFIG.CANVAS_HEIGHT);
      ctx.lineTo(0, 270 + p3);
      ctx.lineTo(100, 190 + p3);
      ctx.lineTo(240, 310 + p3);
      ctx.lineTo(240, CONFIG.CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Right Spire
      ctx.beginPath();
      ctx.moveTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      ctx.lineTo(CONFIG.CANVAS_WIDTH, 260 + p3);
      ctx.lineTo(CONFIG.CANVAS_WIDTH - 120, 180 + p3);
      ctx.lineTo(CONFIG.CANVAS_WIDTH - 250, 300 + p3);
      ctx.lineTo(CONFIG.CANVAS_WIDTH - 250, CONFIG.CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // 5. Atmospheric Drifting Mountain Mist Bands
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const mistY1 = 190 + Math.sin(anim * 0.015) * 8 + (cameraY * 0.25);
      const mistY2 = 320 + Math.cos(anim * 0.012) * 10 + (cameraY * 0.35);
      ctx.fillRect(0, mistY1, CONFIG.CANVAS_WIDTH, 18);
      ctx.fillRect(0, mistY2, CONFIG.CANVAS_WIDTH, 22);
      ctx.restore();
    }
  }

  // =========================================================================
  // 12. CAMERA SYSTEM (19:6 VERTICAL SCROLL)
  // =========================================================================
  class Camera {
    constructor(mountainHeight) {
      this.y = 0;
      this.targetY = 0;
      this.minY = -420;
      this.maxY = Math.max(0, 640 + 24 - CONFIG.CANVAS_HEIGHT);
      this.reset(mountainHeight);
    }

    updateBounds(canvasHeight) {
      this.minY = -420;
      this.maxY = Math.max(0, 640 + 24 - canvasHeight);
      this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
      this.targetY = Math.max(this.minY, Math.min(this.maxY, this.targetY));
    }

    reset(mountainHeight) {
      this.maxY = Math.max(0, 640 + 24 - CONFIG.CANVAS_HEIGHT);
      this.y = this.maxY;
      this.targetY = this.maxY;
    }

    update(players, lowestFloorY) {
      const activePlayers = players.filter(p => p.isAlive);
      if (activePlayers.length === 0) {
        this.y += (this.targetY - this.y) * 0.06;
        return this.y;
      }

      // Smoothly frame the player around the upper-middle portion of the screen (55% height)
      const p = activePlayers[0];
      const playerTargetY = (p.isGrounded ? p.y : (p.standingY || p.y));
      const desiredY = playerTargetY - (CONFIG.CANVAS_HEIGHT * 0.55);

      // Camera Y range: minY (-420 at summit) to maxY (ground level)
      // Clamps to maxY so starting ground platform is firmly visible at bottom
      const target = Math.max(this.minY, Math.min(this.maxY, desiredY));

      // Smooth bidirectional tracking with gentle lerp (zero sudden jumps or jitter)
      this.targetY = target;
      this.y += (this.targetY - this.y) * 0.065;
      this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
      return this.y;
    }
  }

  // =========================================================================
  // 13. INPUT HANDLERS (KEYBOARD, GAMEPAD & TOUCH)
  // =========================================================================
  class KeyboardInput {
    constructor() {
      this.keysDown = {};
      this.justPressed = {};

      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        if (!this.keysDown[e.code]) this.justPressed[e.code] = true;
        this.keysDown[e.code] = true;
      });

      window.addEventListener('keyup', (e) => {
        this.keysDown[e.code] = false;
        this.justPressed[e.code] = false;
      });
    }

    isDown(code) {
      return !!this.keysDown[code];
    }

    isJustPressed(code) {
      const val = !!this.justPressed[code];
      this.justPressed[code] = false;
      return val;
    }

    pollGamepad() {
      if (!navigator.getGamepads) return null;
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          const left = gp.axes[0] < -0.3 || (gp.buttons[14] && gp.buttons[14].pressed);
          const right = gp.axes[0] > 0.3 || (gp.buttons[15] && gp.buttons[15].pressed);
          const up = gp.axes[1] < -0.3 || (gp.buttons[12] && gp.buttons[12].pressed);
          const down = gp.axes[1] > 0.3 || (gp.buttons[13] && gp.buttons[13].pressed);
          const jump = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed);
          const hammer = (gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[3] && gp.buttons[3].pressed);
          const start = (gp.buttons[9] && gp.buttons[9].pressed);
          return { left, right, up, down, jump, hammer, start };
        }
      }
      return null;
    }

    getPlayer1State(isTwoPlayer = false) {
      const gp = this.pollGamepad();
      if (isTwoPlayer) {
        return {
          left: this.isDown('ArrowLeft') || (gp ? gp.left : false),
          right: this.isDown('ArrowRight') || (gp ? gp.right : false),
          up: this.isDown('ArrowUp') || (gp ? gp.up : false),
          jump: this.isDown('KeyZ') || (gp ? gp.jump : false),
          hammer: this.isDown('KeyX') || (gp ? gp.hammer : false)
        };
      }
      const attack = this.isDown('KeyX') || (gp ? (gp.hammer || gp.jump) : false);
      return {
        left: this.isDown('ArrowLeft') || this.isDown('KeyA') || (gp ? gp.left : false),
        right: this.isDown('ArrowRight') || this.isDown('KeyD') || (gp ? gp.right : false),
        up: this.isDown('ArrowUp') || this.isDown('KeyW') || (gp ? gp.up : false),
        jump: this.isDown('KeyZ') || this.isDown('Space') || (gp ? gp.jump : false),
        attack: attack,
        hammer: attack
      };
    }

    getPlayer2State() {
      return {
        left: this.isDown('KeyA'),
        right: this.isDown('KeyD'),
        jump: this.isDown('KeyG'),
        hammer: this.isDown('KeyH')
      };
    }

    isPausePressed() {
      const gp = this.pollGamepad();
      return this.isJustPressed('Escape') || this.isJustPressed('KeyP') || (gp && gp.start);
    }

    isStartPressed() {
      const gp = this.pollGamepad();
      return this.isJustPressed('Enter') || this.isJustPressed('Space') || (gp && (gp.jump || gp.start));
    }

    isUpPressed() {
      const gp = this.pollGamepad();
      return this.isJustPressed('ArrowUp') || this.isJustPressed('KeyW') || (gp && gp.up);
    }

    isDownPressed() {
      const gp = this.pollGamepad();
      return this.isJustPressed('ArrowDown') || this.isJustPressed('KeyS') || (gp && gp.down);
    }
  }

  // Cross-Platform Touch Input Handler
  class TouchInput {
    constructor() {
      this.state = { left: false, right: false, jump: false, attack: false, hammer: false, pause: false };
      this.hasTouch = false;
      this.init();
    }

    init() {
      // Bind existing DOM buttons
      this.bindButton('touch-btn-left', 'left');
      this.bindButton('touch-btn-right', 'right');
      this.bindButton('touch-btn-jump', 'jump');
      this.bindButton('touch-btn-attack', 'attack');
      this.bindButton('touch-btn-hammer', 'attack');

      // Listen for actual touch interactions
      window.addEventListener('touchstart', () => {
        if (!this.hasTouch) {
          this.hasTouch = true;
          document.body.classList.add('touch-active');
        }
      }, { passive: true, once: true });
    }

    bindButton(elementId, stateKey) {
      const el = document.getElementById(elementId);
      if (!el) return;

      const setDown = (e) => {
        e.preventDefault();
        this.state[stateKey] = true;
        el.classList.add('pressed');
        APU.unlock();
        if (e.pointerId && el.setPointerCapture) {
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
        }
      };

      const setUp = (e) => {
        e.preventDefault();
        this.state[stateKey] = false;
        el.classList.remove('pressed');
      };

      el.addEventListener('pointerdown', setDown, { passive: false });
      el.addEventListener('pointerup', setUp, { passive: false });
      el.addEventListener('pointercancel', setUp, { passive: false });
      el.addEventListener('pointerleave', setUp, { passive: false });
    }

    getState() {
      return { ...this.state };
    }
  }

  // =========================================================================
  // 14. UI MANAGER & HOW TO PLAY INSTRUCTIONS
  // =========================================================================
  class UIManager {
    constructor() {
      this.titleOptions = ['1 PLAYER GAME', '2 PLAYERS GAME', 'HOW TO PLAY'];
      this.selectedOption = 0;
      this.animTimer = 0;
    }

    drawHUD(ctx, state) {
      const { players, runTimeRemaining, mountainIndex, isTwoPlayer } = state;

      // Clean translucent top bar across full 19:6 widescreen width
      ctx.fillStyle = 'rgba(6, 13, 36, 0.92)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 30);

      // Bottom border line with cyan ice glow
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(0, 29, CONFIG.CANVAS_WIDTH, 1);

      ctx.textBaseline = 'middle';
      const hudY = 15;

      // --- LEFT SECTION: PLAYER 1 (AND 2P IF ACTIVE) ---
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('1P SCORE', 24, hudY);

      ctx.font = '900 14px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      const p1ScoreStr = String(players[0] ? players[0].score : 0).padStart(6, '0');
      ctx.fillText(p1ScoreStr, 96, hudY);

      // Lives counter
      const p1Lives = players[0] ? Math.max(0, players[0].lives) : 0;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillStyle = '#ff5252';
      ctx.fillText(`♥ × ${p1Lives}`, 174, hudY);

      if (isTwoPlayer && players[1]) {
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.fillStyle = '#ba68c8';
        ctx.fillText('2P SCORE', 236, hudY);

        ctx.font = '900 14px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ffffff';
        const p2ScoreStr = String(players[1].score).padStart(6, '0');
        ctx.fillText(p2ScoreStr, 308, hudY);

        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.fillStyle = '#f06292';
        ctx.fillText(`♥ × ${Math.max(0, players[1].lives)}`, 380, hudY);
      }

      // --- CENTER SECTION: 90-SECOND COUNTDOWN TIMER ---
      const centerX = CONFIG.CANVAS_WIDTH / 2;
      ctx.textAlign = 'center';
      const timeLeft = Math.max(0, runTimeRemaining !== undefined ? runTimeRemaining : 90);

      if (timeLeft > 10) {
        ctx.font = '900 15px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ffeb3b'; // Arcade yellow
        ctx.shadowColor = 'rgba(255, 235, 59, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fillText(`TIME: ${Math.ceil(timeLeft)}`, centerX, hudY);
      } else {
        // Low time warning pulse (<10s) with decimal
        const pulse = Math.sin(Date.now() * 0.015);
        ctx.font = '900 15px "Courier New", Courier, monospace';
        ctx.fillStyle = pulse > 0 ? '#ff1744' : '#ffeb3b';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.fillText(`TIME: ${timeLeft.toFixed(1)}s`, centerX, hudY);
      }
      ctx.shadowBlur = 0;

      // --- RIGHT SECTION: CURRENT MOUNTAIN / STAGE THEME ---
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#69f0ae';
      const themeName = THEMES[mountainIndex % THEMES.length].name.toUpperCase();
      ctx.fillText(`STAGE ${mountainIndex + 1} : ${themeName}`, CONFIG.CANVAS_WIDTH - 24, hudY);
    }

    drawStartPrompt(ctx) {
      this.animTimer++;
      const pulse = Math.sin(this.animTimer * 0.08);
      const scale = 1 + pulse * 0.035;

      ctx.save();
      ctx.translate(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.scale(scale, scale);

      // Frosted Glass Rounded Badge
      ctx.fillStyle = 'rgba(6, 16, 45, 0.88)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-240, -48, 480, 96, 24);
      ctx.fill();
      ctx.stroke();

      // Main Animated Text: TOUCH ANYWHERE TO START
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffe600';
      ctx.font = '900 24px -apple-system, sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ TOUCH ANYWHERE TO START ⚡', 0, -12);

      // Sub-caption
      ctx.shadowBlur = 0;
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillStyle = '#b2ebf2';
      ctx.fillText('CLICK, TAP OR PRESS SPACE / ENTER', 0, 18);
      ctx.restore();
    }

    drawTitleScreen(ctx) {
      this.drawStartPrompt(ctx);
    }

    drawHowToPlay(ctx) {
      this.drawStartPrompt(ctx);
    }

    drawPause(ctx) {
      ctx.fillStyle = 'rgba(6, 12, 34, 0.7)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      ctx.textAlign = 'center';
      ctx.font = '900 32px -apple-system, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS ESC, P, OR TAP TO RESUME', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 35);
    }

    drawStageComplete(ctx, mountainNum, score) {
      // Semi-transparent backdrop
      ctx.fillStyle = 'rgba(6, 12, 34, 0.75)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      ctx.save();
      const centerX = CONFIG.CANVAS_WIDTH / 2;
      const centerY = CONFIG.CANVAS_HEIGHT / 2 - 10;

      // Decorative Ribbon Banner
      const bannerW = 460;
      const bannerH = 120;
      ctx.fillStyle = 'rgba(13, 71, 161, 0.9)';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(centerX - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH, 16);
      ctx.fill();
      ctx.stroke();

      // Golden Header
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd54f';
      ctx.textAlign = 'center';
      ctx.font = '900 28px -apple-system, sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('★ STAGE COMPLETE! ★', centerX, centerY - 14);

      // Subtitle
      ctx.shadowBlur = 0;
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.fillStyle = '#e0f7fa';
      ctx.fillText(`MOUNTAIN ${mountainNum} CONQUERED!`, centerX, centerY + 14);

      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillStyle = '#81c784';
      ctx.fillText(`SUMMIT BONUS +10,000  •  MOUNTAIN CLEAR +3,000`, centerX, centerY + 38);

      ctx.restore();
    }

    drawGameOver(ctx, players, stats, reason = 'LIVES_ZERO') {
      this.animTimer++;
      ctx.save();

      // Fullscreen dark backdrop
      ctx.fillStyle = 'rgba(4, 9, 28, 0.94)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      const centerX = CONFIG.CANVAS_WIDTH / 2;
      const centerY = CONFIG.CANVAS_HEIGHT / 2;

      // Frosted Modal Card (centered, 660x310)
      const cardW = 660;
      const cardH = 310;
      const cardX = centerX - cardW / 2;
      const cardY = centerY - cardH / 2;

      ctx.fillStyle = 'rgba(10, 22, 54, 0.92)';
      ctx.strokeStyle = (reason === 'TIME_UP') ? '#ffd54f' : '#ff5252';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = (reason === 'TIME_UP') ? 'rgba(255, 213, 79, 0.5)' : 'rgba(255, 82, 82, 0.5)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Header: TIME'S UP! or GAME OVER
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 28px -apple-system, sans-serif';
      if (reason === 'TIME_UP') {
        ctx.fillStyle = '#ffeb3b';
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = 12;
        ctx.fillText("⏰ TIME'S UP!", centerX, cardY + 34);
      } else {
        ctx.fillStyle = '#ff5252';
        ctx.shadowColor = '#d50000';
        ctx.shadowBlur = 12;
        ctx.fillText("💀 GAME OVER", centerX, cardY + 34);
      }
      ctx.shadowBlur = 0;

      // FINAL SCORE
      const scoreVal = players[0] ? players[0].score : 0;
      const scoreStr = String(scoreVal).padStart(6, '0');
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillStyle = '#80deea';
      ctx.fillText('FINAL SCORE', centerX, cardY + 68);

      ctx.font = '900 32px "Courier New", Courier, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillText(scoreStr, centerX, cardY + 96);
      ctx.shadowBlur = 0;

      // Stats Grid - 5 sleek stat pills
      const runStats = stats || { totalDefeated: 0, ducksDefeated: 0, penguinsDefeated: 0, mountainsReached: 1 };
      const remainingLives = players[0] ? Math.max(0, players[0].lives) : 0;

      const statItems = [
        { label: 'TOTAL FOES', val: runStats.totalDefeated, icon: '⚡', color: '#ffca28' },
        { label: 'DUCKS', val: runStats.ducksDefeated, icon: '🦆', color: '#66bb6a' },
        { label: 'PENGUINS', val: runStats.penguinsDefeated, icon: '🐧', color: '#42a5f5' },
        { label: 'STAGE REACHED', val: runStats.mountainsReached, icon: '🏔', color: '#ab47bc' },
        { label: 'LIVES LEFT', val: remainingLives, icon: '♥', color: '#ef5350' }
      ];

      const pillW = 112;
      const pillH = 50;
      const gap = 12;
      const totalPillsW = statItems.length * pillW + (statItems.length - 1) * gap;
      const startPillX = centerX - totalPillsW / 2;
      const pillY = cardY + 130;

      statItems.forEach((st, idx) => {
        const px = startPillX + idx * (pillW + gap);
        // Pill background
        ctx.fillStyle = 'rgba(6, 14, 38, 0.75)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(px, pillY, pillW, pillH, 10);
        ctx.fill();
        ctx.stroke();

        // Value with icon
        ctx.font = '900 16px -apple-system, sans-serif';
        ctx.fillStyle = st.color;
        ctx.fillText(`${st.icon} ${st.val}`, px + pillW / 2, pillY + 18);

        // Label
        ctx.font = 'bold 9px -apple-system, sans-serif';
        ctx.fillStyle = '#b0bec5';
        ctx.fillText(st.label, px + pillW / 2, pillY + 36);
      });

      // Interactive PLAY AGAIN Button
      const btnW = 240;
      const btnH = 44;
      const btnX = centerX - btnW / 2;
      const btnY = cardY + 204;

      const pulse = Math.sin(this.animTimer * 0.08);
      const btnGlow = 10 + pulse * 4;

      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, '#00e676');
      btnGrad.addColorStop(1, '#00b0ff');

      ctx.fillStyle = btnGrad;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = btnGlow;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 22);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = '900 16px -apple-system, sans-serif';
      ctx.fillStyle = '#041624';
      ctx.fillText('▶ PLAY AGAIN', centerX, btnY + btnH / 2);

      // Subtext prompt
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillStyle = '#80deea';
      ctx.fillText('CLICK / TAP BUTTON OR PRESS SPACE / ENTER', centerX, cardY + 276);

      ctx.restore();
    }
  }

  // =========================================================================
  // 15. MAIN GAME ENGINE (19:6 WIDESCREEN & FREEZE-PROOF GAME LOOP)
  // =========================================================================
  class IceBreakerGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');

      this.keyboard = new KeyboardInput();
      this.touch = new TouchInput();
      this.levelManager = new LevelManager();
      this.collisionSystem = new CollisionSystem(this.levelManager);
      this.camera = new Camera(this.levelManager.mountainHeight);
      this.ui = new UIManager();

      this.players = [];
      this.isTwoPlayer = false;
      this.state = 'WAIT_START';
      this.hasStarted = false;

      this.lastTime = 0;
      this.accumulator = 0;
      this.stepSize = CONFIG.FRAME_TIME;
      this.animFrameId = null;
      this.isStopped = false;

      this.runTimeRemaining = 90.0;
      this.gameOverReason = 'LIVES_ZERO';
      this.stats = {
        totalDefeated: 0,
        ducksDefeated: 0,
        penguinsDefeated: 0,
        mountainsReached: 1
      };

      this.initEvents();
      this.resize();

      // Pre-load mountain and Shinchan immediately so the mountain, platforms, and Shinchan are rendered instantly on boot!
      this.startNewGame(false);
      this.state = 'WAIT_START';
      this.render();

      this.animFrameId = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
      const windowW = window.innerWidth || document.documentElement.clientWidth || 1140;
      const windowH = window.innerHeight || document.documentElement.clientHeight || 640;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      CONFIG.CANVAS_WIDTH = 1140;
      CONFIG.CANVAS_HEIGHT = Math.max(340, Math.round(1140 / (windowW / windowH)));

      this.canvas.width = Math.round(windowW * dpr);
      this.canvas.height = Math.round(windowH * dpr);

      const scale = (windowW * dpr) / CONFIG.CANVAS_WIDTH;
      this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.ctx.imageSmoothingEnabled = true;

      if (this.camera) {
        this.camera.updateBounds(CONFIG.CANVAS_HEIGHT);
      }

      if (this.state) this.render();
    }

    initEvents() {
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('fullscreenchange', () => this.resize());
      document.addEventListener('webkitfullscreenchange', () => this.resize());

      const fsBtn = document.getElementById('fullscreen-btn');
      if (fsBtn) {
        fsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!document.fullscreenElement) {
            (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || function(){}).call(document.documentElement).catch(() => {});
          } else {
            (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document).catch(() => {});
          }
        });
      }

      document.addEventListener('visibilitychange', () => {
        this.lastTime = 0;
        this.accumulator = 0;
      });
      window.addEventListener('blur', () => {
        this.lastTime = 0;
        this.accumulator = 0;
      });
      window.addEventListener('focus', () => {
        this.lastTime = performance.now();
        this.accumulator = 0;
      });

      const handleUserStart = () => {
        if (this.state === 'WAIT_START' || this.state === 'TITLE') {
          this.startGameNow();
        } else if (this.state === 'GAME_OVER') {
          this.hasStarted = false;
          this.startNewGame(false);
          this.startGameNow();
        } else if (this.state === 'PAUSED') {
          this.state = 'PLAYING';
        }
      };

      this.canvas.addEventListener('click', handleUserStart);
      this.canvas.addEventListener('touchstart', handleUserStart, { passive: true });
      window.addEventListener('keydown', (e) => {
        if (['Space', 'Enter', 'KeyX', 'KeyZ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          if (this.state === 'WAIT_START' || this.state === 'TITLE' || this.state === 'GAME_OVER') {
            handleUserStart();
          }
        }
      });
    }

    startGameNow() {
      if (this.hasStarted && this.state === 'PLAYING') return;
      this.hasStarted = true;
      APU.unlock();
      SFX.shinchanStart();
      Music.play('mountain');
      this.state = 'PLAYING';
    }

    startNewGame(isTwoPlayer = false) {
      this.isTwoPlayer = isTwoPlayer;
      this.runTimeRemaining = 90.0;
      this.gameOverReason = 'LIVES_ZERO';
      this.stats = {
        totalDefeated: 0,
        ducksDefeated: 0,
        penguinsDefeated: 0,
        mountainsReached: 1
      };
      this.levelManager.loadMountain(0);
      this.players = [];

      const groundY = this.levelManager.baseGroundY;
      const p1 = new Player(1, 240, groundY - 38);
      this.players.push(p1);

      if (this.isTwoPlayer) {
        const p2 = new Player(2, 340, groundY - 38);
        this.players.push(p2);
      }

      this.camera.reset(this.levelManager.mountainHeight);
      this.state = 'PLAYING';
      SFX.menuConfirm();
    }

    loop(currentTime) {
      if (this.isStopped) return;

      if (!this.lastTime) this.lastTime = currentTime;
      const rawDelta = currentTime - this.lastTime;
      this.lastTime = currentTime;

      // Strict delta clamp between 0 and 50ms to completely prevent spiral of death
      const delta = Math.min(Math.max(rawDelta, 0), 33.3);

      this.accumulator += delta;
      let updateCount = 0;
      // Cap physics steps per animation frame to at most 2
      while (this.accumulator >= this.stepSize && updateCount < 2) {
        try {
          this.update();
        } catch (err) {
          console.error("Game loop update error caught:", err);
        }
        this.accumulator -= this.stepSize;
        updateCount++;
      }

      // Discard residual accumulator debt if behind to ensure silky 60 FPS
      if (updateCount >= 2) {
        this.accumulator = 0;
      }

      try {
        this.render();
      } catch (err) {
        console.error("Game loop render error caught:", err);
      }

      if (!this.isStopped) {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.animFrameId = requestAnimationFrame((t) => this.loop(t));
      }
    }

    stop() {
      this.isStopped = true;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      Music.stop();
    }

    update() {
      if (this.keyboard.isPausePressed() || this.touch.getState().pause) {
        if (this.state === 'PLAYING') {
          this.state = 'PAUSED';
          SFX.menuSelect();
        } else if (this.state === 'PAUSED') {
          this.state = 'PLAYING';
          SFX.menuSelect();
        }
      }

      switch (this.state) {
        case 'WAIT_START':
        case 'TITLE':
        case 'HOW_TO_PLAY':
          if (this.keyboard.isStartPressed() || this.touch.getState().jump || this.touch.getState().attack) {
            this.startGameNow();
          }
          break;

        case 'PLAYING':
          // 90-second countdown timer for current run
          this.runTimeRemaining = Math.max(0, this.runTimeRemaining - (this.stepSize / 1000));
          if (this.runTimeRemaining <= 0) {
            this.runTimeRemaining = 0;
            this.gameOverReason = 'TIME_UP';
            this.state = 'GAME_OVER';
            Music.play('gameover');
            SFX.death();
            break;
          }

          const p1Key = this.keyboard.getPlayer1State(this.isTwoPlayer);
          const touchState = this.touch.getState();
          const isNearDoor = this.levelManager.summitDoor && this.levelManager.summitDoor.isPlayerNear(this.players[0]);
          const p1Combined = {
            left: p1Key.left || touchState.left,
            right: p1Key.right || touchState.right,
            jump: p1Key.jump || touchState.jump,
            attack: p1Key.attack || p1Key.hammer || touchState.attack || touchState.hammer,
            hammer: p1Key.attack || p1Key.hammer || touchState.attack || touchState.hammer,
            up: p1Key.up || this.keyboard.isUpPressed() || (isNearDoor && touchState.jump)
          };
          this.players[0].handleInput(p1Combined);

          if (this.isTwoPlayer && this.players[1]) {
            const p2Key = this.keyboard.getPlayer2State();
            this.players[1].handleInput(p2Key);
          }

          // Immediately check player attack hits against nearby enemies before bot moves
          for (const p of this.players) {
            if (p.isAlive && p.isSwinging) {
              this.collisionSystem.checkHammerAttack(p, this.levelManager.enemies);
            }
          }

          const lowestIntactY = this.collisionSystem.getLowestIntactFloorY();
          const cameraY = this.camera.update(this.players, lowestIntactY);
          this.levelManager.update(this.players, this.camera);

          for (const p of this.players) {
            p.update(this.collisionSystem, cameraY);
            if (p.isAlive) {
              if (p.isSwinging) {
                this.collisionSystem.checkHammerAttack(p, this.levelManager.enemies);
              }
              // Check downward stomp after player update
              this.collisionSystem.checkEnemyStomp(p, this.levelManager.enemies);
            }

            // Respawn on the TOP safe platform reached rather than the same platform!
            if (!p.isAlive && p.lives > 0 && p.deathTimer <= 0) {
              const safeSpot = this.levelManager.findTopSafePlatform(this.levelManager.highestTierReached, this.levelManager.enemies);
              p.respawn(safeSpot.x, safeSpot.y - p.height, safeSpot.tier);
              p.isInvulnerable = true;
              p.invulnerableTimer = 120; // 2s generous invulnerability
              // Reposition camera to comfortably frame top respawned platform
              this.camera.targetY = Math.max(this.camera.minY, Math.min(this.camera.maxY, p.y - CONFIG.CANVAS_HEIGHT * 0.55));
              this.camera.y = this.camera.targetY;
            }

          }

          if (this.players.every(p => p.lives <= 0 && p.deathTimer <= 0)) {
            this.gameOverReason = 'LIVES_ZERO';
            this.state = 'GAME_OVER';
            Music.play('gameover');
          }
          break;

        case 'GAME_OVER':
          if (this.keyboard.isStartPressed()) {
            SFX.menuConfirm();
            this.startNewGame(this.isTwoPlayer);
          }
          break;
      }
    }

    render() {
      this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

      switch (this.state) {
        case 'WAIT_START':
        case 'TITLE':
        case 'HOW_TO_PLAY':
          this.levelManager.draw(this.ctx, this.camera.y);
          for (const p of this.players) p.draw(this.ctx, this.camera.y);
          this.ui.drawHUD(this.ctx, {
            players: this.players,
            runTimeRemaining: this.runTimeRemaining,
            mountainIndex: this.levelManager.currentMountainIndex,
            isTwoPlayer: this.isTwoPlayer
          });
          this.ui.drawStartPrompt(this.ctx);
          break;

        case 'PLAYING':
        case 'PAUSED':
          this.levelManager.draw(this.ctx, this.camera.y);
          for (const p of this.players) p.draw(this.ctx, this.camera.y);

          this.ui.drawHUD(this.ctx, {
            players: this.players,
            runTimeRemaining: this.runTimeRemaining,
            mountainIndex: this.levelManager.currentMountainIndex,
            isTwoPlayer: this.isTwoPlayer
          });

          if (this.levelManager.mountainCleared) {
            this.ui.drawStageComplete(this.ctx, this.levelManager.currentMountainIndex + 1, this.players[0].score);
          }

          if (this.state === 'PAUSED') this.ui.drawPause(this.ctx);
          break;

        case 'GAME_OVER':
          this.ui.drawGameOver(this.ctx, this.players, this.stats, this.gameOverReason);
          break;
      }
    }
  }

  // Bulletproof bootloader: immediate execution if DOM canvas is ready, with fallback listeners
  function bootGame() {
    if (window.game) return;
    try {
      window.CartoonArtist = CartoonArtist;
      window.SFX = SFX;
      window.APU = APU;
      window.CONFIG = CONFIG;
      window.Music = Music;
      window.IceBreakerGame = IceBreakerGame;
      window.DuckEnemy = DuckEnemy;
      window.PenguinEnemy = PenguinEnemy;
      window.game = new IceBreakerGame();
    } catch (err) {
      window.bootError = err.message + '\n' + err.stack;
      console.error("Boot error:", err);
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#060d24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText("BOOT ERROR: " + err.message, 20, 40);
      }
    }
  }

  // Multi-tier boot trigger: immediate if canvas is present, plus DOMContentLoaded & load events
  if (document.getElementById('game-canvas')) {
    bootGame();
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootGame);
  }
  window.addEventListener('load', bootGame);

})();
