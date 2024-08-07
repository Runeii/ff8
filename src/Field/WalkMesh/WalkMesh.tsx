import { Line } from "@react-three/drei";
import type { FieldData } from "../Field";
import { BufferAttribute, BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, ShapeUtils, Vector3 } from "three";
import { useMemo } from "react";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

type WalkMeshProps = {
  walkmesh: FieldData["walkmesh"];
};

const WalkMesh = ({ setCharacterPosition, walkmesh }: WalkMeshProps) => {
  const meshGeometry = useMemo(() => {
    const geometries = walkmesh.flat().map(triangle => {
      const geometry = new BufferGeometry();
      const vertices = new Float32Array([
        triangle.vertices[0].x, triangle.vertices[0].y, triangle.vertices[0].z,
        triangle.vertices[1].x, triangle.vertices[1].y, triangle.vertices[1].z,
        triangle.vertices[2].x, triangle.vertices[2].y, triangle.vertices[2].z,
        triangle.vertices[0].x, triangle.vertices[0].y, triangle.vertices[0].z,
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
    <group name="walkmesh" renderOrder={2}>
      {meshGeometry.map((geometry, index) => (
        <mesh key={index} name="walkmesh-triangle" geometry={geometry} onClick={(e) => {
          setCharacterPosition(e.point)
          console.log(e)
        }}>
          <meshBasicMaterial wireframe color={0x0000ff}transparent opacity={0.5}side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

export default WalkMesh;