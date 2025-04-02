import { Line } from "@react-three/drei";
import { Script } from "../../types";
import { Vector3 } from "three";
import useTriggerEvent from "../useTriggerEvent";
import useLineIntersection from "../useLineIntersection";
import { useMemo } from "react";
import TalkRadius from "../TalkRadius/TalkRadius";
import { ScriptStateStore } from "../state";
import useGlobalStore from "../../../../store";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: string | undefined) => void;
  useScriptStateStore: ScriptStateStore;
}

const Location = ({ setActiveMethodId, script, useScriptStateStore }: LocationProps) => {
  const isLineOn = useScriptStateStore(state => state.isLineOn);
  const linePoints = useScriptStateStore(state => state.linePoints);

  const { isIntersecting, wasIntersecting, hasEverExited } = useLineIntersection(linePoints ?? undefined, isLineOn);

  const hasValidTouchHandler = useMemo(() => {
    const touchMethod = script.methods.find(method => method.methodId === 'touch')
    if (!touchMethod) {
      return false;
    }
    return touchMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [script]);

  const hasValidAcrossHandler = useMemo(() => {
    const acrossMethod = script.methods.find(method => method.methodId === 'across')
    if (!acrossMethod) {
      return false;
    }
    return acrossMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [script]);
  
  useTriggerEvent(hasValidTouchHandler ? 'touch' : 'touchon',  script, setActiveMethodId, isIntersecting && hasEverExited);
  useTriggerEvent(hasValidAcrossHandler ? 'across' : 'touchoff', script, setActiveMethodId, !isIntersecting && wasIntersecting && hasEverExited);

  const talkPosition = useMemo(() => {
    if (!linePoints || !linePoints?.[0] || !linePoints?.[1]) {
      return new Vector3();
    }
    return new Vector3().addVectors(linePoints?.[0], linePoints?.[1]).divideScalar(2);
  }, [linePoints]);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  const talkMethod = script.methods.find(method => method.methodId === 'talk');

  if (!linePoints || !isLineOn) {
    return null;
  }

  return (
    <>
      <Line
        points={linePoints}
        lineWidth={5}
        color="blue"
        visible={isDebugMode}
      />
      <group position={talkPosition}>
        {talkMethod && (
          <TalkRadius
            setActiveMethodId={setActiveMethodId}
            talkMethod={talkMethod}
            useScriptStateStore={useScriptStateStore}
          />
        )}
      </group>
    </>
  );
}

export default Location;