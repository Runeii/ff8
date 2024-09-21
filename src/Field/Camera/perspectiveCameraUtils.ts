export const calculateParallax = (currentRotation, initialRotation, depth: number): number => {
  // Ensure depth is valid
  if (depth <= 0) {
    throw new Error("Depth must be greater than zero.");
  }

  const deltaAngle = currentRotation - initialRotation;

  // Calculate the factor by which the parallax reduces the effect based on depth
  const parallaxFactor = 1 - (1 / depth);

  // Calculate parallax displacement based on rotation angle
  return Math.sin(deltaAngle) * parallaxFactor * depth;
}