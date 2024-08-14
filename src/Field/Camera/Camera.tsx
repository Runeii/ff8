import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { calculatePannedCameraPosition, inverseLerpSymmetric, vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useMemo } from "react";
import { clamp } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  backgroundDetails: FieldData['backgroundDetails'],
  cameras: FieldData['cameras'],
  sceneBoundingBox: Box3
}

const Camera = ({ backgroundPanRef, backgroundDetails, cameras, sceneBoundingBox }: CameraProps) => {
  // NOTES: 320 x 240 (224?) is standard map size
  const initialCameraPosition = useThree(({ camera }) => {
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

    
    (camera as PerspectiveCamera).fov = (2 * Math.atan(240.0/(2.0 * camera_zoom))) * 57.29577951;
    camera.updateProjectionMatrix();

    return camera.position.clone();
  });

  const safePanZone = useMemo(() => {
    const box = sceneBoundingBox.clone();

    const visibleWidth = (320 / backgroundDetails.width);
    const visibleHeight = (240 / backgroundDetails.height);

    const halfScreenWidthBuffer = (visibleWidth / 2);
    const halfScreenHeightBuffer = (visibleHeight / 2);

    const boxXLength = box.max.x - box.min.x;
    const boxXAdjustment = Math.min(boxXLength * 0.5, boxXLength * halfScreenWidthBuffer);
    
    const boxYLength = box.max.y - box.min.y;
    const boxYAdjustment = Math.min(boxYLength * 0.5, boxYLength * halfScreenHeightBuffer);

    box.min.x += boxXAdjustment;
    box.max.x -= boxXAdjustment;
  
    box.min.y += boxYAdjustment;
    box.max.y -= boxYAdjustment
    
    box.min.z = 0;
    box.max.z = 0;

    return box;
  }, [backgroundDetails.height, backgroundDetails.width, sceneBoundingBox]);

  const character = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);
  const camera = useThree(({ camera }) => camera as PerspectiveCamera);

  // To avoid re-creating the vectors for camera direction every frame, as camera is static
  const cameraDirection = new Vector3();
  const screenRight = new Vector3();
  const screenUp = new Vector3();

  camera.getWorldDirection(cameraDirection);
  screenRight.set(0, 0, 0).crossVectors(camera.up, cameraDirection).normalize();
  screenUp.copy(camera.up).normalize();

  useFrame(() => {
    if (!camera && !character) {
      return;
    }

    if (safePanZone.getSize(new Vector3()).length() === 0) {
      backgroundPanRef.current.x = 0;
      backgroundPanRef.current.y = 0;
      return;
    }

    const {min, max} = safePanZone;

    const x = inverseLerpSymmetric(min.x, max.x, character.position.x);
    const y = inverseLerpSymmetric(min.y, max.y, character.position.y);

    backgroundPanRef.current.x = clamp(x, -1, 1);
    backgroundPanRef.current.y = clamp(y, -1, 1);

    const xPan = (sceneBoundingBox.max.x - sceneBoundingBox.min.x) / -14;
    const yPan = (sceneBoundingBox.max.y - sceneBoundingBox.min.y) / 27;

    const pannedPosition = initialCameraPosition.clone()
      .addScaledVector(screenRight, backgroundPanRef.current.x * xPan)
      .addScaledVector(screenUp, backgroundPanRef.current.y * yPan);

      camera.position.copy(pannedPosition);
  });

  return null;
}

export default Camera;