import { Box, OrbitControls, Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { isValidElement, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Group,
  Line3,
  Material,
  MathUtils,
  Mesh,
  NearestFilter,
  NoBlending,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry, 
  SubtractiveBlending,
  Vector3,
} from "three";
import { TILE_SIZE, TileWithTexture } from "../Background";
import useGlobalStore from "../../../store";
import { FieldData } from "../../Field";

const BLENDS = {
  1: AdditiveBlending,
  2: SubtractiveBlending,
  3: AdditiveBlending, // "+25%"
  4: NoBlending,
  0: NormalBlending // Default to normal blending for unknowns
};


function getPlaneScaleToFillFrustum(
  plane: Mesh<PlaneGeometry, Material | Material[]>,
  camera: PerspectiveCamera,
  planeWidth: number = 320,
  planeHeight: number = 224
): { x: number; y: number } {
  // Get the world positions of the camera and the plane
  const cameraWorldPosition = new Vector3();
  camera.getWorldPosition(cameraWorldPosition);

  const planeWorldPosition = new Vector3();
  plane.getWorldPosition(planeWorldPosition);

  // Compute the distance from the camera to the plane along the camera's view direction
  const viewDirection = new Vector3();
  camera.getWorldDirection(viewDirection);

  const distance = planeWorldPosition.clone().sub(cameraWorldPosition).dot(viewDirection);
  // If the plane is behind the camera, return zeros or handle as needed
  if (distance <= 0) {
    console.warn('Plane is behind the camera.');
    return { x: 0, y: 0 };
  }

  // Convert the camera's field of view from degrees to radians
  const fovInRadians = MathUtils.degToRad(camera.fov);

  // Calculate the height and width of the frustum at the distance
  const frustumHeight = 2 * distance * Math.tan(fovInRadians / 2);
  const frustumWidth = frustumHeight * camera.aspect;

  // Calculate the scale factors needed to match the frustum dimensions
  const scaleX = frustumWidth / planeWidth;
  const scaleY = frustumHeight / planeHeight;

  // Return the scale factors
  return { x: scaleX, y: scaleY };
}


type LayerProps = {
  backgroundDetails: FieldData['backgroundDetails']
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  tiles: TileWithTexture[];
};

const Layer = ({ backgroundPanRef, backgroundDetails, tiles }: LayerProps) => {
  const layerRef = useRef<Mesh<PlaneGeometry>>(null);

  const {layerWidth, layerHeight} = useMemo(() => {
    const roundedWidth = Math.round(backgroundDetails.width / TILE_SIZE) * TILE_SIZE;
    const roundedHeight = Math.round(backgroundDetails.height / TILE_SIZE) * TILE_SIZE;
    return {layerWidth: roundedWidth, layerHeight: roundedHeight};
  }, [backgroundDetails.height, backgroundDetails.width]);

  const { isBlended, blendType, layerID } = tiles[0];

  const [line] = useState<Line3>(new Line3(new Vector3(), new Vector3()));
  const [point] = useState<Vector3>(new Vector3());
  useFrame(({camera}) => {
    if (!layerRef.current) {
      return;
    }

    const {initialTargetPosition, initialPosition} = camera.userData as {
      initialPosition: Vector3,
      initialTargetPosition: Vector3,
    }
    if (!initialPosition || !initialTargetPosition) {
      return;
    }
    line.start.copy(initialPosition);
    line.end.copy(initialTargetPosition);
    const length = line.distance();

    const direction = camera.getWorldDirection(new Vector3());
    line.start.copy(camera.getWorldPosition(new Vector3()));
    line.end.copy(line.start).add(direction.multiplyScalar(length));
    layerRef.current.quaternion.copy(camera.quaternion);

    line.at(parseInt(`${layerID}${tiles[0].Z}`) / 1000, point);

    layerRef.current.position.copy(point);

    layerRef.current.rotation.setFromQuaternion(camera.quaternion);
    const scale = getPlaneScaleToFillFrustum(layerRef.current, camera as PerspectiveCamera);
    layerRef.current.scale.set(scale.x * 1.05, scale.y * 1.15, 1)
   })
   
   const isLayerVisible = useGlobalStore((storeState) => {
    const {layerID, parameter, state} = tiles[0];
    
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
  const canvasTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = layerWidth;
    canvas.height = layerHeight;
    canvas.style.imageRendering = "pixelated";
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      return null;
    }

    context.imageSmoothingEnabled = false;

    const texture = new CanvasTexture(canvas);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.premultiplyAlpha = false;
    
    return texture;
  }, [layerHeight, layerWidth]);

  useFrame(() => {
    if (!canvasTexture || !isLayerVisible) {
      return;
    }
    const canvas = canvasTexture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const panX = Math.round(backgroundPanRef.current.panX);
    const panY = Math.round(backgroundPanRef.current.panY);
    tiles.forEach(({ X, Y, texture }) => {
      context.drawImage(texture.image, X + (layerWidth / 2) + panX, Y + (layerHeight / 2) - panY);
    })

    canvasTexture.needsUpdate = true;
  });

  if (!isLayerVisible) {
    return null;
  }

  return (
    <Plane args={[layerWidth, layerHeight]} ref={layerRef}>
      <meshBasicMaterial
        blending={isBlended ? BLENDS[blendType as keyof typeof BLENDS] : NormalBlending}
        map={canvasTexture}
        side={DoubleSide}
        transparent
        />
    </Plane>
  )
}

export default Layer;