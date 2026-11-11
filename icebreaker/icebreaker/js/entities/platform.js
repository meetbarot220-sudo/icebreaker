/**
 * platform.js - Floating cloud and ice moving platforms
 */

import { CONFIG } from '../config.js';
import { Sprites } from '../graphics/spriteData.js';

export class MovingPlatform {
  constructor({ x, y, width = 32, type = 'cloud', pattern = 'horizontal', speed = 0.8, range = 80, dir = 1 }) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.width = width;
    this.height = 8;
    this.type = type; // 'cloud' | 'ice'
    this.pattern = pattern; // 'horizontal' | 'wrap' | 'vertical'
    this.speed = speed;
    this.range = range;
    this.dir = dir; // 1 or -1
    this.vx = 0;
    this.vy = 0;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.pattern === 'horizontal') {
      // Ping pong within range
      this.vx = this.speed * this.dir;
      this.x += this.vx;
      if (this.x > this.startX + this.range) {
        this.dir = -1;
      } else if (this.x < this.startX - this.range) {
        this.dir = 1;
      }
      // Also clamp to screen bounds
      if (this.x < 4) {
        this.dir = 1;
      } else if (this.x + this.width > CONFIG.CANVAS_WIDTH - 4) {
        this.dir = -1;
      }
    } else if (this.pattern === 'wrap') {
      // Continuous scroll in one direction with screen wrap
      this.vx = this.speed * this.dir;
      this.x += this.vx;
      if (this.dir > 0 && this.x > CONFIG.CANVAS_WIDTH) {
        this.x = -this.width;
        this.prevX = this.x;
      } else if (this.dir < 0 && this.x < -this.width) {
        this.x = CONFIG.CANVAS_WIDTH;
        this.prevX = this.x;
      }
    } else if (this.pattern === 'vertical') {
      this.vy = this.speed * this.dir;
      this.y += this.vy;
      if (this.y > this.startY + this.range) {
        this.dir = -1;
      } else if (this.y < this.startY - this.range) {
        this.dir = 1;
      }
    }
  }

  draw(ctx, cameraY) {
    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -10 || screenY > CONFIG.CANVAS_HEIGHT + 10) return;

    const sprite = this.width === 24 ? Sprites.get('cloud24') : Sprites.get('cloud32');
    if (sprite) {
      ctx.drawImage(sprite, Math.floor(this.x), screenY);
    }
  }
}
