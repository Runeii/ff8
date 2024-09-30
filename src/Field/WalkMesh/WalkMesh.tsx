import { BufferGeometry, DoubleSide, Vector3 } from "three";
import { useEffect } from "react";

type WalkMeshProps = {
  setCharacterPosition: (position: Vector3) => void;
  setHasPlacedWalkmesh: (value: boolean) => void;
  walkmesh: BufferGeometry[];
};

const WalkMesh = ({ setCharacterPosition, setHasPlacedWalkmesh, walkmesh }: WalkMeshProps) => {
  useEffect(() => {
    setHasPlacedWalkmesh(true);
  }, [setHasPlacedWalkmesh]);

  return (
    <group name="walkmesh">
      {walkmesh.map((geometry, index) => (
        <mesh key={index} name="walkmesh-triangle" geometry={geometry} onClick={(e) => {
          setCharacterPosition(e.point)
        }}>
          <meshBasicMaterial color={0x0000ff}transparent opacity={0.2}side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;