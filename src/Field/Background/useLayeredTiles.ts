import { useMemo } from "react";
import useTilesTexture from "./useTilesTexture";
import { NoBlending, Texture } from "three";
import { getLayerIdFromTile, TILE_BLENDS_TO_THREEJS, TILE_PADDING, TILE_SIZE, TILES_PER_COLUMN } from "./tileUtils";

const initialiseLayer = (tile: Tile, width: number, height: number): Layer => {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const blendType = TILE_BLENDS_TO_THREEJS[tile.blendType as keyof typeof TILE_BLENDS_TO_THREEJS];
  return {
    canvas,
    blendType,
    id: getLayerIdFromTile(tile),
    isBlended: blendType !== NoBlending,
    layerID: tile.layerID,
    parameter: tile.parameter,
    state: tile.state,
    z: tile.Z,
  }
}

const drawTile = (tile: Tile, canvas: HTMLCanvasElement, texture: Texture) => {
  // Calculate the column and row based on the tile's index
  const column = Math.floor(tile.index / TILES_PER_COLUMN);
  const row = tile.index % TILES_PER_COLUMN;

  // Calculate the source position in the texture atlas
  const sourceX = column * (TILE_SIZE + TILE_PADDING);
  const sourceY = row * (TILE_SIZE + TILE_PADDING);

  const context = canvas.getContext('2d');

  if (!context) {
    console.error('Could not get 2D context from canvas');
    return;
  }

  context.imageSmoothingEnabled = false;

  const posX = tile.X + canvas.width / 2
  const posY = tile.Y + canvas.height / 2

  context.drawImage(
    texture.image as HTMLImageElement,
    sourceX,
    sourceY,
    TILE_SIZE,
    TILE_SIZE,
    posX,
    posY,
    TILE_SIZE,
    TILE_SIZE
  );
}


const useLayeredTiles = (tiles: Tile[], filename: string, width: number, height: number) => {
  const tilesTexture = useTilesTexture(filename);

  const layers = useMemo(() => {
    const result: Record<string, Layer> = {};

    tiles.forEach((tile) => {
      const layerId = getLayerIdFromTile(tile);

      // Initialize the Z group if it doesn't exist
      if (!result[layerId]) {
        result[layerId] = initialiseLayer(tile, width, height);
      }

      const { canvas } = result[layerId];

      drawTile(tile, canvas, tilesTexture);
      document.body.appendChild(canvas);
    });

    return Object.values(result);
  }, [height, tiles, tilesTexture, width]);

  return layers;
}

export default useLayeredTiles;