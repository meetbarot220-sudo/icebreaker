/**
 * enemy.js - Ground enemy (Topi), Flying Bird, and Large Pursuer (Stomper Bear)
 */

import { CONFIG } from '../config.js';
import { Sprites } from '../graphics/spriteData.js';
import { aabbIntersect } from '../physics/math.js';
import { SFX } from '../audio/sfx.js';

// ==================== GROUND ENEMY (Topi) ====================
export class TopiEnemy {
  constructor(x, y, floorIndex) {
    this.x = x;
    this.y = y;
    this.floorIndex = floorIndex;
    this.width = 16;
    this.height = 16;
    this.vx = 0.65;
    this.dir = 1;
    this.state = 'walk'; // 'walk' | 'fetch' | 'push' | 'hit' | 'dead'
    this.hasIce = false;
    this.targetHoleCol = -1;
    this.animFrame = 0;
    this.animTimer = 0;
    this.isActive = true;
    this.isDefeated = false;
    this.deadVy = 0;
    this.deadVx = 0;
  }

  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      w: 12,
      h: 14
    };
  }

  hitByHammer(player) {
    if (this.isDefeated) return;
    this.isDefeated = true;
    this.state = 'hit';
    this.deadVx = player.facing * 2.0;
    this.deadVy = -2.5;
    player.addScore(CONFIG.SCORE.DEFEAT_TOPI);
    SFX.enemyHit();
    SFX.enemyDefeat();
  }

  update(level, players) {
    if (!this.isActive) return;

    if (this.isDefeated) {
      // Spinning off screen
      this.x += this.deadVx;
      this.y += this.deadVy;
      this.deadVy += 0.2;
      if (this.y > level.baseGroundY + 100) {
        this.isActive = false;
      }
      return;
    }

    this.animTimer++;
    if (this.animTimer % 8 === 0) {
      this.animFrame = 1 - this.animFrame;
    }

    const floor = level.floors[this.floorIndex];
    if (!floor) return;

    // Check if there is an empty hole on this floor that needs repairing
    if (this.state === 'walk') {
      let foundHole = -1;
      for (let c = 0; c < CONFIG.TILES_X; c++) {
        if (floor.blocks[c] === 0) {
          foundHole = c;
          break;
        }
      }

      if (foundHole !== -1) {
        // Go fetch ice block from screen edge
        this.state = 'fetch';
        this.targetHoleCol = foundHole;
        this.dir = this.x > (CONFIG.CANVAS_WIDTH / 2) ? 1 : -1;
      }
    }

    if (this.state === 'fetch') {
      this.x += this.vx * 1.2 * this.dir;
      // Reached offscreen edge?
      if (this.x > CONFIG.CANVAS_WIDTH + 4 || this.x < -20) {
        // Grabbed ice brick!
        this.hasIce = true;
        this.state = 'push';
        this.dir = -this.dir; // Head back towards hole
      }
    } else if (this.state === 'push') {
      this.x += this.vx * 0.8 * this.dir;
      const targetX = this.targetHoleCol * CONFIG.TILE_WIDTH;

      // Check if reached hole
      if (Math.abs(this.x - targetX) < 6) {
        // Plug the hole!
        if (floor.blocks[this.targetHoleCol] === 0) {
          floor.blocks[this.targetHoleCol] = 1; // Repaired to breakable ice!
          level.particleSystem.spawnDust(targetX + 8, floor.y + 4, 3);
          SFX.iceBreak();
        }
        this.hasIce = false;
        this.state = 'walk';
        this.targetHoleCol = -1;
      }
    } else {
      // Normal walk
      this.x += this.vx * this.dir;
      if (this.x < 4) {
        this.dir = 1;
      } else if (this.x > CONFIG.CANVAS_WIDTH - this.width - 4) {
        this.dir = -1;
      }
    }

    // Keep y grounded to floor
    this.y = floor.y - this.height;

    // Check player collision
    const myBox = this.getBounds();
    for (const p of players) {
      if (p.isAlive && !p.isInvulnerable) {
        const playerBox = p.getBounds();
        if (aabbIntersect(myBox, playerBox)) {
          p.takeDamage();
        }
      }
    }
  }

  draw(ctx, cameraY) {
    if (!this.isActive) return;

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) return;

    let spriteName = 'topi_walk1';
    if (this.isDefeated) {
      spriteName = 'topi_hit';
    } else if (this.hasIce) {
      spriteName = 'topi_push';
    } else {
      spriteName = this.animFrame === 0 ? 'topi_walk1' : 'topi_walk2';
    }

    const sprite = Sprites.get(spriteName);
    if (sprite) {
      ctx.save();
      if (this.dir < 0) {
        ctx.translate(Math.floor(this.x + this.width), screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
      } else {
        ctx.drawImage(sprite, Math.floor(this.x), screenY);
      }
      ctx.restore();
    }
  }
}

// ==================== FLYING ENEMY (Sky Swift) ====================
export class BirdEnemy {
  constructor(y, dir = 1) {
    this.x = dir > 0 ? -20 : CONFIG.CANVAS_WIDTH + 4;
    this.startY = y;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.vx = 1.15 * dir;
    this.dir = dir;
    this.animFrame = 0;
    this.animTimer = 0;
    this.isActive = true;
    this.isDefeated = false;
    this.deadVy = 0;
  }

  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 4,
      w: 12,
      h: 8
    };
  }

  hitByHammer(player) {
    if (this.isDefeated) return;
    this.isDefeated = true;
    this.deadVy = 2.5; // Plummet
    player.addScore(CONFIG.SCORE.DEFEAT_BIRD);
    SFX.enemyHit();
    SFX.enemyDefeat();
  }

  update(level, players) {
    if (!this.isActive) return;

    this.animTimer++;
    if (this.animTimer % 8 === 0) {
      this.animFrame = 1 - this.animFrame;
    }

    if (this.isDefeated) {
      this.y += this.deadVy;
      this.deadVy += 0.2;
      if (this.y > level.baseGroundY + 100) {
        this.isActive = false;
      }
      return;
    }

    this.x += this.vx;
    // Sinusoidal wave flight path
    this.y = this.startY + Math.sin(this.animTimer * 0.08) * 8;

    // Despawn once off opposite screen edge
    if ((this.dir > 0 && this.x > CONFIG.CANVAS_WIDTH + 30) ||
        (this.dir < 0 && this.x < -40)) {
      this.isActive = false;
    }

    // Check player collision
    const myBox = this.getBounds();
    for (const p of players) {
      if (p.isAlive && !p.isInvulnerable) {
        const playerBox = p.getBounds();
        if (aabbIntersect(myBox, playerBox)) {
          p.takeDamage();
        }
      }
    }
  }

  draw(ctx, cameraY) {
    if (!this.isActive) return;

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) return;

    const sprite = this.animFrame === 0 ? Sprites.get('bird_up') : Sprites.get('bird_down');
    if (sprite) {
      ctx.save();
      if (this.dir < 0) {
        ctx.translate(Math.floor(this.x + this.width), screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
      } else {
        ctx.drawImage(sprite, Math.floor(this.x), screenY);
      }
      ctx.restore();
    }
  }
}

// ==================== LARGE PURSUER (Glacial Stomper Bear) ====================
export class StomperBear {
  constructor(y) {
    this.x = -28;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.vx = 0.5;
    this.state = 'walk_in'; // 'walk_in' | 'stomp' | 'walk_out' | 'done'
    this.stompTimer = 0;
    this.hasStomped = false;
    this.isActive = true;
    this.isDefeated = false;
  }

  getBounds() {
    return {
      x: this.x + 3,
      y: this.y + 2,
      w: 18,
      h: 22
    };
  }

  hitByHammer(player) {
    // The stomper bear is huge and impenetrable to hammer! Plays a clank sound.
    SFX.hammer();
  }

  update(level, players, camera) {
    if (!this.isActive) return;

    if (this.state === 'walk_in') {
      this.x += this.vx;
      if (this.x >= 40) {
        this.state = 'stomp';
        this.stompTimer = 0;
      }
    } else if (this.state === 'stomp') {
      this.stompTimer++;
      if (this.stompTimer === 30 && !this.hasStomped) {
        this.hasStomped = true;
        SFX.bearStomp();
        // Shake screen!
        camera.triggerShake(18, 3);
        // Force screen scroll up one floor!
        camera.forceScrollUpOneFloor();
        level.particleSystem.spawnDust(this.x + 12, this.y + 24, 8);
      }

      if (this.stompTimer > 60) {
        this.state = 'walk_out';
      }
    } else if (this.state === 'walk_out') {
      this.x -= this.vx;
      if (this.x < -32) {
        this.isActive = false;
      }
    }

    // Damage players on contact
    const myBox = this.getBounds();
    for (const p of players) {
      if (p.isAlive && !p.isInvulnerable) {
        const playerBox = p.getBounds();
        if (aabbIntersect(myBox, playerBox)) {
          p.takeDamage();
        }
      }
    }
  }

  draw(ctx, cameraY) {
    if (!this.isActive) return;

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -30 || screenY > CONFIG.CANVAS_HEIGHT + 30) return;

    const sprite = (this.state === 'stomp' && this.stompTimer >= 20 && this.stompTimer <= 45)
      ? Sprites.get('bear_stomp')
      : Sprites.get('bear_walk');

    if (sprite) {
      ctx.save();
      if (this.state === 'walk_out') {
        ctx.translate(Math.floor(this.x + this.width), screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
      } else {
        ctx.drawImage(sprite, Math.floor(this.x), screenY);
      }
      ctx.restore();
    }
  }
}
