import { useMemo, useRef } from "react";
import { FieldData } from "../../Field";
import { CanvasTexture, DoubleSide, Mesh, NearestFilter, Texture } from "three";
import { useFrame } from "@react-three/fiber";

const TILE_SIZE = 16

type LayerProps = {
  backgroundDetails: FieldData["backgroundDetails"];
  tiles: FieldData["tiles"];
  texture: Texture;
}

const colors = []
colors[6] = 'red';
colors[221] = 'yellow';
colors[395] = 'blue';
colors[396] = 'green';
colors[432] = 'purple';
colors[451] = 'brown';
colors[4094] = 'white';

const Layer = ({ backgroundDetails, tiles, texture }: LayerProps) => {
  const layerTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = backgroundDetails.width;
    canvas.height = backgroundDetails.height;
    const context = canvas.getContext('2d');
  
    if (!context) {
      throw new Error('Could not get canvas context');
    }
  
    // Clear the canvas with transparent color
    context.clearRect(0, 0, canvas.width, canvas.height);

    //18
    // Loop through the squares and draw them
    tiles.sort((a, b) => a.Z - b.Z).forEach((square) => {
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

  return canvasTexture;
  }, [backgroundDetails, tiles, texture.image]);

  const layerRef = useRef<Mesh>();
  const planeDimensionsRef = useRef<{ planeWidth: number, planeHeight: number }>();
  
  useFrame(() => {
    if (planeDimensionsRef.current || !layerRef.current) {
      return;
    }
    const boundingBox = layerRef.current.geometry.boundingBox;

    if (!boundingBox) {
      return;
    }

    const width = boundingBox.max.x - boundingBox.min.x;
    const height = boundingBox.max.y - boundingBox.min.y;

    console.log('Width:', width);
    console.log('Height:', height);

    planeDimensionsRef.current = {
      planeWidth: width,
      planeHeight: height
    }
  });

  return (
    <mesh ref={layerRef} position={[0,0,-tiles[0].Z /4096]}>
      <planeGeometry args={[backgroundDetails.width, backgroundDetails.height]} />
      <meshBasicMaterial map={layerTexture} side={DoubleSide} transparent />
    </mesh>
  )
}

export default Layer;