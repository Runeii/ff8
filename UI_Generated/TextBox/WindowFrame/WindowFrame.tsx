import React from 'react';
import { DoubleSide } from 'three';
import { WindowFrameProps } from '../types';
import { WINDOW_COLORS } from '../constants';

const WindowFrame: React.FC<WindowFrameProps> = ({
  width,
  height,
  position
}) => {
  return (
    <group position={position}>
      {/* Background */}
      <mesh position={[width/2, height/2, -0.1]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial 
          color={WINDOW_COLORS.BACKGROUND} 
          transparent 
          opacity={WINDOW_COLORS.BACKGROUND_OPACITY}
          side={DoubleSide}
        />
      </mesh>
      
      {/* Frame borders */}
      <mesh position={[width/2, height-1, 0]}>
        <planeGeometry args={[width-4, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.BORDER_LIGHT} side={DoubleSide} />
      </mesh>
      
      <mesh position={[1, height/2, 0]}>
        <planeGeometry args={[2, height-4]} />
        <meshBasicMaterial color={WINDOW_COLORS.BORDER_LIGHT} side={DoubleSide} />
      </mesh>
      
      <mesh position={[width/2, 1, 0]}>
        <planeGeometry args={[width-4, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.BORDER_MID} side={DoubleSide} />
      </mesh>
      
      <mesh position={[width-1, height/2, 0]}>
        <planeGeometry args={[2, height-4]} />
        <meshBasicMaterial color={WINDOW_COLORS.BORDER_MID} side={DoubleSide} />
      </mesh>

      {/* Corners */}
      <mesh position={[1, height-1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.CORNER_LIGHT} side={DoubleSide} />
      </mesh>
      
      <mesh position={[width-1, height-1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.CORNER_DARK} side={DoubleSide} />
      </mesh>
      
      <mesh position={[1, 1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.CORNER_DARK} side={DoubleSide} />
      </mesh>
      
      <mesh position={[width-1, 1, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={WINDOW_COLORS.CORNER_DARK} side={DoubleSide} />
      </mesh>
    </group>
  );
};

export default WindowFrame;