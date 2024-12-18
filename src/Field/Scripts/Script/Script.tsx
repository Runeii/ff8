import { useEffect, useMemo, useRef, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { FieldData } from "../../Field";
import { useFrame, useThree } from "@react-three/fiber";
import {  Group, Line3, Vector3 } from "three";
import createScriptState from "./state";
import { getDirectionToCamera, getLocalViewportTop, WORLD_DIRECTIONS } from "../../../utils";
import { convert255ToRadians, convertRadiansTo255, getRotationAngleToDirection } from "./utils";
import { createAnimationController } from "./AnimationController";
import { Line } from "@react-three/drei";

type ScriptProps = {
  controlDirection: FieldData['controlDirection'],
  doors: FieldData['doors'],
  isActive: boolean;
  models: string[];
  script: ScriptType;
  onSetupCompleted: () => void;
}

// Not implemented
// * Pushable
const Script = ({ controlDirection, doors, isActive, models, script, onSetupCompleted }: ScriptProps) => {
  const entityRef = useRef<Group>(null);

  const [activeMethodId, setActiveMethodId] = useState<string>();
  const [remoteExecutionKey, setRemoteExecutionKey] = useState<string>();
  useEffect(() => {
    if (activeMethodId) {
      return;
    }
  
    if (!remoteExecutionKey) {
      return;
    }

    document.dispatchEvent(new CustomEvent('scriptFinished', { detail: { key: remoteExecutionKey } }));
    setRemoteExecutionKey(undefined);
  }, [activeMethodId, remoteExecutionKey]);
  
  const useScriptStateStore = useMemo(() => createScriptState(), []);
  const animationController = useMemo(() => createAnimationController(), []);
  const hasCompletedConstructor = useMethod(script, useScriptStateStore, activeMethodId, setActiveMethodId, isActive, animationController);

  useEffect(() => {
    if (!hasCompletedConstructor) {
      return;
    }

    onSetupCompleted();
  }, [hasCompletedConstructor, onSetupCompleted]);

  const isSolid = useScriptStateStore(state => state.isSolid);
  const isVisible = useScriptStateStore(state => state.isVisible);
  const isUnused = useScriptStateStore(state => state.isUnused);
  const position = useScriptStateStore(state => state.position);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);

  useEffect(() => {
    if (isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel } }: {detail: ExecuteScriptEventDetail}) => {
    //  console.log('request received', scriptLabel, script.groupId, script.methods)
      const matchingMethod = script.methods.find((method) => method.scriptLabel === scriptLabel);
      if (!matchingMethod) {
        return;
      }
      
    //  console.log('request accepted', matchingMethod, scriptLabel, useScriptStateStore.getState())
      setActiveMethodId(matchingMethod?.methodId);
      setRemoteExecutionKey(key);
    }

    const handlePartyEntityExecutionRequest = async ({ detail: { key, methodIndex, partyMemberId: requestedPartyMemberId } }: {detail: ExecutePartyEntityScriptEventDetail}) => {
      if (requestedPartyMemberId !== undefined && partyMemberId !== requestedPartyMemberId) {
        return;
      }
      const matchingMethod = script.methods[methodIndex];
      if (!matchingMethod) {
        return;
      }
      
    //  console.log('request accepted on entity', matchingMethod, requestedPartyMemberId)
      setActiveMethodId(matchingMethod?.methodId);
      setRemoteExecutionKey(key);
    }
  
    document.addEventListener('executeScript', handleExecutionRequest);
    document.addEventListener('executeScriptOnPartyEntity', handlePartyEntityExecutionRequest);

    return () => {
      document.removeEventListener('executeScript', handleExecutionRequest);
      document.removeEventListener('executeScriptOnPartyEntity', handlePartyEntityExecutionRequest);
    }
  }, [activeMethodId, isUnused, partyMemberId, script.groupId, script.methods, setActiveMethodId, useScriptStateStore]);
  
  const activeParty = useGlobalStore(storeState => storeState.party);
  
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  useEffect(() => {
    if (!isTransitioningMap) {
      return;
    }
    const { backgroundAnimationSpring, position, headAngle, angle} = useScriptStateStore.getState();
    animationController.stopAnimations();
    position.pause();
    headAngle.pause();
    angle.pause();
    backgroundAnimationSpring.pause();
  }, [animationController, isTransitioningMap, useScriptStateStore]);

  if (isUnused) {
    return null;
  }

  if (partyMemberId !== undefined && !activeParty.includes(partyMemberId)) {
    return null;
  }

  return (
    <animated.group
      position={position as unknown as Vector3}
      ref={entityRef}
      name={isSolid ? 'blockage' : 'script'}
      visible={isVisible}
    >
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location script={script} useScriptStateStore={useScriptStateStore} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model controlDirection={controlDirection} animationController={animationController} models={models} setActiveMethodId={setActiveMethodId} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;