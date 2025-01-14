// Character.tsx
import React, { useMemo } from 'react';
import { DoubleSide } from 'three';
import { CharacterProps } from '../types';
import { CHAR_HEIGHT, CHAR_WIDTH } from '../constants';
import { calculateUVs } from '../textUtils';

const Character: React.FC<CharacterProps> = ({
  charCode,
  position,
  color,
  fontTexture,
  scale = 1
}) => {
  const uvs = useMemo(() => calculateUVs(charCode), [charCode]);

  const materialProps = useMemo(() => {
    switch (color) {
      case 0: return { color: 0xFFFFFF }; // White
      case 1: return { color: 0x808080 }; // Gray
      case 2: return { color: 0xFFFF00 }; // Yellow
      case 3: return { color: 0xFF0000 }; // Red
      case 4: return { color: 0x00FF00 }; // Green
      case 5: return { color: 0x0000FF }; // Blue
      case 6: return { color: 0x800080 }; // Purple
      case 7: return { color: 0x00FFFF }; // Cyan
      default: return { color: 0xFFFFFF };
    }
  }, [color]);

  return (
    <mesh position={position}>
      <planeGeometry args={[CHAR_WIDTH * scale, CHAR_HEIGHT * scale]}>
        <bufferAttribute
          attach="attributes-uv"
          array={uvs}
          count={4}
          itemSize={2}
        />
      </planeGeometry>
      <meshBasicMaterial
        map={fontTexture}
        transparent
        side={DoubleSide}
        {...materialProps}
      />
    </mesh>
  );
};

export default Character;