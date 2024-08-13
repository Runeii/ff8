import React from 'react';
import { Line, Text } from '@react-three/drei';
import { Vector3 } from 'three';

interface LineWithTextProps {
  start: [number, number, number];
  end: [number, number, number];
  text: string;
}

const LineWithText: React.FC<LineWithTextProps> = ({ color = 'white', start, end, text }) => {
  // Convert start and end to THREE.Vector3
  const startVec = new Vector3(...start);
  const endVec = new Vector3(...end);

  // Calculate the midpoint
  const midPoint = new Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

  // Calculate the direction vector and then get a perpendicular vector
  const direction = new Vector3().subVectors(endVec, startVec).normalize();
  const perpendicular = new Vector3(-direction.y, direction.x, direction.z);

  // Adjust text position to be slightly above the line
  const textPosition = midPoint.clone().add(perpendicular.multiplyScalar(0.001));

  return (
    <>
      {/* Draw the line */}
      <Line points={[startVec, endVec]} color={color} lineWidth={1} />

      {/* Render the text */}
      <Text
        position={textPosition}
        rotation={[0, Math.PI / 2, Math.atan2(direction.y, direction.x)]}
        fontSize={0.05}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </>
  );
};

export default LineWithText;
