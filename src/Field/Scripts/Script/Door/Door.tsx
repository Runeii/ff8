import { useMemo, useRef, useState } from "react";
import { Script } from "../../types";
import { Mesh } from "three";
import { ScriptStateStore } from "../state";
import LineBlock from "../../../LineBlock/LineBlock";
import createScriptController from "../ScriptController/ScriptController";
import { vectorToFloatingPoint } from "../../../../utils";
import useIntersection, { STATES } from "../useIntersection";

type DoorProps = {
  doors: Door[]
  script: Script;
  scriptController: ReturnType<typeof createScriptController>;
  useScriptStateStore: ScriptStateStore;
}

const Door = ({ doors, script, scriptController,  useScriptStateStore }: DoorProps) => {
  const isDoorOn = useScriptStateStore(state => state.isDoorOn);

  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const door = useMemo(() => {
    const entry = doors.find(door => door.name === script.name)!
    if (!entry) {
      console.warn(`Door with name ${script.name} not found in doors array.`);
    }
    return entry;
  }, [doors, script.name]);

  const hitboxRef = useRef<Mesh>(null);

  const [playerOpenedFromSide, setPlayerOpenedFromSide] = useState<STATES>();
  const handleIntersect = async (entrySide: STATES) => {
    if (playerOpenedFromSide) {
      return;
    }
    setPlayerOpenedFromSide(entrySide);
    await scriptController.triggerMethod('open');
    console.log(`Door ${script.name} opened from side: ${entrySide}`);
    setIsDoorOpen(true);
  }
  
  const handleExit = async (entrySide: STATES) => {
    if (entrySide !== playerOpenedFromSide) {
      return;
    }
    setPlayerOpenedFromSide(undefined);
    setIsDoorOpen(false);
    console.log(`Door ${script.name} closed from side: ${entrySide}`);
    await scriptController.triggerMethod('close');
  }

  const linePoints = useMemo(() => door && door.line.map(vectorToFloatingPoint), [door]);

  useIntersection(hitboxRef, isDoorOn, {
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