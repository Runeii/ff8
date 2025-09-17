import { BufferGeometry, Mesh, Object3D, Raycaster, Triangle, Vector3 } from "three";
import useGlobalStore from "../../store";

const DIRECTION_DOWN = new Vector3(0, 0, 1);
const DIRECTION_UP = new Vector3(0, 0, -1);
class WalkmeshMovementController {
  private raycaster = new Raycaster();
  private walkmesh: Object3D;
  private triangleCache = new Map<number, Triangle>();

  constructor(walkmesh: Object3D) {
    this.walkmesh = walkmesh;
    this.buildTriangleCache();
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

  public getTriangleForPosition(position: Vector3): number | null {
    for (const [triangleId, triangle] of this.triangleCache.entries()) {
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

  private isPointInTriangle(point: Vector3, triangle: Triangle): boolean {
    const barycoord = new Vector3();
    triangle.getBarycoord(point, barycoord);

    const tolerance = 0.001;
    return barycoord.x >= -tolerance && 
           barycoord.y >= -tolerance && 
           barycoord.z >= -tolerance &&
           Math.abs(barycoord.x + barycoord.y + barycoord.z - 1.0) < tolerance;
  }

  public moveToward(currentPos: Vector3, desiredNextPos: Vector3, isAllowedToCrossBlockedTriangles: boolean): Vector3 {
    return this.projectOntoSurface(currentPos, desiredNextPos, isAllowedToCrossBlockedTriangles);
  }

  private projectOntoSurface(from: Vector3, to: Vector3, isAllowedToCrossBlockedTriangles: boolean): Vector3 {
    // Try direct projection first
    const projected = this.getPositionOnWalkmesh(to, 1, isAllowedToCrossBlockedTriangles);
    if (projected) {
      return projected;
    }

    // If that fails, slide along the surface
    return this.slideAlongSurface(from, to, isAllowedToCrossBlockedTriangles);
  }

  private slideAlongSurface(from: Vector3, to: Vector3, isAllowedToCrossBlockedTriangles: boolean): Vector3 {
    const direction = new Vector3().subVectors(to, from).normalize();
    const stepSize = 0.1;
    const maxSteps = Math.ceil(from.distanceTo(to) / stepSize);
    let currentPos = from.clone();
    let lastValidPos = from.clone();

    for (let i = 0; i < maxSteps; i++) {
      const testPos = currentPos.clone().addScaledVector(direction, stepSize);
      const projected = this.getPositionOnWalkmesh(testPos, 2.0, isAllowedToCrossBlockedTriangles);
      if (projected) {
        lastValidPos = projected;
        currentPos = projected;
      } else {
        // Hit an edge or hole, return last valid position
        break;
      }
    }
    return lastValidPos;
  }

  public getPositionOnWalkmesh(position: Vector3, maxDistance = 1, isAllowedToCrossBlockedTriangles = true): Vector3 | null {
    for (const direction of [DIRECTION_DOWN, DIRECTION_UP]) {
      this.raycaster.set(position, direction);
      const intersects = this.raycaster.intersectObject(this.walkmesh, true).sort((a, b) => a.distance - b.distance);
      for (const intersect of intersects) {
        if (intersect.distance > maxDistance) continue;
        const triangleId = parseInt(intersect.object.name);
        if (this.isTriangleLocked(triangleId) && !isAllowedToCrossBlockedTriangles) continue;
        return intersect.point;
      }
    }
    return null;
  }

  // Used to allow player to "slide" along edge of walkmesh
  public findNearestValidPosition(
    from: Vector3, 
    target: Vector3, 
    isAllowedToCrossBlockedTriangles: boolean,
    minMoveDistance: number = 0.05
  ): Vector3 | null {
    // First try the exact target
    const directProjected = this.getPositionOnWalkmesh(target, 2.0, isAllowedToCrossBlockedTriangles);
    if (directProjected) {
      return directProjected;
    }

    // Get the movement direction
    const movementDirection = new Vector3().subVectors(target, from).normalize();
    const desiredMoveDistance = from.distanceTo(target);
    
    // Search in a fan pattern in the direction of movement
    const numAngles = 36; // Every 10 degrees
    const numDistances = 8;
    
    let bestPosition: Vector3 | null = null;
    let bestScore = -Infinity;
    
    // Test positions in a fan pattern, prioritizing forward movement
    for (let angleIndex = 0; angleIndex < numAngles; angleIndex++) {
      // Create angles that prioritize forward movement
      // 0° = forward, then ±10°, ±20°, etc.
      const angle = angleIndex === 0 ? 0 : 
                   (Math.ceil(angleIndex / 2) * (Math.PI / 18)) * (angleIndex % 2 === 1 ? 1 : -1);
      
      // Rotate movement direction by this angle (in XY plane)
      const testDirection = new Vector3(
        movementDirection.x * Math.cos(angle) - movementDirection.y * Math.sin(angle),
        movementDirection.x * Math.sin(angle) + movementDirection.y * Math.cos(angle),
        movementDirection.z
      ).normalize();
      
      // Test multiple distances in this direction, starting from minimum meaningful distance
      for (let distIndex = 1; distIndex <= numDistances; distIndex++) {
        const testDistance = Math.max(
          minMoveDistance, 
          (distIndex / numDistances) * desiredMoveDistance * 1.5
        );
        const testPos = from.clone().addScaledVector(testDirection, testDistance);
        
        const projected = this.getPositionOnWalkmesh(testPos, 3.0, isAllowedToCrossBlockedTriangles);
        if (projected) {
          const actualMovement = new Vector3().subVectors(projected, from);
          const actualDistance = actualMovement.length();
          
          // Skip if movement is too small
          if (actualDistance < minMoveDistance) continue;
          
          const forwardProgress = actualMovement.dot(movementDirection);
          const angleScore = testDirection.dot(movementDirection); // 1.0 = perfect alignment
          
          // Score heavily weights meaningful forward progress
          const score = forwardProgress * 20 + angleScore * 10 + actualDistance * 5;
          
          if (score > bestScore && forwardProgress > minMoveDistance) {
            bestPosition = projected;
            bestScore = score;
          }
        }
      }
    }
    
    return bestPosition;
  }

  private isTriangleLocked(triangleId: number): boolean {
    const { lockedTriangles } = useGlobalStore.getState();
    return lockedTriangles.includes(triangleId);
  }
}

export default WalkmeshMovementController;