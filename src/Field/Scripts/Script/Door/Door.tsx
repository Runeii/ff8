import { useMemo, useRef, useState } from "react";
import { Script } from "../../types";
import { FieldData } from "../../../Field";
import { Mesh } from "three";
import { ScriptStateStore } from "../state";
import LineBlock from "../../../LineBlock/LineBlock";
import createScriptController from "../ScriptController/ScriptController";
import { vectorToFloatingPoint } from "../../../../utils";
import useIntersection, { STATES } from "../useIntersection";

type DoorProps = {
  doors: FieldData['doors'];
  script: Script;
  scriptController: ReturnType<typeof createScriptController>;
  useScriptStateStore: ScriptStateStore;
}

const Door = ({ doors, script, scriptController,  useScriptStateStore }: DoorProps) => {
  const isDoorOn = useScriptStateStore(state => state.isDoorOn);

  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const door = useMemo(() => {
    const doorId = parseInt(script.name.toLowerCase().replace('door', '')) - 1
    const entry = doors.find(door => door.doorID === doorId)!
    return entry;
  }, [doors, script.name]);

  const hitboxRef = useRef<Mesh>(null);

  const [playerOpenedFromSide, setPlayerOpenedFromSide] = useState<STATES>();
  const handleIntersect = (entrySide: STATES) => {
    if (playerOpenedFromSide) {
      return;
    }
    setPlayerOpenedFromSide(entrySide);
    scriptController.triggerMethod('open', false);
    setIsDoorOpen(true);
  }
  
  const handleExit = (entrySide: STATES) => {
    if (entrySide !== playerOpenedFromSide) {
      return;
    }
    setPlayerOpenedFromSide(undefined);
    scriptController.triggerMethod('close', false);
    setIsDoorOpen(false);
  }

  const linePoints = useMemo(() => door.line.map(vectorToFloatingPoint), [door]);

  useIntersection(hitboxRef.current, isDoorOn, {
    onTouchOn: handleIntersect,
    onTouchOff: handleExit,
  }, linePoints);

  if (!linePoints || !isDoorOn) {
    return null;
  }

  return (
    <LineBlock
      color={isDoorOpen ? 'green' : 'red'}
      lineBlockRef={hitboxRef}
      points={linePoints}
      name={`door-${script.name}`}
      userData={{
        isSolid: !isDoorOpen
      }}
    />
  );
}

export default Door;