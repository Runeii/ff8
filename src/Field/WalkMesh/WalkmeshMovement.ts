import { BufferGeometry, Mesh, Object3D, Triangle, Vector3 } from "three";
import useGlobalStore from "../../store";

interface TriangleNode {
  id: number;
  triangle: Triangle;
  neighbors: number[];
}

interface PathNode {
  triangleId: number;
  f: number; // f = g + h (total cost)
  g: number; // cost from start
  h: number; // heuristic cost to end
  parent: PathNode | null;
  entryPoint?: Vector3; // Point where we entered this triangle
}

class WalkmeshMovementController {
  private walkmesh: Object3D;
  private triangleCache = new Map<number, Triangle>();
  private triangleGraph = new Map<number, TriangleNode>();
  private triangleCenters = new Map<number, Vector3>();

  constructor(walkmesh: Object3D) {
    this.walkmesh = walkmesh;
    this.buildTriangleCache();
    this.buildTriangleGraph();
    this.buildTriangleCenters();
  }

  private buildTriangleCache() {
    this.walkmesh.traverse((child) => {
      if (child instanceof Mesh && child.geometry instanceof BufferGeometry) {
        const geometry = child.geometry;
        const positionAttribute = geometry.attributes.position;
        const triangleId = parseInt(child.name);

        if (!positionAttribute || isNaN(triangleId)) {
          return;
        }

        if (positionAttribute.count >= 3) {
          const a = new Vector3().fromBufferAttribute(positionAttribute, 0).applyMatrix4(child.matrixWorld);
          const b = new Vector3().fromBufferAttribute(positionAttribute, 1).applyMatrix4(child.matrixWorld);
          const c = new Vector3().fromBufferAttribute(positionAttribute, 2).applyMatrix4(child.matrixWorld);
          this.triangleCache.set(triangleId, new Triangle(a, b, c));
        }
      }
    });
  }

  private buildTriangleGraph() {
    // Build adjacency graph for triangles
    for (const [id, triangle] of this.triangleCache.entries()) {
      const neighbors: number[] = [];

      // Find neighboring triangles (sharing at least one edge)
      for (const [otherId, otherTriangle] of this.triangleCache.entries()) {
        if (id === otherId) continue;

        const shareEdge = this.trianglesShareEdge(triangle, otherTriangle);
        const intersect = this.trianglesIntersect(triangle, otherTriangle);

        if (shareEdge || intersect) {
          neighbors.push(otherId);
        }
      }

      this.triangleGraph.set(id, {
        id,
        triangle,
        neighbors
      });
    }
  }

  private buildTriangleCenters() {
    // Pre-calculate and cache all triangle centers for performance
    for (const [triangleId, triangle] of this.triangleCache.entries()) {
      const center = new Vector3();
      center.addVectors(triangle.a, triangle.b);
      center.add(triangle.c);
      center.divideScalar(3);
      this.triangleCenters.set(triangleId, center);
    }
  }

  private trianglesShareEdge(t1: Triangle, t2: Triangle): boolean {
    const tolerance = 0.001;

    // Get vertices of both triangles
    const t1Verts = [t1.a, t1.b, t1.c];
    const t2Verts = [t2.a, t2.b, t2.c];

    // Count shared vertices
    let sharedCount = 0;
    for (const v1 of t1Verts) {
      for (const v2 of t2Verts) {
        if (v1.distanceTo(v2) < tolerance) {
          sharedCount++;
          break;
        }
      }
    }

    // Triangles share an edge if they have exactly 2 shared vertices
    return sharedCount === 2;
  }

  private trianglesIntersect(triangle1: Triangle, triangle2: Triangle): boolean {
    const vertices1 = [triangle1.a, triangle1.b, triangle1.c];
    const vertices2 = [triangle2.a, triangle2.b, triangle2.c];

    for (const vertex of vertices1) {
      if (this.isPointInTriangle(vertex, triangle2)) {
        return true;
      }
    }

    for (const vertex of vertices2) {
      if (this.isPointInTriangle(vertex, triangle1)) {
        return true;
      }
    }

    return false;
  }

  public getTriangleCentre(triangleId: number): Vector3 {
    const cachedCenter = this.triangleCenters.get(triangleId);
    if (cachedCenter) {
      return cachedCenter.clone(); // Return a clone to prevent modification
    }

    console.error(`Triangle ID ${triangleId} not found in walkmesh.`);
    return new Vector3();
  }

  public getTriangleForPosition(position: Vector3, permittedIds?: number[], isAllowedToCrossBlockedTriangles = false): number | null {
    const triangles = permittedIds
      ? permittedIds.map(id => [id, this.triangleCache.get(id)]).filter(([, t]) => t !== undefined) as [number, Triangle][]
      : this.triangleCache.entries();

    const blockedTriangles = useGlobalStore.getState().lockedTriangles;

    // Collect all triangles that contain the X/Y position
    const candidateTriangles: Array<{
      id: number;
      triangle: Triangle;
      zDistance: number;
    }> = [];

    for (const [triangleId, triangle] of triangles) {
      if (blockedTriangles.includes(triangleId) && !isAllowedToCrossBlockedTriangles) {
        continue;
      }

      if (this.isPointInTriangle(position, triangle)) {
        // Calculate the Z distance from the position to the triangle's surface
        const triangleZ = this.getTriangleZAtPosition(position, triangle);
        const zDistance = Math.abs(position.z - triangleZ);

        candidateTriangles.push({
          id: triangleId,
          triangle: triangle,
          zDistance: zDistance
        });
      }
    }

    // If no triangles found, return null
    if (candidateTriangles.length === 0) {
      return null;
    }

    // Sort by Z distance (closest first) and return the nearest triangle
    candidateTriangles.sort((a, b) => a.zDistance - b.zDistance);
    return candidateTriangles[0].id;
  }

  /**
   * Calculate the Z coordinate on a triangle's surface at a given X/Y position
   * Uses barycentric coordinates to interpolate the Z value
   */
  private getTriangleZAtPosition(position: Vector3, triangle: Triangle): number {
    // Calculate barycentric coordinates in X/Y plane
    const v0x = triangle.c.x - triangle.a.x;
    const v0y = triangle.c.y - triangle.a.y;
    const v1x = triangle.b.x - triangle.a.x;
    const v1y = triangle.b.y - triangle.a.y;
    const v2x = position.x - triangle.a.x;
    const v2y = position.y - triangle.a.y;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    const w = 1 - u - v;

    // Interpolate Z using barycentric coordinates
    return w * triangle.a.z + v * triangle.b.z + u * triangle.c.z;
  }

  public getPositionOnTriangle(position: Vector3, triangleId: number): Vector3 | null {
    const triangle = this.triangleCache.get(triangleId);
    if (!triangle) {
      return null;
    }

    // Find the closest point on the triangle to the given position
    const closestPoint = new Vector3();
    triangle.closestPointToPoint(position, closestPoint);
    return closestPoint;
  }

  public getPositionOnWalkmesh(position: Vector3, targetTriangleId?: number, isAllowedToCrossBlockedTriangles = false): Vector3 | null {
    let permittedTriangleIds: number[] | undefined = undefined;
    if (targetTriangleId !== undefined) {
      const adjacent = this.getAdjacentTriangles(targetTriangleId);
      permittedTriangleIds = [targetTriangleId, ...adjacent];
    }
    const triangleId = this.getTriangleForPosition(position, permittedTriangleIds, isAllowedToCrossBlockedTriangles);
    if (triangleId === null) {
      return null;
    }
    return this.getPositionOnTriangle(position, triangleId);
  }

  public getAdjacentTriangles(triangleId: number): number[] {
    const triangleNode = this.triangleGraph.get(triangleId);
    if (!triangleNode) {
      console.warn(`Triangle ID ${triangleId} not found in triangle graph.`);
      return [];
    }

    return triangleNode.neighbors;
  }

  public findPath(start: Vector3, end: Vector3, isAllowedToCrossBlockedTriangles = false) {
    // Find start and end triangles
    const startTriangleId = this.getTriangleForPosition(start);
    const endTriangleId = this.getTriangleForPosition(end);

    if (startTriangleId === null || endTriangleId === null) {
      console.warn("Start or end position not on walkmesh");
      return null;
    }

    // If start and end are in the same triangle, return direct path
    if (startTriangleId === endTriangleId) {
      return [start.clone(), end.clone()];
    }

    // Find triangle path using A*
    const trianglePath = this.findTrianglePath(startTriangleId, endTriangleId, start, end, isAllowedToCrossBlockedTriangles);

    if (!trianglePath) {
      return null;
    }

    // Convert triangle path to smooth position path
    return this.smoothPath(trianglePath, start, end);
  }

  private findTrianglePath(startId: number, endId: number, startPos: Vector3, endPos: Vector3, isAllowedToCrossBlockedTriangles = false) {
    const openSet: PathNode[] = [];
    const closedSet = new Set<number>();

    // Initialize start node
    const startNode: PathNode = {
      triangleId: startId,
      g: 0,
      h: this.getTriangleCentre(startId).distanceTo(endPos),
      f: 0,
      parent: null,
      entryPoint: startPos
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const currentNode = openSet.shift()!;

      // Check if we reached the goal
      if (currentNode.triangleId === endId) {
        // Reconstruct path
        const path: number[] = [];
        let node: PathNode | null = currentNode;
        while (node) {
          path.unshift(node.triangleId);
          node = node.parent;
        }
        return path;
      }

      closedSet.add(currentNode.triangleId);

      // Check neighbors
      const nodeData = this.triangleGraph.get(currentNode.triangleId);
      if (!nodeData) continue;

      for (const neighborId of nodeData.neighbors) {
        if (closedSet.has(neighborId)) continue;
        if (this.isTriangleLocked(neighborId) && !isAllowedToCrossBlockedTriangles) continue;

        const neighborCenter = this.getTriangleCentre(neighborId);
        const tentativeG = currentNode.g +
          this.getTriangleCentre(currentNode.triangleId).distanceTo(neighborCenter);

        // Find existing node in open set
        let neighborNode = openSet.find(n => n.triangleId === neighborId);

        if (!neighborNode) {
          // Create new node
          neighborNode = {
            triangleId: neighborId,
            g: tentativeG,
            h: neighborCenter.distanceTo(endPos),
            f: 0,
            parent: currentNode
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          // Update existing node with better path
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = currentNode;
        }
      }
    }

    return null;
  }

  private smoothPath(trianglePath: number[], start: Vector3, end: Vector3): Vector3[] {
    if (trianglePath.length === 0) return [];

    const path: Vector3[] = [start.clone()];

    // If path has more than 2 triangles, try to create smooth waypoints
    if (trianglePath.length > 2) {
      for (let i = 1; i < trianglePath.length - 1; i++) {
        const currentTriangle = this.triangleCache.get(trianglePath[i]);
        const nextTriangle = this.triangleCache.get(trianglePath[i + 1]);

        if (currentTriangle && nextTriangle) {
          // Find the shared edge between current and next triangle
          const sharedEdge = this.getSharedEdge(currentTriangle, nextTriangle);

          if (sharedEdge) {
            // Create waypoint at midpoint of shared edge
            const waypoint = new Vector3()
              .addVectors(sharedEdge[0], sharedEdge[1])
              .multiplyScalar(0.5);

            // Check line of sight from last point to waypoint
            const lastPoint = path[path.length - 1];
            if (!this.hasLineOfSight(lastPoint, waypoint, trianglePath.slice(0, i + 2))) {
              // Add intermediate point if no line of sight
              const intermediatePoint = this.getTriangleCentre(trianglePath[i]);
              path.push(intermediatePoint);
            }

            path.push(waypoint);
          } else {
            // Fallback to triangle center if no shared edge found
            path.push(this.getTriangleCentre(trianglePath[i]));
          }
        }
      }
    }

    // Add end point
    path.push(end.clone());

    // Post-process: Remove unnecessary waypoints
    return this.optimizePath(path, trianglePath);
  }

  private getSharedEdge(t1: Triangle, t2: Triangle): [Vector3, Vector3] | null {
    const tolerance = 0.001;
    const t1Edges: [Vector3, Vector3][] = [
      [t1.a, t1.b],
      [t1.b, t1.c],
      [t1.c, t1.a]
    ];

    const t2Verts = [t2.a, t2.b, t2.c];

    for (const [v1, v2] of t1Edges) {
      let matches = 0;
      const sharedVerts: Vector3[] = [];

      for (const v of t2Verts) {
        if (v.distanceTo(v1) < tolerance) {
          matches++;
          sharedVerts.push(v1);
        } else if (v.distanceTo(v2) < tolerance) {
          matches++;
          sharedVerts.push(v2);
        }
      }

      if (matches === 2 && sharedVerts.length === 2) {
        return [sharedVerts[0], sharedVerts[1]];
      }
    }

    return null;
  }

  private hasLineOfSight(from: Vector3, to: Vector3, allowedTriangles: number[]): boolean {
    // Simple check: verify the line segment stays within allowed triangles
    const steps = 10;
    const delta = new Vector3().subVectors(to, from).divideScalar(steps);

    for (let i = 1; i < steps; i++) {
      const testPoint = new Vector3()
        .copy(from)
        .add(delta.clone().multiplyScalar(i));

      const triangleId = this.getTriangleForPosition(testPoint);
      if (triangleId === null || !allowedTriangles.includes(triangleId)) {
        return false;
      }
    }

    return true;
  }

  private optimizePath(path: Vector3[], trianglePath: number[]): Vector3[] {
    if (path.length <= 2) return path;

    const optimized: Vector3[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let farthest = current + 1;

      // Find the farthest point we can reach with line of sight
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i], trianglePath)) {
          farthest = i;
        }
      }

      optimized.push(path[farthest]);
      current = farthest;
    }

    return optimized;
  }


  private isPointInTriangle(point: Vector3, triangle: Triangle, tolerance = 0.001): boolean {
    // For Z-up coordinate system, we need to check if the point projection
    // onto the X-Y plane is within the triangle's X-Y projection

    const minX = Math.min(triangle.a.x, triangle.b.x, triangle.c.x);
    const maxX = Math.max(triangle.a.x, triangle.b.x, triangle.c.x);
    const minY = Math.min(triangle.a.y, triangle.b.y, triangle.c.y);
    const maxY = Math.max(triangle.a.y, triangle.b.y, triangle.c.y);

    if (point.x < minX - tolerance || point.x > maxX + tolerance ||
      point.y < minY - tolerance || point.y > maxY + tolerance) {
      return false;
    }

    const v0x = triangle.c.x - triangle.a.x;
    const v0y = triangle.c.y - triangle.a.y;
    const v1x = triangle.b.x - triangle.a.x;
    const v1y = triangle.b.y - triangle.a.y;
    const v2x = point.x - triangle.a.x;
    const v2y = point.y - triangle.a.y;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= -tolerance) && (v >= -tolerance) && (u + v <= 1 + tolerance);
  }

  private isTriangleLocked(triangleId: number): boolean {
    const { lockedTriangles } = useGlobalStore.getState();
    return lockedTriangles.includes(triangleId);
  }
  /**
   * Calculate the next position on the walkmesh based on current position and movement input
   * @param currentPosition - The current position on the walkmesh
   * @param moveDirection - Normalized direction vector of movement (in X-Y plane)
   * @param moveDistance - Distance to move
   * @param currentTriangleId - The triangle ID the player is currently on (optional, will be calculated if not provided)
   * @returns The new position on the walkmesh, or null if movement is blocked perpendicular to an edge
   */
  public getNextPositionOnWalkmesh(
    currentPosition: Vector3,
    moveDirection: Vector3,
    moveDistance: number,
    currentTriangleId?: number
  ): Vector3 {
    // Ensure move direction is normalized and on X-Y plane
    const normalizedDirection = moveDirection.clone().normalize();
    normalizedDirection.z = 0;

    // Get current triangle if not provided
    if (currentTriangleId === undefined) {
      const foundTriangleId = this.getTriangleForPosition(currentPosition)!;
      currentTriangleId = foundTriangleId;
    }

    // Calculate target position
    const targetPosition = currentPosition.clone().add(
      normalizedDirection.clone().multiplyScalar(moveDistance)
    );

    // Get two levels of adjacency for better navigation
    const adjacentTriangles = this.getAdjacentTriangles(currentTriangleId);

    const permittedTriangles = [currentTriangleId, ...adjacentTriangles];

    // Check if target position is in a permitted triangle
    const targetTriangleId = this.getTriangleForPosition(
      targetPosition,
      permittedTriangles,
      false // Not allowed to cross blocked triangles
    );

    // If target is valid, return it (adjusted to be on the triangle surface)
    if (targetTriangleId !== null) {
      const adjustedPosition = this.getPositionOnTriangle(targetPosition, targetTriangleId);
      return adjustedPosition || targetPosition;
    }

    // Target position is blocked or off walkmesh
    // Find the edge we're hitting
    const hitEdge = this.findHitEdge(
      currentPosition,
      targetPosition,
      currentTriangleId,
      adjacentTriangles
    );

    if (!hitEdge) {
      // No clear edge hit, return null
      return currentPosition.clone();
    }

    // Slide along the edge
    return this.slideAlongEdge(
      currentPosition,
      normalizedDirection,
      moveDistance,
      hitEdge,
      currentTriangleId,
      adjacentTriangles
    );
  }

  /**
   * Find the edge that blocks movement
   */
  private findHitEdge(
    currentPosition: Vector3,
    targetPosition: Vector3,
    currentTriangleId: number,
    adjacentTriangles: number[]
  ): { start: Vector3; end: Vector3; direction: Vector3 } | null {
    const currentTriangle = this.triangleCache.get(currentTriangleId);
    if (!currentTriangle) return null;

    const edges: [Vector3, Vector3][] = [
      [currentTriangle.a, currentTriangle.b],
      [currentTriangle.b, currentTriangle.c],
      [currentTriangle.c, currentTriangle.a]
    ];

    const blockedTriangles = useGlobalStore.getState().lockedTriangles;
    let closestBlockingEdge: { start: Vector3; end: Vector3; direction: Vector3; distance: number } | null = null;

    // Check each edge
    for (const [edgeStart, edgeEnd] of edges) {
      // Check if this edge is shared with an adjacent triangle
      let isBlockingEdge = false;

      // Edge is blocking if it's an outer edge (not shared with any adjacent)
      let hasAdjacentOnThisEdge = false;

      for (const adjacentId of adjacentTriangles) {
        const adjacentTriangle = this.triangleCache.get(adjacentId);
        if (!adjacentTriangle) continue;

        // Check if this edge is shared with the adjacent triangle
        if (this.isEdgeShared(edgeStart, edgeEnd, adjacentTriangle)) {
          hasAdjacentOnThisEdge = true;

          // If the adjacent triangle is blocked, this edge is blocking
          if (blockedTriangles.includes(adjacentId)) {
            isBlockingEdge = true;
            break;
          }
        }
      }

      // If no adjacent triangle shares this edge, it's a boundary edge
      if (!hasAdjacentOnThisEdge) {
        isBlockingEdge = true;
      }

      if (isBlockingEdge) {
        // Check if movement crosses OR goes outside the triangle near this edge
        const crossesEdge = this.doesMovementCrossEdge(currentPosition, targetPosition, edgeStart, edgeEnd);
        const isNearEdge = this.isTargetOutsideNearEdge(targetPosition, edgeStart, edgeEnd, currentTriangle);

        if (crossesEdge || isNearEdge) {
          // Calculate distance to edge for prioritization
          const edgeDistance = this.getDistanceToEdge(targetPosition, edgeStart, edgeEnd);

          // Keep track of the closest blocking edge
          if (!closestBlockingEdge || edgeDistance < closestBlockingEdge.distance) {
            const edgeDirection = new Vector3()
              .subVectors(edgeEnd, edgeStart)
              .normalize();
            edgeDirection.z = 0; // Keep on X-Y plane

            closestBlockingEdge = {
              start: edgeStart,
              end: edgeEnd,
              direction: edgeDirection,
              distance: edgeDistance
            };
          }
        }
      }
    }

    // Return the closest blocking edge (without the distance property)
    if (closestBlockingEdge) {
      return {
        start: closestBlockingEdge.start,
        end: closestBlockingEdge.end,
        direction: closestBlockingEdge.direction
      };
    }

    return null;
  }

  /**
   * Check if an edge is shared between a triangle edge and another triangle
   */
  private isEdgeShared(
    edgeStart: Vector3,
    edgeEnd: Vector3,
    triangle: Triangle
  ): boolean {
    const tolerance = 0.001;
    const triangleVerts = [triangle.a, triangle.b, triangle.c];

    let matchCount = 0;
    for (const vert of triangleVerts) {
      if (vert.distanceTo(edgeStart) < tolerance ||
        vert.distanceTo(edgeEnd) < tolerance) {
        matchCount++;
      }
    }

    return matchCount >= 2;
  }

  /**
   * Check if movement from current to target crosses an edge
   */
  private doesMovementCrossEdge(
    current: Vector3,
    target: Vector3,
    edgeStart: Vector3,
    edgeEnd: Vector3
  ): boolean {
    // 2D line intersection test in X-Y plane
    const x1 = current.x, y1 = current.y;
    const x2 = target.x, y2 = target.y;
    const x3 = edgeStart.x, y3 = edgeStart.y;
    const x4 = edgeEnd.x, y4 = edgeEnd.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /**
   * Slide movement along an edge
   */
  private slideAlongEdge(
    currentPosition: Vector3,
    moveDirection: Vector3,
    moveDistance: number,
    edge: { start: Vector3; end: Vector3; direction: Vector3 },
    currentTriangleId: number,
    adjacentTriangles: number[]
  ): Vector3 {
    // Project movement onto edge direction to get the component along the edge
    const dotProduct = moveDirection.dot(edge.direction);

    // If no sliding component (movement perpendicular to edge), stay in place
    if (Math.abs(dotProduct) < 0.001) {
      return currentPosition.clone();
    }

    // Use the full movement distance for sliding (preserving the distance the player wanted to move)
    const slideDirection = dotProduct > 0 ? edge.direction.clone() : edge.direction.clone().negate();

    // Calculate slide position using the full movement distance
    const slidePosition = currentPosition.clone().add(
      slideDirection.multiplyScalar(moveDistance)
    );

    // Ensure slide position stays within permitted triangles
    const permittedTriangles = [currentTriangleId, ...adjacentTriangles];
    const slideTriangleId = this.getTriangleForPosition(
      slidePosition,
      permittedTriangles,
      false
    );

    if (slideTriangleId !== null) {
      // Adjust to be on triangle surface
      const adjustedPosition = this.getPositionOnTriangle(slidePosition, slideTriangleId);
      return adjustedPosition || slidePosition;
    }

    // If full slide distance goes too far, find maximum valid slide distance
    const maxSlideDistance = this.findMaxSlideDistance(
      currentPosition,
      slideDirection,
      moveDistance,
      permittedTriangles
    );

    if (maxSlideDistance > 0) {
      const validSlidePosition = currentPosition.clone().add(
        slideDirection.multiplyScalar(maxSlideDistance)
      );

      const validTriangleId = this.getTriangleForPosition(
        validSlidePosition,
        permittedTriangles,
        false
      );

      if (validTriangleId !== null) {
        const adjustedPosition = this.getPositionOnTriangle(validSlidePosition, validTriangleId);
        return adjustedPosition || validSlidePosition;
      }
    }

    // Fallback: stay in current position
    return currentPosition.clone();
  }

  /**
   * Find the maximum distance we can slide along an edge while staying on valid triangles
   */
  private findMaxSlideDistance(
    currentPosition: Vector3,
    slideDirection: Vector3,
    maxDistance: number,
    permittedTriangles: number[]
  ): number {
    // Binary search for the maximum valid slide distance
    let low = 0;
    let high = maxDistance;
    let bestDistance = 0;

    // Use binary search with reasonable precision
    while (high - low > 0.01) {
      const mid = (low + high) / 2;
      const testPosition = currentPosition.clone().add(
        slideDirection.clone().multiplyScalar(mid)
      );

      const triangleId = this.getTriangleForPosition(
        testPosition,
        permittedTriangles,
        false
      );

      if (triangleId !== null) {
        // Valid position, try going further
        bestDistance = mid;
        low = mid;
      } else {
        // Invalid position, reduce distance
        high = mid;
      }
    }

    return bestDistance;
  }

  /**
   * Get closest point on a line segment
   */
  private getClosestPointOnSegment(
    point: Vector3,
    segStart: Vector3,
    segEnd: Vector3
  ): Vector3 {
    const segVector = new Vector3().subVectors(segEnd, segStart);
    const pointVector = new Vector3().subVectors(point, segStart);

    const segLengthSq = segVector.lengthSq();
    if (segLengthSq === 0) {
      return segStart.clone();
    }

    const t = Math.max(0, Math.min(1, pointVector.dot(segVector) / segLengthSq));

    return segStart.clone().add(segVector.multiplyScalar(t));
  }

  /**
   * Check if target is outside the triangle near a specific edge
   */
  private isTargetOutsideNearEdge(
    target: Vector3,
    edgeStart: Vector3,
    edgeEnd: Vector3,
    triangle: Triangle
  ): boolean {
    // Check if target is outside the triangle
    if (this.isPointInTriangle(target, triangle)) {
      return false; // Target is inside, not outside
    }

    // Find the third vertex (not part of this edge)
    const tolerance = 0.001;
    let thirdVertex: Vector3 | null = null;

    for (const vert of [triangle.a, triangle.b, triangle.c]) {
      if (vert.distanceTo(edgeStart) > tolerance && vert.distanceTo(edgeEnd) > tolerance) {
        thirdVertex = vert;
        break;
      }
    }

    if (!thirdVertex) return false;

    // Check which side of the edge the third vertex is on
    const edgeNormal = new Vector3()
      .subVectors(edgeEnd, edgeStart)
      .normalize();
    const toThird = new Vector3().subVectors(thirdVertex, edgeStart);
    const cross = new Vector3().crossVectors(edgeNormal, toThird);
    const thirdSide = cross.z;

    // Check which side of the edge the target is on
    const toTarget = new Vector3().subVectors(target, edgeStart);
    const crossTarget = new Vector3().crossVectors(edgeNormal, toTarget);
    const targetSide = crossTarget.z;

    // Target is "outside" if it's on the opposite side of the edge from the third vertex
    return Math.sign(targetSide) !== Math.sign(thirdSide);
  }

  /**
   * Get distance from a point to an edge (line segment)
   */
  private getDistanceToEdge(point: Vector3, edgeStart: Vector3, edgeEnd: Vector3): number {
    const closest = this.getClosestPointOnSegment(point, edgeStart, edgeEnd);
    return point.distanceTo(closest);
  }
  public getAdjacentTrianglesWithDepth(
    triangleId: number,
    depth: number = 1,
    includeBlocked: boolean = true
  ): number[] {
    if (depth < 1) {
      return [];
    }

    const visited = new Set<number>();
    const result = new Set<number>();

    // Initialize with the starting triangle
    visited.add(triangleId);

    // Current level to process
    let currentLevel = new Set<number>([triangleId]);

    // Process each depth level
    for (let d = 0; d < depth; d++) {
      const nextLevel = new Set<number>();

      // For each triangle in the current level
      for (const currentId of currentLevel) {
        const neighbors = this.getAdjacentTriangles(currentId);

        // Add each neighbor to the next level if not already visited
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            // Check if we should include blocked triangles
            if (!includeBlocked && this.isTriangleLocked(neighborId)) {
              continue;
            }

            visited.add(neighborId);
            nextLevel.add(neighborId);
            result.add(neighborId);
          }
        }
      }

      // Move to the next level
      currentLevel = nextLevel;

      // If no more triangles to process, we're done
      if (currentLevel.size === 0) {
        break;
      }
    }

    return Array.from(result);
  }
  /**
   * Find the nearest triangles in a given direction from a starting triangle
   * Always returns at least one triangle - if none match the angle tolerance, returns the closest directional matches
   * @param triangleId - The starting triangle ID
   * @param direction - The direction vector to search (will be normalized, Z component ignored)
   * @param maxDepth - Maximum depth to search (default: 3)
   * @param angleToleranceDegrees - Maximum angle deviation from direction to consider a triangle (default: 45 degrees)
   * @returns Array of up to 2 best matching triangle IDs, ordered by score (best first)
   */
  public getTriangleInDirection(
    triangleId: number,
    direction: Vector3,
    maxDepth: number = 3,
    angleToleranceDegrees: number = 45
  ): number[] {
    const startTriangle = this.triangleCache.get(triangleId);
    if (!startTriangle) {
      return [];
    }

    // Normalize direction and ensure it's on X-Y plane
    const searchDirection = direction.clone().normalize();
    searchDirection.z = 0;

    // If direction is zero, return first two adjacent triangles as fallback
    if (searchDirection.length() < 0.001) {
      const adjacent = this.getAdjacentTriangles(triangleId);
      return adjacent.slice(0, 2);
    }

    // Get center of starting triangle
    const startCenter = this.getTriangleCentre(triangleId);

    // Build a map of triangle depths as we search
    const triangleDepths = new Map<number, number>();

    // Search level by level to build depth map
    for (let d = 1; d <= maxDepth; d++) {
      const trianglesAtCurrentDepth = d === 1
        ? this.getAdjacentTriangles(triangleId)
        : this.getAdjacentTrianglesWithDepth(triangleId, d, true)
          .filter(id => !triangleDepths.has(id));

      for (const id of trianglesAtCurrentDepth) {
        if (!triangleDepths.has(id)) {
          triangleDepths.set(id, d);
        }
      }
    }

    // If no adjacent triangles at all, return empty array
    if (triangleDepths.size === 0) {
      return [];
    }

    // Track all candidates with their scores
    const candidates: Array<{
      id: number;
      score: number;
      angleDeviation: number;
      depth: number;
      withinTolerance: boolean;
    }> = [];

    // Evaluate each candidate triangle
    for (const [candidateId, depth] of triangleDepths.entries()) {
      const candidateCenter = this.getTriangleCentre(candidateId);

      // Calculate direction from start to candidate
      const toCandidate = new Vector3()
        .subVectors(candidateCenter, startCenter);

      // Skip if distance is too small to get meaningful direction
      if (toCandidate.length() < 0.001) {
        continue;
      }

      toCandidate.normalize();
      toCandidate.z = 0;

      // Calculate angle between search direction and actual direction to candidate
      const dotProduct = searchDirection.dot(toCandidate);
      const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
      const angleDeg = angleRad * (180 / Math.PI);

      // Calculate distance from start to candidate
      const distance = startCenter.distanceTo(candidateCenter);

      // Calculate a score (lower is better)
      const depthWeight = 1.0;
      const angleWeight = 2.0;
      const distanceWeight = 0.1;

      // If outside tolerance, add penalty to score
      const withinTolerance = angleDeg <= angleToleranceDegrees;
      const tolerancePenalty = withinTolerance ? 0 : 100;

      const score =
        (depth * depthWeight) +
        (angleDeg * angleWeight) +
        (distance * distanceWeight) +
        tolerancePenalty;

      candidates.push({
        id: candidateId,
        score: score,
        angleDeviation: angleDeg,
        depth: depth,
        withinTolerance: withinTolerance
      });
    }

    // Sort candidates by score (lower is better)
    candidates.sort((a, b) => a.score - b.score);

    // Return top 2 candidates
    const result = candidates.slice(0, 2).map(c => c.id);

    // If we only have one candidate, return it
    if (result.length > 0) {
      return result;
    }

    // Fallback: return first two adjacent triangles
    const adjacent = this.getAdjacentTriangles(triangleId);
    return adjacent.slice(0, 2);
  }

  /**
   * Find the nearest triangle in a given direction, considering blocked triangles
   * @param triangleId - The starting triangle ID
   * @param direction - The direction vector to search
   * @param maxDepth - Maximum depth to search (default: 3)
   * @param angleToleranceDegrees - Maximum angle deviation from direction (default: 45 degrees)
   * @param allowBlocked - Whether to return blocked triangles (default: true)
   * @returns The ID of the best matching triangle, or null if none found
   */
  public getReachableTriangleInDirection(
    triangleId: number,
    direction: Vector3,
    maxDepth: number = 3,
    angleToleranceDegrees: number = 45,
    allowBlocked: boolean = true
  ): number | null {
    const startTriangle = this.triangleCache.get(triangleId);
    if (!startTriangle) {
      return null;
    }

    // Normalize direction and ensure it's on X-Y plane
    const searchDirection = direction.clone().normalize();
    searchDirection.z = 0;

    // Get center of starting triangle
    const startCenter = this.getTriangleCentre(triangleId);

    // Build a map of triangle depths as we search
    const triangleDepths = new Map<number, number>();

    // Search level by level to build depth map
    for (let d = 1; d <= maxDepth; d++) {
      const trianglesAtCurrentDepth = d === 1
        ? this.getAdjacentTriangles(triangleId)
        : this.getAdjacentTrianglesWithDepth(triangleId, d, allowBlocked)
          .filter(id => !triangleDepths.has(id));

      for (const id of trianglesAtCurrentDepth) {
        if (!triangleDepths.has(id)) {
          triangleDepths.set(id, d);
        }
      }
    }

    // Track best candidate
    let bestCandidate: {
      id: number;
      score: number;
      depth: number;
    } | null = null;

    // Evaluate each candidate
    for (const [candidateId, depth] of triangleDepths.entries()) {
      const candidateCenter = this.getTriangleCentre(candidateId);

      // Calculate direction from start to candidate
      const toCandidate = new Vector3()
        .subVectors(candidateCenter, startCenter)
        .normalize();
      toCandidate.z = 0;

      // Calculate angle deviation
      const dotProduct = searchDirection.dot(toCandidate);
      const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
      const angleDeg = angleRad * (180 / Math.PI);

      // Check if within angle tolerance
      if (angleDeg <= angleToleranceDegrees) {
        const distance = startCenter.distanceTo(candidateCenter);

        // Calculate score
        const score =
          (depth * 1.0) +
          (angleDeg * 2.0) +
          (distance * 0.1);

        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = {
            id: candidateId,
            score: score,
            depth: depth
          };
        }
      }
    }

    return bestCandidate ? bestCandidate.id : null;
  }
}

export default WalkmeshMovementController;