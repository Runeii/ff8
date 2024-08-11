import type { FieldData } from "../Field";
import { BufferAttribute, BufferGeometry, DoubleSide, Vector3 } from "three";
import { useMemo } from "react";
import { vectorToFloatingPoint } from "../../utils";

type WalkMeshProps = {
  setCharacterPosition: (position: Vector3) => void;
  walkmesh: FieldData["walkmesh"];
};

const WalkMesh = ({ setCharacterPosition, walkmesh }: WalkMeshProps) => {
  const meshGeometry = useMemo(() => {
    const geometries = walkmesh.flat().map(triangle => {
      const geometry = new BufferGeometry();
      const vertices = new Float32Array([
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[1]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[2]).toArray(),
        ...vectorToFloatingPoint(triangle.vertices[0]).toArray(),
      ]);
      // Set the vertices attribute in the geometry
      geometry.setAttribute('position', new BufferAttribute(vertices, 3));
      
      // Optionally, compute normals for lighting (useful for shaded rendering)
      geometry.computeVertexNormals();
      
      return geometry;
    });

    return geometries;
  }, [walkmesh]);

  return (
    <group name="walkmesh">
      {meshGeometry.map((geometry, index) => (
        <mesh key={index} name="walkmesh-triangle" geometry={geometry} onClick={(e) => {
          setCharacterPosition(e.point)
        }}>
          <meshBasicMaterial wireframe color={0x0000ff}transparent opacity={0.5}side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;