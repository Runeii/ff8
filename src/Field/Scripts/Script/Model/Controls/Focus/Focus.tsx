import { Sphere } from "@react-three/drei";

const Focus = () => {
  return (
    <Sphere args={[0.1, 32, 32]} name="focus">
      <meshBasicMaterial color="blue" transparent opacity={0.8} visible={false} />
    </Sphere>
  )
}

export default Focus;