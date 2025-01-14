import { CHAR_WIDTH, DEFAULT_LOCATIONS, DEFAULT_NAMES, OPTIMIZED_DUOS } from './constants';

export function calcFF8TextWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code < 227) {
      width += CHAR_WIDTH;
    } else if (code < 32) {
      switch (code) {
        case 0x03: // Character names
          const nameIndex = text.charCodeAt(++i) - 0x30;
          if (nameIndex >= 0 && nameIndex < DEFAULT_NAMES.length) {
            width += DEFAULT_NAMES[nameIndex].length * CHAR_WIDTH;
          }
          break;
        case 0x0e: // Locations
          const locIndex = text.charCodeAt(++i) - 0x20;
          if (locIndex >= 0 && locIndex < DEFAULT_LOCATIONS.length) {
            width += DEFAULT_LOCATIONS[locIndex].length * CHAR_WIDTH;
          }
          break;
      }
    }
  }
  return width;
}

export function processText(text: string) {
  const pages: string[][] = [[]];
  let currentPage = 0;
  let currentLine = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code === 0x01) { // New page
      currentPage++;
      currentLine = 0;
      pages[currentPage] = [];
    } else if (code === 0x02) { // New line
      currentLine++;
      if (currentLine >= 4) { // Max 4 lines per page
        currentPage++;
        currentLine = 0;
        pages[currentPage] = [];
      }
      pages[currentPage].push('\n');
    } else if (code < 32) {
      // Handle control codes
      i++;
      switch (code) {
        case 0x03: // Character names
          const nameIndex = text.charCodeAt(i) - 0x30;
          if (nameIndex >= 0 && nameIndex < DEFAULT_NAMES.length) {
            pages[currentPage].push(...DEFAULT_NAMES[nameIndex]);
          }
          break;
        case 0x0e: // Locations
          const locIndex = text.charCodeAt(i) - 0x20;
          if (locIndex >= 0 && locIndex < DEFAULT_LOCATIONS.length) {
            pages[currentPage].push(...DEFAULT_LOCATIONS[locIndex]);
          }
          break;
      }
    } else if (code >= 232) {
      // Handle optimized duos
      const duo = OPTIMIZED_DUOS[code - 232];
      console.log(OPTIMIZED_DUOS, duo, code, text,i, text[i]);
      pages[currentPage].push(String.fromCharCode(duo[0]));
      pages[currentPage].push(String.fromCharCode(duo[1]));
    } else {
      pages[currentPage].push(text[i]);
    }
  }

  return pages;
}

export function calculateUVs(charCode: number): Float32Array {
  const col = charCode % 16;
  const row = Math.floor(charCode / 16);
  
  const u1 = (col * CHAR_WIDTH) / 256;
  const v1 = 1 - ((row * CHAR_HEIGHT) / 256);
  const u2 = ((col + 1) * CHAR_WIDTH) / 256;
  const v2 = 1 - (((row + 1) * CHAR_HEIGHT) / 256);

  return new Float32Array([
    u1, v1,
    u2, v1,
    u1, v2,
    u2, v2,
  ]);
}