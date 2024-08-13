import { useMemo, useRef } from "react";
import { FieldData } from "../../Field";
import { CanvasTexture, DoubleSide, Mesh, NearestFilter, Sprite, Texture } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import {  useFrame, useThree } from "@react-three/fiber";
import { convertToRealZUnit } from "../utils";
import LineWithText from "../../../LineWithText/LineWithText";

const TILE_SIZE = 16

type LayerProps = {
  backgroundDetails: FieldData["backgroundDetails"];
  tiles: FieldData["tiles"];
  texture: Texture;
}

const names = {
  4094: 'background',
  451: 'window light',
  432: 'right doorway',
  396: 'left window',
  395: 'random stuff',
  221: 'car',
  6: 'light aura',
}

const Layer = ({ backgroundDetails, characterZDepthRef, sceneBoundingBox, tiles, texture }: LayerProps) => {
  const layerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = backgroundDetails.width;
    canvas.height = backgroundDetails.height;
    const context = canvas.getContext('2d');
  
    if (!context) {
      throw new Error('Could not get canvas context');
    }
  
    context.clearRect(0, 0, canvas.width, canvas.height);

    tiles.sort((a, b) => b.Z - a.Z).forEach((square) => {
      if (square.state !== 0) {
        return;
      }
      const { X, Y, index } = square;
      
      const adjustedX = Math.floor(X + canvas.width / 2);
      const adjustedY = Math.floor(Y + canvas.height / 2);

      context.drawImage(
        texture.image,
        0, index * TILE_SIZE, TILE_SIZE, TILE_SIZE, // Source image coordinates
        adjustedX, adjustedY, TILE_SIZE , TILE_SIZE    // Destination canvas coordinates
      );
    });

    // Create a texture from the canvas
    const canvasTexture = new CanvasTexture(canvas);
    canvasTexture.repeat.set(1, 1);
    canvasTexture.needsUpdate = true;
    canvasTexture.premultiplyAlpha = true; // Ensures transparency is handled correctly
    canvasTexture.minFilter = NearestFilter;
    canvasTexture.magFilter = NearestFilter;

    // Show full texture on each side of box
    //canvasTexture.wrapS = canvasTexture.wrapT = 1000;

    return canvasTexture;
  }, [backgroundDetails, tiles, texture.image]);

  const imageRef = useRef<Mesh>();
  const layerRef = useRef<number>(1);

  const character = useThree(({scene}) => scene.getObjectByName('character'));
  const zDepth = convertToRealZUnit(sceneBoundingBox.min.y, sceneBoundingBox.max.y, tiles[0].Z / 4096);
  useFrame(({camera, invalidate}) => {
    if (!imageRef.current) {
      return;
    }

    const previousLayerIndex = layerRef.current
    const nicename = index => index === 1 ? 'above' : 'below'
    const nextLayerIndex = zDepth < character.position.y ? 3 : 1;
    console.log('Layer z pos', zDepth, '. The character is ', nicename(nextLayerIndex) ,' it.', )
    if (previousLayerIndex !== nextLayerIndex) {
      imageRef.current.layers.set(nextLayerIndex);
      invalidate();
      layerRef.current = nextLayerIndex;
      console.log('Chage!');
    }
  });

  return (
    <>
    <mesh ref={imageRef} position={[0,0,0]} >
      <planeGeometry args={[backgroundDetails.width, backgroundDetails.height]} />
      <meshBasicMaterial map={layerTexture} side={DoubleSide} transparent />
    </mesh>
    </>
  )
}

export default Layer;