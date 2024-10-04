import { BufferGeometry, Mesh, Raycaster, Vector3 } from "three";
import { FormattedGateway } from "./Gateways";
import { clamp } from "three/src/math/MathUtils.js";

const raycaster = new Raycaster();
let direction = new Vector3()

export const adjustSourceLineZOffset = (sourceLine: Vector3[], height: number) => {
  sourceLine[0].z += height;
  sourceLine[1].z += height;

  return sourceLine;
}
export const checkForIntersection = (player: Mesh, gateway: FormattedGateway) => {
  const [lineStart, lineEnd] = gateway.sourceLine;
  direction.set(0, 0, 0);
  direction = direction.subVectors(lineEnd, lineStart).normalize();
  const length = lineStart.distanceTo(lineEnd);

  raycaster.set(lineStart, direction);
  raycaster.far = length;
  raycaster.near = 0;

  const intersects = raycaster.intersectObject(player, true);

  return intersects.length > 0
}

// Utility function to compute the closest point on an edge to a specific point
const getClosestPointOnEdge = (edgeStart: Vector3, edgeEnd: Vector3, point: Vector3): Vector3 => {
  const edgeDir = edgeEnd.clone().sub(edgeStart);
  const edgeLengthSquared = edgeDir.lengthSq();

  // Parametric t value along the edge
  let t = edgeDir.dot(point.clone().sub(edgeStart)) / edgeLengthSquared;
  t = clamp(t, 0, 1);

  return edgeStart.clone().add(edgeDir.multiplyScalar(t));
};

// Utility function to extract edges from a triangular mesh
const getMeshEdges = (walkmesh: BufferGeometry[]): { start: Vector3; end: Vector3 }[] => {
  const triangles = walkmesh.map((geometry) => geometry.attributes.position.array);
  const edges: { start: Vector3; end: Vector3 }[] = [];
  for (let j = 0; j < triangles.length; j++) {
    const vertices = triangles[j];
    let i = 0;
    const v1 = new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
    const v2 = new Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
    const v3 = new Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);
    edges.push({ start: v1, end: v2 }, { start: v2, end: v3 }, { start: v3, end: v1 });

  }

  return edges;
};

// TODO: tidy this lot up

// Compute the closest points between two edges
const getClosestPointsBetweenEdges = (
  edge1Start: Vector3,
  edge1End: Vector3,
  edge2Start: Vector3,
  edge2End: Vector3
) => {
  const edge1Dir = edge1End.clone().sub(edge1Start);
  const edge2Dir = edge2End.clone().sub(edge2Start);
  const diffStart = edge1Start.clone().sub(edge2Start);

  const a = edge1Dir.dot(edge1Dir);
  const b = edge1Dir.dot(edge2Dir);
  const c = edge2Dir.dot(edge2Dir);
  const d = edge1Dir.dot(diffStart);
  const e = edge2Dir.dot(diffStart);

  const denominator = a * c - b * b;

  const s = clamp((b * e - c * d) / denominator, 0, 1);
  const t = clamp((a * e - b * d) / denominator, 0, 1);

  const pointOnEdge1 = edge1Start.clone().add(edge1Dir.multiplyScalar(s));
  const pointOnEdge2 = edge2Start.clone().add(edge2Dir.multiplyScalar(t));

  // Step 1: Calculate the direction vector between the two points
  const direction = new Vector3().subVectors(pointOnEdge1, pointOnEdge2);

  // Step 2: Normalize the direction vector (to get the unit vector along the line)
  const directionNormalized = direction.clone().normalize();

  // Step 3: Move pointA in the negative direction and pointB in the positive direction
  // Scale the direction vector by half of `y` because both points will move
  const distance = pointOnEdge1.distanceTo(pointOnEdge2);
  const offset = directionNormalized.clone().multiplyScalar(distance);

  // New positions
  const expandedPointA = pointOnEdge1.clone().sub(offset.multiplyScalar(2));  // Move pointA backwards along the line
  const expandedPointB = pointOnEdge2.clone().add(offset.multiplyScalar(2));

  return [expandedPointA, expandedPointB];
};

// Find the closest two edges for a given point on the mesh and return the shortest line between them
export const findShortestLineForPointOnMesh = (
  walkmesh: BufferGeometry[],
  pointOnMesh: Vector3
) => {
  const edges = getMeshEdges(walkmesh);

  // Step 1: Find the closest edge to the point on the mesh
  const closestEdge = edges.reduce(
    (closest, edge) => {
      const closestPoint = getClosestPointOnEdge(edge.start, edge.end, pointOnMesh);
      const distance = closestPoint.distanceTo(pointOnMesh);

      return distance < closest.distance
        ? { edge, closestPoint, distance }
        : closest;
    },
    { edge: { start: new Vector3(), end: new Vector3() }, closestPoint: new Vector3(), distance: Infinity }
  );

  // Step 2: Find the second closest edge, excluding the closest one
  const secondClosestEdge = edges.reduce(
    (secondClosest, edge) => {
      if (edge.start.equals(closestEdge.edge.start) || edge.start.equals(closestEdge.edge.end) || edge.end.equals(closestEdge.edge.start) || edge.end.equals(closestEdge.edge.end)) {
        return secondClosest;
      }

      const closestPoint = getClosestPointOnEdge(edge.start, edge.end, pointOnMesh);

      if (closestPoint.equals(closestEdge.closestPoint)) {
        return secondClosest;
      }
      const distance = closestPoint.distanceTo(closestEdge.closestPoint);

      return distance < secondClosest.distance
        ? { edge, closestPoint, distance }
        : secondClosest;
    },
    { edge: { start: new Vector3(), end: new Vector3() }, closestPoint: new Vector3(), distance: Infinity }
  );

  // Step 3: Calculate the shortest line between the two closest edges
  return getClosestPointsBetweenEdges(
    closestEdge.edge.start,
    closestEdge.edge.end,
    secondClosestEdge.edge.start,
    secondClosestEdge.edge.end
  );
};
