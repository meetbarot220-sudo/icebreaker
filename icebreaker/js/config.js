/**
 * config.js - Global constants, display settings, palettes, and physics configuration
 */

export const CONFIG = {
  // Authentic NES resolution
  CANVAS_WIDTH: 256,
  CANVAS_HEIGHT: 240,
  
  // Target Framerate
  FPS: 60,
  FRAME_TIME: 1000 / 60,
  
  // Mountain & Tile dimensions
  TILE_WIDTH: 16,
  TILE_HEIGHT: 8,
  TILES_X: 16, // 16 * 16 = 256 px
  FLOOR_HEIGHT: 32, // Each regular floor is 32px (8px ice floor + 24px clearance)
  FLOORS_PER_MOUNTAIN: 8, // Floors 1 to 8 are the standard climb
  BONUS_FLOORS: 5, // Floors 9 to 13 are the Bonus / Summit stage
  TOTAL_FLOORS: 13,
  
  // Mountain vertical height in pixels
  MOUNTAIN_HEIGHT: 13 * 32, // 416 px
  
  // Starting lives
  STARTING_LIVES: 3,
  
  // Scoring
  SCORE: {
    BREAK_ICE: 10,
    DEFEAT_TOPI: 100,
    DEFEAT_BIRD: 400,
    COLLECT_VEGGIE_BASE: 400, // Multiplies by tier
    REACH_SUMMIT: 10000,
    MOUNTAIN_CLEAR: 2000
  },
  
  // Physics parameters (authentic NES arcade feel)
  PHYSICS: {
    GRAVITY: 0.22,
    MAX_FALL_SPEED: 4.5,
    WALK_ACCEL: 0.25,
    WALK_MAX_SPEED: 1.35,
    ICE_FRICTION: 0.92,
    GROUND_FRICTION: 0.82,
    JUMP_SPEED: -4.3,
    AIR_STEER_ACCEL: 0.08,
    AIR_MAX_SPEED: 1.35,
    HEAD_BUMP_REBOUND: 0.5
  },

  // Timings
  TIMINGS: {
    HAMMER_COOLDOWN: 14, // frames
    HAMMER_ACTIVE_FRAMES: 8,
    INVULNERABLE_FRAMES: 90,
    BONUS_STAGE_SECONDS: 40,
    BEAR_SPAWN_SECONDS: 28, // If player spends >28s on one section without scrolling
    ICICLE_WARN_FRAMES: 40,
    ICICLE_DROP_SPEED: 3.5
  },

  // Key mappings
  KEYS: {
    PLAYER_1: {
      LEFT: ['ArrowLeft', 'KeyA'],
      RIGHT: ['ArrowRight', 'KeyD'],
      JUMP: ['KeyZ', 'Space'],
      HAMMER: ['KeyX']
    },
    PLAYER_2: {
      LEFT: ['KeyJ'],
      RIGHT: ['KeyL'],
      JUMP: ['KeyI'],
      HAMMER: ['KeyO']
    },
    // Alternate 2P mapping requested in prompt:
    // P1: Arrow Keys, Z = Jump, X = Hammer
    // P2: WASD, G = Jump, H = Hammer
    P1_DEDICATED: {
      LEFT: ['ArrowLeft'],
      RIGHT: ['ArrowRight'],
      JUMP: ['KeyZ'],
      HAMMER: ['KeyX']
    },
    P2_DEDICATED: {
      LEFT: ['KeyA'],
      RIGHT: ['KeyD'],
      JUMP: ['KeyG'],
      HAMMER: ['KeyH']
    },
    PAUSE: ['Escape', 'KeyP'],
    SELECT: ['ShiftLeft', 'ShiftRight'],
    START: ['Enter']
  }
};
