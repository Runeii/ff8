import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, ClampToEdgeWrapping, DoubleSide, NearestFilter, NoBlending, NormalBlending, RGBAFormat, Sprite, SpriteMaterial, SubtractiveBlending, Texture, TextureLoader } from "three";
import { FieldData } from "../../Field";
import { useMemo, useState } from "react";
import { numberToFloatingPoint } from "../../../utils";

type LayerProps = {
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

const Layer = ({ tiles, tilesTexture }: LayerProps) => {
  // Calculate the number of columns in the spritesheet
  const textureWidthInTiles = tilesTexture.image.width / TILE_SIZE;
  const textureHeightInTiles = TILES_PER_COLUMN;

  const camera = useThree(({ camera }) => camera);

  const character = useThree(({ scene }) => scene.getObjectByName('character'));
  
  const [isAbove, setIsAbove] = useState(false);
  useFrame(() => {
    if (!character) {
      return;
    }

    const y = character.position.y * 4096;
    setIsAbove(y > tiles[0].Z);
  })

  const textures = useMemo(() => {
    return tiles.map(({ X, Y, Z, index, isBlended, blendType }) => {
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
          position={[X, -Y, -1]}
          scale={[TILE_SIZE + 1, TILE_SIZE + 1, 1]}
        >
          <spriteMaterial
            map={texture}
            transparent
            blending={isBlended ? BLENDS[blendType] : NormalBlending}
          />
        </sprite>
      );
    });
  }, [textureHeightInTiles, textureWidthInTiles, tiles, tilesTexture]);

  return (
    <group position={[0,0,numberToFloatingPoint(tiles[0].Z)]}>
      {textures}
    </group>
  );
}

export default Layer;
