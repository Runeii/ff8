import { Box3, DoubleSide, MathUtils, Mesh, PerspectiveCamera, Texture, Vector3 } from "three";
import type { FieldData } from "../Field";
import TileSprite from "./TileSprite/TileSprite";
import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

function getMeshPositionToFitInView(mesh: Mesh, camera: PerspectiveCamera): Vector3 {
  // Get the field of view in radians
  const fov = MathUtils.degToRad(camera.fov);

  // Calculate the bounding box of the mesh
  const boundingBox = new Box3().setFromObject(mesh);
  const meshWidth = boundingBox.max.x - boundingBox.min.x;
  const meshHeight = boundingBox.max.y - boundingBox.min.y;

  // Calculate the aspect ratio of the camera
  const aspect = camera.aspect;

  // Calculate the distance from the camera required to fit the mesh height within the camera's view
  const distance = (meshHeight / 2) / Math.tan(fov / 2);

  // Adjust the distance based on the camera's aspect ratio and mesh width to ensure the width fits as well
  const distanceBasedOnWidth = (meshWidth / 2) / (Math.tan(fov / 2) * aspect);
  const finalDistance = Math.max(distance, distanceBasedOnWidth);

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

const Tiles = ({ texture, tiles }: TilesProps) => {
  const planeRef = useRef<Mesh>(null);
  
  useFrame(({ camera }) => {
    if (!planeRef.current) {
      return;
    }
    const position = getMeshPositionToFitInView(planeRef.current, camera as PerspectiveCamera);

    planeRef.current.position.copy(position);
    planeRef.current.quaternion.copy(camera.quaternion);
  });

  texture.repeat.set(320 / texture.image.width, 224 / texture.image.height);

  return (
    <Plane args={[320,224]} ref={planeRef} >
      <meshBasicMaterial map={texture} side={DoubleSide} depthWrite={false}/>
    </Plane>
  )
  return tiles.map((tile, index) => {
    return <TileSprite key={index} index={index} tile={tile} texture={texture} />;
  });
}

export default Tiles;