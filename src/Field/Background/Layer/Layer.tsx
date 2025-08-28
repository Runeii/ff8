
import { MutableRefObject, useRef, useState } from "react";
import { ClampToEdgeWrapping, Line3, Mesh, NearestFilter, PerspectiveCamera, RepeatWrapping, Sprite, SRGBColorSpace, Vector2, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../../constants/constants";
import { getCameraDirections } from "../../Camera/cameraUtils";
import useGlobalStore from "../../../store";
import useCameraScroll from "../../useScrollTransition";
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
  isTiled: boolean;
  layer: Layer;
};

const Layer = ({ backgroundPanRef, isTiled, layer }: LayerProps) => {
  const layerRef = useRef<Sprite | Mesh>(null);

  const [line] = useState<Line3>(new Line3(new Vector3(), new Vector3()));
  const [point] = useState<Vector3>(new Vector3());

  const {parameter, state} = layer;

  const camera = useThree(({ scene }) => scene.getObjectByName("sceneCamera") as PerspectiveCamera);

  const layerPanRef = useRef<{panX: number, panY: number}>({panX: 0, panY: 0});
  const layerScroll = useCameraScroll('layer', layerPanRef, layer.renderID);

  useFrame(() => {
    if (!layerRef.current) {
      return;
    }

    const {initialTargetPosition, initialPosition} = camera.userData as {
      initialPosition: Vector3,
      initialTargetPosition: Vector3,
    }
    
    const { backgroundAnimations, backgroundLayerVisibility, backgroundScrollRatios } = useGlobalStore.getState();
    
    const currentParameterState = backgroundAnimations[parameter];

    let isLayerVisible = true;

    if (parameter !== -1 && backgroundLayerVisibility[parameter] !== true) {
      isLayerVisible = false;
    } else if (currentParameterState !== undefined && Math.round(currentParameterState?.get()) !== state) {
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

    const tiling = isTiled ? 5 : 1
    layerRef.current.scale.set(width * tiling, height * tiling, 1)

    /*
    // Panning
    */
    const widthUnits = result.width / SCREEN_WIDTH;
    const heightUnits = result.height / SCREEN_HEIGHT;

    const panX = backgroundPanRef.current.panX;
    const panY = backgroundPanRef.current.panY;

    const {left, right, top, bottom} = backgroundPanRef.current.boundaries;
    const ratio = backgroundScrollRatios[layer.renderID];

    const xLeft = left * 256;
    const xRight = right * 256;

    const yTop = top * 256;
    const yBottom = bottom * 256;

    let clampedPanX = clamp(panX, xLeft, xRight);
    let clampedPanY = clamp(panY, yTop, yBottom);

    let ratioAdjustedX = clampedPanX;
    let ratioAdjustedY = clampedPanY;

    if (ratio) {
      const standardXRange = xRight - xLeft;
      const standardYRange = yBottom - yTop;

      ratioAdjustedX = clampedPanX * (standardXRange / ratio.x);
      ratioAdjustedY = clampedPanY * (standardYRange / ratio.y);
    }

    if (Number.isNaN(ratioAdjustedX) || !Number.isFinite(ratioAdjustedX)) {
      ratioAdjustedX = 0;
    }
    if (Number.isNaN(ratioAdjustedY) || !Number.isFinite(ratioAdjustedY)) {
      ratioAdjustedY = 0;
    }

    const { layerScrollAdjustments } = useGlobalStore.getState()
    const controlledScroll = layerScrollAdjustments[layer.renderID]
    if (controlledScroll) {
      const {
        xOffset,
        yOffset,
        xScrollSpeed,
        yScrollSpeed,
      } = controlledScroll;

      const adjustedX = (ratioAdjustedX / 256) * xScrollSpeed;
      const adjustedY = (ratioAdjustedY / 256) * yScrollSpeed;

      ratioAdjustedX = xOffset + adjustedX;
      ratioAdjustedY = -yOffset + adjustedY;
    }
  
    if (layerScroll.current.positioning === 'camera') {
      if (layerScroll.current.x !== 0) {
        ratioAdjustedX -= layerScroll.current.x;
      }
      if (layerScroll.current.y !== 0) {
        ratioAdjustedY -= layerScroll.current.y;
      }
    } else {
      ratioAdjustedX += layerScroll.current.x;
      ratioAdjustedY += layerScroll.current.y;
    }

    const directions = getCameraDirections(camera);

    layerRef.current.position.add(directions.rightVector.clone().multiplyScalar(ratioAdjustedX * widthUnits));
    layerRef.current.position.add(directions.upVector.clone().multiplyScalar(ratioAdjustedY * heightUnits));
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
            wrapS={isTiled ? RepeatWrapping : ClampToEdgeWrapping}
            wrapT={isTiled ? RepeatWrapping : ClampToEdgeWrapping}
            repeat={isTiled ? new Vector2(5, 5) : new Vector2(1, 1)}
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
          wrapS={isTiled ? RepeatWrapping : ClampToEdgeWrapping}
          wrapT={isTiled ? RepeatWrapping : ClampToEdgeWrapping}
          repeat={isTiled ? new Vector2(5, 5) : new Vector2(1, 1)}
        />
      </spriteMaterial>
    </sprite>
  );
}

export default Layer;