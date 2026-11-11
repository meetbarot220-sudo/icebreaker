/**
 * collectible.js - Bonus stage vegetables, items, and the Summit Condor Eagle
 */

import { CONFIG } from '../config.js';
import { Sprites } from '../graphics/spriteData.js';
import { aabbIntersect } from '../physics/math.js';
import { SFX } from '../audio/sfx.js';

export class Collectible {
  constructor(x, y, type = 'eggplant', points = 400) {
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.type = type;
    this.points = points;
    this.isCollected = false;
    this.animTimer = 0;
  }

  update(players, level) {
    if (this.isCollected) return;

    this.animTimer++;
    // Check pickup
    const itemBox = {
      x: this.x + 2,
      y: this.y + 2,
      w: 12,
      h: 12
    };

    for (const p of players) {
      if (p.isAlive) {
        const playerBox = p.getBounds();
        if (aabbIntersect(itemBox, playerBox)) {
          this.isCollected = true;
          p.addScore(this.points);
          p.veggiesCollected = (p.veggiesCollected || 0) + 1;
          level.particleSystem.spawnSparkles(this.x + 8, this.y + 8, 8);
          level.particleSystem.spawnScorePopup(this.x + 8, this.y, this.points);
          SFX.collectible();
          return;
        }
      }
    }
  }

  draw(ctx, cameraY) {
    if (this.isCollected) return;

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -16 || screenY > CONFIG.CANVAS_HEIGHT + 16) return;

    const sprite = Sprites.get(`veggie_${this.type}`);
    if (sprite) {
      // Subtle 1-pixel float bobbing
      const bob = (this.animTimer % 30 < 15) ? 0 : -1;
      ctx.drawImage(sprite, Math.floor(this.x), screenY + bob);
    }
  }
}

export class SummitEagle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.width = 32;
    this.height = 16;
    this.vx = 1.4;
    this.dir = 1;
    this.animFrame = 0;
    this.animTimer = 0;
    this.caughtBy = null;
    this.isLeaving = false;
  }

  update(players, level) {
    this.animTimer++;
    if (this.animTimer % 10 === 0) {
      this.animFrame = 1 - this.animFrame;
    }

    if (this.caughtBy) {
      // Carrying climber up and away
      this.x += this.vx * 1.5;
      this.y -= 0.6; // Fly up into space
      this.caughtBy.x = this.x + 8;
      this.caughtBy.y = this.y + 12;
      return;
    }

    // Normal flight back and forth across summit
    this.x += this.vx * this.dir;
    // Gentle sine wave altitude
    this.y = this.startY + Math.sin(this.animTimer * 0.05) * 4;

    if (this.x > CONFIG.CANVAS_WIDTH - this.width - 4) {
      this.dir = -1;
    } else if (this.x < 4) {
      this.dir = 1;
    }

    // Talons catch hitbox (bottom center of eagle)
    const talonBox = {
      x: this.x + 10,
      y: this.y + 8,
      w: 12,
      h: 10
    };

    for (const p of players) {
      if (p.isAlive && p.vy <= 1.0) { // While jumping or at apex
        const playerHeadBox = {
          x: p.x + 4,
          y: p.y,
          w: 8,
          h: 8
        };

        if (aabbIntersect(talonBox, playerHeadBox)) {
          this.caughtBy = p;
          p.onSummitGrab(this);
          level.onSummitAchieved(p);
          SFX.summitCatch();
          level.particleSystem.spawnSparkles(this.x + 16, this.y + 12, 16);
          level.particleSystem.spawnScorePopup(this.x + 8, this.y - 4, CONFIG.SCORE.REACH_SUMMIT);
          return;
        }
      }
    }
  }

  draw(ctx, cameraY) {
    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -30 || screenY > CONFIG.CANVAS_HEIGHT + 30) return;

    const sprite = this.animFrame === 0 ? Sprites.get('eagle_up') : Sprites.get('eagle_down');
    if (sprite) {
      ctx.save();
      if (this.dir < 0) {
        // Face left
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
