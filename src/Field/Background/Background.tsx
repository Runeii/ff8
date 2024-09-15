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
  backgroundDetails: FieldData["backgroundDetails"];
  tiles: FieldData["tiles"];
};

const Background = ({ backgroundPanRef, backgroundDetails, tiles }: BackgroundProps) => {
  const perspectiveCamera = useThree(({ camera }) => camera as PerspectiveCamera);
  const planesRef = useRef<Mesh>(null);
  const cameraRef = useRef<OrthographicCameraType>(null);

  const WIDTH = 320
  const HEIGHT = 224

  const [BGWIDTH, BGHEIGHT] = useMemo(() => {
    //Find the largest X and Y values in tiles, using Math.abs to handle negative values
    const maxX = Math.max(...tiles.map(tile => Math.abs(tile.X)));
    const maxY = Math.max(...tiles.map(tile => Math.abs(tile.Y)));
    return [maxX * 2, maxY * 2];
  },[tiles])

  useEffect(() => {
    backgroundPanRef.current.width = BGWIDTH;
    backgroundPanRef.current.height = BGHEIGHT;
  }, [BGWIDTH, BGHEIGHT, backgroundPanRef]);

  useFrame(() => {
    if (!cameraRef.current || !planesRef.current) {
      return;
    }
    
    const camera = cameraRef.current;

    const { rightVector, upVector } = getCameraDirections(camera);
    const normalizedX = backgroundPanRef.current.x / BGWIDTH;
    const startX = BGWIDTH / 2;
    const endX = 0 - startX;
    console.log(BGWIDTH, WIDTH)
    const movementDistanceX = lerp(endX, startX, normalizedX);

    const normalizedY = backgroundPanRef.current.y / BGHEIGHT;
    const startY = BGHEIGHT / 2;
    const endY = 0 - startY;

    const movementDistanceY = lerp(endY, startY, normalizedY);

    // Apply the movement to the plane's position
    planesRef.current.position.set(0,0,0)
    planesRef.current.position.addScaledVector(rightVector, movementDistanceX);    
    planesRef.current.position.addScaledVector(upVector, movementDistanceY);    

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