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
        
        if (!positionAttribute || isNaN(triangleId)) return;
        
        // Cache triangle geometry
        for (let i = 0; i < positionAttribute.count; i += 3) {
          const a = new Vector3().fromBufferAttribute(positionAttribute, i).applyMatrix4(child.matrixWorld);
          const b = new Vector3().fromBufferAttribute(positionAttribute, i + 1).applyMatrix4(child.matrixWorld);
          const c = new Vector3().fromBufferAttribute(positionAttribute, i + 2).applyMatrix4(child.matrixWorld);
          
          this.triangleCache.set(triangleId, new Triangle(a, b, c));
        }
      }
    });
  }

  public moveToward(currentPos: Vector3, desiredNextPos: Vector3): Vector3 {
    return this.projectOntoSurface(currentPos, desiredNextPos);
  }

  private projectOntoSurface(from: Vector3, to: Vector3): Vector3 {
    // Try direct projection first
    const projected = this.getPositionOnWalkmesh(to);
    if (projected) return projected;
    
    // If that fails, slide along the surface
    return this.slideAlongSurface(from, to);
  }

  private slideAlongSurface(from: Vector3, to: Vector3): Vector3 {
    const direction = new Vector3().subVectors(to, from).normalize();
    const stepSize = 0.1;
    const maxSteps = Math.ceil(from.distanceTo(to) / stepSize);
    
    let currentPos = from.clone();
    let lastValidPos = from.clone();
    
    for (let i = 0; i < maxSteps; i++) {
      const testPos = currentPos.clone().addScaledVector(direction, stepSize);
      const projected = this.getPositionOnWalkmesh(testPos, 2.0);
      
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

  public getPositionOnWalkmesh(position: Vector3, maxDistance = 1): Vector3 | null {
    for (const direction of [DIRECTION_DOWN, DIRECTION_UP]) {
      this.raycaster.set(position, direction);
      const intersects = this.raycaster.intersectObject(this.walkmesh, true);

      for (const intersect of intersects) {
        if (intersect.distance > maxDistance) continue;
        
        const triangleId = parseInt(intersect.object.name);
        if (this.isTriangleLocked(triangleId)) continue;
        
        return intersect.point;
      }
    }
    
    return null;
  }

  private isTriangleLocked(triangleId: number): boolean {
    const { lockedTriangles } = useGlobalStore.getState();
    return lockedTriangles.includes(triangleId);
  }
}

export default WalkmeshMovementController