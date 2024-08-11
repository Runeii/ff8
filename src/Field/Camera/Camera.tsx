import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from 'three';
import { vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";

type CameraProps = {
  cameras: FieldData['cameras']
}

const Camera = ({ cameras }: CameraProps) => {
  // NOTES: 320 x 240 (224?) is standard map size
  useThree(({ camera }) => {
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
  });

  return null;
}

export default Camera;