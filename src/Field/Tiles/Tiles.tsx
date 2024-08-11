import { Box3, Group, MathUtils, Object3D, PerspectiveCamera, TextureLoader, Vector3 } from "three";
import type { FieldData } from "../Field";
import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import Layer from "./Layer/Layer";

function getPositionToFitInView(object: Object3D, camera: PerspectiveCamera, xScale: number = 1, yScale: number = 1): Vector3 {
  // Get the field of view in radians
  const fov = MathUtils.degToRad(camera.fov);

  // Calculate the bounding box of the mesh
  const boundingBox = new Box3().setFromObject(object);
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
  backgroundDetails: FieldData["backgroundDetails"];
  tiles: FieldData["tiles"];
};

// 16x16 tiles
const Tiles = ({ backgroundDetails, tiles }: TilesProps) => {
  const groupRef = useRef<Group>(null);

  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
  
  useFrame(({ camera }) => {
    if (!groupRef.current) {
      return;
    }

    const xScale = Math.min(backgroundDetails.width / 320, 1);
    const yScale = Math.min(backgroundDetails.height / 240, 1);

    const position = getPositionToFitInView(groupRef.current, camera as PerspectiveCamera, xScale, yScale);

  //  groupRef.current.position.copy(position);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  // Create an array of arrays of tiles, grouped by the Z value
   const groupedTiles = useMemo(() => {
     const groupedTiles: FieldData["tiles"][] = []
     tiles.forEach((tile) => {
       if (!groupedTiles[tile.Z]) {
         groupedTiles[tile.Z] = [];
       }
       groupedTiles[tile.Z].push(tile);
     });
     return groupedTiles
   }, [tiles]);

  return (
    <group ref={groupRef} >
      {groupedTiles.map((layerTiles, index) => (
        <Layer
          backgroundDetails={backgroundDetails}
          key={`${backgroundDetails.sprite}--${layerTiles[0].Z}`}
          colorIndex={index}
          tiles={layerTiles}
          texture={tilesTexture}
        />
      ))}
    </group>
  );
}

export default Tiles;