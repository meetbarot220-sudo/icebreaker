/**
 * camera.js - Authentic NES vertical-only scrolling camera with screen shake
 */

import { CONFIG } from '../config.js';

export class Camera {
  constructor() {
    this.y = 0;
    this.targetY = 0;
    this.minY = 0; // Top of mountain
    this.maxY = 0; // Bottom of mountain
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.scrollSpeed = 2.0; // Pixels per frame
  }

  reset(mountainHeight) {
    this.minY = 0;
    // Initial camera shows ground level (Floor 1)
    this.maxY = mountainHeight - CONFIG.CANVAS_HEIGHT;
    this.y = this.maxY;
    this.targetY = this.maxY;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
  }

  // Trigger screen shake (e.g. bear stomp)
  triggerShake(duration = 20, intensity = 3) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  // Force scroll upward by one full floor (Stomper Bear punishment)
  forceScrollUpOneFloor() {
    const newTarget = Math.max(this.minY, this.targetY - CONFIG.FLOOR_HEIGHT);
    if (newTarget < this.targetY) {
      this.targetY = newTarget;
    }
  }

  update(players) {
    // Find the highest living player (lowest y value)
    let highestPlayer = null;
    let minY = Infinity;

    for (const p of players) {
      if (p.isAlive && p.y < minY) {
        minY = p.y;
        highestPlayer = p;
      }
    }

    if (highestPlayer) {
      // Screen coordinate of highest player
      const playerScreenY = highestPlayer.y - this.y;

      // When player reaches upper portion of the visible screen (e.g. upper 85 pixels)
      if (playerScreenY < 85) {
        // Scroll upward to position player at y ~ 140
        const desiredCameraY = highestPlayer.y - 140;
        if (desiredCameraY < this.targetY) {
          // Camera NEVER scrolls back down in Ice Climber!
          this.targetY = Math.max(this.minY, desiredCameraY);
        }
      }
    }

    // Smooth step-scroll towards targetY
    if (this.y > this.targetY) {
      this.y -= this.scrollSpeed;
      if (this.y < this.targetY) {
        this.y = this.targetY;
      }
    }

    // Screen shake update
    let shakeOffset = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
      shakeOffset = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    return Math.floor(this.y + shakeOffset);
  }
}
