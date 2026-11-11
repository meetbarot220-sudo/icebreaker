/**
 * main.js - Master Game Loop, State Machine, Input Orchestration & High Scores
 */

import { CONFIG } from './config.js';
import { GameRenderer } from './graphics/renderer.js';
import { KeyboardInput } from './input/keyboard.js';
import { GamepadInput } from './input/gamepad.js';
import { TouchInput } from './input/touch.js';
import { LevelManager } from './level/levelManager.js';
import { CollisionSystem } from './physics/collision.js';
import { Player } from './entities/player.js';
import { Camera } from './level/camera.js';
import { MenuSystem } from './ui/menu.js';
import { Music } from './audio/music.js';
import { APU } from './audio/soundChip.js';
import { SFX } from './audio/sfx.js';
import { Sprites } from './graphics/spriteData.js';

class IceBreakerGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.keyboard = new KeyboardInput();
    this.gamepad = new GamepadInput();
    this.touch = new TouchInput();

    // High score loaded from localStorage
    this.highScore = parseInt(localStorage.getItem('icebreaker_highscore') || '10000', 10);

    // Systems
    this.levelManager = new LevelManager();
    this.collisionSystem = new CollisionSystem(this.levelManager);
    this.camera = new Camera();
    this.menuSystem = new MenuSystem();

    // Players
    this.isTwoPlayer = false;
    this.players = [];

    // Master Game State
    // 'TITLE' | 'HOW_TO_PLAY' | 'OPTIONS' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
    this.state = 'TITLE';

    // Loop Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.stepSize = CONFIG.FRAME_TIME;

    this.init();
  }

  init() {
    Sprites.init();
    Music.play('title');

    // Setup window event handlers (audio unlock on user gesture)
    const unlockAudio = () => {
      APU.unlock();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Setup fullscreen button
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Start 60 FPS loop
    requestAnimationFrame((t) => this.loop(t));
  }

  toggleFullscreen() {
    const container = document.getElementById('game-container');
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }

  startNewGame(twoPlayer = false) {
    this.isTwoPlayer = twoPlayer;
    this.players = [];

    // Player 1 (Pip - Blue)
    const p1 = new Player(1, 64, this.levelManager.baseGroundY - 16);
    this.players.push(p1);

    // Player 2 (Penny - Pink) if 2-player mode enabled
    if (this.isTwoPlayer) {
      const p2 = new Player(2, 112, this.levelManager.baseGroundY - 16);
      this.players.push(p2);
    }

    this.levelManager.loadMountain(0);
    this.camera.reset(this.levelManager.mountainHeight);
    this.state = 'PLAYING';
    SFX.menuConfirm();
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Fixed timestep accumulation for rock-solid deterministic 60 FPS physics
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= this.stepSize) {
      this.update();
      this.accumulator -= this.stepSize;
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update() {
    // Check Pause Toggle
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
      case 'TITLE':
        this.updateTitle();
        break;
      case 'HOW_TO_PLAY':
        this.updateHowToPlay();
        break;
      case 'OPTIONS':
        this.updateOptions();
        break;
      case 'PLAYING':
        this.updatePlaying();
        break;
      case 'PAUSED':
        // Do nothing while paused
        break;
      case 'GAME_OVER':
        this.updateGameOver();
        break;
    }
  }

  updateTitle() {
    if (this.keyboard.isUpPressed()) {
      this.menuSystem.selectedOption = (this.menuSystem.selectedOption - 1 + 4) % 4;
      SFX.menuSelect();
    } else if (this.keyboard.isDownPressed()) {
      this.menuSystem.selectedOption = (this.menuSystem.selectedOption + 1) % 4;
      SFX.menuSelect();
    }

    if (this.keyboard.isStartPressed() || this.gamepad.isStartPressed(0)) {
      SFX.menuConfirm();
      switch (this.menuSystem.selectedOption) {
        case 0: // 1 Player
          this.startNewGame(false);
          break;
        case 1: // 2 Players
          this.startNewGame(true);
          break;
        case 2: // How To Play
          this.state = 'HOW_TO_PLAY';
          break;
        case 3: // Options
          this.state = 'OPTIONS';
          break;
      }
    }
  }

  updateHowToPlay() {
    if (this.keyboard.isStartPressed() || this.keyboard.isPausePressed() || this.gamepad.isStartPressed(0)) {
      SFX.menuConfirm();
      this.state = 'TITLE';
    }
  }

  updateOptions() {
    if (this.keyboard.isUpPressed()) {
      this.menuSystem.selectedOptionMenu = (this.menuSystem.selectedOptionMenu - 1 + 3) % 3;
      SFX.menuSelect();
    } else if (this.keyboard.isDownPressed()) {
      this.menuSystem.selectedOptionMenu = (this.menuSystem.selectedOptionMenu + 1) % 3;
      SFX.menuSelect();
    }

    if (this.keyboard.isStartPressed() || this.gamepad.isStartPressed(0)) {
      switch (this.menuSystem.selectedOptionMenu) {
        case 0: // Toggle CRT
          this.renderer.toggleCRT();
          SFX.menuSelect();
          break;
        case 1: // Toggle Audio
          APU.toggleMute();
          SFX.menuSelect();
          break;
        case 2: // Back
          SFX.menuConfirm();
          this.state = 'TITLE';
          break;
      }
    }
  }

  updateGameOver() {
    if (this.keyboard.isUpPressed() || this.keyboard.isDownPressed()) {
      this.menuSystem.selectedGameOver = 1 - this.menuSystem.selectedGameOver;
      SFX.menuSelect();
    }

    if (this.keyboard.isStartPressed() || this.gamepad.isStartPressed(0)) {
      SFX.menuConfirm();
      if (this.menuSystem.selectedGameOver === 0) {
        // Restart game with same player count
        this.startNewGame(this.isTwoPlayer);
      } else {
        // Return to title
        this.state = 'TITLE';
        Music.play('title');
      }
    }
  }

  updatePlaying() {
    // 1. Gather Input for Player 1
    const p1Key = this.keyboard.getPlayer1State(this.isTwoPlayer);
    const p1Gp = this.gamepad.getState(0);
    const touchState = this.touch.getState();

    const p1Combined = {
      left: p1Key.left || p1Gp.left || touchState.left,
      right: p1Key.right || p1Gp.right || touchState.right,
      jump: p1Key.jump || p1Gp.jump || touchState.jump,
      hammer: p1Key.hammer || p1Gp.hammer || touchState.hammer
    };

    this.players[0].handleInput(p1Combined);

    // 2. Gather Input for Player 2 (if active)
    if (this.isTwoPlayer && this.players[1]) {
      const p2Key = this.keyboard.getPlayer2State();
      const p2Gp = this.gamepad.getState(1);

      const p2Combined = {
        left: p2Key.left || p2Gp.left,
        right: p2Key.right || p2Gp.right,
        jump: p2Key.jump || p2Gp.jump,
        hammer: p2Key.hammer || p2Gp.hammer
      };

      this.players[1].handleInput(p2Combined);
    }

    // 3. Update Camera
    const cameraY = this.camera.update(this.players);

    // 4. Update Level, Enemies, Hazards, Moving Platforms, Collectibles
    this.levelManager.update(this.players, this.camera);

    // 5. Update Players
    for (const p of this.players) {
      p.update(this.collisionSystem, cameraY);

      // Check player hammer attacks against enemies and breakable ice
      if (p.isSwinging) {
        this.collisionSystem.checkHammerAttack(p, this.levelManager.enemies);
      }

      // Handle Respawn after death if lives remain
      if (!p.isAlive && p.lives > 0 && p.deathTimer <= 0) {
        // Find safe platform on current visible screen to respawn
        const respawnY = Math.min(this.levelManager.baseGroundY - 16, cameraY + 180);
        p.respawn(64 + (p.id - 1) * 48, respawnY);
      }

      // Update High Score
      if (p.score > this.highScore) {
        this.highScore = p.score;
        localStorage.setItem('icebreaker_highscore', String(this.highScore));
      }
    }

    // 6. Check Game Over (When all players have lost all lives)
    const allDead = this.players.every(p => p.lives <= 0 && p.deathTimer <= 0);
    if (allDead) {
      this.state = 'GAME_OVER';
      Music.play('gameover');
    }
  }

  render() {
    this.renderer.clear();
    const ctx = this.renderer.ctx;

    switch (this.state) {
      case 'TITLE':
        this.menuSystem.drawTitleScreen(ctx, this.highScore);
        break;
      case 'HOW_TO_PLAY':
        this.menuSystem.drawHowToPlay(ctx);
        break;
      case 'OPTIONS':
        this.menuSystem.drawOptions(ctx, this.renderer.crtEnabled, APU.muted);
        break;
      case 'PLAYING':
      case 'PAUSED':
        // Draw Level and World
        this.levelManager.draw(ctx, this.camera.y);

        // Draw Players
        for (const p of this.players) {
          p.draw(ctx, this.camera.y);
        }

        // Draw HUD
        this.renderer.drawHUD({
          players: this.players,
          highScore: this.highScore,
          mountainIndex: this.levelManager.currentMountainIndex,
          isBonusStage: this.levelManager.isBonusStage,
          bonusSeconds: this.levelManager.bonusTimer / 60,
          isTwoPlayer: this.isTwoPlayer
        });

        // Draw Pause overlay if paused
        if (this.state === 'PAUSED') {
          this.menuSystem.drawPause(ctx);
        }
        break;

      case 'GAME_OVER':
        this.menuSystem.drawGameOver(ctx, this.players, this.highScore, this.isTwoPlayer);
        break;
    }

    // Post processing (optional CRT scanlines)
    this.renderer.applyPostEffects();
  }
}

// Start game once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new IceBreakerGame();
});
