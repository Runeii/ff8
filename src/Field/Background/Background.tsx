
import type { FieldData } from "../Field";
import { MutableRefObject, useMemo, useRef, useState } from "react";
import Layer from "./Layer/Layer";
import useCalculatePlayerDepth from "../../hooks/useCalculatePlayerDepth";
import useTilesTexture from "../../hooks/useTilesTexture";
import { CanvasTexture, Group, NearestFilter, Texture, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Plane } from "@react-three/drei";

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
  
  
    // Calculate the column and row based on the tile's index
    const column = Math.floor(tile.index / TILES_PER_COLUMN);
    const row = tile.index % TILES_PER_COLUMN;

    // Calculate the source position in the texture atlas
    const sourceX = column * (TILE_SIZE + TILE_PADDING);
    const sourceY = row * (TILE_SIZE + TILE_PADDING);

    // Create a canvas to extract the tile image
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
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
        0,
        0,
        TILE_SIZE,
        TILE_SIZE
      );

      // Create a texture from the canvas
      const texture = new CanvasTexture(canvas);
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      texture.generateMipmaps = false; 
    
      groupedTiles[layerId].push({
        ...tile,
        texture,
      });
    });

    // Return the grouped tiles by Z value
    return Object.values(groupedTiles).sort((a, b) => b[0].Z - a[0].Z);
  }, [tiles, tilesTexture]);

  return (
    <>
      {groupedTiles.map((tiles) =>
        <Layer backgroundPanRef={backgroundPanRef} backgroundDetails={backgroundDetails} key={tiles[0].Z} tiles={tiles} tilesTexture={tilesTexture} /> 
      )}
    </>
  );
}

export default Background;