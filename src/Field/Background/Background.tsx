import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { CanvasTexture, ClampToEdgeWrapping, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, PerspectiveCamera, RGBAFormat, TextureLoader } from "three";
import type { FieldData } from "../Field";
import { OrthographicCamera, Plane } from "@react-three/drei";
import { MutableRefObject, useMemo, useRef, useState } from "react";
import Layer from "./Layer/Layer";


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

  const visibleWidth = (WIDTH / BGWIDTH);
  const visibleHeight = (HEIGHT / BGHEIGHT);

  const horizontalPan = ((1 - visibleWidth) / 2) * BGWIDTH;
  const verticalPan = ((1 - visibleHeight) / 2) * BGHEIGHT;

  useFrame(() => {
    if (!cameraRef.current) {
      return;
    }

    const offsetX = 0;
    const adjustmentX = backgroundPanRef.current.x * horizontalPan;

    const offsetY = 0;
    const adjustmentY = backgroundPanRef.current.y * verticalPan;

    //cameraRef.current.position.x = adjustmentX;
    //cameraRef.current.position.y = adjustmentY;

   // planesRef.current.position.x = (horizontalPan * backgroundPanRef.current.x) * -BGWIDTH;
   // planesRef.current.position.y = (verticalPan * backgroundPanRef.current.y) * -BGHEIGHT;

    window.debug['orthoX'] = `OrthoX centre: ${cameraRef.current.position.x + BGWIDTH / 2}`;
    window.debug['orthoY'] = `OrthoY centre: ${cameraRef.current.position.y + BGHEIGHT / 2}`;
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