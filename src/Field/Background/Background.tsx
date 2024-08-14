import { useFrame, useLoader } from "@react-three/fiber";
import { CanvasTexture, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, TextureLoader } from "three";
import type { FieldData } from "../Field";
import { OrthographicCamera, Plane } from "@react-three/drei";
import { MutableRefObject, useMemo, useRef } from "react";


type BackgroundProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  backgroundDetails: FieldData["backgroundDetails"];
  tiles: FieldData["tiles"];
};

const TILE_SIZE = 16

const Background = ({ backgroundPanRef, backgroundDetails, tiles }: BackgroundProps) => {
  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
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
        tilesTexture.image,
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
  }, [backgroundDetails.width, backgroundDetails.height, tiles, tilesTexture.image]);

  const planeRef = useRef<Mesh>(null);
  const cameraRef = useRef<OrthographicCameraType>(null);

  const WIDTH = 320;
  const HEIGHT = 240;

  const visibleWidth = (WIDTH / backgroundDetails.width);
  const visibleHeight = (HEIGHT / backgroundDetails.height);

  const horizontalPan = (1 - visibleWidth) / 2;
  const verticalPan = (1 - visibleHeight) / 2;

  useFrame(() => {
    if (!planeRef.current) {
      return;
    }

    planeRef.current.position.x = (horizontalPan * backgroundPanRef.current.x) * -WIDTH;
    planeRef.current.position.y = (verticalPan * backgroundPanRef.current.y) * -HEIGHT;
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef} name="orthoCamera"
        position={[0, 0, 0]}
        zoom={1}
        left={-WIDTH / 2}
        right={WIDTH / 2}
        top={HEIGHT / 2}
        bottom={-HEIGHT / 2}
      />
      <Plane
        args={[backgroundDetails.width, backgroundDetails.height]}
        position={[0,0,-1]}
        ref={planeRef}
        layers={2}
      >
        <meshBasicMaterial attach="material" map={layerTexture} transparent />
      </Plane>
    </>
  );
}

export default Background;