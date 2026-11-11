/**
 * particle.js - Retro 8-bit particle effects & score popups
 */

import { C } from '../graphics/palette.js';
import { drawPixelText } from '../ui/font.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.popups = [];
  }

  reset() {
    this.particles = [];
    this.popups = [];
  }

  // Ice block debris shower
  spawnIceChips(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 4 - 2),
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 2.5 - 0.5,
        color: Math.random() > 0.5 ? C.WHITE : C.ICE_CYAN,
        size: Math.random() > 0.5 ? 2 : 3,
        life: 25 + Math.floor(Math.random() * 15),
        maxLife: 40,
        gravity: 0.18
      });
    }
  }

  // Dust puff for landing or hammer hit
  spawnDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 6 - 3),
        y: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.0 - 0.2,
        color: C.LIGHT_GRAY,
        size: 2,
        life: 16,
        maxLife: 16,
        gravity: 0.08
      });
    }
  }

  // Sparkles for enemy defeat or veggie pickup
  spawnSparkles(x, y, count = 5) {
    const colors = [C.GOLD, C.WHITE, C.PINK, C.ICE_CYAN];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2,
        life: 20,
        maxLife: 20,
        gravity: 0.04
      });
    }
  }

  // Score popup (+100, +400, +10000)
  spawnScorePopup(x, y, score) {
    this.popups.push({
      x: Math.floor(x - 8),
      y: Math.floor(y),
      text: String(score),
      life: 45
    });
  }

  update() {
    // Update regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update score popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.y -= 0.4; // Slowly drift up
      popup.life--;
      if (popup.life <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  draw(ctx, cameraY) {
    // Render particles
    for (const p of this.particles) {
      const screenY = Math.floor(p.y - cameraY);
      if (screenY >= -5 && screenY <= 245) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), screenY, p.size, p.size);
      }
    }

    // Render score popups
    for (const popup of this.popups) {
      const screenY = Math.floor(popup.y - cameraY);
      if (screenY >= -10 && screenY <= 245) {
        drawPixelText(ctx, popup.text, popup.x, screenY, C.GOLD, 7);
      }
    }
  }
}
