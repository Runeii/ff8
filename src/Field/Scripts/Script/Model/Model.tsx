import { Sphere } from "@react-three/drei";
import { Script, ScriptState } from "../../types";

type ModelProps = {
  script: Script;
  state: ScriptState;
}

const Model = ({ state }: ModelProps) => {
  //const modelId = state.modelId < 75 ? state.modelId : 1;
  //const idleAnimationId = state.idleAnimationId;
  //const isSolid = state.isSolid;
  const isUnused = state.isUnused;
  //const angle = state.angle

  return (
    <Sphere args={[0.006]}>
      <meshBasicMaterial attach="material" color={isUnused ? 'black' : 'blue'} />
    </Sphere>
  );
}

export default Model;