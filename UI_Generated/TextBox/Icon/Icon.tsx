// Icon.tsx
import React, { useMemo } from 'react';
import { DoubleSide } from 'three';
import { IconProps } from '../types';
import { ICON_PADDING, ICON_WIDTHS } from '../constants';

const Icon: React.FC<IconProps> = ({
  iconId,
  position,
  iconTexture
}) => {
  const uvs = useMemo(() => {
    const col = iconId % 16;
    const row = Math.floor(iconId / 16);
    const width = ICON_WIDTHS[iconId];
    
    const u1 = (col * 31) / 512; // Icon sheet is 512x512
    const v1 = 1 - (row * 12) / 512;
    const u2 = u1 + (width / 512);
    const v2 = v1 - (12 / 512);

    return new Float32Array([
      u1, v1,
      u2, v1,
      u1, v2,
      u2, v2,
    ]);
  }, [iconId]);

  const width = ICON_WIDTHS[iconId];
  const padding = ICON_PADDING[iconId];

  return (
    <mesh position={position}>
      <planeGeometry args={[width, 12]}>
        <bufferAttribute
          attach="attributes-uv"
          array={uvs}
          count={4}
          itemSize={2}
        />
      </planeGeometry>
      <meshBasicMaterial
        map={iconTexture}
        transparent
        side={DoubleSide}
      />
    </mesh>
  );
};

export default Icon;