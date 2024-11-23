import { Box, Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
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
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SubtractiveBlending,
  Vector3,
} from "three";
import { TILE_SIZE, TileWithTexture } from "../Background";
import useGlobalStore from "../../../store";
import { FieldData } from "../../Field";

type LayerProps = {
  backgroundDetails: FieldData['backgroundDetails']
  backgroundPanRef: React.MutableRefObject<CameraPanAngle>;
  cameraZoom: number;
  tiles: TileWithTexture[];
};

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
  planeHeight: number = 240
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

const Layer = ({ backgroundPanRef, backgroundDetails, tiles }: LayerProps) => {
  const layerRef = useRef<Mesh<PlaneGeometry>>();

  const {layerWidth, layerHeight} = useMemo(() => {
    const roundedWidth = Math.round(backgroundDetails.width / TILE_SIZE) * TILE_SIZE;
    const roundedHeight = Math.round(backgroundDetails.height / TILE_SIZE) * TILE_SIZE;
    return {layerWidth: roundedWidth, layerHeight: roundedHeight};
  }, [backgroundDetails.height, backgroundDetails.width]);

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
  
    line.start.copy(initialPosition);
    line.end.copy(initialTargetPosition);
    const length = line.distance();

    const direction = camera.getWorldDirection(new Vector3());
    line.start.copy(camera.getWorldPosition(new Vector3()));
    line.end.copy(line.start).add(direction.multiplyScalar(length));
    layerRef.current.quaternion.copy(camera.quaternion);

    line.at(tiles[0].Z / 1000, point);

    layerRef.current.position.copy(point);

    layerRef.current.rotation.setFromQuaternion(camera.quaternion);
    const scale = getPlaneScaleToFillFrustum(layerRef.current, camera as PerspectiveCamera);
    layerRef.current.scale.set(scale.x * 1.05, scale.y * 1.05, 1)
   })


   const isLayerVisible = useGlobalStore((state) => state.backgroundLayerVisibility[tiles[0].layerID] !== false);
   const currentParameterStates = useGlobalStore((state) => state.currentParameterStates);
   const currentParameterVisibility = useGlobalStore((state) => state.currentParameterVisibility);

  const canvasTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = layerWidth;
    canvas.height = layerHeight;
    canvas.style.imageRendering = "pixelated";
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.imageSmoothingEnabled = false;

    const texture = new CanvasTexture(canvas);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    
    return texture;
  }, [layerHeight, layerWidth]);

  useFrame(() => {
    if (!canvasTexture) {
      return;
    }
    const canvas = canvasTexture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    const panX = Math.round(backgroundPanRef.current.panX);
    const panY = Math.round(backgroundPanRef.current.panY);
    tiles.forEach(({ X, Y, parameter, state, texture }) => {
      let isVisible = true;
  
      if (currentParameterStates[parameter] !== undefined && currentParameterStates[parameter] !== state) {
        isVisible = false;
      } else if (currentParameterVisibility[parameter] === false) {
        isVisible = false;
      }

      if (currentParameterStates[parameter] === state) {
        isVisible = true;
      }
    
      if (!isVisible) {
        return;
      }

      context.drawImage(texture.image, X + (layerWidth / 2) + panX, Y + (layerHeight / 2) - panY);
    })
    canvasTexture.needsUpdate = true;
  });

  const { isBlended, blendType } = tiles[0];

  if (!isLayerVisible) {
    return null;
  }

  return (
    <Plane args={[layerWidth, layerHeight]} position={[0,0,tiles[0].Z / 1000]} ref={layerRef} >
      <meshBasicMaterial
        blending={isBlended ? BLENDS[blendType as keyof typeof BLENDS] : NormalBlending}
        map={canvasTexture}
        opacity={blendType === 3 ? 0.25 : 1}
        side={DoubleSide}
        transparent 
      />
    </Plane>
  )
}

export default Layer;