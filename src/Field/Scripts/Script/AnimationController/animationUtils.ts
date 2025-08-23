import { AnimationClip, Object3D, VectorKeyframeTrack, NumberKeyframeTrack, QuaternionKeyframeTrack, Vector3 } from 'three';

/**
 * Extracts object name and property name from track name
 */
const extractNamesFromTrack = (trackName: string): [string, string] => {
  const propertyIndex = trackName.lastIndexOf('.');
  const objectName = trackName.substring(0, propertyIndex);
  const propertyName = trackName.substring(propertyIndex + 1);
  return [objectName, propertyName];
};


export const applyAnimationAtTime = (mesh: Object3D, clip: AnimationClip, time: number): void => {
  // Process each track in the clip
  clip.tracks.forEach(track => {
    const trackName = track.name;
    const [objectName, propertyName] = extractNamesFromTrack(trackName);
    const object = mesh.getObjectByName(objectName);
    if (object) {
      // @ts-expect-error Helper method
      applyTrackToObjectAtTime(track, object, propertyName, time);
    }
  });
  
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);
};


const applyTrackToObjectAtTime = (
  track: VectorKeyframeTrack | NumberKeyframeTrack | QuaternionKeyframeTrack,
  object: Object3D,
  propertyName: keyof typeof object,
  time: number
): void => {
  const stride = track.getValueSize();
  const times = track.times;
  const values = track.values;
  
  // Clamp time to valid range
  const clampedTime = Math.min(Math.max(0, time), times[times.length - 1]);
  
  // Find the keyframe indices for interpolation
  let leftIndex = 0;
  let rightIndex = 0;
  
  for (let i = 0; i < times.length - 1; i++) {
    if (clampedTime >= times[i] && clampedTime <= times[i + 1]) {
      leftIndex = i;
      rightIndex = i + 1;
      break;
    }
  }
  
  // If time is exactly at a keyframe, use that keyframe
  if (clampedTime === times[leftIndex]) {
    const valueIndex = leftIndex * stride;
    applyValuesAtIndex(track, object, propertyName, values, valueIndex, stride);
  } else if (clampedTime === times[rightIndex]) {
    const valueIndex = rightIndex * stride;
    applyValuesAtIndex(track, object, propertyName, values, valueIndex, stride);
  } else {
    // Interpolate between keyframes
    const t = (clampedTime - times[leftIndex]) / (times[rightIndex] - times[leftIndex]);
    interpolateAndApply(track, object, propertyName, values, leftIndex, rightIndex, t, stride);
  }
};

const applyValuesAtIndex = (
  track: VectorKeyframeTrack | NumberKeyframeTrack | QuaternionKeyframeTrack,
  object: Object3D,
  propertyName: keyof typeof object,
  values: Float32Array,
  index: number,
  stride: number
): void => {
  if (track instanceof VectorKeyframeTrack || track instanceof NumberKeyframeTrack) {
    const value = Array.from(values.slice(index, index + stride));
    
    if (stride === 3 && object[propertyName] instanceof Vector3) {
      const [x, y, z] = value;
      object[propertyName].set(x, y, z);
    } else if (stride === 1) {
      // @ts-expect-error Helper method
      object[propertyName] = value[0];
    }
  } else if (track instanceof QuaternionKeyframeTrack) {
    const quaternionValues = Array.from(values.slice(index, index + 4));
    const [x, y, z, w] = quaternionValues;
    object.quaternion.set(x, y, z, w);
  }
};

const interpolateAndApply = (
  track: VectorKeyframeTrack | NumberKeyframeTrack | QuaternionKeyframeTrack,
  object: Object3D,
  propertyName: keyof typeof object,
  values: Float32Array,
  leftIndex: number,
  rightIndex: number,
  t: number,
  stride: number
): void => {
  const leftValueIndex = leftIndex * stride;
  const rightValueIndex = rightIndex * stride;
  
  if (track instanceof QuaternionKeyframeTrack) {
    // Quaternion interpolation (slerp)
    const leftQuat = Array.from(values.slice(leftValueIndex, leftValueIndex + 4));
    const rightQuat = Array.from(values.slice(rightValueIndex, rightValueIndex + 4));
    
    // Simple lerp for demonstration (slerp would be more accurate)
    const interpolated = leftQuat.map((val, i) => val * (1 - t) + rightQuat[i] * t);
    const [x, y, z, w] = interpolated;
    object.quaternion.set(x, y, z, w);
  } else {
    // Linear interpolation for vectors and numbers
    const leftValues = Array.from(values.slice(leftValueIndex, leftValueIndex + stride));
    const rightValues = Array.from(values.slice(rightValueIndex, rightValueIndex + stride));
    
    const interpolated = leftValues.map((val, i) => val * (1 - t) + rightValues[i] * t);
    
    if (stride === 3 && object[propertyName] instanceof Vector3) {
      const [x, y, z] = interpolated;
      object[propertyName].set(x, y, z);
    } else if (stride === 1) {
      // @ts-expect-error Helper method
      object[propertyName] = interpolated[0];
    }
  }
};