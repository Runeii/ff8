import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { inverseLerpSymmetric, vectorToFloatingPoint } from "../../utils";
import { FieldData } from "../Field";
import { MutableRefObject, useMemo } from "react";
import { clamp } from "three/src/math/MathUtils.js";

type CameraProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  backgroundDetails: FieldData['backgroundDetails'],
  cameras: FieldData['cameras'],
  sceneBoundingBox: Box3
}

const calculateRotation = (x: number, unitRange: number, fov: number, midpointRotation: number) => {
  // Calculate the midpoint of the unit range
  const midpoint = unitRange / 2;

  // Calculate the total rotation range proportional to the FOV
  // (The value of 0.037 used here is based on your examples and can be adjusted if necessary)
  const rotationRange = fov * 0.037; // This factor is derived from the examples you provided

  // The rotation difference from the midpoint to unit 0 or max unit is half of the rotation range
  const rotationAtExtreme = rotationRange / 2;

  // Calculate the slope (m)
  const m = rotationAtExtreme / midpoint;

  // Calculate the rotation at the given unit (x)
  const rotation = m * (x - midpoint) + midpointRotation;

  return rotation;
}
const calculateUnitFromRotation = (
  rotation: number,          // The desired rotation
  unitRange: number,         // The total range of units (e.g., 816 or 960)
  fov: number,               // The field of view (FOV)
  midpointRotation: number   // The known midpoint rotation
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

  const clampedY = clamp(newRotation.y, startRotation.y - maxY, startRotation.y + maxY);

  // Apply the clamped rotation values back to the camera
  camera.rotation.set(startRotation.x, clampedY, startRotation.z);
}

const Camera = ({ backgroundPanRef, backgroundDetails, cameras, sceneBoundingBox }: CameraProps) => {
  // NOTES: 320 x 224 is standard map size
  const [centreCameraPosition,centreCameraTargetPosition] = useThree(({ camera }) => {
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

    return [camera.position.clone(), lookAtTarget.clone()];
  });

  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

    /// CURRENT THINKING
    // * Camera position adjusts for up and down screen movement
    // * Camera rotates for left and right screen movement
    // * Z may be adjusted for up and down screen movement somehow (not important atm)

    // The x bound passed to clamp needs to be derived from bg width vs screen width and likely zoom
    // bghall_5 is around 0.28

  useFrame(({ camera }) => {
    if (!player) {
      return;
    }

    // STARTY / ((BGWIDTH / SCREENWIDTH) * (UNITS / SCREENWIDTH))
    
    camera.lookAt(centreCameraTargetPosition);

    // note: in the notes Y is , for ease
    /* bghall_5
    const CENTRE_X = -0.0034178633602187773;
    const ZOOM = 783;
    const BGWIDTH = 816;
    const VERTICAL_FOV = 16.280693096101423
    const SCREENWIDTH = 320;
    
    lookAtWithClamp(camera as PerspectiveCamera, player.position, 0.3588755529077225, 0);
    */

    /* tmmura1

    const ZOOM = 614
    const SCREENWIDTH = 320
    const BGWIDTH = 960
    const CENTRE_X = 0.20109850432971224
    const VERTICAL_FOV = 20.675380266012716

    */
    const BGWIDTH = backgroundPanRef.current.width;

    if (BGWIDTH <= 320) {
      backgroundPanRef.current.x = BGWIDTH / 2;
      return;
    }

    const midpointRotation = camera.rotation.y;
    const leftX = calculateRotation(160, BGWIDTH, camera.fov, midpointRotation);
    const rightX = calculateRotation(BGWIDTH - 160, BGWIDTH, camera.fov, midpointRotation);

    const range = (rightX - leftX / 2);

    lookAtWithClamp(camera as PerspectiveCamera, player.position, range);

    backgroundPanRef.current.x = calculateUnitFromRotation(camera.rotation.y, BGWIDTH, camera.fov, midpointRotation);
  });

  useFrame(({ camera }) => {
    const upAxis = new Vector3().copy(camera.up);
    const forwardAxis = new Vector3();
    camera.getWorldDirection(forwardAxis);
    const rightAxis = new Vector3().crossVectors(forwardAxis, upAxis);

    const multiple = 720 //correct for dollet
    //const multiple = 300
    const movementVectorX = rightAxis.clone().multiplyScalar(-window.debug.x / multiple);
    const movementVectorY = upAxis.clone().multiplyScalar(-window.debug.y / multiple);
    const movementVectorZ = forwardAxis.clone().multiplyScalar(window.debug.x / multiple / 4);

    camera.position.set(centreCameraPosition.x, centreCameraPosition.y, centreCameraPosition.z);

    //camera.position.add(movementVectorX);
    //camera.position.add(movementVectorY);
    //camera.position.add(movementVectorZ);
  })
  return null;
}

export default Camera;
