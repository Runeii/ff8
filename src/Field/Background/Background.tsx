import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { ClampToEdgeWrapping, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, PerspectiveCamera, RGBAFormat, TextureLoader, Vector3 } from "three";
import type { FieldData } from "../Field";
import { OrthographicCamera } from "@react-three/drei";
import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import Layer from "./Layer/Layer";
import { lerp } from "three/src/math/MathUtils.js";
import { getCameraDirections } from "../../utils";


type BackgroundProps = {
  backgroundPanRef: MutableRefObject<{ x: number, y: number }>;
  data: FieldData;
};

const Background = ({ backgroundPanRef, data }: BackgroundProps) => {
  const { backgroundDetails, limits, tiles } = data;

  const perspectiveCamera = useThree(({ camera }) => camera as PerspectiveCamera);
  const planesRef = useRef<Mesh>(null);
  const cameraRef = useRef<OrthographicCameraType>(null);

  const WIDTH = 320
  const HEIGHT = 224

  useFrame(() => {
    if (!cameraRef.current || !planesRef.current) {
      return;
    }
    
    const camera = cameraRef.current;

    const { rightVector, upVector } = getCameraDirections(camera);

    planesRef.current.position.set(0,0,0)
    planesRef.current.position.x = backgroundPanRef.current.x;
    planesRef.current.position.y = backgroundPanRef.current.y;
  });

  const groupedTiles = useMemo(() => {
    const groupedTiles: FieldData["tiles"][] = []
    tiles.forEach((tile) => {
      if (!groupedTiles[tile.Z]) {
        groupedTiles[tile.Z] = [];
      }
      groupedTiles[tile.Z].push(tile);
    });
    return groupedTiles
  }, [tiles]);

  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
  tilesTexture.format = RGBAFormat;
  tilesTexture.wrapS = ClampToEdgeWrapping;
  tilesTexture.wrapT = ClampToEdgeWrapping;
  tilesTexture.magFilter = NearestFilter;
  tilesTexture.minFilter = NearestFilter;

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
        near={perspectiveCamera.near}
        far={perspectiveCamera.far}
      />
      <group ref={planesRef}>
        {groupedTiles.map((tiles) => (
          <Layer
            key={tiles[0].Z}
            tiles={tiles}
            tilesTexture={tilesTexture}
          />
        ))}
      </group>
    </>
  );
}

export default Background;