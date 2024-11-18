import { Line } from "@react-three/drei";
import { Script } from "../../types";
import { useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import useTriggerEvent from "../useTriggerEvent";
import useLineIntersection from "../useLineIntersection";
import { useMemo } from "react";
import TalkRadius from "../TalkRadius/TalkRadius";
import { ScriptStateStore } from "../state";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: string | undefined) => void;
  useScriptStateStore: ScriptStateStore;
}

const Location = ({ setActiveMethodId, script, useScriptStateStore }: LocationProps) => {
  const player = useThree(({ scene }) => scene.getObjectByName("character") as Group);

  const isLineOn = useScriptStateStore(state => state.isLineOn);
  const linePoints = useScriptStateStore(state => state.linePoints);

  const { isIntersecting, wasIntersecting } = useLineIntersection(linePoints ?? undefined, player, isLineOn);

  useTriggerEvent('touchon',  script, setActiveMethodId, isIntersecting);
  useTriggerEvent('touchoff', script, setActiveMethodId, !isIntersecting && wasIntersecting);

  const talkPosition = useMemo(() => {
    if (!linePoints || !linePoints?.[0] || !linePoints?.[1]) {
      return new Vector3();
    }
    return new Vector3().addVectors(linePoints?.[0], linePoints?.[1]).divideScalar(2);
  }, [linePoints]);

  if (!linePoints || !isLineOn) {
    return null;
  }

  return (
    <>
      <Line
        points={linePoints}
        lineWidth={5}
        color="red"
        visible={import.meta.env.DEV}
      />
      <group position={talkPosition}>
        <TalkRadius
          radius={200 / 4096 / 1.5}
          setActiveMethodId={setActiveMethodId}
          talkMethod={script.methods.find(method => method.methodId === 'talk')!}
        />
      </group>
    </>
  );
}

export default Location;