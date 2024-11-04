import { Line } from "@react-three/drei";
import { Script, ScriptState } from "../../types";
import { useThree } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";
import useTriggerEvent from "../useTriggerEvent";
import useLineIntersection from "../useLineIntersection";
import { useEffect, useMemo } from "react";
import TalkRadius from "../TalkRadius/TalkRadius";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: string | undefined) => void;
  state: ScriptState;
}

const Location = ({ setActiveMethodId, script, state }: LocationProps) => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const { isLineOn, linePoints } = state;

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