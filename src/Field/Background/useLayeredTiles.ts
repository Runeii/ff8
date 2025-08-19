import { useMemo } from "react";
import useTilesTexture from "./useTilesTexture";
import { Texture } from "three";
import { getLayerIdFromTile, TILE_BLENDS_TO_THREEJS, TILE_PADDING, TILE_SIZE, TILES_PER_COLUMN } from "./tileUtils";
import { sendToDebugger } from "../../Debugger/debugUtils";

const initialiseLayer = (tile: Tile, width: number, height: number, layerRenderID: number): Layer => {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    console.error('Could not get 2D context from canvas');
    throw new Error('Could not get 2D context from canvas');
  }
  
  context.clearRect(0, 0, canvas.width, canvas.height);
  const blendType = TILE_BLENDS_TO_THREEJS[tile.blendType as keyof typeof TILE_BLENDS_TO_THREEJS];

  return {
    canvas,
    blendType,
    id: getLayerIdFromTile(tile),
    layerID: tile.layerID,
    renderID: layerRenderID,
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

      let layerRenderIDs = tiles.map(tile => tile.layerID);
      layerRenderIDs = layerRenderIDs.filter((id, index) => layerRenderIDs.indexOf(id) === index).sort((a,b) => a - b);

      if (layerRenderIDs[0] !== 0) {
        layerRenderIDs.unshift(0);
      }
      // Initialize the Z group if it doesn't exist
      if (!result[layerId]) {
        result[layerId] = initialiseLayer(tile, width, height, layerRenderIDs.indexOf(tile.layerID));
      }

      const { canvas } = result[layerId];

      drawTile(tile, canvas, tilesTexture);
    });

    Object.values(result).forEach(layer => {
      const {canvas, ...rest} = layer;
      canvas.toBlob(blob => {
        sendToDebugger('layers', JSON.stringify(rest), blob ?? undefined);
      });
    });

    return Object.values(result);
  }, [height, tiles, tilesTexture, width]);

  return layers;
}

export default useLayeredTiles;