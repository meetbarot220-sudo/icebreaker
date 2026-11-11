/**
 * icicle.js - Falling icicle environmental hazard
 */

import { CONFIG } from '../config.js';
import { Sprites } from '../graphics/spriteData.js';
import { aabbIntersect } from '../physics/math.js';
import { SFX } from '../audio/sfx.js';

export class Icicle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.width = 8;
    this.height = 16;
    this.state = 'warning'; // 'warning' | 'falling' | 'broken'
    this.warnTimer = CONFIG.TIMINGS.ICICLE_WARN_FRAMES;
    this.vy = 0;
    this.shiverOffset = 0;
  }

  update(level, players) {
    if (this.state === 'broken') return;

    if (this.state === 'warning') {
      this.warnTimer--;
      // Shiver left and right slightly
      this.shiverOffset = (this.warnTimer % 4 < 2) ? -1 : 1;
      if (this.warnTimer <= 0) {
        this.state = 'falling';
        this.vy = CONFIG.TIMINGS.ICICLE_DROP_SPEED;
        this.shiverOffset = 0;
        SFX.icicleWarn();
      }
    } else if (this.state === 'falling') {
      this.y += this.vy;
      this.vy += 0.15; // Gravity acceleration

      const icicleBox = {
        x: this.x + 2,
        y: this.y + 6,
        w: 4,
        h: 10
      };

      // 1. Check collision with players
      for (const p of players) {
        if (p.isAlive && !p.isInvulnerable) {
          const playerBox = p.getBounds();
          if (aabbIntersect(icicleBox, playerBox)) {
            p.takeDamage();
            this.shatter(level);
            return;
          }
        }
      }

      // 2. Check collision with lower ice floors or base ground
      for (const floor of level.floors) {
        if (this.y + this.height >= floor.y && this.y + this.height <= floor.y + 12) {
          const col = Math.floor((this.x + 4) / CONFIG.TILE_WIDTH);
          if (col >= 0 && col < CONFIG.TILES_X && floor.blocks[col] > 0) {
            this.shatter(level);
            return;
          }
        }
      }

      if (this.y + this.height >= level.baseGroundY) {
        this.shatter(level);
        return;
      }

      // Despawn if fallen off bottom of screen
      if (this.y > level.baseGroundY + 40) {
        this.state = 'broken';
      }
    }
  }

  shatter(level) {
    this.state = 'broken';
    level.particleSystem.spawnIceChips(this.x + 4, this.y + 14, 5);
    SFX.icicleSmash();
  }

  draw(ctx, cameraY) {
    if (this.state === 'broken') return;

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) return;

    const sprite = Sprites.get('icicle');
    if (sprite) {
      ctx.drawImage(sprite, Math.floor(this.x + this.shiverOffset), screenY);
    }
  }
}
