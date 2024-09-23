import { useFrame, useThree } from "@react-three/fiber";
import {  Mesh, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { vectorToFloatingPoint, WORLD_DIRECTIONS } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { calculateAngleForParallax, calculateParallax, getBoundaries, getRotationAngleAroundAxis } from "./cameraUtils";
import { clamp } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData,
}

const Camera = ({ backgroundPanRef, data }: CameraProps) => {
  const { cameras, limits } = data;

  const [initialCameraTargetPosition, setInitialCameraTargetPosition] = useState(new Vector3());

  const camera = useThree(({ camera }) => camera as PerspectiveCamera);
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  useEffect(() => {
    const {camera_axis,camera_position,camera_zoom} = cameras[0];
    camera.far = camera_zoom;
    camera.near = 0.00001;
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

    setInitialCameraTargetPosition(lookAtTarget.clone());
  }, [backgroundPanRef, camera, cameras]);

  // Precompute boundaries
  const boundaries = useMemo(
    () => getBoundaries(limits),
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

    const cameraZoom = data.cameras[0].camera_zoom;

    const panX = calculateParallax(
      yawAngle,
      cameraZoom,
    );

    const panY = calculateParallax(
      -pitchAngle,
      cameraZoom,
    );

    camera.rotation.copy(initialCameraRotation);
    
    const finalPanX = clamp(panX, boundaries.left, boundaries.right);
    const finalPanY = clamp(panY, boundaries.top, boundaries.bottom);

    const yawRotation = new Quaternion().setFromAxisAngle(UP, calculateAngleForParallax(finalPanX, cameraZoom));
    camera.quaternion.multiply(yawRotation);
    
    const pitchRotation = new Quaternion().setFromAxisAngle(RIGHT, -calculateAngleForParallax(finalPanY, cameraZoom));
    camera.quaternion.multiply(pitchRotation);

    backgroundPanRef.current.yaw = yawAngle;
    backgroundPanRef.current.pitch = pitchAngle;
    backgroundPanRef.current.cameraZoom = cameraZoom;
    backgroundPanRef.current.boundaries = boundaries;
  });

  return null;
}

export default Camera;
  