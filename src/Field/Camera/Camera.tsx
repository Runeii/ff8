import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { vectorToFloatingPoint, WORLD_DIRECTIONS } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { calculateAngleForParallax, calculateFOV, calculateParallax, getBoundaries, getCameraDirections, getReliableRotationAxes, getRotationAngleAroundAxis } from "./cameraUtils";
import { clamp } from "three/src/math/MathUtils.js";
import { SCREEN_HEIGHT } from "../../constants/constants";
import useGlobalStore from "../../store";
import Focus from "./Focus/Focus";
import useScrollTransition from "../useScrollTransition";
import LerpValue from "../../LerpValue";
import { CONTROLS_MAP } from "../../constants/controls";

type CameraProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData,
}

const Camera = ({ backgroundPanRef, data }: CameraProps) => {
  const { cameras, limits } = data;

  const [initialCameraTargetPosition, setInitialCameraTargetPosition] = useState(new Vector3());

  const activeCameraId = useGlobalStore((state) => state.activeCameraId);
  const moveableCamera = useThree(({camera}) => camera as PerspectiveCamera);
  const camera = useThree(({ scene }) => scene.getObjectByName("sceneCamera") as PerspectiveCamera);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);
  useEffect(() => {
    const {camera_axis,camera_position,camera_zoom} = cameras[activeCameraId];

    camera.far = 100;
    moveableCamera.far = 100;
    camera.near = 0.000001;
    moveableCamera.near = 0.000001;

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
    moveableCamera.position.set(tx, ty, tz);
  
    camera.up.set(camAxisY.x, camAxisY.y, camAxisY.z);
    moveableCamera.up.set(camAxisY.x, camAxisY.y, camAxisY.z);
  
    camera.lookAt(lookAtTarget);
    moveableCamera.lookAt(lookAtTarget);

    camera.fov = calculateFOV(camera_zoom, SCREEN_HEIGHT);
    moveableCamera.fov = camera.fov;

    camera.updateProjectionMatrix();
    moveableCamera.updateProjectionMatrix();

    const direction = new Vector3(0, 0, -1); // Default forward direction in Three.js
    direction.applyQuaternion(new Quaternion().setFromEuler(camera.rotation));
  
    camera.userData = {
      initialPosition: camera.position.clone(),
      initialTargetPosition: lookAtTarget.clone(),
      initialDirection: direction.clone(),
    }

    setInitialCameraTargetPosition(lookAtTarget.clone());
  }, [activeCameraId, camera, cameras, data, isDebugMode, moveableCamera]);

  // Precompute boundaries
  const boundaries = useMemo(
    () => getBoundaries(limits),
    [limits]
  );

  const scrollSpring = useScrollTransition('camera', backgroundPanRef);

  // This is the main logic for the camera movement
  useFrame(({ scene }) => {
    if (activeCameraId !== 0) {
      backgroundPanRef.current.panX = 0
      backgroundPanRef.current.panY = 0
      return
    }
    const cameraFocusObject = useGlobalStore.getState().cameraFocusObject;

    const player = cameraFocusObject ?? scene.getObjectByName("focus");

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

    const {x: xPan, y: yPan, positioning} = scrollSpring.current;

    const clippedPanX = clamp(panX, boundaries.left, boundaries.right);
    const clippedPanY = clamp(panY, boundaries.top, boundaries.bottom);
    let finalPanX, finalPanY;
    if (positioning === 'camera') {
      finalPanX = clippedPanX - xPan / 256;
      finalPanY = clippedPanY - yPan / 256;
    } else {
      finalPanX = xPan / 256;
      finalPanY = yPan / 256;
    }

    const { UP, RIGHT } = WORLD_DIRECTIONS;
    const yawRotation = new Quaternion().setFromAxisAngle(UP, calculateAngleForParallax(finalPanX, cameraZoom));
    camera.quaternion.multiply(yawRotation);
    
    const pitchRotation = new Quaternion().setFromAxisAngle(RIGHT, -calculateAngleForParallax(finalPanY, cameraZoom));
    camera.quaternion.multiply(pitchRotation);

    backgroundPanRef.current.boundaries = boundaries;
    backgroundPanRef.current.panX = finalPanX * 256;
    backgroundPanRef.current.panY = finalPanY * 256;
  });

  const [isDebugModeActive, setIsDebugModeActive] = useState(false);
  const [pullback] = useState(new LerpValue(0));

  useEffect(() => {
    if (isDebugModeActive) {
      useGlobalStore.setState({ isDebugMode: true });
    }
    pullback.start(isDebugModeActive ? 1 : 0, 300)
      .then(() => {
        if (!isDebugModeActive) {
          useGlobalStore.setState({ isDebugMode: false });
        }
      })
  }, [isDebugModeActive, pullback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === CONTROLS_MAP.debug) {
        setIsDebugModeActive(state => !state);
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [])


  useFrame(({ scene }) => {
    if (!moveableCamera) {
      return;
    }
    
    const focus = scene.getObjectByName("focus");
    if (!focus) {
      return;
    }
    
    moveableCamera.lookAt(focus.position);
    const lookingAtQuaternion = moveableCamera.quaternion.clone();
    moveableCamera.quaternion.copy(camera.quaternion.clone().slerp(lookingAtQuaternion, pullback.get()));

    const {upVector, rightVector, forwardVector} = getCameraDirections(camera.clone());
    
    const scenePosition = camera.position.clone();
    const debugPosition = camera.position.clone();
    debugPosition.sub(forwardVector.clone().multiplyScalar(2));
    debugPosition.sub(rightVector.clone().multiplyScalar(1));
    debugPosition.add(upVector.clone().multiplyScalar(0.5));

    moveableCamera.position.copy(scenePosition.lerp(debugPosition, pullback.get()));

    moveableCamera.fov = camera.fov;
    moveableCamera.updateProjectionMatrix();
  })
  return <Focus />;
}

export default Camera;
  