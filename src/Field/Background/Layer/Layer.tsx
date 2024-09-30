import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Group,  NoBlending, NormalBlending, Object3D, OrthographicCamera, SubtractiveBlending, Texture } from "three";
import { FieldData } from "../../Field";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { calculateParallax } from "../../Camera/cameraUtils";
import { clamp } from "three/src/math/MathUtils.js";

type LayerProps = {
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  cameraZoom: number;
  playerDepthRef: MutableRefObject<number>;
  tiles: FieldData["tiles"];
  tilesTexture: Texture;
}

const BLENDS = {
  1: AdditiveBlending,
  2: SubtractiveBlending,
  3: NoBlending, // "+25%"
  4: NoBlending,
  0: '?' // Unknowns
}

const TILE_SIZE = 16;
const TILES_PER_COLUMN = 64;

const Layer = ({ backgroundPanRef, playerDepthRef, tiles, tilesTexture }: LayerProps) => {
  const textureWidthInTiles = tilesTexture.image.width / TILE_SIZE;
  const textureHeightInTiles = TILES_PER_COLUMN;

  const layerRef = useRef<Group & {position: Object3D['position']}>(null);

  const animationFrameRef = useRef(0);

  useEffect(() => {
    const maxFrames = tiles.map(tile => tile.state).sort((a, b) => b - a)[0];
    if (maxFrames === 0) {
      return;
    }
    
    const handleFrame = () => {
      animationFrameRef.current = (animationFrameRef.current % maxFrames) + 1
    }

    const interval = setInterval(handleFrame, 1000);

    return () => {
      clearInterval(interval);
    }
  }, [tiles]);

  useFrame(() => {
    if (!layerRef.current) {
      return;
    }

    layerRef.current.position.set(0,0,0)

    const {
      yaw,
      pitch,
      cameraZoom,
      boundaries
    } = backgroundPanRef.current;

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

  const orthographicCamera = useThree(({ scene }) => scene.getObjectByName('orthoCamera') as OrthographicCamera);
  useFrame(() => {
    if (!playerDepthRef.current || !orthographicCamera || !layerRef.current) {
      return;
    }

    const normalisedZ = tiles[0].Z / 1000 

    if (playerDepthRef.current > normalisedZ && !isAbove) {
      setIsAbove(true);
    } else if (playerDepthRef.current < normalisedZ && isAbove) {
      setIsAbove(false);
    }
  });

  const textures = useMemo(() => {
    return tiles.map(({ X, Y, Z, index, isBlended, blendType, state }) => {
      const texture = tilesTexture.clone();

      // Calculate the column and row based on index
      const column = Math.floor(index / TILES_PER_COLUMN);
      const row = index % TILES_PER_COLUMN;

      const xOffset = column * TILE_SIZE / tilesTexture.image.width;
      const yOffset = row * TILE_SIZE / tilesTexture.image.height;

      texture.offset.set(xOffset, 1 - yOffset - (TILE_SIZE / tilesTexture.image.height));
      texture.repeat.set(1 / textureWidthInTiles, 1 / textureHeightInTiles);

      return (
        <sprite
          key={`${Z}-${index}`}
          position={[X + TILE_SIZE / 2, -Y - TILE_SIZE / 2, -2]}
          scale={[TILE_SIZE, TILE_SIZE, 1]}
          layers={isAbove ? 2 : 1}
          visible={animationFrameRef.current === state}
        >
          <spriteMaterial
            map={texture}
            transparent
            blending={isBlended ? BLENDS[blendType] : NormalBlending}
          />
        </sprite>
      );
    });
  }, [ isAbove, textureHeightInTiles, textureWidthInTiles, tiles, tilesTexture]);

  return (
    <group position={[0,0,tiles[0].Z]} ref={layerRef}>
      {textures}
    </group>
  );
}

export default Layer;
