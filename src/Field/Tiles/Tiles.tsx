import { Box3, CanvasTexture, DoubleSide, MathUtils, Mesh, PerspectiveCamera, PlaneGeometry, Texture, Vector3 } from "three";
import type { FieldData } from "../Field";
import TileSprite from "./TileSprite/TileSprite";
import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { vectorToFloatingPoint } from "../../utils";

function getMeshPositionToFitInView(mesh: Mesh, camera: PerspectiveCamera, xScale: number = 1, yScale: number = 1): Vector3 {
  // Get the field of view in radians
  const fov = MathUtils.degToRad(camera.fov);

  // Calculate the bounding box of the mesh
  const boundingBox = new Box3().setFromObject(mesh);
  const meshWidth = boundingBox.max.x - boundingBox.min.x;
  const meshHeight = boundingBox.max.y - boundingBox.min.y;

  // Calculate the aspect ratio of the camera
  const aspect = camera.aspect;

  // Adjust the mesh dimensions based on the scale factors
  const scaledMeshWidth = meshWidth * xScale;
  const scaledMeshHeight = meshHeight * yScale;

  // Calculate the distance from the camera required to fit the scaled mesh height within the camera's view
  const distanceHeight = (scaledMeshHeight / 2) / Math.tan(fov / 2);

  // Adjust the distance based on the camera's aspect ratio and scaled mesh width to ensure the width fits as well
  const distanceWidth = (scaledMeshWidth / 2) / (Math.tan(fov / 2) * aspect);
  const finalDistance = Math.max(distanceHeight, distanceWidth);

  // Get the camera's direction vector
  const direction = new Vector3();
  camera.getWorldDirection(direction);

  // Calculate the position where the mesh should be placed
  const position = direction.multiplyScalar(finalDistance);

  // Align the position with the camera's world position
  position.add(camera.position);

  return position;
}

type TilesProps = {
  texture: Texture;
  tiles: FieldData["tiles"];
};

// 16x16 tiles
const TILE_SIZE = 16
const Tiles = ({ texture, tiles }: TilesProps) => {
  const planeRef = useRef<Mesh>(null);

  texture.repeat.set(1, 1);
  
  useFrame(({ camera }) => {
    if (!planeRef.current) {
      return;
    }

    const xScale = 320 / texture.image.width;
    const yScale = 240 / texture.image.height

    const position = getMeshPositionToFitInView(planeRef.current, camera as PerspectiveCamera, 1, 1);

    planeRef.current.position.copy(position);
    planeRef.current.quaternion.copy(camera.quaternion);
  });

  const backgroundTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
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
      const adjustedY = Y + canvas.height / 2;
      const adjustedX = X + canvas.width / 2;

      context.drawImage(
        texture.image,
        0, index * TILE_SIZE, TILE_SIZE, TILE_SIZE, // Source image coordinates
        adjustedX, adjustedY, TILE_SIZE, TILE_SIZE    // Destination canvas coordinates
      );

      console.log(adjustedX, adjustedY)
    });

    // Create a texture from the canvas
  const canvasTexture = new CanvasTexture(canvas);
  canvasTexture.repeat.set(1, 1);
  canvasTexture.needsUpdate = true;
  canvasTexture.premultiplyAlpha = true; // Ensures transparency is handled correctly

  return canvasTexture;
  }, [tiles, texture.image]);  
  
  return (
    <Plane args={[320, 240]} ref={planeRef} >
      <meshBasicMaterial map={backgroundTexture} side={DoubleSide} depthWrite={false} transparent />
    </Plane>
  )
  return tiles.map((tile, index) => {
    return <TileSprite key={index} index={index} tile={tile} texture={texture} />;
  });
}

export default Tiles;