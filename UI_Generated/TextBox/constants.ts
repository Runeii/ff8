// constants.ts
export const ICON_WIDTHS = [
  15, 15, 15, 15, 9, 9, 9, 9, 31, 0, 0, 31, 12, 12, 12, 12,
  15, 15, 15, 15, 9, 9, 9, 9, 31, 0, 0, 31, 12, 12, 12, 12,
  0, 8, 6, 11, 8, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12,
  12, 12, 12, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16,
  16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16,
  16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 24
] as const;

export const ICON_PADDING = [
  2, 2, 2, 2, 8, 8, 8, 8, 2, 17, 17, 2, 3, 3, 3, 3,
  2, 2, 2, 2, 8, 8, 8, 8, 2, 17, 17, 2, 3, 3, 3, 3,
  9, 1, 3, 6, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
] as const;

export const OPTIMIZED_DUOS = [
  [0x47, 0x4c], // in
  [0x43, 0x00], // e
  [0x4c, 0x43], // ne
  [0x52, 0x4d], // to
  [0x50, 0x43], // re
  [0x2c, 0x34], // HP
  [0x4a, 0x00], // l
  [0x4a, 0x4a], // ll
  [0x2b, 0x2a], // GF
  [0x4c, 0x52], // nt
  [0x47, 0x4a], // il
  [0x4d, 0x00], // o
  [0x43, 0x44], // ef
  [0x4d, 0x4c], // on
  [0x00, 0x55], // w
  [0x00, 0x50], // r
  [0x55, 0x47], // wi
  [0x44, 0x47], // fi
  [0x29, 0x27], // EC
  [0x51, 0x00], // s
  [0x3f, 0x50], // ar
  [0x2a, 0x29], // FE
  [0x00, 0x37], // S
  [0x3f, 0x45]  // ag
] as const;

export const DEFAULT_NAMES = [
  'Squall', 'Zell', 'Irvine', 'Quistis', 
  'Rinoa', 'Selphie', 'Seifer', 'Edea',
  'Laguna', 'Kiros', 'Ward', 'Angelo',
  'Griever', 'MiniMog'
] as const;

export const DEFAULT_LOCATIONS = [
  'Galbadia', 'Esthar', 'Balamb', 'Dollet',
  'Timber', 'Trabia', 'Centra', 'Horizon'
] as const;

export enum FontColor {
  White = 0,
  Gray = 1,
  Yellow = 2,
  Red = 3,
  Green = 4,
  Blue = 5,
  Purple = 6,
  Cyan = 7
}

export enum TextCommand {
  NewPage = 0x01,
  NewLine = 0x02,
  Name = 0x03,
  Variable = 0x04,
  Icon = 0x05,
  Color = 0x06,
  Location = 0x0e,
  Japanese1 = 0x19,
  Japanese2 = 0x1a,
  Japanese3 = 0x1b,
  Japanese4 = 0x1c
}

// Font texture dimensions
export const CHAR_WIDTH = 12;
export const CHAR_HEIGHT = 12;
export const TEXTURE_SIZE = 256; // Font texture is 256x256

// Window styling constants from original code
export const WINDOW_COLORS = {
  BORDER_DARK: 0x292929,
  BORDER_LIGHT: 0x848484,
  BORDER_MID: 0x3A3A3A,
  CORNER_DARK: 0x525252,
  CORNER_LIGHT: 0x636363,
  BACKGROUND: 0x292929,
  BACKGROUND_OPACITY: 0.8
} as const;

// Text positioning constants
export const TEXT_START_X = 8;
export const TEXT_START_Y = 8;
export const LINE_HEIGHT = 16;
export const MAX_LINES_PER_PAGE = 4;

// Icon texture dimensions
export const ICON_TEXTURE_SIZE = 512; // Icon sheet is 512x512
export const ICON_HEIGHT = 12;
export const ICON_SHEET_CELL_WIDTH = 31; // Each icon cell is 31px wide in the sheet