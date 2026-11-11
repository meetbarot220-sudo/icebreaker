/**
 * levelManager.js - Mountain level management, tile rendering, enemy spawner, and bonus tracking
 */

import { CONFIG } from '../config.js';
import { MOUNTAIN_DATA } from './levelData.js';
import { MOUNTAIN_PALETTES, C } from '../graphics/palette.js';
import {
  createBreakableIceCanvas,
  createSolidIceCanvas,
  createConveyorIceCanvas
} from '../graphics/spriteData.js';
import { TopiEnemy, BirdEnemy, StomperBear } from '../entities/enemy.js';
import { MovingPlatform } from '../entities/platform.js';
import { Icicle } from '../entities/icicle.js';
import { Collectible, SummitEagle } from '../entities/collectible.js';
import { ParticleSystem } from '../entities/particle.js';
import { Music } from '../audio/music.js';
import { SFX } from '../audio/sfx.js';

export class LevelManager {
  constructor() {
    this.currentMountainIndex = 0;
    this.mountainData = null;
    this.palette = null;

    // Mountain geometry
    this.mountainHeight = CONFIG.MOUNTAIN_HEIGHT;
    this.baseGroundY = this.mountainHeight - 12;

    // Floor layers
    // Each floor object: { floorIndex: int, y: number, blocks: int[16] }
    this.floors = [];

    // Entities
    this.enemies = [];
    this.movingPlatforms = [];
    this.icicles = [];
    this.collectibles = [];
    this.eagle = null;
    this.stomperBear = null;

    // Particle system
    this.particleSystem = new ParticleSystem();

    // Spawners & Timers
    this.birdTimer = 0;
    this.icicleTimer = 0;
    this.bearTimer = 0;
    this.lastCameraTargetY = 0;

    // Bonus Stage & Summit State
    this.isBonusStage = false;
    this.bonusTimer = 0;
    this.summitAchieved = false;
    this.mountainCleared = false;
    this.clearTimer = 0;

    // Tile image caches for current mountain palette
    this.tileCache = {
      breakable: null,
      solid: null,
      conveyorL: null,
      conveyorR: null
    };
  }

  loadMountain(index) {
    this.currentMountainIndex = index % MOUNTAIN_DATA.length;
    this.mountainData = MOUNTAIN_DATA[this.currentMountainIndex];
    this.palette = MOUNTAIN_PALETTES[this.mountainData.paletteIndex] || MOUNTAIN_PALETTES[0];

    // Rebuild tile graphics with current mountain palette
    this.tileCache.breakable = createBreakableIceCanvas(
      this.palette.iceBase,
      this.palette.iceHighlight,
      this.palette.iceShadow
    );
    this.tileCache.solid = createSolidIceCanvas(
      this.palette.solidBase,
      this.palette.solidHighlight,
      this.palette.solidShadow
    );
    this.tileCache.conveyorL = createConveyorIceCanvas(
      -1,
      this.palette.iceBase,
      this.palette.iceHighlight
    );
    this.tileCache.conveyorR = createConveyorIceCanvas(
      1,
      this.palette.iceBase,
      this.palette.iceHighlight
    );

    // Build Floors
    this.floors = [];
    // Floors 2 to 8
    for (let f = 0; f < this.mountainData.floors.length; f++) {
      const floorIdx = f + 2; // Floor 2 is at index 0
      const floorY = this.baseGroundY - ((floorIdx - 1) * CONFIG.FLOOR_HEIGHT);
      this.floors.push({
        floorIndex: floorIdx,
        y: floorY,
        blocks: [...this.mountainData.floors[f]]
      });
    }

    // Reset Entities
    this.enemies = [];
    this.movingPlatforms = [];
    this.icicles = [];
    this.collectibles = [];
    this.stomperBear = null;
    this.particleSystem.reset();

    // Spawn Moving Platforms
    if (this.mountainData.platforms) {
      for (const p of this.mountainData.platforms) {
        const floorY = this.baseGroundY - ((p.floorIndex - 1) * CONFIG.FLOOR_HEIGHT);
        this.movingPlatforms.push(new MovingPlatform({
          x: p.x,
          y: floorY + 4,
          width: p.width,
          pattern: p.pattern,
          speed: p.speed,
          range: p.range
        }));
      }
    }

    // Spawn Ground Enemies (Topis)
    if (this.mountainData.topis) {
      for (const t of this.mountainData.topis) {
        const floor = this.floors.find(fl => fl.floorIndex === t.floorIndex);
        if (floor) {
          this.enemies.push(new TopiEnemy(t.x, floor.y - 16, this.floors.indexOf(floor)));
        }
      }
    }

    // Setup Bonus Stage Platforms & Veggies
    if (this.mountainData.bonus) {
      for (const bp of this.mountainData.bonus.platforms) {
        const platY = this.baseGroundY - bp.yOffset;
        this.movingPlatforms.push(new MovingPlatform({
          x: bp.x,
          y: platY,
          width: bp.width,
          pattern: bp.pattern,
          speed: bp.speed,
          dir: bp.dir,
          range: bp.range || 50
        }));
      }

      for (const bv of this.mountainData.bonus.veggies) {
        const vegY = this.baseGroundY - bv.yOffset;
        this.collectibles.push(new Collectible(bv.x, vegY, bv.type, bv.points));
      }
    }

    // Summit Eagle (at the apex of the mountain)
    const eagleY = this.baseGroundY - (12 * CONFIG.FLOOR_HEIGHT) - 2;
    this.eagle = new SummitEagle(100, eagleY);

    // Timers
    this.birdTimer = 120;
    this.icicleTimer = 180;
    this.bearTimer = 0;
    this.lastCameraTargetY = this.mountainHeight - CONFIG.CANVAS_HEIGHT;

    // Bonus & clear state
    this.isBonusStage = false;
    this.bonusTimer = CONFIG.TIMINGS.BONUS_STAGE_SECONDS * 60;
    this.summitAchieved = false;
    this.mountainCleared = false;
    this.clearTimer = 0;

    // Start mountain climb BGM
    Music.play('mountain');
  }

  spawnIceDebris(x, y) {
    this.particleSystem.spawnIceChips(x, y, 6);
  }

  onSummitAchieved(player) {
    if (this.summitAchieved) return;
    this.summitAchieved = true;
    this.mountainCleared = true;
    this.clearTimer = 180; // 3 seconds before next mountain
    Music.play('victory');
  }

  triggerBonusStage() {
    if (this.isBonusStage) return;
    this.isBonusStage = true;
    Music.play('bonus');
    // Remove standard enemies when bonus stage starts
    this.enemies = [];
    this.stomperBear = null;
  }

  update(players, camera) {
    this.particleSystem.update();

    // Check if highest player has reached bonus area (Floors 9+)
    let highestY = Infinity;
    for (const p of players) {
      if (p.isAlive && p.y < highestY) highestY = p.y;
    }
    const bonusStartY = this.baseGroundY - (8 * CONFIG.FLOOR_HEIGHT);
    if (highestY <= bonusStartY && !this.isBonusStage) {
      this.triggerBonusStage();
    }

    // Bonus stage countdown
    if (this.isBonusStage && !this.summitAchieved) {
      this.bonusTimer--;
      if (this.bonusTimer <= 0) {
        // Bonus timer expired! Mountain completed without eagle catch
        this.mountainCleared = true;
        this.clearTimer = 120;
      }
    }

    // Transition to next mountain when cleared
    if (this.mountainCleared) {
      this.clearTimer--;
      if (this.clearTimer <= 0) {
        this.loadMountain(this.currentMountainIndex + 1);
        // Reset players to base of next mountain
        for (let i = 0; i < players.length; i++) {
          players[i].resetPosition(64 + i * 48, this.baseGroundY - 16);
          players[i].addScore(CONFIG.SCORE.MOUNTAIN_CLEAR);
        }
        camera.reset(this.mountainHeight);
        return;
      }
    }

    // Track Inactivity for Stomper Bear Spawner (Classic Ice Climber Bear!)
    if (!this.isBonusStage && !this.mountainCleared) {
      if (Math.abs(camera.targetY - this.lastCameraTargetY) > 4) {
        // Camera scrolled! Reset bear timer
        this.bearTimer = 0;
        this.lastCameraTargetY = camera.targetY;
      } else {
        this.bearTimer++;
        if (this.bearTimer > CONFIG.TIMINGS.BEAR_SPAWN_SECONDS * 60 && !this.stomperBear) {
          // Spawn bear on the current visible floor!
          this.stomperBear = new StomperBear(camera.y + 160);
          this.bearTimer = 0;
        }
      }
    }

    // Update Stomper Bear
    if (this.stomperBear) {
      this.stomperBear.update(this, players, camera);
      if (!this.stomperBear.isActive) {
        this.stomperBear = null;
      }
    }

    // Update Moving Platforms
    for (const plat of this.movingPlatforms) {
      plat.update();
    }

    // Update Ground & Flying Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this, players);
      if (!e.isActive) {
        this.enemies.splice(i, 1);
      }
    }

    // Spawn Flying Birds at intervals
    if (!this.isBonusStage) {
      this.birdTimer--;
      if (this.birdTimer <= 0) {
        this.birdTimer = this.mountainData.birdInterval || 300;
        const spawnY = camera.y + 40 + Math.random() * 100;
        const dir = Math.random() > 0.5 ? 1 : -1;
        this.enemies.push(new BirdEnemy(spawnY, dir));
      }
    }

    // Spawn Falling Icicles
    if (!this.isBonusStage) {
      this.icicleTimer--;
      if (this.icicleTimer <= 0) {
        this.icicleTimer = 180 + Math.floor(Math.random() * 120);
        // Find a floor with solid/normal ice within visible screen
        for (const fl of this.floors) {
          if (fl.y > camera.y && fl.y < camera.y + 160) {
            // Pick a random block that has ice
            const colsWithIce = [];
            for (let c = 0; c < CONFIG.TILES_X; c++) {
              if (fl.blocks[c] > 0) colsWithIce.push(c);
            }
            if (colsWithIce.length > 0 && Math.random() < (this.mountainData.icicleChance || 0.4)) {
              const col = colsWithIce[Math.floor(Math.random() * colsWithIce.length)];
              this.icicles.push(new Icicle(col * CONFIG.TILE_WIDTH + 4, fl.y + CONFIG.TILE_HEIGHT));
              break;
            }
          }
        }
      }
    }

    // Update Icicles
    for (let i = this.icicles.length - 1; i >= 0; i--) {
      const icicle = this.icicles[i];
      icicle.update(this, players);
      if (icicle.state === 'broken') {
        this.icicles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (const item of this.collectibles) {
      item.update(players, this);
    }

    // Update Summit Eagle
    if (this.eagle) {
      this.eagle.update(players, this);
    }
  }

  draw(ctx, cameraY) {
    // 1. Draw Mountain Background & Sky Gradient
    this.drawBackground(ctx, cameraY);

    // 2. Draw Base Ground (Floor 1)
    const baseScreenY = Math.floor(this.baseGroundY - cameraY);
    if (baseScreenY < CONFIG.CANVAS_HEIGHT) {
      ctx.fillStyle = this.palette.solidBase;
      ctx.fillRect(0, baseScreenY, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - baseScreenY + 20);
      ctx.fillStyle = this.palette.solidHighlight;
      ctx.fillRect(0, baseScreenY, CONFIG.CANVAS_WIDTH, 2);
    }

    // 3. Draw Ice Floors (Floors 2 to 8)
    for (const floor of this.floors) {
      const screenY = Math.floor(floor.y - cameraY);
      if (screenY >= -16 && screenY <= CONFIG.CANVAS_HEIGHT + 16) {
        for (let col = 0; col < CONFIG.TILES_X; col++) {
          const blockType = floor.blocks[col];
          const x = col * CONFIG.TILE_WIDTH;

          if (blockType === 1) { // Breakable Normal Ice
            ctx.drawImage(this.tileCache.breakable, x, screenY);
          } else if (blockType === 2) { // Solid Stone/Ice
            ctx.drawImage(this.tileCache.solid, x, screenY);
          } else if (blockType === 3) { // Conveyor Left
            ctx.drawImage(this.tileCache.conveyorL, x, screenY);
          } else if (blockType === 4) { // Conveyor Right
            ctx.drawImage(this.tileCache.conveyorR, x, screenY);
          }
        }
      }
    }

    // 4. Draw Summit Peak Crest (at the top)
    const peakY = Math.floor(this.baseGroundY - (12 * CONFIG.FLOOR_HEIGHT) - cameraY);
    if (peakY >= -40 && peakY <= CONFIG.CANVAS_HEIGHT) {
      this.drawSummitPeak(ctx, peakY);
    }

    // 5. Draw Moving Platforms (Clouds)
    for (const plat of this.movingPlatforms) {
      plat.draw(ctx, cameraY);
    }

    // 6. Draw Collectibles
    for (const item of this.collectibles) {
      item.draw(ctx, cameraY);
    }

    // 7. Draw Summit Eagle
    if (this.eagle) {
      this.eagle.draw(ctx, cameraY);
    }

    // 8. Draw Icicles
    for (const icicle of this.icicles) {
      icicle.draw(ctx, cameraY);
    }

    // 9. Draw Enemies
    for (const e of this.enemies) {
      e.draw(ctx, cameraY);
    }

    // 10. Draw Stomper Bear
    if (this.stomperBear) {
      this.stomperBear.draw(ctx, cameraY);
    }

    // 11. Draw Particles
    this.particleSystem.draw(ctx, cameraY);
  }

  drawBackground(ctx, cameraY) {
    // NES Sky background
    ctx.fillStyle = this.palette.sky;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Parallax Mountain Silhouettes in background
    ctx.fillStyle = '#001A55';
    const bgOffset = Math.floor(cameraY * 0.15) % 80;
    
    // Mountain ridges
    ctx.beginPath();
    ctx.moveTo(0, 160 - bgOffset);
    ctx.lineTo(60, 110 - bgOffset);
    ctx.lineTo(120, 150 - bgOffset);
    ctx.lineTo(190, 90 - bgOffset);
    ctx.lineTo(256, 140 - bgOffset);
    ctx.lineTo(256, 240);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();

    // Distant snowcaps
    ctx.fillStyle = C.PALE_BLUE;
    ctx.beginPath();
    ctx.moveTo(50, 120 - bgOffset);
    ctx.lineTo(60, 110 - bgOffset);
    ctx.lineTo(70, 120 - bgOffset);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(180, 100 - bgOffset);
    ctx.lineTo(190, 90 - bgOffset);
    ctx.lineTo(200, 100 - bgOffset);
    ctx.closePath();
    ctx.fill();

    // Authentic NES stars in bonus/summit upper sky
    if (cameraY < 120) {
      ctx.fillStyle = C.WHITE;
      const stars = [
        [30, 25], [75, 45], [140, 18], [210, 35],
        [90, 75], [180, 60], [45, 95], [235, 80]
      ];
      for (const [sx, sy] of stars) {
        const starScreenY = sy - Math.floor(cameraY * 0.2);
        if (starScreenY >= 0 && starScreenY < 120) {
          ctx.fillRect(sx, starScreenY, 1, 1);
        }
      }
    }
  }

  drawSummitPeak(ctx, peakY) {
    // Snowy summit crest
    ctx.fillStyle = C.WHITE;
    ctx.beginPath();
    ctx.moveTo(60, peakY + 28);
    ctx.lineTo(128, peakY + 4);
    ctx.lineTo(196, peakY + 28);
    ctx.lineTo(196, peakY + 36);
    ctx.lineTo(60, peakY + 36);
    ctx.closePath();
    ctx.fill();

    // Crest shadow / permafrost
    ctx.fillStyle = C.PALE_CYAN;
    ctx.fillRect(64, peakY + 26, 128, 4);
  }
}
