import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { CanvasTexture, ClampToEdgeWrapping, Mesh, NearestFilter, type OrthographicCamera as OrthographicCameraType, RGBAFormat, TextureLoader } from "three";
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
  const planesRef = useRef<Mesh>(null);
  const cameraRef = useRef<OrthographicCameraType>(null);

  const WIDTH = 320;
  const HEIGHT = 240;

  const visibleWidth = (WIDTH / backgroundDetails.width);
  const visibleHeight = (HEIGHT / backgroundDetails.height);

  const horizontalPan = (1 - visibleWidth) / 2;
  const verticalPan = (1 - visibleHeight) / 2;

  useFrame(() => {
    if (!planesRef.current) {
      return;
    }

    planesRef.current.position.x = (horizontalPan * backgroundPanRef.current.x) * -WIDTH;
    planesRef.current.position.y = (verticalPan * backgroundPanRef.current.y) * -HEIGHT;
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
      />
      <group ref={planesRef}>
        {groupedTiles.map((tiles) => (
          <Layer
            isAbove
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