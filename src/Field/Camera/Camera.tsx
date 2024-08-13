import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from 'three';
import { vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import {  MathUtils } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundDetails: FieldData['backgroundDetails'],
  cameras: FieldData['cameras']
}

const Camera = ({ backgroundDetails, cameras }: CameraProps) => {
  // NOTES: 320 x 240 (224?) is standard map size
  const lookAtRotation = useThree(({ camera }) => {
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

    return camera.rotation.clone();
  });


  const character = useThree(({ scene }) => scene.getObjectByName('character'));
  useFrame(({camera}) => {
    if (!character) {
      return;
    }
    
    // x is up/down
    // y is left/right
    const maxAngleY = ((backgroundDetails.width/320) - 1) / 2;
    const maxAngleX = ((backgroundDetails.height/240) - 1) / 2;
    
    camera.lookAt(character.position);
    const lookedAtCameraRotation = camera.rotation.clone();
    
    const desiredY = lookedAtCameraRotation.y;
    const desiredX = lookedAtCameraRotation.x;

    // Clamp the desired rotations within the maxAngle constraints
    const clampedX = MathUtils.clamp(desiredY, lookAtRotation.y - maxAngleY, lookAtRotation.y + maxAngleY);
    const clampedY = MathUtils.clamp(desiredX, lookAtRotation.x - maxAngleX, lookAtRotation.x + maxAngleX);

    // Apply the clamped rotations to the camera
    camera.rotation.y = clampedX;
    camera.rotation.x = clampedY;
    camera.rotation.z = lookAtRotation.z;
  })

  return null;
}

export default Camera;