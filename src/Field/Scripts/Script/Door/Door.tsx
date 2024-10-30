import { useCallback, useMemo, useState } from "react";
import { Script, ScriptState } from "../../types";
import { FieldData } from "../../../Field";
import { Line } from "@react-three/drei";
import { vectorToFloatingPoint } from "../../../../utils";
import useTriggerEvent from "../useTriggerEvent";
import useLineIntersection from "../useLineIntersection";
import { useThree } from "@react-three/fiber";
import { Mesh } from "three";

type DoorProps = {
  doors: FieldData['doors'];
  script: Script;
  setActiveMethodId: (methodId: string) => void;
  state: ScriptState;
}

const Door = ({ doors, script, setActiveMethodId, state }: DoorProps) => {
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const door = useMemo(() => {
    // Feels hacky, but seems to work?
    const doorId = parseInt(script.name.replace('Door', '')) - 1
    const entry = doors.find(door => door.doorID === doorId)
    return {
      ...entry,
      line: entry?.line.map(vectorToFloatingPoint)
    }
  }, [doors, script.name]);

  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);
  const { isIntersecting } = useLineIntersection(door.line, player, state.isDoorOn);

  const setDoorOpenState = useCallback((isOpen: boolean) => {
    return (methodId: string) => {
      setIsDoorOpen(isOpen);
      setActiveMethodId(methodId);
    }
  }, [setActiveMethodId]);

   useTriggerEvent('open', script, setDoorOpenState(true), isIntersecting && !isDoorOpen);
  useTriggerEvent('close', script, setDoorOpenState(false), !isIntersecting && isDoorOpen);

  const linePoints = useMemo(() => door.line, [door]);

  if (!linePoints || !state.isDoorOn) {
    return null;
  }

  return (
    <Line
      color="blue"
      name={isDoorOpen ? 'door-open' : 'door-closed'}
      points={linePoints}
      lineWidth={8}
      visible={import.meta.env.DEV}
    />
  );
}

export default Door;