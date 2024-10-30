import { Line } from "@react-three/drei";
import { Script, ScriptState } from "../../types";
import { useThree } from "@react-three/fiber";
import { Mesh } from "three";
import useTriggerEvent from "../useTriggerEvent";
import useLineIntersection from "../useLineIntersection";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: string) => void;
  state: ScriptState;
}

const Location = ({ setActiveMethodId, script, state }: LocationProps) => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const { isLineOn, linePoints } = state;

  const { isIntersecting, wasIntersecting } = useLineIntersection(linePoints ?? undefined, player, isLineOn);

  useTriggerEvent('touchon',  script, setActiveMethodId, isIntersecting);
  useTriggerEvent('touchoff', script, setActiveMethodId, !isIntersecting && wasIntersecting);

  if (!linePoints || !isLineOn) {
    return null;
  }

  return (
    <Line
      points={linePoints}
      lineWidth={5}
      color="red"
      visible={import.meta.env.DEV}
    />
  );
}

export default Location;