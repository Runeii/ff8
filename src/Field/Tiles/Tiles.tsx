import { Box3, Group, MathUtils, Object3D, PerspectiveCamera, TextureLoader, Vector3 } from "three";
import type { FieldData } from "../Field";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {  useMemo, useRef } from "react";
import Layer from "./Layer/Layer";
import { OrbitControls } from "@react-three/drei";
import { lerp } from "three/src/math/MathUtils.js";
import { getPositionToFitInView } from "./utils";


type TilesProps = {
  backgroundDetails: FieldData["backgroundDetails"];
  sceneBoundingBox: Box3;
  tiles: FieldData["tiles"];
};


// 16x16 tiles
const Tiles = ({ backgroundDetails, sceneBoundingBox, tiles }: TilesProps) => {
  const groupRef = useRef<Group>(null);

  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
  useFrame(({ camera }) => {
    if (!groupRef.current) {
      return;
    }

    const xScale = Math.max(backgroundDetails.width / 320, 1);
    const yScale = Math.max(backgroundDetails.height / 240, 1);

    const position = getPositionToFitInView(groupRef.current, camera as PerspectiveCamera, xScale, yScale);

    groupRef.current.position.copy(position);
   groupRef.current.quaternion.copy(camera.quaternion);
  });

  const groupedTiles = useMemo(() => {
     const groupedTiles: FieldData["tiles"][] = []
     tiles.forEach((tile) => {
       //4094: background
       //451: window light
       //432: right doorway
       //396: left window
       //395: random stuff
       //221: car
      //6: light aura
      if (tile.Z !== 432) {
       // return;
      }
       if (!groupedTiles[tile.Z]) {
         groupedTiles[tile.Z] = [];
       }
       groupedTiles[tile.Z].push(tile);
     });
     return groupedTiles
  }, [tiles]);

  return (
    <group ref={groupRef}>
      {groupedTiles.map((layerTiles) => (
        <Layer
          backgroundDetails={backgroundDetails}
          sceneBoundingBox={sceneBoundingBox}
          key={`${backgroundDetails.sprite}--${layerTiles[0].Z}`}
          tiles={layerTiles}
          texture={tilesTexture}
        />
      ))}
    </group>
  );
}

export default Tiles;