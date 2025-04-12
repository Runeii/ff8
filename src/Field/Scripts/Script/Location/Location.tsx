import { Line } from "@react-three/drei";
import { Script } from "../../types";
import { Vector3 } from "three";
import useLineIntersection from "../useLineIntersection";
import { useEffect, useMemo, useRef } from "react";
import TalkRadius from "../TalkRadius/TalkRadius";
import { ScriptStateStore } from "../state";
import useGlobalStore from "../../../../store";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: string | undefined) => void;
  useScriptStateStore: ScriptStateStore;
}

const Location = ({ setActiveMethodId, script, scriptController, useScriptStateStore }: LocationProps) => {
  const isLineOn = useScriptStateStore(state => state.isLineOn);
  const linePoints = useScriptStateStore(state => state.linePoints);

  const isUserControllable = useGlobalStore(state => state.isUserControllable);

  useLineIntersection(linePoints ?? undefined, isLineOn && isUserControllable, {
    onTouchOn: () => scriptController.triggerMethod('touchon', false, 0, false),
    onTouch: () => scriptController.triggerMethod('touch', false),
    onTouchOff: () => scriptController.triggerMethod('touchoff', false),
    onAcross: () => scriptController.triggerMethod('across', false),
  })
  

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
            scriptController={scriptController}
            talkMethod={talkMethod}
            useScriptStateStore={useScriptStateStore}
          />
        )}
      </group>
    </>
  );
}

export default Location;