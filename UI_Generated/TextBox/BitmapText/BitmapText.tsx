import { useMemo } from 'react';
import * as THREE from 'three';

// Configuration for FF7 font sprite sheet
const CHAR_WIDTH = 12;
const CHAR_HEIGHT = 12;
const SHEET_COLS = 32;
const SHEET_ROWS = 8;
const FF7_GREEN = "#00ff00";

// Direct character mapping (reading left-to-right, top-to-bottom)
const CHAR_MAP = [
  // Row 1 - Numbers and basic punctuation
  "0123456789w/!?m-.",
  // Row 2 - Uppercase letters (first part)
  "ABCDEFGHIJKLMNOP",
  // Row 3 - Uppercase letters (second part)
  "QRSTUVWXYZ():;[]",
  // Row 4 - Lowercase letters (first part)
  "abcdefghijklmnop",
  // Row 5 - Lowercase letters (second part)
  "qrstuvwxyz{}$*'\"",
  // Row 6 - Special symbols and accents
  "ÀÁÂÃÄÅÈÉÊËÌÍªº%+",
  // Row 7 - More special characters and symbols
  "↑↓←→♪♫★☆△○□×÷=≠",
  // Row 8 - Roman numerals and additional symbols
  "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ∞♥♦♠♣"
].join('');

const BitmapText = ({ 
  text = "", 
  position = [0, 0, 0], 
  color = FF7_GREEN,
  scale = 1,
  spriteSheetUrl = "/font-sheet.png"
}) => {
  const characters = useMemo(() => {
    const chars = [];
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(spriteSheetUrl);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charIndex = CHAR_MAP.indexOf(char);
      
      if (charIndex === -1) {
        console.warn(`Character "${char}" not found in font`);
        continue;
      }
      
      // Calculate UV coordinates from character index
      const col = charIndex % SHEET_COLS;
      const row = Math.floor(charIndex / SHEET_COLS);
      
      const u1 = col / SHEET_COLS;
      const v1 = 1 - (row / SHEET_ROWS);
      const u2 = (col + 1) / SHEET_COLS;
      const v2 = 1 - ((row + 1) / SHEET_ROWS);
      
      const geometry = new THREE.PlaneGeometry(CHAR_WIDTH * scale, CHAR_HEIGHT * scale);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        color: new THREE.Color(color)
      });
      
      // Set UV coordinates for this character
      const uvs = geometry.attributes.uv;
      uvs.setXY(0, u1, v1);
      uvs.setXY(1, u2, v1);
      uvs.setXY(2, u1, v2);
      uvs.setXY(3, u2, v2);
      
      chars.push({ geometry, material });
    }
    
    return chars;
  }, [text, spriteSheetUrl, scale, color]);
  
  return (
    <group position={position}>
      {characters.map((char, i) => (
        <mesh
          key={i}
          geometry={char.geometry}
          material={char.material}
          position={[i * (CHAR_WIDTH + 1) * scale, 0, 0]}
        />
      ))}
    </group>
  );
};

export default BitmapText;