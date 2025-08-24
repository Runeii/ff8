import { MutableRefObject, useRef, useState } from "react";
import { Line3, Mesh, NearestFilter, PerspectiveCamera, RepeatWrapping, Sprite, SRGBColorSpace, Vector2, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../../constants/constants";
import { getCameraDirections } from "../../Camera/cameraUtils";
import useGlobalStore from "../../../store";
import useCameraScroll from "../../useCameraScroll";
import { clamp } from "three/src/math/MathUtils.js";
import { Plane } from "@react-three/drei";


function getVisibleDimensionsAtDistance(
  camera: PerspectiveCamera,
  distance: number
): { width: number; height: number } {
  // Calculate half the height based on the camera's FOV
  const vFOV = camera.fov * Math.PI / 180; // Convert FOV to radians
  const height = 2 * Math.tan(vFOV / 2) * Math.abs(distance);
  
  // Calculate width using the aspect ratio
  const width = height * camera.aspect;
  
  return { width, height };
}

type LayerProps = {
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  layer: Layer;
};

const Layer = ({ backgroundPanRef, layer }: LayerProps) => {
  const layerRef = useRef<Sprite | Mesh>(null);

  const [line] = useState<Line3>(new Line3(new Vector3(), new Vector3()));
  const [point] = useState<Vector3>(new Vector3());

  const {layerID, parameter, state} = layer;

  const camera = useThree(({ scene }) => scene.getObjectByName("sceneCamera") as PerspectiveCamera);

  const cameraScroll = useCameraScroll('camera');
  const layerScroll = useCameraScroll('layer', layer.renderID);

  useFrame(() => {
    if (!layerRef.current) {
      return;
    }

    const {initialTargetPosition, initialPosition} = camera.userData as {
      initialPosition: Vector3,
      initialTargetPosition: Vector3,
    }

    const { backgroundLayerVisibility, currentParameterStates, currentParameterVisibility} = useGlobalStore.getState();

    let isLayerVisible = true;
    if (backgroundLayerVisibility[layerID] === false) {
      isLayerVisible = false;
    }

    if (currentParameterVisibility[parameter] === false) {
      isLayerVisible = false;
    }

    if (currentParameterStates[parameter] !== undefined && currentParameterStates[parameter] !== state) {
      isLayerVisible = false;
    }

    layerRef.current.visible = isLayerVisible;

    if (!initialPosition || !initialTargetPosition || !isLayerVisible) {
      return;
    }


    /*
    // Position
    */
    line.start.copy(initialPosition);
    line.end.copy(initialTargetPosition);
    const length = line.distance();

    const direction = camera.getWorldDirection(new Vector3());
    line.start.copy(camera.getWorldPosition(new Vector3()));
    line.end.copy(line.start).add(direction.clone().multiplyScalar(length));

    layerRef.current.quaternion.copy(camera.quaternion);

    line.at(layer.z / 1000, point);
  
    layerRef.current.position.copy(point);

    /*
    // Scaling to fill frustum
    */
    // Get frustum width/height at distance
    const layerPosition = layerRef.current.position.clone();
    camera.worldToLocal(layerPosition);
    const zDistance = Math.abs(layerPosition.z);
    const result = getVisibleDimensionsAtDistance(camera, zDistance);

    // First calculate scale relative to 320 wide
    const widthScale = layer.canvas.width / SCREEN_WIDTH;
    const width = result.width * widthScale;

    // And then calculate height based on the aspect ratio
    const heightScale = layer.canvas.height / layer.canvas.width;
    const height = width * heightScale

    layerRef.current.scale.set(width * 3, height * 3, 1)

    /*
    // Panning
    */
    const widthUnits = result.width / SCREEN_WIDTH;
    const heightUnits = result.height / SCREEN_HEIGHT;

    let panX = backgroundPanRef.current.panX;
    let panY = backgroundPanRef.current.panY 

    if (Number.isNaN(panX) || !Number.isFinite(panX)) {
      panX = 0;
    }
    if (Number.isNaN(panY) || !Number.isFinite(panY)) {
      panY = 0;
    }

    const {left, right, top, bottom} = backgroundPanRef.current.boundaries;
    let clampedPanX = clamp(panX, left * 256, right * 256);
    let clampedPanY = clamp(panY, top * 256, bottom * 256);

    clampedPanX -= cameraScroll.current.x;
    clampedPanY -= cameraScroll.current.y;

    clampedPanX -= layerScroll.current.x;
    clampedPanY -= layerScroll.current.y;

    const { layerScrollAdjustments } = useGlobalStore.getState()
    const controlledScroll = layerScrollAdjustments[layer.renderID]
    if (controlledScroll) {
      const {
        xOffset,
        yOffset,
        xScrollSpeed,
        yScrollSpeed,
      } = controlledScroll;

      const adjustedX = (clampedPanX / 256) * xScrollSpeed;
      const adjustedY = (clampedPanY / 256) * yScrollSpeed;

      clampedPanX = xOffset + adjustedX;
      clampedPanY = -yOffset + adjustedY;
    }
  
    const directions = getCameraDirections(camera);

    layerRef.current.position.add(directions.rightVector.clone().multiplyScalar(clampedPanX * widthUnits));
    layerRef.current.position.add(directions.upVector.clone().multiplyScalar(clampedPanY * heightUnits));
  })

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  if (isDebugMode) {
    return (
      <Plane
        args={[1, 1, 1]}
        position={[0, 0, 0]}
        ref={layerRef as MutableRefObject<Mesh>}
        renderOrder={20 - layer.layerID}
        >
        <meshBasicMaterial transparent={true} alphaTest={0.1} color={0xffffff} blending={layer.blendType}>
          <canvasTexture
            attach="map"
            premultiplyAlpha
            image={layer.canvas}
            minFilter={NearestFilter}
            colorSpace={SRGBColorSpace}
            magFilter={NearestFilter}
            wrapS={RepeatWrapping}
            wrapT={RepeatWrapping}
            repeat={new Vector2(3, 3)}
          />
        </meshBasicMaterial>
      </Plane>
    );
  }
     
  return (
    <sprite ref={layerRef as MutableRefObject<Sprite>} position={[0, 0, 0]} scale={[layer.canvas.width, layer.canvas.height, 1]} renderOrder={20 - layer.layerID}>
      <spriteMaterial transparent={true} alphaTest={0.1} color={0xffffff} blending={layer.blendType}>
        <canvasTexture
          attach="map"
          premultiplyAlpha
          image={layer.canvas}
          minFilter={NearestFilter}
          colorSpace={SRGBColorSpace}
          magFilter={NearestFilter}
          wrapS={RepeatWrapping}
          wrapT={RepeatWrapping}
          repeat={new Vector2(3, 3)}
        />
      </spriteMaterial>
    </sprite>
  );
}

export default Layer;