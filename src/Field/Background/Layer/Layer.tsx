import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
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
import { TileWithTexture } from "../Background";
import useGlobalStore from "../../../store";
import { FieldData } from "../../Field";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../../constants/constants";

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
  planeWidth: number = SCREEN_WIDTH,
  planeHeight: number = SCREEN_HEIGHT
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
  tile: TileWithTexture;
};

const Layer = ({ backgroundPanRef, tile }: LayerProps) => {
  const layerRef = useRef<Mesh<PlaneGeometry>>(null);

  const { canvas, parameter, state, isBlended, blendType, layerID, layerRenderID } = tile;
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
    line.end.copy(line.start).add(direction.clone().multiplyScalar(length));

    layerRef.current.quaternion.copy(camera.quaternion);

    line.at(tile.Z / 1000, point);
  
    layerRef.current.position.copy(point);

    layerRef.current.rotation.setFromQuaternion(camera.quaternion);
    const scale = getPlaneScaleToFillFrustum(layerRef.current, camera as PerspectiveCamera);
    layerRef.current.scale.set(scale.x * 1, scale.y * 1, 1)
   })
   
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

  const [pannedCanvas] = useState(document.createElement('canvas'));
  const pannedTexture = useMemo(() => {
    const texture = new CanvasTexture(pannedCanvas);
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    return texture;
  }, [pannedCanvas]);

  const controlledScrolls = useGlobalStore(state => state.controlledScrolls)

  useFrame(() => {
    if (!layerRef.current) {
      return;
    }

    pannedCanvas.width = SCREEN_WIDTH;
    pannedCanvas.height = SCREEN_HEIGHT;

    const context = pannedCanvas.getContext('2d');
    if (!context) {
      console.error('Could not get 2D context from canvas');
      return;
    }


    const boundaries = backgroundPanRef.current.boundaries;

    const horizontalRange = boundaries.left - boundaries.right;
    const verticalRange = boundaries.top - boundaries.bottom;

    let panX = Math.round(backgroundPanRef.current.panX + boundaries.left);
    let panY = Math.round(-backgroundPanRef.current.panY + boundaries.top);

    const controlledScroll = controlledScrolls[layerRenderID]
    if (controlledScroll) {
      let xPos = backgroundPanRef.current.panX / horizontalRange;
      if (Number.isNaN(xPos)) {
        xPos = 0;
      }
      let yPos = backgroundPanRef.current.panY / verticalRange;
      if (Number.isNaN(yPos)) {
        yPos = 0;
      }

      panX = (boundaries.left + controlledScroll.x1) - (xPos * controlledScroll.x2);
      panY = (boundaries.top + controlledScroll.y1) - (yPos * controlledScroll.y2);
    }
    
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, pannedCanvas.width, pannedCanvas.height);
    context.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      panX,
      panY,
      canvas.width,
      canvas.height
    );

    pannedTexture.needsUpdate = true;
  })

  if (!isLayerVisible) {
    return null;
  }

  return (
    <Plane args={[SCREEN_WIDTH, SCREEN_HEIGHT]} ref={layerRef} renderOrder={16 - layerID}>
      <meshBasicMaterial
        blending={isBlended ? BLENDS[blendType as keyof typeof BLENDS] : NormalBlending}
        map={pannedTexture}
        side={DoubleSide}
        alphaTest={0.5}
        transparent
        />
    </Plane>
  )
}

export default Layer;