import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Euler, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useState } from "react";
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
): void {
  const startRotation = camera.rotation.clone();
  camera.lookAt(targetPosition);
  const newRotation = camera.rotation.clone();
console.log(newRotation.y, startRotation.y - maxY, startRotation.y + maxY);
  const clampedY = clamp(newRotation.y, startRotation.y - maxY, startRotation.y + maxY);

  // Apply the clamped rotation values back to the camera
  camera.rotation.set(startRotation.x, clampedY, startRotation.z);
}

const Camera = ({ backgroundPanRef, cameras }: CameraProps) => {
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
    if (!player) {
      return;
    }
    
    camera.lookAt(initialCameraTargetPosition);

    const BGWIDTH = backgroundPanRef.current.width;

    if (BGWIDTH <= 320) {
      backgroundPanRef.current.x = BGWIDTH / 2;
      return;
    }

    const midpointRotation = camera.rotation.y;

    const SCREEN_WIDTH = 320;
    const HALF_SCREEN_WIDTH = SCREEN_WIDTH / 2;
    const leftX = calculateRotation(HALF_SCREEN_WIDTH, BGWIDTH, camera.fov, midpointRotation);
    const rightX = calculateRotation(BGWIDTH - HALF_SCREEN_WIDTH, BGWIDTH, camera.fov, midpointRotation);

    const range = (rightX - leftX / 2);

    lookAtWithClamp(camera as PerspectiveCamera, player.position, range);

    backgroundPanRef.current.x = calculateUnitFromRotation(camera.rotation.y, BGWIDTH, camera.fov, midpointRotation);
  });


  return null;
}

export default Camera;
