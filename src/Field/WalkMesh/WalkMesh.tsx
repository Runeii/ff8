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
        }}>
          <meshBasicMaterial color={0x0000ff}transparent opacity={import.meta.env.DEV ? 0.2 : 0}side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;