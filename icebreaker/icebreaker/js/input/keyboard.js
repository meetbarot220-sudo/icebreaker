/**
 * keyboard.js - Keyboard input handler with dedicated 1P and 2P schemes
 */

import { CONFIG } from '../config.js';

export class KeyboardInput {
  constructor() {
    this.keysDown = {};
    this.justPressed = {};

    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling with arrow keys and spacebar
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keysDown[e.code]) {
        this.justPressed[e.code] = true;
      }
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

  // Get input state for Player 1
  getPlayer1State(isTwoPlayerMode = false) {
    if (isTwoPlayerMode) {
      // In 2P mode, P1 uses Arrow Keys + Z (Jump) + X (Hammer)
      return {
        left: this.isDown('ArrowLeft'),
        right: this.isDown('ArrowRight'),
        jump: this.isDown('KeyZ'),
        hammer: this.isDown('KeyX')
      };
    } else {
      // In 1P mode, P1 can use Arrow keys OR WASD, Space/Z for Jump, X for Hammer
      return {
        left: this.isDown('ArrowLeft') || this.isDown('KeyA'),
        right: this.isDown('ArrowRight') || this.isDown('KeyD'),
        jump: this.isDown('KeyZ') || this.isDown('Space'),
        hammer: this.isDown('KeyX')
      };
    }
  }

  // Get input state for Player 2 (WASD + G / H)
  getPlayer2State() {
    return {
      left: this.isDown('KeyA'),
      right: this.isDown('KeyD'),
      jump: this.isDown('KeyG'),
      hammer: this.isDown('KeyH')
    };
  }

  // Global pause check (ESC or P)
  isPausePressed() {
    return this.isJustPressed('Escape') || this.isJustPressed('KeyP');
  }

  // Global start/select check
  isStartPressed() {
    return this.isJustPressed('Enter') || this.isJustPressed('Space');
  }

  isSelectPressed() {
    return this.isJustPressed('ShiftLeft') || this.isJustPressed('ShiftRight');
  }

  isUpPressed() {
    return this.isJustPressed('ArrowUp') || this.isJustPressed('KeyW');
  }

  isDownPressed() {
    return this.isJustPressed('ArrowDown') || this.isJustPressed('KeyS');
  }

  flush() {
    this.justPressed = {};
  }
}
