import { Sphere } from "@react-three/drei";
import useGlobalStore from "../../../../../../store";

const Focus = () => {
  const isDebugMode = useGlobalStore((state) => state.isDebugMode);
  return (
    <Sphere args={[0.01, 32, 32]} name="focus" position={[0,0,0.08]}>
      <meshBasicMaterial color="blue" transparent opacity={0.8} visible={isDebugMode} />
    </Sphere>
  )
}

export default Focus;