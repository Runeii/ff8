import { Box } from "@react-three/drei"
import { forwardRef } from "react";

const Fallback = forwardRef((props, ref) => {
  return (
    <Box args={[0.08, 0.01, 0.01]} position={[-0.03,0,0]} ref={ref}>
      <meshStandardMaterial color="white" />
      <Box args={[0.01, 0.01, 0.01]} position={[0, 0, 0.01]}>
        <meshStandardMaterial color="black" />
      </Box>
    </Box>
  )
})

export default Fallback;