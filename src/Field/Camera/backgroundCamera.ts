import { Vector2, MathUtils } from 'three';

const BACKGROUND_DEPTH = 461;  // Depth of the background plane

// Step 1: Calculate Horizontal FOV (FOV_h)
export const calculateHorizontalFOV = (fovV: number, aspect: number): number => {
  return 2 * Math.atan(Math.tan(fovV / 2) * aspect);
};

// Step 2: Calculate Horizontal Translation (T_screen_x) with depth for parallax
const calculateHorizontalTranslationWithDepth = (
  yaw: number,
  fovH: number,
  width: number,
  depth: number
): number => {
  const tanYaw = Math.tan(yaw);
  const tanHalfFovH = Math.tan(fovH / 2);
  return -(tanYaw / tanHalfFovH) * (width / 2) * (depth / BACKGROUND_DEPTH);
};
// Step 3: Calculate Vertical Translation (T_screen_y) with depth for parallax
const calculateVerticalTranslationWithDepth = (
  pitch: number,
  fovV: number,
  height: number,
  depth: number
): number => {
  const tanPitch = Math.tan(pitch);
  const tanHalfFovV = Math.tan(fovV / 2);
  return (tanPitch / tanHalfFovV) * (height / 2) * (depth / BACKGROUND_DEPTH);
};

// Step 4: Calculate the final translations considering depth (for parallax)
export const calculateTranslationsWithDepth = (
  yawChange: number,
  pitchChange: number,
  fovV: number,
  aspectRatio: number,
  screenWidth: number,
  screenHeight: number,
  depth: number
): Vector2 => {
  const fovH = calculateHorizontalFOV(fovV, aspectRatio);

  const translationX = calculateHorizontalTranslationWithDepth(
    yawChange,
    fovH,
    screenWidth,
    depth
  );
  const translationY = calculateVerticalTranslationWithDepth(
    pitchChange,
    fovV,
    screenHeight,
    depth
  );

  return new Vector2(translationX, translationY);
};

export const calculateYawFromTranslationWithDepth = (
  translationX: number,
  fovH: number,
  width: number,
  depth: number
): number => {
  const tanHalfFovH = Math.tan(fovH / 2);
  const Kx = (width / 2) * (depth / BACKGROUND_DEPTH);
  const tanYaw = -(translationX * tanHalfFovH) / Kx;
  return Math.atan(tanYaw);
};

// Inverse function for vertical translation
export const calculatePitchFromTranslationWithDepth = (
  translationY: number,
  fovV: number,
  height: number,
  depth: number
): number => {
  const tanHalfFovV = Math.tan(fovV / 2);
  const Ky = (height / 2) * (depth / BACKGROUND_DEPTH);
  const tanPitch = (translationY * tanHalfFovV) / Ky;
  return Math.atan(tanPitch);
};