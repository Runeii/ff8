import { useRef, useState } from "react";
import { ClampToEdgeWrapping, Line3, NearestFilter, PerspectiveCamera, Sprite, SRGBColorSpace, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../../constants/constants";
import { getCameraDirections } from "../../Camera/cameraUtils";
import useGlobalStore from "../../../store";
import { useSpring } from "@react-spring/web";
import useScrollSpring from "../../useScrollSpring";


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
  const layerRef = useRef<Sprite>(null);

  const [line] = useState<Line3>(new Line3(new Vector3(), new Vector3()));
  const [point] = useState<Vector3>(new Vector3());

  const {layerID, parameter, state} = layer;
  const isLayerVisible = useGlobalStore((storeState) => {
    const { backgroundLayerVisibility, currentParameterStates, currentParameterVisibility} = storeState;

    if (backgroundLayerVisibility[layerID] === false) {
      return false;
    }

    if (currentParameterVisibility[parameter] === false) {
      return false;
    }

    if (currentParameterStates[parameter] !== undefined && currentParameterStates[parameter] !== state) {
      return false;
    }

    return true;
  });


  const camera = useThree(state => state.camera as PerspectiveCamera);

  const scrollSpring = useScrollSpring(layer.renderID);

  useFrame(() => {
    if (!layerRef.current) {
      return;
    }

    const {initialTargetPosition, initialPosition} = camera.userData as {
      initialPosition: Vector3,
      initialTargetPosition: Vector3,
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

    layerRef.current.scale.set(width, height, 1)

    /*
    // Panning
    */
    const widthUnits = result.width / SCREEN_WIDTH;
    const heightUnits = result.height / SCREEN_HEIGHT;

    const { layerScrollAdjustments } = useGlobalStore.getState()

    // Unclear to me why we need to use a non standard layerID here,
    // but that seems to be what Opcodes expect
    // Update: I think it's layer index rather than ID
    const controlledScroll = layerScrollAdjustments[layer.renderID]

    let panX = backgroundPanRef.current.panX;
    let panY = backgroundPanRef.current.panY 

    if (controlledScroll) {
      const {
        xOffset,
        yOffset,
        xScrollSpeed,
        yScrollSpeed,
      } = controlledScroll;

      const adjustedX = (panX / 256) * xScrollSpeed;
      const adjustedY = (panY / 256) * yScrollSpeed;

      panX = xOffset + adjustedX;
      panY = -yOffset + adjustedY;
    }

    panX -= scrollSpring.x.get();
    panY -= scrollSpring.y.get();

    if (Number.isNaN(panX) || !Number.isFinite(panX)) {
      panX = 0;
    }
    if (Number.isNaN(panY) || !Number.isFinite(panY)) {
      panY = 0;
    }

    const directions = getCameraDirections(camera);

    layerRef.current.position.add(directions.rightVector.clone().multiplyScalar(panX * widthUnits));
    layerRef.current.position.add(directions.upVector.clone().multiplyScalar(panY * heightUnits));
  })
     
  return (
    <sprite ref={layerRef} position={[0, 0, 0]} scale={[layer.canvas.width, layer.canvas.height, 1]} renderOrder={layer.layerID}>
      <spriteMaterial transparent={true} alphaTest={0.1} color={0xffffff} blending={layer.blendType}>
        <canvasTexture
          attach="map"
          premultiplyAlpha
          image={layer.canvas}
          minFilter={NearestFilter}
          colorSpace={SRGBColorSpace}
          magFilter={NearestFilter}
          wrapS={ClampToEdgeWrapping}
          wrapT={ClampToEdgeWrapping}
        />
      </spriteMaterial>
    </sprite>
  );
}

export default Layer;