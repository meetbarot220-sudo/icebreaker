/**
 * player.js - Authentic NES Ice Climber player controller
 */

import { CONFIG } from '../config.js';
import { Sprites } from '../graphics/spriteData.js';
import { SFX } from '../audio/sfx.js';
import { clamp } from '../physics/math.js';

export class Player {
  constructor(id = 1, startX = 64, startY = 380) {
    this.id = id; // 1 (Pip - Blue) or 2 (Penny - Pink)
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.prevX = startX;
    this.prevY = startY;
    this.width = 16;
    this.height = 16;

    // Velocities
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.isGrounded = false;
    this.ridingPlatform = null;
    this.conveyorVx = 0;

    // Movement & state
    this.state = 'idle'; // 'idle' | 'walk' | 'jump' | 'fall' | 'swing' | 'hurt' | 'dead' | 'victory'
    this.animTimer = 0;
    this.animFrame = 0;

    // Hammer
    this.hammerTimer = 0;
    this.isSwinging = false;

    // Lives & Score
    this.lives = CONFIG.STARTING_LIVES;
    this.score = 0;
    this.veggiesCollected = 0;
    this.isAlive = true;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // Summit status
    this.caughtEagle = null;

    // Death animation state
    this.deathTimer = 0;
    this.deathVy = 0;
  }

  resetPosition(x, y) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.state = 'idle';
    this.isSwinging = false;
    this.hammerTimer = 0;
    this.ridingPlatform = null;
    this.caughtEagle = null;
  }

  addScore(pts) {
    this.score += pts;
  }

  getBounds() {
    return {
      x: this.x + 3,
      y: this.y + 1,
      w: 10,
      h: 15
    };
  }

  getHammerHitbox() {
    if (!this.isSwinging || this.hammerTimer < 2 || this.hammerTimer > CONFIG.TIMINGS.HAMMER_ACTIVE_FRAMES) {
      return null;
    }
    // Hitbox directly in front of the climber at mallet strike position
    return {
      x: this.facing > 0 ? this.x + 8 : this.x - 10,
      y: this.y + 2,
      w: 18,
      h: 16
    };
  }

  takeDamage() {
    if (!this.isAlive || this.isInvulnerable || this.state === 'victory') return;
    this.loseLife();
  }

  loseLife() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.state = 'dead';
    this.lives--;
    this.deathVy = -4.0;
    this.deathTimer = 120; // 2 seconds
    SFX.damage();
    SFX.death();
  }

  respawn(safeX, safeY) {
    this.isAlive = true;
    this.state = 'idle';
    this.resetPosition(safeX, safeY);
    this.isInvulnerable = true;
    this.invulnerableTimer = CONFIG.TIMINGS.INVULNERABLE_FRAMES;
  }

  onSummitGrab(eagle) {
    this.state = 'victory';
    this.caughtEagle = eagle;
    this.vy = 0;
    this.vx = 0;
    this.addScore(CONFIG.SCORE.REACH_SUMMIT);
  }

  handleInput(inputState) {
    if (!this.isAlive || this.state === 'victory') return;

    // 1. Hammer Swing Action
    if (inputState.hammer && this.hammerTimer === 0 && this.state !== 'swing') {
      this.isSwinging = true;
      this.hammerTimer = CONFIG.TIMINGS.HAMMER_COOLDOWN;
      SFX.hammer();
      if (this.isGrounded) {
        this.state = 'swing';
        this.vx = 0; // Stand still during swing on ground
      }
    }

    // 2. Jump Action
    if (inputState.jump && this.isGrounded && this.state !== 'swing') {
      this.vy = CONFIG.PHYSICS.JUMP_SPEED;
      this.isGrounded = false;
      this.ridingPlatform = null;
      this.state = 'jump';
      SFX.jump();
    }

    // 3. Horizontal Movement
    if (this.isGrounded) {
      if (this.state === 'swing') {
        // Can't walk while swinging on ground
        this.vx *= CONFIG.PHYSICS.GROUND_FRICTION;
      } else {
        if (inputState.left) {
          this.facing = -1;
          this.vx = Math.max(-CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx - CONFIG.PHYSICS.WALK_ACCEL);
          this.state = 'walk';
        } else if (inputState.right) {
          this.facing = 1;
          this.vx = Math.min(CONFIG.PHYSICS.WALK_MAX_SPEED, this.vx + CONFIG.PHYSICS.WALK_ACCEL);
          this.state = 'walk';
        } else {
          // Slide to halt with ice friction
          this.vx *= CONFIG.PHYSICS.ICE_FRICTION;
          if (Math.abs(this.vx) < 0.08) {
            this.vx = 0;
            this.state = 'idle';
          }
        }
      }
    } else {
      // In mid-air: Jump momentum is mostly preserved, with subtle air steering nudge
      if (inputState.left) {
        this.facing = -1;
        this.vx = Math.max(-CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx - CONFIG.PHYSICS.AIR_STEER_ACCEL);
      } else if (inputState.right) {
        this.facing = 1;
        this.vx = Math.min(CONFIG.PHYSICS.AIR_MAX_SPEED, this.vx + CONFIG.PHYSICS.AIR_STEER_ACCEL);
      }
    }
  }

  update(collisionSystem, cameraY) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.animTimer++;

    // Invulnerability blinking countdown
    if (this.isInvulnerable) {
      this.invulnerableTimer--;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Dead sequence
    if (this.state === 'dead') {
      this.y += this.deathVy;
      this.deathVy += 0.22;
      this.deathTimer--;
      return;
    }

    // Victory sequence (holding onto eagle)
    if (this.state === 'victory') {
      return; // Handled by eagle update
    }

    // Hammer timer cooldown
    if (this.hammerTimer > 0) {
      this.hammerTimer--;
      if (this.hammerTimer === 0) {
        this.isSwinging = false;
        if (this.state === 'swing') {
          this.state = this.isGrounded ? 'idle' : 'fall';
        }
      }
    }

    // Moving platform ride
    if (this.isGrounded && this.ridingPlatform) {
      this.x += this.ridingPlatform.vx;
      this.y += this.ridingPlatform.vy;
    }

    // Conveyor ice push
    if (this.isGrounded && this.conveyorVx !== 0) {
      this.x += this.conveyorVx;
    }

    // Apply horizontal speed
    this.x += this.vx;

    // Authentic Screen Wrap
    collisionSystem.handleScreenWrap(this);

    // Apply gravity
    if (!this.isGrounded) {
      this.vy = Math.min(CONFIG.PHYSICS.MAX_FALL_SPEED, this.vy + CONFIG.PHYSICS.GRAVITY);
      this.y += this.vy;

      // Update air animation state
      if (this.state !== 'swing') {
        this.state = this.vy < 0 ? 'jump' : 'fall';
      }
    }

    // Check upward head collision (ice cracking/breaking)
    collisionSystem.checkHeadCollision(this);

    // Check downward platform / floor landing
    const grounded = collisionSystem.checkFloorCollision(this);
    if (grounded && this.state !== 'swing') {
      this.state = Math.abs(this.vx) > 0.1 ? 'walk' : 'idle';
    }

    // Walk animation bobbing
    if (this.state === 'walk') {
      if (this.animTimer % 6 === 0) {
        this.animFrame = 1 - this.animFrame;
      }
    } else {
      this.animFrame = 0;
    }

    // Screen Bottom Death Check:
    // If camera has scrolled up and player falls below bottom of visible screen
    const screenBottom = cameraY + CONFIG.CANVAS_HEIGHT + 8;
    if (this.y > screenBottom && this.isAlive) {
      this.loseLife();
    }
  }

  draw(ctx, cameraY) {
    if (!this.isAlive && this.state !== 'dead') return;

    // Invulnerability blinking
    if (this.isInvulnerable && Math.floor(this.animTimer / 3) % 2 === 0) {
      return;
    }

    const screenY = Math.floor(this.y - cameraY);
    if (screenY < -24 || screenY > CONFIG.CANVAS_HEIGHT + 24) return;

    const prefix = this.id === 1 ? 'p1' : 'p2';
    let spriteName = `${prefix}_idle`;

    switch (this.state) {
      case 'walk':
        spriteName = `${prefix}_walk${this.animFrame === 0 ? '1' : '2'}`;
        break;
      case 'jump':
        spriteName = `${prefix}_jump`;
        break;
      case 'fall':
        spriteName = `${prefix}_fall`;
        break;
      case 'swing':
        spriteName = `${prefix}_swing`;
        break;
      case 'hurt':
      case 'dead':
        spriteName = `${prefix}_hurt`;
        break;
      case 'victory':
        spriteName = `${prefix}_victory`;
        break;
      default:
        spriteName = `${prefix}_idle`;
    }

    const sprite = Sprites.get(spriteName);
    if (sprite) {
      ctx.save();
      const drawX = Math.floor(this.x);
      if (this.facing < 0 && this.state !== 'victory') {
        // Flip horizontally
        ctx.translate(drawX + this.width, screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
      } else {
        ctx.drawImage(sprite, drawX, screenY);
      }
      ctx.restore();
    }
  }
}
