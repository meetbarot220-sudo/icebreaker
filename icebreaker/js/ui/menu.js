/**
 * menu.js - Authentic NES 8-bit title screen, pause menu, options, how-to-play, and game over screens
 */

import { CONFIG } from '../config.js';
import { C } from '../graphics/palette.js';
import { drawPixelText } from './font.js';
import { SFX } from '../audio/sfx.js';
import { Sprites } from '../graphics/spriteData.js';

export class MenuSystem {
  constructor() {
    this.titleOptions = ['1 PLAYER GAME', '2 PLAYERS GAME', 'HOW TO PLAY', 'OPTIONS'];
    this.selectedOption = 0;
    this.cursorAnim = 0;

    this.optionsMenu = ['CRT SCANLINES: OFF', 'AUDIO: ON', 'BACK'];
    this.selectedOptionMenu = 0;

    this.gameOverOptions = ['RESTART', 'TITLE'];
    this.selectedGameOver = 0;
  }

  updateCursorAnim() {
    this.cursorAnim++;
  }

  // Draw authentic Title Screen
  drawTitleScreen(ctx, highScore) {
    this.updateCursorAnim();

    // Dark mountain background
    ctx.fillStyle = '#002A88';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // High Score at top
    drawPixelText(ctx, 'TOP SCORE', 64, 16, C.GOLD, 8);
    drawPixelText(ctx, String(highScore).padStart(6, '0'), 144, 16, C.WHITE, 8);

    // Title Logo Banner
    // Decorative snowy frame
    ctx.fillStyle = C.PALE_CYAN;
    ctx.fillRect(24, 38, 208, 48);
    ctx.fillStyle = '#001A55';
    ctx.fillRect(26, 40, 204, 44);

    // Big 8-bit stylized text
    drawPixelText(ctx, 'ICE BREAKER', 56, 48, C.ICE_CYAN, 10);
    drawPixelText(ctx, 'PEAK CLIMBERS', 52, 66, C.WHITE, 9);

    // Climber & Eagle Pixel Vignette in center
    const p1Sprite = Sprites.get('p1_jump');
    const p2Sprite = Sprites.get('p2_jump');
    const eagleSprite = Sprites.get('eagle_up');
    const topiSprite = Sprites.get('topi_walk1');

    if (p1Sprite) ctx.drawImage(p1Sprite, 60, 100);
    if (topiSprite) ctx.drawImage(topiSprite, 95, 100);
    if (p2Sprite) ctx.drawImage(p2Sprite, 180, 100);
    if (eagleSprite) ctx.drawImage(eagleSprite, 112, 92);

    // Menu selections
    const startY = 142;
    for (let i = 0; i < this.titleOptions.length; i++) {
      const isSelected = i === this.selectedOption;
      const color = isSelected ? C.YELLOW : C.WHITE;
      const y = startY + i * 16;

      // Blinking carrot cursor
      if (isSelected) {
        drawPixelText(ctx, '>', 48, y, (this.cursorAnim % 20 < 10) ? C.GOLD : C.WHITE, 8);
      }
      drawPixelText(ctx, this.titleOptions[i], 64, y, color, 8);
    }

    // Footer copyright
    drawPixelText(ctx, '© 1985-2026 RETRO ARCADIA', 32, 218, C.LIGHT_GRAY, 7);
  }

  // Draw How to Play screen
  drawHowToPlay(ctx) {
    ctx.fillStyle = '#000B4D';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawPixelText(ctx, 'HOW TO PLAY', 80, 16, C.GOLD, 8);

    // Controls explanation
    drawPixelText(ctx, 'CONTROLS', 24, 38, C.PALE_CYAN, 8);
    drawPixelText(ctx, 'P1: ARROWS / WASD = MOVE', 24, 52, C.WHITE, 7);
    drawPixelText(ctx, '    Z / SPACE    = JUMP', 24, 62, C.WHITE, 7);
    drawPixelText(ctx, '    X            = HAMMER', 24, 72, C.WHITE, 7);

    drawPixelText(ctx, 'P2: WASD         = MOVE', 24, 88, C.PINK, 7);
    drawPixelText(ctx, '    G = JUMP   H = HAMMER', 24, 98, C.PINK, 7);

    // Objectives
    drawPixelText(ctx, 'OBJECTIVES', 24, 116, C.PALE_CYAN, 8);
    drawPixelText(ctx, '1. BREAK CEILING ICE WITH HEAD/HAMMER', 24, 130, C.WHITE, 6);
    drawPixelText(ctx, '2. JUMP THROUGH HOLES TO REACH TOP', 24, 142, C.WHITE, 6);
    drawPixelText(ctx, '3. WATCH OUT! CAMERA ONLY SCROLLS UP', 24, 154, C.YELLOW, 6);
    drawPixelText(ctx, '4. SMASH ENEMIES BEFORE THEY REPAIR HOLES', 24, 166, C.WHITE, 6);
    drawPixelText(ctx, '5. CATCH THE SUMMIT EAGLE FOR 10000 PTS!', 24, 178, C.GOLD, 6);

    drawPixelText(ctx, 'PRESS START / ENTER TO RETURN', 24, 210, C.ICE_CYAN, 7);
  }

  // Draw Options screen
  drawOptions(ctx, crtEnabled, audioMuted) {
    this.updateCursorAnim();

    ctx.fillStyle = '#1412A7';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawPixelText(ctx, 'OPTIONS', 96, 24, C.GOLD, 8);

    const menuItems = [
      `CRT SCANLINES: ${crtEnabled ? 'ON' : 'OFF'}`,
      `AUDIO SOUND:   ${audioMuted ? 'MUTED' : 'ENABLED'}`,
      'BACK TO TITLE'
    ];

    const startY = 80;
    for (let i = 0; i < menuItems.length; i++) {
      const isSelected = i === this.selectedOptionMenu;
      const color = isSelected ? C.YELLOW : C.WHITE;
      const y = startY + i * 22;

      if (isSelected) {
        drawPixelText(ctx, '>', 40, y, (this.cursorAnim % 20 < 10) ? C.GOLD : C.WHITE, 8);
      }
      drawPixelText(ctx, menuItems[i], 56, y, color, 8);
    }

    drawPixelText(ctx, 'USE UP/DOWN AND ENTER', 48, 190, C.PALE_CYAN, 7);
  }

  // Draw Minimal Pause screen
  drawPause(ctx) {
    // Semi-translucent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Classic retro PAUSE box
    ctx.fillStyle = C.BLACK;
    ctx.fillRect(80, 100, 96, 32);
    ctx.strokeStyle = C.WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 100, 96, 32);

    drawPixelText(ctx, 'PAUSE', 104, 112, C.YELLOW, 9);
  }

  // Draw Game Over screen
  drawGameOver(ctx, players, highScore, isTwoPlayer) {
    this.updateCursorAnim();

    ctx.fillStyle = C.BLACK;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Large GAME OVER text
    drawPixelText(ctx, 'GAME OVER', 80, 48, C.RED, 9);

    // Final Scoreboard
    drawPixelText(ctx, '1P FINAL SCORE', 48, 80, C.PALE_CYAN, 7);
    drawPixelText(ctx, String(players[0].score).padStart(6, '0'), 160, 80, C.WHITE, 7);

    if (isTwoPlayer && players[1]) {
      drawPixelText(ctx, '2P FINAL SCORE', 48, 96, C.PINK, 7);
      drawPixelText(ctx, String(players[1].score).padStart(6, '0'), 160, 96, C.WHITE, 7);
    }

    drawPixelText(ctx, 'HIGH SCORE', 48, 120, C.GOLD, 7);
    drawPixelText(ctx, String(highScore).padStart(6, '0'), 160, 120, C.WHITE, 7);

    // Menu options: RESTART / TITLE
    const startY = 160;
    for (let i = 0; i < this.gameOverOptions.length; i++) {
      const isSelected = i === this.selectedGameOver;
      const color = isSelected ? C.YELLOW : C.WHITE;
      const y = startY + i * 18;

      if (isSelected) {
        drawPixelText(ctx, '>', 80, y, (this.cursorAnim % 20 < 10) ? C.GOLD : C.WHITE, 8);
      }
      drawPixelText(ctx, this.gameOverOptions[i], 98, y, color, 8);
    }
  }

  // Draw Mountain Summit Victory Screen
  drawSummitVictory(ctx, mountainName, veggiesCollected, bonusScore) {
    ctx.fillStyle = 'rgba(0, 0, 40, 0.75)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    drawPixelText(ctx, 'MOUNTAIN SUMMIT!', 64, 40, C.GOLD, 8);
    drawPixelText(ctx, mountainName, 72, 60, C.WHITE, 8);

    drawPixelText(ctx, 'VEGETABLES:', 48, 90, C.PALE_GREEN, 7);
    drawPixelText(ctx, `+${veggiesCollected}`, 160, 90, C.WHITE, 7);

    drawPixelText(ctx, 'SUMMIT BONUS:', 48, 110, C.YELLOW, 7);
    drawPixelText(ctx, `+${bonusScore}`, 160, 110, C.WHITE, 7);

    drawPixelText(ctx, 'GET READY FOR NEXT PEAK!', 36, 160, C.ICE_CYAN, 7);
  }
}
