import { useFrame, useThree } from "@react-three/fiber";
import {  Mesh, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { vectorToFloatingPoint, WORLD_DIRECTIONS } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { calculateAngleForParallax, calculateParallax, getRotationAngleAroundAxis } from "./cameraUtils";
import { clamp } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  data: FieldData,
}

const Camera = ({ backgroundPanRef, data }: CameraProps) => {
  const { cameras, limits } = data;

  const [initialCameraTargetPosition, setInitialCameraTargetPosition] = useState(new Vector3());

  const camera = useThree(({ camera }) => camera as PerspectiveCamera);
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);
console.log('go')
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
    backgroundPanRef.current = { x: 0, y: 0 };
    setInitialCameraTargetPosition(lookAtTarget.clone());
  }, [backgroundPanRef, camera, cameras]);

  // Precompute boundaries
  const leftBoundary = useMemo(
    () => limits.cameraRange.left + limits.screenRange.right / 2,
    [limits]
  );
  const rightBoundary = useMemo(
    () => limits.cameraRange.right - limits.screenRange.right / 2,
    [limits]
  );
  const topBoundary = useMemo(
    () => limits.cameraRange.top + limits.screenRange.bottom / 2,
    [limits]
  );
  const bottomBoundary = useMemo(
    () => limits.cameraRange.bottom - limits.screenRange.bottom / 2,
    [limits]
  );

  // This is the main logic for the camera movement
  useFrame(() => {
    if (!initialCameraTargetPosition) {
      return
    }

    camera.lookAt(initialCameraTargetPosition);
    const initialCameraRotation = camera.rotation.clone();
    const initialCameraQuaternion = new Quaternion().setFromEuler(initialCameraRotation);

    const { UP, RIGHT } = WORLD_DIRECTIONS;

    camera.lookAt(player.position);
    const currentCameraQuaternion = new Quaternion().setFromEuler(camera.rotation);

    const yawAngle = getRotationAngleAroundAxis(
      initialCameraQuaternion,
      currentCameraQuaternion,
      camera.up
    );
    
    const pitchAngle = getRotationAngleAroundAxis(
      initialCameraQuaternion,
      currentCameraQuaternion,
      RIGHT
    );

    const backgroundDepth = data.cameras[0].camera_zoom;

    const panX = calculateParallax(
      yawAngle,
      backgroundDepth,
    );

    const panY = calculateParallax(
      -pitchAngle,
      backgroundDepth,
    );

    camera.rotation.copy(initialCameraRotation);
    
    const finalPanX = clamp(panX, leftBoundary, rightBoundary);
    const finalPanY = clamp(panY, topBoundary, bottomBoundary);

    backgroundPanRef.current.x = finalPanX;
    backgroundPanRef.current.y = finalPanY;

    const yawRotation = new Quaternion().setFromAxisAngle(UP, calculateAngleForParallax(finalPanX, backgroundDepth));
    camera.quaternion.multiply(yawRotation);
    
    const pitchRotation = new Quaternion().setFromAxisAngle(RIGHT, -calculateAngleForParallax(finalPanY, backgroundDepth));
    camera.quaternion.multiply(pitchRotation);
  });

  return null;
}

export default Camera;
  