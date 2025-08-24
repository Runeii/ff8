import { Cylinder } from "@react-three/drei";
import createScriptState from "../state";
import FF8DrawParticles from "./FF8DrawParticles/FF8DrawParticles";
import { useMemo, useRef } from "react";
import { Mesh } from "three";
import useTalkRadius from "../Model/useTalkRadius";
import createScriptController from "../ScriptController/ScriptController";

type DrawPointProps = {
  scriptController: ReturnType<typeof createScriptController>
  useScriptStateStore: ReturnType<typeof createScriptState>
}

const DrawPoint = ({ scriptController, useScriptStateStore }: DrawPointProps) => {
  const talkRadiusRef = useRef<Mesh>(null);

  const talkMethod = useMemo(() => scriptController.script.methods.find(method => method.methodId === 'talk'), [scriptController]);

  useTalkRadius({
    isActive: true,
    scriptController,
    talkMethod,
    useScriptStateStore,
    talkTargetRef: talkRadiusRef
  })

  return (
    <>
      <FF8DrawParticles
        count={30}
        colour="rgb(218,70,192)"
        height={0.04}
        lineWidth={0.01}
        lineOpacity={1}
        curveWidth={0.02}
      />
      <Cylinder args={[0.03, 0.03, 0.05]} position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} userData={{
        isSolid: true
      }} visible={false} ref={talkRadiusRef}>
        <meshBasicMaterial color="white" />
      </Cylinder>
    </>
  )
}

export default DrawPoint;