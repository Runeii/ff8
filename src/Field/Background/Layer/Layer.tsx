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
  3: AdditiveBlending, // "+25%"
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

    layerRef.current.position.x = controlledScroll.x1 ?? 0
    layerRef.current.position.y = controlledScroll.y1 ?? 0
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
  
  const isLayerVisible = useGlobalStore((state) => state.backgroundLayerVisibility[tiles[0].layerID] !== false);
  const currentParameterStates = useGlobalStore((state) => state.currentParameterStates);
  const currentParameterVisibility = useGlobalStore((state) => state.currentParameterVisibility);

  let layer = isAbove ? 3 : 2;
  if (isBackgroundLayer) {
    layer = 1;
  }

  if (!isLayerVisible) {
    return null;
  }

  return (
    <group position={[0, 0, tiles[0].Z]} ref={layerRef}>
      {tiles.map(({ X, Y, index, parameter, state, texture, isBlended, blendType }) => {
        let isVisible = true;
        if (currentParameterStates[parameter] && currentParameterStates[parameter] !== state) {
          isVisible = false;
        } else if (currentParameterVisibility[parameter] === false) {
          isVisible = false;
        }

        return (
          <sprite
            key={index}
            position={[X + TILE_SIZE / 2, -Y - TILE_SIZE / 2, 0]}
            scale={[TILE_SIZE, TILE_SIZE, TILE_SIZE]}
            layers={layer + (state > 0 ? 1 : 0)}
            visible={isVisible}
            >
            <spriteMaterial
              map={texture}
              transparent
              blending={isBlended ? BLENDS[blendType as keyof typeof BLENDS] : NormalBlending}
              opacity={blendType === 3 ? 0.25 : 1}
            />
          </sprite>
        );
      })}
    </group>
  );
};

export default Layer;
