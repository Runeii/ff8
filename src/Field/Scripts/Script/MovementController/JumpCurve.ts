import { Vector3 } from "three";

const GRAVITY_CONSTANT = -0.0006

class JumpCurve {
  start: Vector3;
  end: Vector3;
  duration: number;

  initialVelocityX: number;
  initialVelocityY: number;
  initialVelocityZ: number;

  constructor(start: Vector3, end: Vector3, duration: number) {
    this.start = start;
    this.end = end;
    this.duration = duration;
    
    const displacement = end.clone().sub(start);

    // Apply physics to Z-axis since that's up/down in your world
    this.initialVelocityZ = (displacement.z - 0.5 * GRAVITY_CONSTANT * duration * duration) / duration;
    this.initialVelocityX = displacement.x / duration;
    this.initialVelocityY = displacement.y / duration; // Y is now horizontal
  }

  getPositionAtTime(t: number) {
    const x = this.start.x + this.initialVelocityX * t;
    const y = this.start.y + this.initialVelocityY * t;
    const z = this.start.z + this.initialVelocityZ * t + 0.5 * GRAVITY_CONSTANT * t * t;
    return new Vector3(x, y, z);
  }

  getPointAt(progress: number) {
    const t = progress * this.duration;
    return this.getPositionAtTime(t);
  }
};


export default JumpCurve;