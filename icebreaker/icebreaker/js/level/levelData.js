/**
 * levelData.js - Data-driven configurations for multiple mountains
 * Block Types:
 * 0 = Empty air
 * 1 = Normal breakable ice
 * 2 = Solid unbreakable stone/ice
 * 3 = Conveyor ice left
 * 4 = Conveyor ice right
 */

export const MOUNTAIN_DATA = [
  // ==================== MOUNTAIN 1: Glacier Peak (Intro / Classic) ====================
  {
    id: 1,
    name: 'Glacier Peak',
    paletteIndex: 0,
    // Floors 2 through 8 (16 blocks per floor)
    floors: [
      // Floor 2 (lowest climb floor)
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      // Floor 3
      [1, 1, 2, 2, 1, 1, 1, 1, 0, 0, 1, 1, 1, 2, 2, 1],
      // Floor 4
      [1, 0, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 0, 1],
      // Floor 5
      [2, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 2],
      // Floor 6
      [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
      // Floor 7
      [0, 1, 1, 2, 1, 1, 1, 0, 0, 1, 1, 1, 2, 1, 1, 0],
      // Floor 8 (top regular floor before bonus)
      [1, 1, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 1, 1, 1, 1]
    ],
    // Enemies on regular floors
    topis: [
      { floorIndex: 1, x: 80 },
      { floorIndex: 3, x: 140 },
      { floorIndex: 5, x: 60 }
    ],
    birdInterval: 380, // frames between bird spawns
    icicleChance: 0.35,
    // Moving platforms
    platforms: [
      { floorIndex: 4, x: 96, width: 32, pattern: 'horizontal', speed: 0.6, range: 40 }
    ],
    // Bonus Stage (Floors 9 to 13)
    bonus: {
      platforms: [
        // Floor 9 (Cloud tier 1)
        { x: 30, yOffset: 8 * 32, width: 32, pattern: 'wrap', speed: 0.7, dir: 1 },
        { x: 150, yOffset: 8 * 32, width: 32, pattern: 'wrap', speed: 0.7, dir: -1 },
        // Floor 10 (Cloud tier 2)
        { x: 80, yOffset: 9 * 32, width: 24, pattern: 'horizontal', speed: 0.9, range: 60 },
        // Floor 11 (Cloud tier 3)
        { x: 40, yOffset: 10 * 32, width: 32, pattern: 'wrap', speed: 0.8, dir: 1 },
        { x: 160, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 0.8, dir: -1 },
        // Floor 12 (Cloud tier 4 - narrow approach)
        { x: 110, yOffset: 11 * 32, width: 24, pattern: 'horizontal', speed: 1.1, range: 50 }
      ],
      veggies: [
        { x: 40, yOffset: 8 * 32 - 16, type: 'eggplant', points: 400 },
        { x: 160, yOffset: 8 * 32 - 16, type: 'eggplant', points: 400 },
        { x: 90, yOffset: 9 * 32 - 16, type: 'carrot', points: 600 },
        { x: 50, yOffset: 10 * 32 - 16, type: 'turnip', points: 800 },
        { x: 170, yOffset: 10 * 32 - 16, type: 'mushroom', points: 1000 },
        { x: 118, yOffset: 11 * 32 - 16, type: 'corn', points: 1200 }
      ]
    }
  },

  // ==================== MOUNTAIN 2: Crystal Cavern (Narrower platforms, faster birds) ====================
  {
    id: 2,
    name: 'Crystal Cavern',
    paletteIndex: 1,
    floors: [
      // Floor 2
      [1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1],
      // Floor 3
      [2, 0, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 0, 2],
      // Floor 4
      [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
      // Floor 5
      [0, 1, 2, 2, 1, 1, 0, 1, 1, 0, 1, 1, 2, 2, 1, 0],
      // Floor 6
      [1, 1, 1, 1, 2, 0, 1, 1, 1, 1, 0, 2, 1, 1, 1, 1],
      // Floor 7
      [2, 1, 0, 0, 1, 1, 1, 2, 2, 1, 1, 1, 0, 0, 1, 2],
      // Floor 8
      [1, 1, 1, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 1]
    ],
    topis: [
      { floorIndex: 1, x: 40 },
      { floorIndex: 2, x: 180 },
      { floorIndex: 4, x: 100 },
      { floorIndex: 6, x: 50 }
    ],
    birdInterval: 290,
    icicleChance: 0.45,
    platforms: [
      { floorIndex: 3, x: 60, width: 24, pattern: 'horizontal', speed: 0.8, range: 45 },
      { floorIndex: 5, x: 150, width: 24, pattern: 'horizontal', speed: 0.9, range: 40 }
    ],
    bonus: {
      platforms: [
        { x: 40, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 0.9, dir: 1 },
        { x: 170, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 0.9, dir: -1 },
        { x: 100, yOffset: 9 * 32, width: 24, pattern: 'horizontal', speed: 1.1, range: 50 },
        { x: 50, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.0, dir: 1 },
        { x: 180, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.0, dir: -1 },
        { x: 120, yOffset: 11 * 32, width: 24, pattern: 'horizontal', speed: 1.3, range: 60 }
      ],
      veggies: [
        { x: 45, yOffset: 8 * 32 - 16, type: 'carrot', points: 600 },
        { x: 175, yOffset: 8 * 32 - 16, type: 'carrot', points: 600 },
        { x: 105, yOffset: 9 * 32 - 16, type: 'turnip', points: 800 },
        { x: 55, yOffset: 10 * 32 - 16, type: 'mushroom', points: 1000 },
        { x: 185, yOffset: 10 * 32 - 16, type: 'corn', points: 1200 },
        { x: 125, yOffset: 11 * 32 - 16, type: 'gem', points: 1500 }
      ]
    }
  },

  // ==================== MOUNTAIN 3: Slippery Ridge (Conveyor Ice) ====================
  {
    id: 3,
    name: 'Slippery Ridge',
    paletteIndex: 2,
    floors: [
      // Floor 2 (features conveyor ice left)
      [1, 3, 3, 3, 3, 0, 1, 1, 1, 1, 0, 4, 4, 4, 4, 1],
      // Floor 3
      [2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2],
      // Floor 4 (conveyor ice right)
      [1, 1, 0, 4, 4, 4, 4, 2, 2, 3, 3, 3, 3, 0, 1, 1],
      // Floor 5
      [0, 1, 1, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 1, 1, 0],
      // Floor 6
      [1, 3, 3, 3, 0, 1, 1, 2, 2, 1, 1, 0, 4, 4, 4, 1],
      // Floor 7
      [2, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 2],
      // Floor 8
      [1, 1, 1, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 1, 1, 1]
    ],
    topis: [
      { floorIndex: 1, x: 50 },
      { floorIndex: 3, x: 120 },
      { floorIndex: 5, x: 70 },
      { floorIndex: 6, x: 160 }
    ],
    birdInterval: 240,
    icicleChance: 0.5,
    platforms: [
      { floorIndex: 2, x: 110, width: 24, pattern: 'wrap', speed: 1.0, dir: 1 },
      { floorIndex: 6, x: 100, width: 24, pattern: 'horizontal', speed: 1.1, range: 45 }
    ],
    bonus: {
      platforms: [
        { x: 30, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.1, dir: 1 },
        { x: 160, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.1, dir: -1 },
        { x: 80, yOffset: 9 * 32, width: 24, pattern: 'horizontal', speed: 1.2, range: 50 },
        { x: 40, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.2, dir: 1 },
        { x: 170, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.2, dir: -1 },
        { x: 110, yOffset: 11 * 32, width: 24, pattern: 'horizontal', speed: 1.4, range: 60 }
      ],
      veggies: [
        { x: 35, yOffset: 8 * 32 - 16, type: 'turnip', points: 800 },
        { x: 165, yOffset: 8 * 32 - 16, type: 'turnip', points: 800 },
        { x: 85, yOffset: 9 * 32 - 16, type: 'mushroom', points: 1000 },
        { x: 45, yOffset: 10 * 32 - 16, type: 'corn', points: 1200 },
        { x: 175, yOffset: 10 * 32 - 16, type: 'corn', points: 1200 },
        { x: 115, yOffset: 11 * 32 - 16, type: 'gem', points: 1500 }
      ]
    }
  },

  // ==================== MOUNTAIN 4: Sunset Summit (Challenging layout, tricky jumps) ====================
  {
    id: 4,
    name: 'Sunset Summit',
    paletteIndex: 3,
    floors: [
      // Floor 2
      [2, 0, 1, 1, 2, 0, 1, 1, 1, 1, 0, 2, 1, 1, 0, 2],
      // Floor 3
      [1, 1, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 1, 1],
      // Floor 4
      [0, 1, 2, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 2, 1, 0],
      // Floor 5
      [1, 1, 1, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 1, 1, 1],
      // Floor 6
      [2, 2, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 2, 2],
      // Floor 7
      [0, 1, 1, 0, 2, 2, 1, 1, 1, 1, 2, 2, 0, 1, 1, 0],
      // Floor 8
      [1, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 1]
    ],
    topis: [
      { floorIndex: 1, x: 30 },
      { floorIndex: 2, x: 160 },
      { floorIndex: 4, x: 90 },
      { floorIndex: 5, x: 140 },
      { floorIndex: 6, x: 50 }
    ],
    birdInterval: 210,
    icicleChance: 0.6,
    platforms: [
      { floorIndex: 3, x: 40, width: 24, pattern: 'horizontal', speed: 1.0, range: 40 },
      { floorIndex: 5, x: 140, width: 24, pattern: 'horizontal', speed: 1.1, range: 45 }
    ],
    bonus: {
      platforms: [
        { x: 20, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.2, dir: 1 },
        { x: 180, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.2, dir: -1 },
        { x: 110, yOffset: 9 * 32, width: 24, pattern: 'horizontal', speed: 1.3, range: 55 },
        { x: 30, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.3, dir: 1 },
        { x: 160, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.3, dir: -1 },
        { x: 100, yOffset: 11 * 32, width: 24, pattern: 'horizontal', speed: 1.5, range: 60 }
      ],
      veggies: [
        { x: 25, yOffset: 8 * 32 - 16, type: 'mushroom', points: 1000 },
        { x: 185, yOffset: 8 * 32 - 16, type: 'mushroom', points: 1000 },
        { x: 115, yOffset: 9 * 32 - 16, type: 'corn', points: 1200 },
        { x: 35, yOffset: 10 * 32 - 16, type: 'gem', points: 1500 },
        { x: 165, yOffset: 10 * 32 - 16, type: 'gem', points: 1500 },
        { x: 105, yOffset: 11 * 32 - 16, type: 'gem', points: 2000 }
      ]
    }
  },

  // ==================== MOUNTAIN 5: Midnight Aurora (Master challenge) ====================
  {
    id: 5,
    name: 'Midnight Aurora',
    paletteIndex: 4,
    floors: [
      [2, 3, 3, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 4, 4, 2],
      [1, 0, 0, 1, 1, 0, 1, 2, 2, 1, 0, 1, 1, 0, 0, 1],
      [2, 1, 1, 2, 0, 0, 1, 1, 1, 1, 0, 0, 2, 1, 1, 2],
      [0, 4, 4, 4, 1, 1, 0, 2, 2, 0, 1, 1, 3, 3, 3, 0],
      [1, 1, 0, 0, 1, 2, 2, 1, 1, 2, 2, 1, 0, 0, 1, 1],
      [2, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 2],
      [1, 1, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1, 1]
    ],
    topis: [
      { floorIndex: 1, x: 40 },
      { floorIndex: 2, x: 120 },
      { floorIndex: 3, x: 190 },
      { floorIndex: 5, x: 60 },
      { floorIndex: 6, x: 150 }
    ],
    birdInterval: 180,
    icicleChance: 0.65,
    platforms: [
      { floorIndex: 2, x: 80, width: 24, pattern: 'wrap', speed: 1.2, dir: 1 },
      { floorIndex: 4, x: 130, width: 24, pattern: 'horizontal', speed: 1.3, range: 50 },
      { floorIndex: 6, x: 90, width: 24, pattern: 'horizontal', speed: 1.2, range: 45 }
    ],
    bonus: {
      platforms: [
        { x: 30, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.3, dir: 1 },
        { x: 170, yOffset: 8 * 32, width: 24, pattern: 'wrap', speed: 1.3, dir: -1 },
        { x: 90, yOffset: 9 * 32, width: 24, pattern: 'horizontal', speed: 1.5, range: 60 },
        { x: 40, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.4, dir: 1 },
        { x: 180, yOffset: 10 * 32, width: 24, pattern: 'wrap', speed: 1.4, dir: -1 },
        { x: 120, yOffset: 11 * 32, width: 24, pattern: 'horizontal', speed: 1.6, range: 65 }
      ],
      veggies: [
        { x: 35, yOffset: 8 * 32 - 16, type: 'gem', points: 1500 },
        { x: 175, yOffset: 8 * 32 - 16, type: 'gem', points: 1500 },
        { x: 95, yOffset: 9 * 32 - 16, type: 'gem', points: 1500 },
        { x: 45, yOffset: 10 * 32 - 16, type: 'gem', points: 2000 },
        { x: 185, yOffset: 10 * 32 - 16, type: 'gem', points: 2000 },
        { x: 125, yOffset: 11 * 32 - 16, type: 'gem', points: 2500 }
      ]
    }
  }
];
