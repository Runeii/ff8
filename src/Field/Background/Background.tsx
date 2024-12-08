
import type { FieldData } from "../Field";
import { MutableRefObject, useMemo } from "react";
import Layer from "./Layer/Layer";
import useTilesTexture from "../../hooks/useTilesTexture";
import { CanvasTexture, NearestFilter, RepeatWrapping } from "three";

type BackgroundProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData;
};

export const TILE_SIZE = 16; // Tile size remains 16x16
const TILE_PADDING = 4; // Additional padding around the tile
const TILES_PER_COLUMN = 64; // Number of tiles per column in texture

export type TileWithTexture = FieldData['tiles'][number] & {
  canvas: HTMLCanvasElement,
  texture: CanvasTexture
};

const Background = ({ backgroundPanRef, data }: BackgroundProps) => {
  const { backgroundDetails, limits, tiles } = data;

  const tilesTexture = useTilesTexture(backgroundDetails);


  const tileGroupEntries = useMemo(() => {
    if (!limits) {
      return [];
    }
    const groupedTiles: {
      [key: string]: TileWithTexture;
    } = {};
  
    tiles.forEach((tile) => {
      const layerId = `${tile.layerID}-${tile.Z}-${tile.blendType}-${tile.parameter}-${tile.state}`;

      // Initialize the Z group if it doesn't exist
      if (!groupedTiles[layerId]) {
        const canvas = document.createElement('canvas');

        canvas.width = Math.abs(limits.cameraRange.left) + Math.abs(limits.cameraRange.right);
        canvas.height = Math.abs(limits.cameraRange.top) + Math.abs(limits.cameraRange.bottom);

        groupedTiles[layerId] = {
          canvas,
        } as TileWithTexture;
      }
  
      // Calculate the column and row based on the tile's index
      const column = Math.floor(tile.index / TILES_PER_COLUMN);
      const row = tile.index % TILES_PER_COLUMN;

      // Calculate the source position in the texture atlas
      const sourceX = column * (TILE_SIZE + TILE_PADDING);
      const sourceY = row * (TILE_SIZE + TILE_PADDING);

      const { canvas } = groupedTiles[layerId];
      // Create a canvas to extract the tile image
      const context = canvas.getContext('2d');

      if (!context) {
        console.error('Could not get 2D context from canvas');
        return;
      }

      context.imageSmoothingEnabled = false;

      // Draw the specific tile from the texture atlas onto the canvas
      context.drawImage(
        tilesTexture.image as HTMLImageElement,
        sourceX,
        sourceY,
        TILE_SIZE,
        TILE_SIZE,
        tile.X + canvas.width / 2,
        tile.Y + canvas.height / 2,
        TILE_SIZE,
        TILE_SIZE
      );
    
      groupedTiles[layerId] = {
        ...tile,
        canvas,
        texture: new CanvasTexture(canvas),
      };
    });

    // Return the grouped tiles by Z value
    return Object.entries(groupedTiles).sort((entry1, entry2) => entry2[1].Z - entry1[1].Z).map(([key, value]) => {
      const texture = new CanvasTexture(value.canvas);
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.premultiplyAlpha = false;
      return [key, {
        ...value,
        texture,
      }];
    }) as unknown as [string, TileWithTexture][];
  }, [limits, tiles, tilesTexture.image]);

  return (
    <>
      {tileGroupEntries.map(([key, tiles]) =>
        <Layer backgroundPanRef={backgroundPanRef} backgroundDetails={backgroundDetails} key={key} tile={tiles} /> 
      )}
    </>
  );
}

export default Background;