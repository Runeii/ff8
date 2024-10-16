import { BufferGeometry, DoubleSide } from "three";
import { useEffect } from "react";
import useGlobalStore from "../../store";

type WalkMeshProps = {
  setHasPlacedWalkmesh: (value: boolean) => void;
  walkmesh: BufferGeometry[];
};

const WalkMesh = ({ setHasPlacedWalkmesh, walkmesh }: WalkMeshProps) => {

  useEffect(() => {
    setHasPlacedWalkmesh(true);
  }, [setHasPlacedWalkmesh]);

  return (
    <group name="walkmesh">
      {walkmesh.map((geometry, index) => (
        <mesh key={index} name="walkmesh-triangle" geometry={geometry} onClick={(e) => {
          useGlobalStore.setState({
            characterPosition: e.point
        })
        }} visible={import.meta.env.DEV}>
          <meshBasicMaterial color={"red"} transparent opacity={0.2} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;