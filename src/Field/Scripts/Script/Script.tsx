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
  const isTalkable = useScriptStateStore(state => state.isTalkable);
  const talkRadius = useScriptStateStore(state => state.talkRadius);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const movementTarget = useScriptStateStore(state => state.movementTarget);

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

  const talkMethod = script.methods.find(method => method.methodId === 'talk');
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);
  
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

  useEffect(() => {
    if (!movementTarget || !entityRef.current) {
      return;
    }

    entityRef.current.rotation.set(0, 0, 0);
    entityRef.current.quaternion.identity();
    
    // Current forward
    const meshForward = new Vector3(-1,0,0).applyQuaternion(entityRef.current.quaternion).normalize();
    meshForward.z = 0;

    // Get up axis
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();
  
    // Calculate initial angle to face down
    const base = convert255ToRadians(controlDirection);
    const direction = WORLD_DIRECTIONS.FORWARD.clone().applyAxisAngle(meshUp, base);
    const faceDownBaseAngle = getRotationAngleToDirection(meshForward, direction, meshUp);

    const targetDirection = movementTarget.clone().sub(entityRef.current.position).normalize();
    const targetAngle = getRotationAngleToDirection(meshForward, targetDirection, meshUp);
    
    let radian = (targetAngle - faceDownBaseAngle) % (Math.PI * 2);
    if (radian < 0) {
      radian += Math.PI * 2; // Ensure the angle is in the range [0, 2π)
    }
  
    useScriptStateStore.getState().angle.set(convertRadiansTo255(radian));
  }, [controlDirection, movementTarget, useScriptStateStore]);

  useFrame(() => {
    if (!entityRef.current) {
      return;
    }

    entityRef.current.rotation.set(0, 0, 0);
    entityRef.current.quaternion.identity();
  
    // Current forward
    const meshForward = new Vector3(-1,0,0).applyQuaternion(entityRef.current.quaternion).normalize();
    meshForward.z = 0;

    // Get up axis
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();
  
    // Calculate initial angle to face down
    const base = convert255ToRadians(controlDirection);
    const direction = WORLD_DIRECTIONS.FORWARD.clone().applyAxisAngle(meshUp, base);
    const faceDownBaseAngle = getRotationAngleToDirection(meshForward, direction, meshUp);

    const currentRotation = convert255ToRadians(useScriptStateStore.getState().angle.get());
    entityRef.current.quaternion.setFromAxisAngle(meshUp, faceDownBaseAngle + currentRotation);
  });

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
      {isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          radius={talkRadius / 4096 / 1.5}
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
        />
      )}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location script={script} useScriptStateStore={useScriptStateStore} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model controlDirection={controlDirection} animationController={animationController} models={models} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;