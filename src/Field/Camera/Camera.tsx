import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Euler, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useState } from "react";
import { clamp, MathUtils } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  backgroundDetails: FieldData['backgroundDetails'],
  cameras: FieldData['cameras'],
  sceneBoundingBox: Box3
}

const getHorizontalFov = (camera: PerspectiveCamera) => {
  // Assuming you have an existing camera
  const verticalFov = camera.fov; // Vertical FOV in degrees
  const aspectRatio = camera.aspect; // Typically canvas width divided by height

  // Convert vertical FOV to radians
  const verticalFovRadians = MathUtils.degToRad(verticalFov);

  // Calculate horizontal FOV in radians
  const horizontalFovRadians = 2 * Math.atan(Math.tan(verticalFovRadians / 2) * aspectRatio);

  // Convert horizontal FOV to degrees
  const horizontalFov = MathUtils.radToDeg(horizontalFovRadians);

  return horizontalFov;
}

const calculateRotation = (x: number, unitRange: number, rotationRange: number, midpointRotation: number) => {
  const midpoint = unitRange / 2;

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
  rotationRange: number,
  midpointRotation: number 
): number => {
  // Calculate the midpoint of the unit range
  const midpoint = unitRange / 2;

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
  maxX: number, 
  maxY: number, 
): void {
  const startRotation = camera.rotation.clone();
  camera.lookAt(targetPosition);
  const newRotation = camera.rotation.clone();

  const clampedX = clamp(newRotation.y, startRotation.y - maxX, startRotation.y + maxX);
  const clampedY = clamp(newRotation.x, startRotation.x - maxY, startRotation.x + maxY);

  // Apply the clamped rotation values back to the camera
  camera.rotation.set(startRotation.x, clampedX, startRotation.z);
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
    const BGHEIGHT = backgroundPanRef.current.height;

    const midpointRotationX = camera.rotation.y;
    const SCREEN_WIDTH = 320;
    const HALF_SCREEN_WIDTH = SCREEN_WIDTH / 2;
    const rotationRangeX = camera.fov * 0.037;

    const leftX = calculateRotation(HALF_SCREEN_WIDTH, BGWIDTH, rotationRangeX, midpointRotationX);
    const rightX = calculateRotation(BGWIDTH - HALF_SCREEN_WIDTH, BGWIDTH, rotationRangeX, midpointRotationX);
    const rangeX = (rightX - leftX) / 2;
    
    const midpointRotationY = camera.rotation.x;
    const SCREEN_HEIGHT = 224;
    const HALF_SCREEN_HEIGHT = SCREEN_HEIGHT / 2;
    const horizontalFov = getHorizontalFov(camera as PerspectiveCamera);
    const rotationRangeY = horizontalFov * 0.037;
    const leftY = calculateRotation(HALF_SCREEN_HEIGHT, BGHEIGHT, rotationRangeY, midpointRotationY);
    const rightY = calculateRotation(BGHEIGHT - HALF_SCREEN_HEIGHT, BGHEIGHT, rotationRangeY, midpointRotationY);
    const rangeY = (rightY - leftY) / 2;

    lookAtWithClamp(camera as PerspectiveCamera, player.position, rangeX, rangeY);

    backgroundPanRef.current.x = BGWIDTH <= 320 ? BGWIDTH / 2 : calculateUnitFromRotation(camera.rotation.y, BGWIDTH, rotationRangeX, midpointRotationX);

    backgroundPanRef.current.y = BGHEIGHT / 2;
    backgroundPanRef.current.y = BGHEIGHT <= 224 ? BGHEIGHT / 2 : calculateUnitFromRotation(camera.rotation.x, BGHEIGHT, rotationRangeY, midpointRotationY);
  });


  return null;
}

export default Camera;
