import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Group,
  NoBlending,
  NormalBlending,
  Object3D,
  SubtractiveBlending,
} from "three";
import { MutableRefObject, useRef, useState } from "react";
import { calculateParallax } from "../../Camera/cameraUtils";
import { clamp } from "three/src/math/MathUtils.js";
import { TILE_SIZE, TileWithTexture } from "../Background";

type LayerProps = {
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  cameraZoom: number;
  currentParameterStates: Record<number, number>;
  playerDepthRef: MutableRefObject<number>;
  tiles: TileWithTexture[];
};

const BLENDS = {
  1: AdditiveBlending,
  2: SubtractiveBlending,
  3: NoBlending, // "+25%"
  4: NoBlending,
  0: NormalBlending // Default to normal blending for unknowns
};

const Layer = ({ backgroundPanRef, currentParameterStates, playerDepthRef, tiles }: LayerProps) => {
  const layerRef = useRef<Group & { position: Object3D["position"] }>(null);

  const isBackgroundLayer = tiles[0].layerID > 0;

  useFrame(() => {
    if (!layerRef.current) return;

    layerRef.current.position.set(0, 0, 0);

    const { yaw, pitch, cameraZoom, boundaries } = backgroundPanRef.current;

    if (!boundaries) {
      return;
    }

    const panX = calculateParallax(yaw, cameraZoom);
    const panY = calculateParallax(-pitch, cameraZoom);

    const finalPanX = clamp(panX, boundaries.left, boundaries.right);
    const finalPanY = clamp(panY, boundaries.top, boundaries.bottom);

    layerRef.current.position.x = finalPanX;
    layerRef.current.position.y = finalPanY;
  });

  const [isAbove, setIsAbove] = useState(false);

  useFrame(() => {
    if (!playerDepthRef.current) return;

    if (isBackgroundLayer) {
      setIsAbove(false);
      return;
    }
    const normalisedZ = tiles[0].Z / 1000;

    if (playerDepthRef.current > normalisedZ && !isAbove) {
      setIsAbove(true);
    } else if (playerDepthRef.current < normalisedZ && isAbove) {
      setIsAbove(false);
    }
  });

  let layer = isAbove ? 2 : 1;
  if (isBackgroundLayer) {
    layer = 3;
  }

  return (
    <group position={[0, 0, tiles[0].Z]} ref={layerRef}>
      {tiles.map(({ X, Y, index, parameter, state, texture, isBlended, blendType }) => (
        <sprite
          key={index}
          position={[X + TILE_SIZE / 2, -Y - TILE_SIZE / 2, 0]}
          scale={[TILE_SIZE, TILE_SIZE, TILE_SIZE]}
          layers={layer}
          visible={parameter === 255 || currentParameterStates[parameter] === state}
        >
          <spriteMaterial
            map={texture}
            transparent
            blending={isBlended ? BLENDS[blendType as keyof typeof BLENDS] : NormalBlending}
          />
        </sprite>
      ))}
    </group>
  );
};

export default Layer;
