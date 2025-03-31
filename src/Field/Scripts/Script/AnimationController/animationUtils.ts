import { AnimationClip, Object3D, VectorKeyframeTrack, NumberKeyframeTrack, QuaternionKeyframeTrack, Vector3 } from 'three';

/**
 * Applies a base animation (rest pose) directly to a mesh's bones/objects
 * @param mesh - The mesh to apply the animation to
 * @param clip - The animation clip containing the rest pose
 */
const applyBaseAnimationDirectly = (mesh: Object3D, clip: AnimationClip): void => {
  // Process each track in the clip
  clip.tracks.forEach(track => {
    const trackName = track.name;
    
    // Extract object name and property name from track name
    const [objectName, propertyName] = extractNamesFromTrack(trackName);
    
    // Find target object in mesh hierarchy
    const object = mesh.getObjectByName(objectName);
    
    if (object) {
      // @ts-expect-error Helper method
      applyTrackToObject(track, object, propertyName);
    }
  });
  
  // Update mesh matrices
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);
};

/**
 * Extracts object name and property name from track name
 */
const extractNamesFromTrack = (trackName: string): [string, string] => {
  const propertyIndex = trackName.lastIndexOf('.');
  const objectName = trackName.substring(0, propertyIndex);
  const propertyName = trackName.substring(propertyIndex + 1);
  
  return [objectName, propertyName];
};

/**
 * Applies a track's values to the target object
 */
const applyTrackToObject = (
  track: VectorKeyframeTrack | NumberKeyframeTrack | QuaternionKeyframeTrack, 
  object: Object3D,
  propertyName: keyof typeof object
): void => {
  // Handle different track types
  if (track instanceof VectorKeyframeTrack || track instanceof NumberKeyframeTrack) {
    const stride = track.getValueSize();
    const value = track.values.slice(0, stride);
    
    if (stride === 3 && object[propertyName] instanceof Vector3) {
      // Handle Vector3 properties (position, scale)
      const [x, y, z] = value;
      object[propertyName].set(x, y, z);
    } else if (stride === 1) {
      // Handle single numeric properties
      // @ts-expect-error Helper method
      object[propertyName] = value[0];
    }
  } else if (track instanceof QuaternionKeyframeTrack) {
    // Handle quaternion tracks
    const [x, y, z, w] = track.values.slice(0, 4);
    object.quaternion.set(x, y, z, w);
  }
};

export { applyBaseAnimationDirectly };