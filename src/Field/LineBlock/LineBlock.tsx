import { Box } from "@react-three/drei";
import useGlobalStore from "../../store";
import { Euler, Mesh, Quaternion, Vector3 } from "three";
import { RefObject, useMemo } from "react";

type LineBlockProps = {
  color: string;
  lineBlockRef: RefObject<Mesh>;
  points: VectorLike[] | undefined;
} & React.ComponentProps<typeof Box>;

const LineBlock = ({ color, lineBlockRef, points, ...props }: LineBlockProps) => {
  const box = useMemo(() => {
    if (!points) {
      return null;
    }
    const [startPoint, endPoint] = points;
    const midpoint = new Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
    const direction = new Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();
    direction.normalize(); 
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);

    const hitboxDepth = 0.09;
    const hitboxMidpoint = midpoint.clone();
    hitboxMidpoint.x += hitboxDepth / 4;
    return {
      midpoint,
      hitboxMidpoint,
      hitboxDepth,
      rotation: new Euler().setFromQuaternion(quaternion),
      length,
    }
  }, [points]);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  if (!box) {
    return null;
  }

  return (
      <Box
        args={[0.001, box.length, 0.1]}
        position={box.midpoint}
        rotation={box.rotation}
        visible={isDebugMode}
        ref={lineBlockRef}
        {...props}
        >
        <meshBasicMaterial color={color} opacity={1} transparent />
      </Box>
  );
}

export default LineBlock;