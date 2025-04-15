import { Box, Line } from "@react-three/drei";
import { Script } from "../../types";
import { Box3, Mesh, Object3D, Vector3 } from "three";
import useLineIntersection from "../useIntersection";
import { useEffect, useMemo, useRef } from "react";
import TalkRadius from "../TalkRadius/TalkRadius";
import { ScriptStateStore } from "../state";
import useGlobalStore from "../../../../store";
import useIntersection from "../useIntersection";
import LineBlock from "../../../LineBlock/LineBlock";
import createScriptController from "../ScriptController/ScriptController";
import { useFrame } from "@react-three/fiber";

type LocationProps = {
  scriptController: ReturnType<typeof createScriptController>;
  useScriptStateStore: ScriptStateStore;
}

const Location = ({ scriptController, useScriptStateStore }: LocationProps) => {
  const isLineOn = useScriptStateStore(state => state.isLineOn);
  const linePoints = useScriptStateStore(state => state.linePoints);

  const lineRef = useRef<Mesh>(null);
  const isUserControllable = useGlobalStore(state => state.isUserControllable);

  useIntersection(lineRef.current, isLineOn && isUserControllable, {
    onTouchOn: () => {
      console.log('onTouchOn', scriptController.script.groupId)
       scriptController.triggerMethod('touchon', false);
    },
    onTouch: () => {
      console.log('onTouch', scriptController.script.groupId)
       scriptController.triggerMethod('touch', false);
    },
    onTouchOff: () => {
      console.log('onTouchOff', scriptController.script.groupId)
       scriptController.triggerMethod('touchoff', false);
    },
    onAcross: () => {
      console.log('onAcross', scriptController.script.groupId)
       scriptController.triggerMethod('across', false);
    },
  }, linePoints ?? [], scriptController.script.groupId);

  if (!linePoints || !isLineOn) {
    return null;
  }

  return (
    <LineBlock
      color="blue"
      lineBlockRef={lineRef}
      points={linePoints}
      renderOrder={0}
      />
  );
}

export default Location;