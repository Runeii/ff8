import { BufferAttribute, BufferGeometry, DoubleSide } from "three";
import { useEffect, useMemo } from "react";
import useGlobalStore from "../../store";
import { FieldData } from "../Field";
import { vectorToFloatingPoint } from "../../utils";

type WalkMeshProps = {
  setHasPlacedWalkmesh: (value: boolean) => void;
  walkmesh: FieldData['walkmesh'];
};

const WalkMesh = ({ setHasPlacedWalkmesh, walkmesh }: WalkMeshProps) => {
  const walkMeshGeometry = useMemo(() => {
    const geometries = walkmesh.map(triangle => {
      const geometry = new BufferGeometry();
      const vertices = new Float32Array([
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[1]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[2]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
      ]);

      geometry.setAttribute('position', new BufferAttribute(vertices, 3));      
      geometry.computeVertexNormals();
      
      return geometry;
    });

    return geometries;
  }, [walkmesh]);

  useEffect(() => {
    setHasPlacedWalkmesh(true);
  }, [setHasPlacedWalkmesh]);

  return (
    <group name="walkmesh">
      {walkMeshGeometry.map((geometry, index) => (
        <mesh key={index} name={`${index}`} geometry={geometry} onClick={(e) => {
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