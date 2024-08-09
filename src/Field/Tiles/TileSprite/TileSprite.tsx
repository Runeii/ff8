import { Plane } from "@react-three/drei";
import type { FieldData } from "../../Field";
import { DoubleSide, type Texture} from 'three';
import { useThree } from "@react-three/fiber";
import { useRef } from "react";
import { vectorComponents } from "three/webgpu";
import { vectorToFloatingPoint } from "../../../utils";

type TileSpriteProps = {
  index: number;
  tile: FieldData["tiles"][0];
  texture: Texture;
};

function TileSprite({ index, tile, texture }: TileSpriteProps) {
  const {X, Y, Z, texID, draw, blend, depth, palID, srcX, srcY, layerID, blendType, parameter, state} = tile;

  if (!draw) return null; // Skip rendering if draw is false

  // Calculate the offset and repeat for the texture
  const tileWidth = 48;
  const tileHeight = 48;
  const textureWidth = texture.image.width;
  const textureHeight = texture.image.height;

  const offsetX = srcX / textureWidth;
  const offsetY = srcY / textureHeight;
  const repeatX = tileWidth / textureWidth;
  const repeatY = tileHeight / textureHeight;

  texture.offset.set(offsetX, offsetY);
  texture.repeat.set(repeatX, repeatY);

  return (
    <sprite position={vectorToFloatingPoint({x: X, y: Y, z: Z})} scale={1} >
      <spriteMaterial map={texture} />
    </sprite>
  );
}

export default TileSprite;