import { Line } from "@react-three/drei";
import { Script, ScriptState } from "../../types";
import { useFrame, useThree } from "@react-three/fiber";
import { useState } from "react";
import { checkForIntersection } from "../../../Gateways/gatewayUtils";
import { Mesh } from "three";
import useTriggerEvent from "../useTriggerEvent";

type LocationProps = {
  script: Script;
  setActiveMethodId: (methodId: number) => void;
  state: ScriptState;
}

const Location = ({ setActiveMethodId, script, state }: LocationProps) => {
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);

  const { isLineOn, linePoints } = state;
  useFrame(() => {
    if (!linePoints || !isLineOn) {
      return false;
    }

    const isIntersecting = checkForIntersection(player, linePoints);
    setIsIntersecting(isIntersecting);

    if (isIntersecting && !wasIntersecting) {
      setWasIntersecting(true);
    }
  });

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