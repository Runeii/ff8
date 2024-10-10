
import type { FieldData } from "../Field";
import { OrthographicCamera } from "@react-three/drei";
import { MutableRefObject, useMemo } from "react";
import Layer from "./Layer/Layer";
import useCalculatePlayerDepth from "../../hooks/useCalculatePlayerDepth";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../constants/constants";
import useTilesTexture from "../../hooks/useTilesTexture";
import { NearestFilter, Texture } from "three";

type BackgroundProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData;
};

export const TILE_SIZE = 16; // Tile size remains 16x16
const TILE_PADDING = 4; // Additional padding around the tile
const TILES_PER_COLUMN = 64; // Number of tiles per column in texture

export type TileWithTexture = FieldData['tiles'][number] & { texture: Texture };

const Background = ({ backgroundPanRef, data }: BackgroundProps) => {
  const { backgroundDetails, tiles } = data;

  const tilesTexture = useTilesTexture(backgroundDetails);
  const playerDepthRef = useCalculatePlayerDepth();

  const textureWidthInTiles = tilesTexture.image.width / (TILE_SIZE + TILE_PADDING);
  const textureHeightInTiles = TILES_PER_COLUMN;

  const groupedTiles = useMemo<TileWithTexture[][]>(() => {
    // Initialize a map to group tiles by their Z value
    const groupedTiles: Record<string, TileWithTexture[]> = {};
  
    // Iterate over the tiles
    tiles.forEach((tile) => {
      const layerId = `${tile.layerID}-${tile.Z}`;
      // Initialize the Z group if it doesn't exist
      if (!groupedTiles[layerId]) {
        groupedTiles[layerId] = [];
      }
  
      // Calculate the texture for the tile
      const texture = tilesTexture.clone();
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
  
      // Calculate the column and row based on index, accounting for the padding
      const column = Math.floor(tile.index / TILES_PER_COLUMN);
      const row = tile.index % TILES_PER_COLUMN;
  
      // Adjust for the padding in the offset calculation
      const xOffset = (column * (TILE_SIZE + TILE_PADDING)) / tilesTexture.image.width;
      const yOffset = (row * (TILE_SIZE + TILE_PADDING)) / tilesTexture.image.height;
  
      texture.offset.set(
        xOffset,
        1 - yOffset - TILE_SIZE / tilesTexture.image.height
      );
  
      // Adjust repeat to account for the actual tile size inside the padded space
      texture.repeat.set(
        TILE_SIZE / (TILE_SIZE + TILE_PADDING) / textureWidthInTiles,
        TILE_SIZE / (TILE_SIZE + TILE_PADDING) / textureHeightInTiles
      );
  
      groupedTiles[layerId].push({
        ...tile,
        texture,
      });
    });
  
    // Return the grouped tiles by Z value
    return Object.values(groupedTiles);
  }, [textureHeightInTiles, textureWidthInTiles, tiles, tilesTexture]);

  return (
    <>
      <OrthographicCamera
        name="orthoCamera"
        position={[0, 0, 0]}
        zoom={1}
        left={-SCREEN_WIDTH / 2}
        right={SCREEN_WIDTH / 2}
        top={SCREEN_HEIGHT / 2}
        bottom={-SCREEN_HEIGHT / 2}
        near={0}
        far={4096}
      />
      {groupedTiles.map((tiles) => (
        <Layer
          backgroundPanRef={backgroundPanRef}
          cameraZoom={data.cameras[0].camera_zoom}
          key={`${tiles[0].layerID}-${tiles[0].Z}`}
          playerDepthRef={playerDepthRef}
          tiles={tiles}
        />
      ))}
    </>
  );
}

export default Background;