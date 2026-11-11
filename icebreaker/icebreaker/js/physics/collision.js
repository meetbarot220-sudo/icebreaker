/**
 * collision.js - Deterministic NES-style collision detection and resolution
 */

import { CONFIG } from '../config.js';
import { aabbIntersect } from './math.js';
import { SFX } from '../audio/sfx.js';

export class CollisionSystem {
  constructor(levelManager) {
    this.level = levelManager;
  }

  // Handle screen boundary wrapping (classic Ice Climber screen-wrap)
  handleScreenWrap(entity) {
    const halfW = entity.width / 2;
    if (entity.x < -halfW) {
      entity.x = CONFIG.CANVAS_WIDTH - halfW;
    } else if (entity.x > CONFIG.CANVAS_WIDTH - halfW) {
      entity.x = -halfW;
    }
  }

  // Check and resolve upward collision (Head bumping & ice breaking)
  checkHeadCollision(player) {
    if (player.vy >= 0) return; // Only when moving upward

    const headY = player.y;
    const prevHeadY = player.prevY;
    const feetX1 = player.x + 3;
    const feetX2 = player.x + player.width - 4;

    // Check all floors
    for (const floor of this.level.floors) {
      const blockBottomY = floor.y + CONFIG.TILE_HEIGHT;
      const blockTopY = floor.y;

      // Did head cross into the block layer from below?
      if (headY <= blockBottomY && prevHeadY >= blockTopY) {
        // Find which tile columns are overlapped
        const col1 = Math.floor(feetX1 / CONFIG.TILE_WIDTH);
        const col2 = Math.floor(feetX2 / CONFIG.TILE_WIDTH);

        let hitSolid = false;
        let brokeAny = false;

        for (let col = col1; col <= col2; col++) {
          if (col >= 0 && col < CONFIG.TILES_X) {
            const blockType = floor.blocks[col];

            if (blockType === 1) { // Normal breakable ice
              // Break it!
              floor.blocks[col] = 0; // Empty
              brokeAny = true;
              this.level.spawnIceDebris(col * CONFIG.TILE_WIDTH + 8, floor.y + 4);
              SFX.iceBreak();
              player.addScore(CONFIG.SCORE.BREAK_ICE);
            } else if (blockType === 2 || blockType === 3 || blockType === 4) { // Solid or conveyor
              hitSolid = true;
            }
          }
        }

        if (brokeAny) {
          // Bumping head on breakable ice absorbs upward momentum
          player.vy = CONFIG.PHYSICS.HEAD_BUMP_REBOUND;
          return;
        } else if (hitSolid) {
          // Bonk head on solid stone/ice
          player.y = blockBottomY;
          player.vy = CONFIG.PHYSICS.HEAD_BUMP_REBOUND;
          SFX.hammer();
          return;
        }
      }
    }
  }

  // Check and resolve downward collision (Landing on platforms and ice blocks)
  checkFloorCollision(entity) {
    // Only resolve landing when falling or grounded
    if (entity.vy < 0) return false;

    const feetY = entity.y + entity.height;
    const prevFeetY = entity.prevY + entity.height;
    const feetX1 = entity.x + 4;
    const feetX2 = entity.x + entity.width - 5;

    // 1. Check Level Ice Floors
    for (const floor of this.level.floors) {
      const floorTopY = floor.y;

      // Has entity fallen onto or stepped across the floor top?
      if (prevFeetY <= floorTopY + 5 && feetY >= floorTopY - 5) {
        const col1 = Math.floor(feetX1 / CONFIG.TILE_WIDTH);
        const col2 = Math.floor(feetX2 / CONFIG.TILE_WIDTH);

        let canStand = false;
        let conveyorSpeed = 0;

        for (let col = col1; col <= col2; col++) {
          if (col >= 0 && col < CONFIG.TILES_X) {
            const blockType = floor.blocks[col];
            if (blockType > 0) {
              canStand = true;
              if (blockType === 3) conveyorSpeed = -0.7; // Left conveyor
              if (blockType === 4) conveyorSpeed = 0.7;  // Right conveyor
            }
          }
        }

        if (canStand) {
          entity.y = floorTopY - entity.height;
          entity.vy = 0;
          entity.isGrounded = true;
          entity.conveyorVx = conveyorSpeed;
          entity.ridingPlatform = null;
          return true;
        }
      }
    }

    // 2. Check Moving Cloud Platforms
    for (const plat of this.level.movingPlatforms) {
      if (prevFeetY <= plat.y + 6 && feetY >= plat.y - 5) {
        if (feetX2 >= plat.x && feetX1 <= plat.x + plat.width) {
          entity.y = plat.y - entity.height;
          entity.vy = 0;
          entity.isGrounded = true;
          entity.conveyorVx = 0;
          entity.ridingPlatform = plat;
          return true;
        }
      }
    }

    // 3. Base Ground (Floor 1)
    const baseGroundY = this.level.baseGroundY;
    if (feetY >= baseGroundY) {
      entity.y = baseGroundY - entity.height;
      entity.vy = 0;
      entity.isGrounded = true;
      entity.conveyorVx = 0;
      entity.ridingPlatform = null;
      return true;
    }

    entity.isGrounded = false;
    entity.conveyorVx = 0;
    entity.ridingPlatform = null;
    return false;
  }

  // Check hammer attack collisions (against nearby ice blocks and enemies)
  checkHammerAttack(player, enemies) {
    const hitbox = player.getHammerHitbox();
    if (!hitbox) return;

    // 1. Break adjacent ice blocks at hammer height
    for (const floor of this.level.floors) {
      if (hitbox.y + hitbox.h >= floor.y - 4 && hitbox.y <= floor.y + CONFIG.TILE_HEIGHT + 4) {
        const col1 = Math.floor(hitbox.x / CONFIG.TILE_WIDTH);
        const col2 = Math.floor((hitbox.x + hitbox.w) / CONFIG.TILE_WIDTH);

        for (let col = col1; col <= col2; col++) {
          if (col >= 0 && col < CONFIG.TILES_X) {
            if (floor.blocks[col] === 1) { // Breakable
              floor.blocks[col] = 0;
              this.level.spawnIceDebris(col * CONFIG.TILE_WIDTH + 8, floor.y + 4);
              SFX.iceBreak();
              player.addScore(CONFIG.SCORE.BREAK_ICE);
            }
          }
        }
      }
    }

    // 2. Hit enemies
    for (const enemy of enemies) {
      if (enemy.isActive && !enemy.isDefeated) {
        const enemyBox = enemy.getBounds();
        if (aabbIntersect(hitbox, enemyBox)) {
          enemy.hitByHammer(player);
        }
      }
    }
  }
}
