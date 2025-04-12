import { useEffect, useMemo, useRef, useState } from "react";
import { Script as ScriptType } from "../types";
import Background from "./Background/Background";
import Location from "./Location/Location";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { FieldData } from "../../Field";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import createScriptState from "./state";
import { createAnimationController } from "./AnimationController/AnimationController";
import { Box, Text } from "@react-three/drei";
import createMovementController from "./MovementController/MovementController";
import createRotationController from "./RotationController/RotationController";
import createScriptController from "./ScriptController/ScriptController";

type ScriptProps = {
  doors: FieldData['doors'],
  isActive: boolean;
  onSetupCompleted: () => void;
  models: string[];
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ doors, isActive, models, onSetupCompleted, script }: ScriptProps) => {
  const entityRef = useRef<Group>(null);

  const [activeMethodId, setActiveMethodId] = useState<string>();
  
  const scene = useThree(state => state.scene);
  const useScriptStateStore = useMemo(() => createScriptState(), []);
  const movementController = useMemo(() => createMovementController(script.groupId), [script.groupId]);
  const headController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const rotationController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const animationController = useMemo(() => createAnimationController(script.groupId, headController), [script.groupId, headController]);
  const scriptController = useMemo(() => createScriptController({
    animationController,
    headController,
    movementController,
    rotationController,
    script,
    scene,
    useScriptStateStore,
    isDebugging: script.groupId === 1
  }
  ), [animationController, headController, movementController, rotationController, script, scene, useScriptStateStore]);

  useEffect(() => {
    if (!isActive) {
      scriptController.triggerMethod('constructor').then(() => {
        onSetupCompleted();
      })
      return;
    }
    scriptController.triggerMethod('default', true)
  }, [isActive, scriptController, onSetupCompleted]);

  const isVisible = useScriptStateStore(state => state.isVisible);
  const isUnused = useScriptStateStore(state => state.isUnused);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isSolid = useScriptStateStore(state => state.isSolid);
  
  const activeParty = useGlobalStore(storeState => storeState.party);
  
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);

  useFrame(() => {
    scriptController.tick();
  })

  useEffect(() => {
    if (isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel, priority } }: {detail: ExecuteScriptEventDetail}) => {
      const matchingMethod = script.methods.find((method) => method.scriptLabel === scriptLabel);
      if (!matchingMethod) {
        return;
      }
      console.log('Executing script:', key, scriptLabel, priority);
      try {
        await scriptController.triggerMethod(matchingMethod.methodId, false, priority)
        document.dispatchEvent(new CustomEvent('scriptFinished', { detail: { key} }));
      } catch (error) {
        console.error('Error executing script:', error);
      }
    }
  
    document.addEventListener('executeScript', handleExecutionRequest);

    return () => {
      document.removeEventListener('executeScript', handleExecutionRequest);
    }
  }, [isUnused, script.methods, scriptController]);
  

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

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

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
        scriptController
      }}
      visible={isVisible}
    >
      {isDebugMode || true && <Text fontSize={0.1}>{script.groupId}-{partyMemberId}</Text>}
      {isSolid && <Box args={[0.05, 0.05, 0.2]} name={`entity--${script.groupId}-hitbox`} visible={false} userData={{ isSolid }} />}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location scriptController={scriptController} script={script} useScriptStateStore={useScriptStateStore} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model scriptController={scriptController} animationController={animationController} movementController={movementController} rotationController={rotationController} models={models} setActiveMethodId={setActiveMethodId} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door scriptController={scriptController} doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;