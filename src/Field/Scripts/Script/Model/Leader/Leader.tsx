import { useFrame } from "@react-three/fiber";
import { ReactNode, useRef } from "react";
import { Box3, Group, Mesh, Vector3 } from "three";
import useGlobalStore from "../../../../../store";

type LeaderProps = {
  children: ReactNode;
}

const blankVector = new Vector3();

const Leader = ({children}: LeaderProps) => {
  const activeWalkmeshTrianglesRef = useRef<number[]>([]);
  useFrame(({scene}) => {
    return;
    
    const player = scene.getObjectByName('character') as Group;
    const walkmesh = scene.getObjectByName('walkmesh') as Group; 
    if (!player || !walkmesh) {
      return;
    }
  
    player.userData.groupBoundingBox = new Box3().setFromObject(player);
    
    const nowActiveWalkmeshTriangles: number[] = [];
    walkmesh.children.forEach((child) => {
      if (child instanceof Mesh) {
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox();
        }

        if (player.userData.groupBoundingBox?.intersectsBox(child.geometry.boundingBox)) {
          nowActiveWalkmeshTriangles.push(parseInt(child.name));
        }
      }
    });
    
    if (nowActiveWalkmeshTriangles.join() !== activeWalkmeshTrianglesRef.current.join()) {
      useGlobalStore.setState(state => ({
        congaWaypointHistory: [
          player.getWorldPosition(blankVector).clone(),
          ...state.congaWaypointHistory,
        ]
      }));
    }
    activeWalkmeshTrianglesRef.current = nowActiveWalkmeshTriangles
  })
  return children;
}

export default Leader;