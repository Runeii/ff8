import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Box3, ClampToEdgeWrapping, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, PerspectiveCamera, RGBAFormat, TextureLoader, Vector3 } from "three";
import type { FieldData } from "../Field";
import { OrthographicCamera } from "@react-three/drei";
import { MutableRefObject, useMemo, useRef } from "react";
import Layer from "./Layer/Layer";

type BackgroundProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData;
};

const Background = ({ backgroundPanRef, data }: BackgroundProps) => {
  const { backgroundDetails, tiles } = data;

  const { camera } = useThree();
  const perspectiveCamera = useThree(({ camera }) => camera as PerspectiveCamera);
  const cameraRef = useRef<OrthographicCameraType>(null);

  const WIDTH = 320
  const HEIGHT = 224

  const groupedTiles = useMemo(() => {
    const groupedTiles: FieldData["tiles"][] = []
    tiles.forEach((tile) => {
      if (!groupedTiles[tile.Z]) {
        groupedTiles[tile.Z] = [];
      }
      groupedTiles[tile.Z].push(tile);
    });
    return Object.values(groupedTiles).reverse();
  }, [tiles]);

  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
  tilesTexture.format = RGBAFormat;
  tilesTexture.wrapS = ClampToEdgeWrapping;
  tilesTexture.wrapT = ClampToEdgeWrapping;
  tilesTexture.magFilter = NearestFilter;
  tilesTexture.minFilter = NearestFilter;

  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Mesh);
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const walkmeshMaxDepth = useMemo(() => {
    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);

    if (!walkmesh) {
      console.warn('No walkmesh found');
      return 0;
    }

    const boundingBox = new Box3();
    boundingBox.setFromObject(walkmesh);

    if (!boundingBox) {
      console.warn('No bounding box found for walkmesh');
        return 0;
    }

    // Define the eight corners of the bounding box
    const corners = [
        new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z),
        new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z),
        new Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z),
        new Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z),
        new Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z),
        new Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z),
        new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z),
        new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z),
    ];

    // Transform corners to world space
    corners.forEach(corner => corner.applyMatrix4(walkmesh.matrixWorld));

    // Compute maxDepth using the corners
    let maxDepth = 0;
    corners.forEach(corner => {
        const cameraToCorner = new Vector3().subVectors(corner, perspectiveCamera.position);
        const depth = cameraToCorner.dot(cameraDirection);
        if (depth > maxDepth) {
            maxDepth = depth;
        }
        console.log(corner, depth)
    });

    return maxDepth;
  }, [camera, perspectiveCamera.position, walkmesh]);

  const playerDepthRef = useRef<number>(0);

  useFrame(() => {
    if (!player) {
      return;
    }

    const playerWorldPosition = new Vector3();
    player.getWorldPosition(playerWorldPosition);

    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    const vectorToPlayer = new Vector3();
    vectorToPlayer.subVectors(playerWorldPosition, camera.position);

    playerDepthRef.current = vectorToPlayer.dot(cameraDirection) / walkmeshMaxDepth;
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        name="orthoCamera"
        position={[0, 0, 0]}
        zoom={1}
        left={-WIDTH / 2}
        right={WIDTH / 2}
        top={HEIGHT / 2}
        bottom={-HEIGHT / 2}
        near={0}
        far={4096}
      />
      {groupedTiles.map((tiles) => (
        <Layer
          backgroundPanRef={backgroundPanRef}
          cameraZoom={data.cameras[0].camera_zoom}
          key={tiles[0].Z}
          playerDepthRef={playerDepthRef}
          tiles={tiles}
          tilesTexture={tilesTexture}
        />
      ))}
    </>
  );
}

export default Background;