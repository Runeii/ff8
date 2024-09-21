import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useEffect, useState } from "react";
import { calculateHorizontalFOV, calculatePitchFromTranslationWithDepth, calculateTranslationsWithDepth, calculateYawFromTranslationWithDepth} from "./backgroundCamera";
import { calculateParallax } from "./perspectiveCameraUtils";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  data: FieldData,
}

const Camera = ({ backgroundPanRef, data }: CameraProps) => {
  const { backgroundDetails, cameras, limits } = data;

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

  useFrame(() => {
    if (!initialCameraTargetPosition) {
      return
    }
    const previousCameraRotation = camera.rotation.clone();

    camera.lookAt(initialCameraTargetPosition);
    const initialCameraRotation = camera.rotation.clone();

    camera.lookAt(player.position);
  
    const backgroundDepth = cameras[0].camera_zoom;
    const panX = calculateParallax(
      camera.rotation.y,
      initialCameraRotation.y,
      backgroundDepth
    );

    const panY = -1 * calculateParallax(
      camera.rotation.x,
      initialCameraRotation.x,
      backgroundDepth
    );

    const desiredCameraRotation = camera.rotation.clone();
  
    camera.rotation.copy(previousCameraRotation);
  
    const leftBoundary = limits.cameraRange.left + limits.screenRange.right / 2;
    const rightBoundary = limits.cameraRange.right - limits.screenRange.right / 2;

    if (leftBoundary <= panX && panX <= rightBoundary) {
      backgroundPanRef.current.x = panX;
      camera.rotation.y = desiredCameraRotation.y;
    } else {
      console.log('x out of bounds', panX)
    }
    
    const topBoundary = limits.cameraRange.top + limits.screenRange.bottom / 2;
    const bottomBoundary = limits.cameraRange.bottom - limits.screenRange.bottom / 2;

    if (topBoundary <= panY && panY <= bottomBoundary) {
      backgroundPanRef.current.y = panY;
      camera.rotation.x = desiredCameraRotation.x;
    } else {
      console.log('y out of bounds', panY)
    }
    
  });

  return null;
}

export default Camera;
  