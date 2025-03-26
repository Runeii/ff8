import { useEffect, useMemo, useRef, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { FieldData } from "../../Field";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import createScriptState from "./state";
import { WORLD_DIRECTIONS } from "../../../utils";
import { convert255ToRadians, convertRadiansTo255, getRotationAngleToDirection } from "./utils";
import { createAnimationController } from "./AnimationController";
import { Box } from "@react-three/drei";

type ScriptProps = {
  doors: FieldData['doors'],
  isActive: boolean;
  models: string[];
  script: ScriptType;
  onSetupCompleted: () => void;
}

// Not implemented
// * Pushable
const Script = ({ doors, isActive, models, script, onSetupCompleted }: ScriptProps) => {
  const entityRef = useRef<Group>(null);

  const [activeMethodId, setActiveMethodId] = useState<string>();

  const [remoteExecutionRequests, setRemoteExecutionRequests] = useState<RemoteExecutionRequest[]>([]);
  
  const useScriptStateStore = useMemo(() => createScriptState(), []);
  const animationController = useMemo(() => createAnimationController(), []);

  const [hasCompletedConstructor, setHasCompletedConstructor] = useState(false);

  // Constructor
  useMethod({
    methodId: 'constructor',
    isActive,
    isLooping: false,
    isPaused: false,
    script,
    useScriptStateStore,
    animationController,
    onComplete: () => {
      onSetupCompleted();
      setHasCompletedConstructor(true);
    },
  });

  // Default method (loop)
  useMethod({
    methodId: 'default',
    isActive: hasCompletedConstructor && !useScriptStateStore.getState().isUnused,
    isLooping: true,
    isDebugging: false,
    isPaused: !!(remoteExecutionRequests.length > 0 || activeMethodId),
    script,
    useScriptStateStore,
    animationController,
  });

  // Adhoc method handler
  useMethod({
    methodId: activeMethodId,
    isActive: hasCompletedConstructor && activeMethodId !== undefined,
    isLooping: false,
    isPaused: false,
    script,
    useScriptStateStore,
    animationController,
    isDebugging: script.groupId === 1,
    onComplete: () => {
      useGlobalStore.setState({ hasActiveTalkMethod: false });
      setActiveMethodId(undefined);
    },
  });

  // Remote execution request method handler
  const activeRemoteExecutionRequest = remoteExecutionRequests.at(-1);

  useMethod({
    key: activeRemoteExecutionRequest?.key,
    methodId: activeRemoteExecutionRequest?.methodId,
    isActive: hasCompletedConstructor && activeRemoteExecutionRequest !== undefined,
    isLooping: false,
    isPaused: false,
    script,
    useScriptStateStore,
    animationController,
    isDebugging: script.groupId === 1,
    onComplete: () => {
      setRemoteExecutionRequests(requests => {
        const [completedRequest, ...remainingRequests] = requests;
        document.dispatchEvent(new CustomEvent('scriptFinished', { detail: { key: completedRequest.key } }));
        return remainingRequests;
      });
    }
  });

  const isVisible = useScriptStateStore(state => state.isVisible);
  const isUnused = useScriptStateStore(state => state.isUnused);
  const position = useScriptStateStore(state => state.position);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isSolid = useScriptStateStore(state => state.isSolid);

  useEffect(() => {
    if (isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel } }: {detail: ExecuteScriptEventDetail}) => {
      const matchingMethod = script.methods.find((method) => method.scriptLabel === scriptLabel);
      if (!matchingMethod) {
        return;
      }

      setRemoteExecutionRequests(currentRequests => {
        const updatedRequests = [...currentRequests, {
          key,
          methodId: matchingMethod.methodId
        }]

        return updatedRequests;
      });
    }

    const handlePartyEntityExecutionRequest = async ({ detail: { key, methodIndex, partyMemberId: requestedPartyMemberId } }: {detail: ExecutePartyEntityScriptEventDetail}) => {
      if (requestedPartyMemberId !== undefined && partyMemberId !== requestedPartyMemberId) {
        return;
      }
      const matchingMethod = script.methods[methodIndex];
      if (!matchingMethod) {
        return;
      }

      setRemoteExecutionRequests(currentRequests => [...currentRequests, {
        key,
        methodId: matchingMethod.methodId
      }]);
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
    animationController.stopAnimation();
    position.pause();
    headAngle.pause();
    angle.pause();
    backgroundAnimationSpring.pause();
  }, [activeMethodId, animationController, isTransitioningMap, useScriptStateStore]);

  const fieldDirection = useGlobalStore(state => state.fieldDirection);
  const movementTarget = useScriptStateStore(state => state.movementTarget);
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
    const base = convert255ToRadians(fieldDirection);
    const direction = WORLD_DIRECTIONS.FORWARD.clone().applyAxisAngle(meshUp, base);
    const faceDownBaseAngle = getRotationAngleToDirection(meshForward, direction, meshUp);

    const targetDirection = movementTarget.clone().sub(entityRef.current.position).normalize();
    const targetAngle = getRotationAngleToDirection(meshForward, targetDirection, meshUp);
    
    let radian = (targetAngle - faceDownBaseAngle) % (Math.PI * 2);
    if (radian < 0) {
      radian += Math.PI * 2; // Ensure the angle is in the range [0, 2π)
    }
  
    useScriptStateStore.getState().angle.set(convertRadiansTo255(radian));
  }, [fieldDirection, movementTarget, useScriptStateStore]);

  useFrame(() => {
    if (!entityRef.current || script.type !== 'model') {
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
    const base = convert255ToRadians(fieldDirection);
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
      name={`entity--${script.groupId}`}
      userData={{
        isSolid,
      }}
      visible={isVisible}
    >
      {isSolid && <Box args={[0.05, 0.05, 0.2]} name={`entity--${script.groupId}-hitbox`} visible={false} userData={{ isSolid }} />}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location script={script} useScriptStateStore={useScriptStateStore} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model animationController={animationController} models={models} setActiveMethodId={setActiveMethodId} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;