import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Euler, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { inverseLerpSymmetric, vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { clamp } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  backgroundDetails: FieldData['backgroundDetails'],
  cameras: FieldData['cameras'],
  sceneBoundingBox: Box3
}

const calculateRotation = (x: number, unitRange: number, fov: number, midpointRotation: number) => {
  const midpoint = unitRange / 2;

  const rotationRange = fov * 0.037;

  // The rotation difference from the midpoint to unit 0 or max unit is half of the rotation range
  const rotationAtExtreme = rotationRange / 2;

  // Calculate the slope (m)
  const m = rotationAtExtreme / midpoint;

  const rotation = m * (x - midpoint) + midpointRotation;

  return rotation;
}

const calculateUnitFromRotation = (
  rotation: number,
  unitRange: number,
  fov: number,
  midpointRotation: number 
): number => {
  // Calculate the midpoint of the unit range
  const midpoint = unitRange / 2;

  // Calculate the total rotation range proportional to the FOV
  const rotationRange = fov * 0.037; // Use the same scaling factor from the previous function

  // The rotation difference from the midpoint to unit 0 or max unit is half of the rotation range
  const rotationAtExtreme = rotationRange / 2;

  // Calculate the slope (m)
  const m = rotationAtExtreme / midpoint;

  // Calculate the unit (x) for the given rotation
  const x = ((rotation - midpointRotation) / m) + midpoint;

  return x;
}

function lookAtWithClamp(
  camera: PerspectiveCamera, 
  targetPosition: Vector3, 
  maxY: number, 
  maxX: number, // Add maxX for vertical panning clamping
): void {
  const startRotation = camera.rotation.clone();
  camera.lookAt(targetPosition);
  const newRotation = camera.rotation.clone();

  const clampedY = clamp(newRotation.y, startRotation.y - maxY, startRotation.y + maxY);
  const clampedX = clamp(newRotation.x, startRotation.x - maxX, startRotation.x + maxX); // Clamp pitch (vertical rotation)

  // Apply the clamped rotation values back to the camera
  camera.rotation.set(clampedX, clampedY, startRotation.z);
}

const Camera = ({ backgroundPanRef, backgroundDetails, cameras, sceneBoundingBox }: CameraProps) => {
  // NOTES: 320 x 224 is standard map size

  const [initialCameraPosition, setInitialCameraPosition] = useState(new Vector3());
  const [initialCameraTargetPosition, setInitialCameraTargetPosition] = useState(new Vector3());

  const camera = useThree(({ camera }) => camera as PerspectiveCamera);
  useEffect(() => {
    const {camera_axis,camera_position,camera_zoom} = cameras[0];
    const camAxisX = vectorToFloatingPoint(camera_axis[0])
    const camAxisY = vectorToFloatingPoint(camera_axis[1]).negate();
    const camAxisZ = vectorToFloatingPoint(camera_axis[2])

    const camPos = vectorToFloatingPoint(new Vector3(...camera_position));
    camPos.y = -camPos.y; // Negate Y to match the original logic

    // Calculate the translation components
    const tx = -(camPos.x * camAxisX.x + camPos.y * camAxisY.x + camPos.z * camAxisZ.x);
    const ty = -(camPos.x * camAxisX.y + camPos.y * camAxisY.y + camPos.z * camAxisZ.y);
    const tz = -(camPos.x * camAxisX.z + camPos.y * camAxisY.z + camPos.z * camAxisZ.z);

    const lookAtTarget = new Vector3(
      tx + camAxisZ.x,
      ty + camAxisZ.y,
      tz + camAxisZ.z
    );

    camera.up.set(camAxisY.x, camAxisY.y, camAxisY.z);
    camera.position.set(tx, ty, tz);
    camera.lookAt(lookAtTarget);
    (camera as PerspectiveCamera).fov = (2 * Math.atan(224.0/(2.0 * camera_zoom))) * 57.29577951;
    camera.updateProjectionMatrix();

    setInitialCameraPosition(camera.position.clone());
    setInitialCameraTargetPosition(lookAtTarget.clone());
  }, [camera, cameras]);

  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  useFrame(({ camera }) => {
    if (!player.userData.hasBeenPlacedInScene) {
      return;
    }
    
    camera.lookAt(initialCameraTargetPosition);
    const BGWIDTH = backgroundPanRef.current.width;
    const BGHEIGHT = backgroundPanRef.current.height; // Assuming you have the height for the vertical pan

    const cameraForward = new Vector3();
    camera.getWorldDirection(cameraForward);
    
    const cameraRight = new Vector3();
    cameraRight.crossVectors(camera.up, cameraForward).normalize();
        
    // Step 3: Get the camera's rotation matrix
    const cameraRotationMatrix = new Matrix4();
    cameraRotationMatrix.makeRotationFromQuaternion(camera.quaternion);

    // Step 4: Extract the rotation along the camera's right axis
    const euler = new Euler();
    euler.setFromRotationMatrix(cameraRotationMatrix, 'XYZ');

    // The rotation along the camera's right axis corresponds to the rotation around the X-axis in local space
    const eulerX = euler.x;

    // Horizontal camera rotation calculation
    const midpointRotationY = camera.rotation.y;

    const leftX = calculateRotation(160, BGWIDTH, camera.fov, eulerX);
    const rightX = calculateRotation(BGWIDTH - 160, BGWIDTH, camera.fov, eulerX);
    let horizontalRange = (rightX - leftX) / 2;
  
    // Vertical camera rotation calculation
    const midpointRotationX = camera.rotation.x;
    const topY = calculateRotation(112, BGHEIGHT, camera.fov, midpointRotationX); // Adjust for the vertical FOV
    const bottomY = calculateRotation(BGHEIGHT - 112, BGHEIGHT, camera.fov, midpointRotationX);
    let verticalRange = (topY - bottomY) / 2;

    if (BGWIDTH <= 320) {
      backgroundPanRef.current.x = BGWIDTH / 2;
      horizontalRange = 0; // Disable horizontal panning
    }
    
    if (BGHEIGHT <= 224) {
      backgroundPanRef.current.y = BGHEIGHT / 2; // Center the vertical position
      verticalRange = 0; // Disable vertical panning
    }

    // Update camera rotation
    lookAtWithClamp(camera as PerspectiveCamera, player.position, horizontalRange, 0);

    // Update the camera pan based on its current rotation
    backgroundPanRef.current.x = calculateUnitFromRotation(camera.rotation.y, BGWIDTH, camera.fov, eulerX);
    backgroundPanRef.current.y = calculateUnitFromRotation(camera.rotation.x, BGHEIGHT, camera.fov, midpointRotationX);

  });

  return null;
}

export default Camera;
