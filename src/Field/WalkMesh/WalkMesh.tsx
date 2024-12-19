import { BufferAttribute, BufferGeometry, DoubleSide } from "three";
import {  useMemo } from "react";
import useGlobalStore from "../../store";
import { FieldData } from "../Field";
import { vectorToFloatingPoint } from "../../utils";
import { ThreeEvent } from "@react-three/fiber";

type WalkMeshProps = {
  walkmesh: FieldData['walkmesh'];
};

const WalkMesh = ({ walkmesh }: WalkMeshProps) => {
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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    useGlobalStore.setState({
      characterPosition: e.point
    });
  }

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <group name="walkmesh">
      {walkMeshGeometry.map((geometry, index) => (
        <mesh key={index} name={`${index}`} geometry={geometry} onClick={handleClick} visible={isDebugMode}>
          <meshBasicMaterial color={"red"} transparent opacity={0.2} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;