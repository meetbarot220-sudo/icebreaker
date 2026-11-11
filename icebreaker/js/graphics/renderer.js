/**
 * renderer.js - 256x240 internal resolution renderer, HUD, and optional CRT scanlines
 */

import { CONFIG } from '../config.js';
import { C } from './palette.js';
import { drawPixelText } from '../ui/font.js';
import { Sprites } from './spriteData.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;

    this.crtEnabled = false;
    this.scanlinePattern = this.generateScanlinePattern();
  }

  generateScanlinePattern() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 1, 1, 1);
    return ctx.createPattern(canvas, 'repeat');
  }

  toggleCRT() {
    this.crtEnabled = !this.crtEnabled;
    return this.crtEnabled;
  }

  clear() {
    this.ctx.fillStyle = C.BLACK;
    this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }

  // Draw HUD across the top of the screen (Floors 1-8 and Bonus)
  drawHUD(gameState) {
    const ctx = this.ctx;
    const { players, highScore, mountainIndex, isBonusStage, bonusSeconds, isTwoPlayer } = gameState;

    // Top HUD black bar background
    ctx.fillStyle = C.BLACK;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 16);

    // 1P SCORE
    drawPixelText(ctx, '1P', 8, 2, C.PALE_CYAN, 7);
    const p1ScoreStr = String(players[0].score).padStart(6, '0');
    drawPixelText(ctx, p1ScoreStr, 24, 2, C.WHITE, 7);

    // HIGH SCORE
    drawPixelText(ctx, 'TOP', 100, 2, C.GOLD, 7);
    const hiScoreStr = String(highScore).padStart(6, '0');
    drawPixelText(ctx, hiScoreStr, 126, 2, C.WHITE, 7);

    // 2P SCORE or MOUNTAIN LEVEL
    if (isTwoPlayer && players[1]) {
      drawPixelText(ctx, '2P', 184, 2, C.PINK, 7);
      const p2ScoreStr = String(players[1].score).padStart(6, '0');
      drawPixelText(ctx, p2ScoreStr, 202, 2, C.WHITE, 7);
    } else {
      drawPixelText(ctx, `MT-${mountainIndex + 1}`, 200, 2, C.PALE_CYAN, 7);
    }

    // Secondary HUD row: Lives & Bonus Timer
    // P1 Lives
    drawPixelText(ctx, `♥x${Math.max(0, players[0].lives)}`, 8, 10, C.ROYAL_BLUE, 7);

    if (isTwoPlayer && players[1]) {
      drawPixelText(ctx, `♥x${Math.max(0, players[1].lives)}`, 184, 10, C.HOT_PINK, 7);
    }

    // If Bonus Stage: Display timer
    if (isBonusStage) {
      drawPixelText(ctx, `TIME:${Math.ceil(bonusSeconds)}`, 100, 10, C.YELLOW, 7);
    }
  }

  // Apply subtle retro CRT scanline effect if enabled
  applyPostEffects() {
    if (!this.crtEnabled) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.scanlinePattern;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }
}
