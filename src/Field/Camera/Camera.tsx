import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { vectorToFloatingPoint, WORLD_DIRECTIONS } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { calculateAngleForParallax, calculateParallax, getBoundaries, getCameraDirections, getCharacterForwardDirection, getReliableRotationAxes, getRotationAngleAroundAxis } from "./cameraUtils";
import { clamp, radToDeg } from "three/src/math/MathUtils.js";
import { SCREEN_HEIGHT } from "../../constants/constants";
import useGlobalStore from "../../store";

type CameraProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData,
}

const Camera = ({ backgroundPanRef, data }: CameraProps) => {
  const { cameras, limits } = data;

  const [initialCameraTargetPosition, setInitialCameraTargetPosition] = useState(new Vector3());

  const activeCameraId = useGlobalStore((state) => state.activeCameraId);
  const camera = useThree(({ camera }) => camera as PerspectiveCamera);

  useEffect(() => {
    const {camera_axis,camera_position,camera_zoom} = cameras[activeCameraId];
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

    camera.position.set(tx, ty, tz);
    camera.up.set(camAxisY.x, camAxisY.y, camAxisY.z);
    camera.lookAt(lookAtTarget);
    (camera as PerspectiveCamera).fov = radToDeg(2 * Math.atan(SCREEN_HEIGHT/(2.0 * camera_zoom)))
    camera.updateProjectionMatrix();

    const direction = new Vector3(0, 0, -1); // Default forward direction in Three.js
    direction.applyQuaternion(new Quaternion().setFromEuler(camera.rotation));
  
    camera.userData = {
      initialDirection: direction,
      initialQuaternion: camera.quaternion.clone(),
      initialPosition: camera.position.clone(),
      initialTargetPosition: lookAtTarget.clone(),
    }

    setInitialCameraTargetPosition(lookAtTarget.clone());
  }, [activeCameraId, camera, cameras, data]);

  // Precompute boundaries
  const boundaries = useMemo(
    () => getBoundaries(limits),
    [limits]
  );

  // This is the main logic for the camera movement
  useFrame(({ scene }) => {
    if (activeCameraId !== 0) {
      return
    }
    const player = scene.getObjectByName("character");

    if (!initialCameraTargetPosition || !player) {
      return
    }

    camera.lookAt(initialCameraTargetPosition);
    const initialCameraRotation = camera.rotation.clone();
    const initialCameraQuaternion = new Quaternion().setFromEuler(initialCameraRotation);

    const position = player.position.clone();
    player.getWorldPosition(position);
    camera.lookAt(position);
    const currentCameraQuaternion = new Quaternion().setFromEuler(camera.rotation);
    
    const { yawAxis, pitchAxis } = getReliableRotationAxes(camera);

    const yawAngle = getRotationAngleAroundAxis(
      initialCameraQuaternion,
      currentCameraQuaternion,
      yawAxis
    );

    const pitchAngle = getRotationAngleAroundAxis(
      initialCameraQuaternion,
      currentCameraQuaternion,
      pitchAxis
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

    const { UP, RIGHT } = WORLD_DIRECTIONS;
  

    const yawRotation = new Quaternion().setFromAxisAngle(UP, calculateAngleForParallax(finalPanX, cameraZoom));
    camera.quaternion.multiply(yawRotation);
    
    const pitchRotation = new Quaternion().setFromAxisAngle(RIGHT, -calculateAngleForParallax(finalPanY, cameraZoom));
    camera.quaternion.multiply(pitchRotation);

    backgroundPanRef.current.panX = finalPanX;
    backgroundPanRef.current.panY = finalPanY;
    backgroundPanRef.current.cameraZoom = cameraZoom;
    backgroundPanRef.current.boundaries = boundaries;
  });

  return null;
}

export default Camera;
  