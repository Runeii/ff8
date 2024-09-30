import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { ClampToEdgeWrapping, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, RGBAFormat, TextureLoader, Vector3 } from "three";
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

  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const playerDepthRef = useRef<number>(0);

  useFrame(() => {
    if (!player) {
      return;
    }

    const toTarget = new Vector3();
    toTarget.subVectors(player.position, camera.position);
    const distanceInDirection = toTarget.dot(camera.userData.initialDirection);
    playerDepthRef.current = distanceInDirection;
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