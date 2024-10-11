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
import useGlobalStore from "../../../store";

type LayerProps = {
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  cameraZoom: number;
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

const Layer = ({ backgroundPanRef, playerDepthRef, tiles }: LayerProps) => {
  const layerRef = useRef<Group & { position: Object3D["position"] }>(null);

  const isBackgroundLayer = tiles[0].layerID > 0;
  
  const controlledScrolls = useGlobalStore((state) => state.controlledScrolls);
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
    
    const controlledScroll = controlledScrolls[tiles[0].layerID / 2]

    if (!controlledScroll) {
      layerRef.current.position.x = finalPanX;
      layerRef.current.position.y = finalPanY;
      return;
    }

    if (!controlledScroll.x2 || !controlledScroll.y2) {
      layerRef.current.position.x = controlledScroll.x1;
      layerRef.current.position.y = controlledScroll.y1;
      return
    }

    const standardXRange = boundaries.right - boundaries.left;
    const standardYRange = boundaries.top - boundaries.bottom;

    const controlledXRange = controlledScroll.x2 - controlledScroll.x1;
    const controlledYRange = controlledScroll.y2 - controlledScroll.y1;

    const xRatio = controlledXRange / standardXRange;
    const yRatio = controlledYRange / standardYRange;

    const x = finalPanX - boundaries.left;
    const y = finalPanY - boundaries.top;

    const controlledX = x * xRatio + controlledScroll.x1;
    const controlledY = y * yRatio + controlledScroll.y1;

    layerRef.current.position.x = controlledX;
    layerRef.current.position.y = controlledY;
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
  
  const currentParameterStates = useGlobalStore((state) => state.currentParameterStates);
  const currentParameterVisibility = useGlobalStore((state) => state.currentParameterVisibility);

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
          visible={(parameter === 255 || currentParameterStates[parameter] === state) && currentParameterVisibility[parameter] !== false}
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
