import { Box3, MathUtils, Object3D, PerspectiveCamera, Vector3 } from "three";

export const convertToRealZUnit = (min: number, max: number, z: number) => {
  return MathUtils.lerp(min, max * 5, z);
}

export function getPositionToFitInView(object: Object3D, camera: PerspectiveCamera, xScale: number = 1, yScale: number = 1): Vector3 {
  // Get the field of view in radians
  const fov = MathUtils.degToRad(camera.fov);

  // Calculate the bounding box of the mesh
  const boundingBox = new Box3().setFromObject(object);
  const meshWidth = boundingBox.max.x - boundingBox.min.x;
  const meshHeight = boundingBox.max.y - boundingBox.min.y;

  // Calculate the aspect ratio of the camera
  const aspect = camera.aspect;

  // Adjust the mesh dimensions based on the scale factors
  const scaledMeshWidth = meshWidth / xScale;
  const scaledMeshHeight = meshHeight / yScale;

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