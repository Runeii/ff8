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

  constructor(walkmesh: Object3D) {
    this.walkmesh = walkmesh;
    this.buildTriangleCache();
    this.buildTriangleGraph();
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
        
        if (this.trianglesShareEdge(triangle, otherTriangle)) {
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

  public getTriangleCentre(triangleId: number): Vector3 {
    const triangle = this.triangleCache.get(triangleId)!;
    if (!triangle) {
      console.error(`Triangle ID ${triangleId} not found in walkmesh.`);
      return new Vector3();
    }

    const centre = new Vector3();
    centre.addVectors(triangle.a, triangle.b);
    centre.add(triangle.c);
    centre.divideScalar(3);
    return centre;
  }

  public getTriangleForPosition(position: Vector3, permittedIds?: number[], isAllowedToCrossBlockedTriangles = false): number | null {
    const triangles = permittedIds
      ? permittedIds.map(id => [id, this.triangleCache.get(id)]).filter(([, t]) => t !== undefined) as [number, Triangle][]
      : this.triangleCache.entries();

    const blockedTriangles = useGlobalStore.getState().lockedTriangles;
    for (const [triangleId, triangle] of triangles) {
      if (blockedTriangles.includes(triangleId) && !isAllowedToCrossBlockedTriangles) {
        continue;
      }
      if (this.isPointInTriangle(position, triangle)) {
        return triangleId;
      }
    }
    return null;
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


  private isPointInTriangle(point: Vector3, triangle: Triangle): boolean {
    // For Z-up coordinate system, we need to check if the point projection
    // onto the X-Y plane is within the triangle's X-Y projection
    
    const minX = Math.min(triangle.a.x, triangle.b.x, triangle.c.x);
    const maxX = Math.max(triangle.a.x, triangle.b.x, triangle.c.x);
    const minY = Math.min(triangle.a.y, triangle.b.y, triangle.c.y);
    const maxY = Math.max(triangle.a.y, triangle.b.y, triangle.c.y);
    
    const tolerance = 0.001;
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
}

export default WalkmeshMovementController;