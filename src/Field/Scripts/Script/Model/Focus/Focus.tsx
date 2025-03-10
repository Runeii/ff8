import { Sphere } from "@react-three/drei";
import useGlobalStore from "../../../../../store";

const Focus = () => {
  const isDebugMode = useGlobalStore((state) => state.isDebugMode);
  return (
    <Sphere args={[0.03, 32, 32]} name="focus" position={[0,0,0.04]}>
      <meshBasicMaterial color="pink" transparent opacity={0.8} visible={isDebugMode} />
    </Sphere>
  )
}

export default Focus;