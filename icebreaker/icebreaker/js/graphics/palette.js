/**
 * palette.js - Authentic NES 2C02 64-color palette & custom mountain theme palettes
 */

// Full 64-color NES Master Palette
export const NES_PALETTE = [
  // 0x00 - 0x0F
  '#666666', '#002A88', '#1412A7', '#3B00A4', '#5C007E', '#6E0040', '#6C0600', '#561D00',
  '#333500', '#0B4800', '#005200', '#004F08', '#00404D', '#000000', '#000000', '#000000',
  // 0x10 - 0x1F
  '#ADADAD', '#155FD9', '#4240FF', '#7527FE', '#A01ACC', '#B71E7B', '#B53120', '#994E00',
  '#6B6D00', '#268700', '#0C9300', '#058F32', '#007C8D', '#000000', '#000000', '#000000',
  // 0x20 - 0x2F
  '#FFFFFF', '#64B0FF', '#9290FF', '#C676FF', '#F36AFF', '#FE6ECC', '#FE8170', '#EA9E22',
  '#BCBE00', '#72D800', '#4EE444', '#45DE8B', '#43D7DC', '#4A4A4A', '#000000', '#000000',
  // 0x30 - 0x3F
  '#FFFFFF', '#C0E0FF', '#D3D2FF', '#E8C8FF', '#FBC2FF', '#FEC4EA', '#FECCC5', '#F7D8A5',
  '#E4E594', '#C7F694', '#B7F9B1', '#B3F7D0', '#B2F6F6', '#BFBFBF', '#000000', '#000000'
];

// Named shorthand colors mapped to NES palette indices
export const C = {
  BLACK: NES_PALETTE[0x0F],
  WHITE: NES_PALETTE[0x20],
  DARK_GRAY: NES_PALETTE[0x00],
  MED_GRAY: NES_PALETTE[0x10],
  LIGHT_GRAY: NES_PALETTE[0x3D],
  
  // Blues & Cyan (Ice, Sky, Parka)
  DEEP_BLUE: NES_PALETTE[0x01],
  ROYAL_BLUE: NES_PALETTE[0x11],
  SKY_BLUE: NES_PALETTE[0x21],
  PALE_BLUE: NES_PALETTE[0x31],
  ICE_CYAN: NES_PALETTE[0x2C],
  PALE_CYAN: NES_PALETTE[0x3C],
  DARK_TEAL: NES_PALETTE[0x0C],
  
  // Reds, Pinks, Purples (P2 Parka, Veggies, Enemies)
  DARK_RED: NES_PALETTE[0x06],
  RED: NES_PALETTE[0x16],
  LIGHT_RED: NES_PALETTE[0x26],
  PINK: NES_PALETTE[0x25],
  HOT_PINK: NES_PALETTE[0x14],
  DEEP_PURPLE: NES_PALETTE[0x04],
  PURPLE: NES_PALETTE[0x13],
  LIGHT_PURPLE: NES_PALETTE[0x23],
  
  // Greens & Yellows (Vegetables, Accents)
  DARK_GREEN: NES_PALETTE[0x0A],
  GREEN: NES_PALETTE[0x1A],
  LIGHT_GREEN: NES_PALETTE[0x2A],
  PALE_GREEN: NES_PALETTE[0x3A],
  BROWN: NES_PALETTE[0x07],
  LIGHT_BROWN: NES_PALETTE[0x17],
  GOLD: NES_PALETTE[0x27],
  YELLOW: NES_PALETTE[0x38],
  ORANGE: NES_PALETTE[0x27],
  PEACH: NES_PALETTE[0x37]
};

// Color palettes for different mountains
export const MOUNTAIN_PALETTES = [
  {
    name: 'Glacier Peak',
    sky: '#002A88',
    iceBase: C.ICE_CYAN,
    iceHighlight: C.WHITE,
    iceShadow: C.ROYAL_BLUE,
    solidBase: '#155FD9',
    solidHighlight: C.PALE_BLUE,
    solidShadow: '#001A55',
    cloudColor: C.WHITE,
    cloudShadow: C.PALE_CYAN
  },
  {
    name: 'Crystal Cavern',
    sky: '#3B00A4',
    iceBase: C.LIGHT_PURPLE,
    iceHighlight: C.WHITE,
    iceShadow: C.PURPLE,
    solidBase: C.DEEP_PURPLE,
    solidHighlight: C.PINK,
    solidShadow: '#1F004D',
    cloudColor: '#FEC4EA',
    cloudShadow: '#A01ACC'
  },
  {
    name: 'Emerald Ridge',
    sky: '#0B4800',
    iceBase: C.LIGHT_GREEN,
    iceHighlight: C.WHITE,
    iceShadow: C.DARK_GREEN,
    solidBase: '#005200',
    solidHighlight: C.PALE_GREEN,
    solidShadow: '#002B00',
    cloudColor: C.PALE_GREEN,
    cloudShadow: '#268700'
  },
  {
    name: 'Sunset Summit',
    sky: '#6C0600',
    iceBase: C.PEACH,
    iceHighlight: C.WHITE,
    iceShadow: C.DARK_RED,
    solidBase: '#994E00',
    solidHighlight: C.GOLD,
    solidShadow: '#561D00',
    cloudColor: '#F7D8A5',
    cloudShadow: '#EA9E22'
  },
  {
    name: 'Midnight Aurora',
    sky: '#000000',
    iceBase: C.PALE_CYAN,
    iceHighlight: C.WHITE,
    iceShadow: '#00404D',
    solidBase: '#1412A7',
    solidHighlight: C.SKY_BLUE,
    solidShadow: '#000B4D',
    cloudColor: C.ICE_CYAN,
    cloudShadow: '#007C8D'
  }
];
