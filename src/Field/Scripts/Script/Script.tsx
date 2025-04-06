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
import { createAnimationController } from "./AnimationController/AnimationController";
import { Box } from "@react-three/drei";
import createMovementController from "./MovementController/MovementController";
import createRotationController from "./RotationController/RotationController";

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
  const movementController = useMemo(() => createMovementController(script.groupId), [script.groupId]);
  const headController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const rotationController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const animationController = useMemo(() => createAnimationController(script.groupId, headController), [script.groupId, headController]);

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
    headController,
    movementController,
    rotationController,
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
    isPaused: !!(remoteExecutionRequests.length > 0 || activeMethodId),
    script,
    useScriptStateStore,
    animationController,
    headController,
    movementController,
    rotationController,
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
    headController,
    movementController,
    rotationController,
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
    headController,
    movementController,
    rotationController,
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
    const { backgroundAnimationSpring} = useScriptStateStore.getState();
    const { position } = movementController.getState();
    animationController.stopAnimation();
    position.pause();
    backgroundAnimationSpring.pause();
  }, [activeMethodId, animationController, isTransitioningMap, movementController, useScriptStateStore]);

  const controlDirection = useGlobalStore(state => state.fieldDirection);
  useFrame(({ scene }) => {
    if (!entityRef.current || script.type !== 'model') {
      return;
    }

    const position = movementController.getPosition();
    entityRef.current.position.set(position.x, position.y, position.z);

    entityRef.current.quaternion.identity();
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();

    const { movementTarget } = movementController.getState();
    if (movementTarget) {
      rotationController.turnToFaceVector(movementTarget, 0);      
    }

    const raw256Angle = rotationController.getState().angle.get();
    const faceDownAdjustment = -256 / 4;
    const adjustedForField = (raw256Angle + controlDirection + faceDownAdjustment) % 256;
    const radians = (adjustedForField / 256) * 2 * Math.PI;

    entityRef.current.quaternion.setFromAxisAngle(meshUp, radians);

    if (useScriptStateStore.getState().isHeadTrackingPlayer) {
      const player = scene.getObjectByName("character") as Group;
      headController.turnToFaceDirection(player.getWorldPosition(new Vector3()), 0);
    }
  });

  if (isUnused) {
    return null;
  }
  
  if (partyMemberId !== undefined && !activeParty.includes(partyMemberId)) {
    return null;
  }

  return (
    <animated.group
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
      {script.type === 'model' && <Model animationController={animationController} movementController={movementController} rotationController={rotationController} models={models} setActiveMethodId={setActiveMethodId} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;