import { useEffect, useMemo, useRef } from "react";
import { Script as ScriptType } from "../types";
import Background from "./Background/Background";
import Location from "./Location/Location";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import createScriptState from "./state";
import { createAnimationController } from "./AnimationController/AnimationController";
import createMovementController from "./MovementController/MovementController";
import createRotationController from "./RotationController/RotationController";
import createScriptController from "./ScriptController/ScriptController";
import createSFXController from "./SFXController/SFXController";
import { getPlayerEntity } from "./Model/modelUtils";
import { FieldData } from "../../Field";

type ScriptProps = {
  doors: Door[];
  isActive: boolean;
  onSetupCompleted: () => void;
  onStarted?: () => void;
  models: string[];
  script: ScriptType;
  sounds: FieldData['sounds']
}

const Script = ({ doors, isActive, models, onSetupCompleted, onStarted, script, sounds }: ScriptProps) => {
  const entityRef = useRef<Group>(null);
  const scene = useThree(state => state.scene);
  const useScriptStateStore = useMemo(() => createScriptState(script), [script]);
  const animationController = useMemo(() => createAnimationController(script.groupId), [script.groupId]);
  const movementController = useMemo(() => createMovementController(script.groupId, animationController, useScriptStateStore), [script.groupId, animationController, useScriptStateStore]);
  const headController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const rotationController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const sfxController = useMemo(() => createSFXController(script.groupId, sounds ?? []), [script.groupId, sounds]);
  const scriptController = useMemo(() => createScriptController({
    animationController,
    headController,
    movementController,
    rotationController,
    sfxController,
    script,
    scene,
    useScriptStateStore,
  }), [animationController, headController, movementController, rotationController,sfxController, script, scene, useScriptStateStore]);

  const isVisible = useScriptStateStore(state => state.isVisible);
  const isUnused = useScriptStateStore(state => state.isUnused);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  
  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);

  const hasTriggeredConstructorRef = useRef<boolean>(false);
  const hasTriggeredDefaultRef = useRef<boolean>(false);
  useFrame(() => {
    if (!isActive && !hasTriggeredConstructorRef.current && entityRef.current) {
      hasTriggeredConstructorRef.current = true;
      scriptController.triggerMethod('constructor').then(() => {
        onSetupCompleted();
      })
    }
    if (!hasTriggeredDefaultRef.current && isActive) {
      hasTriggeredDefaultRef.current = true;
      scriptController.triggerMethod('default');
      onStarted?.();
    }
    if (isUnused && isActive) {
      return;
    }
    scriptController.tick();
  })

  useFrame((_, delta) => {
    const isTransitioningMap = !!useGlobalStore.getState().pendingFieldId;

    if (isTransitioningMap) {
      return;
    }

    animationController.tick(delta);
  });

  useEffect(() => {
    if (isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel, priority } }: {detail: ExecuteScriptEventDetail}) => {
      const matchingMethod = script.methods.find((method) => method.scriptLabel === scriptLabel);
      if (!matchingMethod) {
        return;
      }
      try {
        await scriptController.triggerMethod(matchingMethod.methodId, priority, true)
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
    return () => {
      sfxController.stop();
    }
  }, [sfxController]);
  

  useEffect(() => {
    if (!isTransitioningMap) {
      return;
    }
    const { backgroundAnimationSpring} = useScriptStateStore.getState();
    animationController.stopAnimation();
    movementController.pause();
    backgroundAnimationSpring.pause();
  }, [animationController, isTransitioningMap, movementController, useScriptStateStore]);

  const hasPausedMovement = useRef(false);
  useFrame(({ scene }, delta) => {
    if (!entityRef.current || script.type !== 'model') {
      return;
    }

    movementController.tick(entityRef.current, delta);

    entityRef.current.quaternion.identity();
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();

    const { goal } = movementController.getState().position
    if (goal) {
      rotationController.turnToFaceVector(goal, 0);
    }

    const isTalkingToPlayer = scriptController.isTalkingToPlayer();
    if (isTalkingToPlayer && !hasPausedMovement.current) {
      movementController.pause();
      hasPausedMovement.current = true;
    }

    if (!isTalkingToPlayer && hasPausedMovement.current) {
      movementController.resume();
      hasPausedMovement.current = false;
    }

    const raw256Angle = rotationController.getState().angle.get();
    const radians = (raw256Angle * Math.PI) / 128;

    entityRef.current.quaternion.setFromAxisAngle(meshUp, radians);

    if (useScriptStateStore.getState().isHeadTrackingPlayer) {
      const player = getPlayerEntity(scene);
      if (!player) {
        console.warn('Player character not found for head tracking');
        return;
      }
      headController.turnToFaceDirection(player.getWorldPosition(new Vector3()), 0);
    }
  });

  if (isUnused) {
    return null;
  }

  return (
    <animated.group
      ref={entityRef}
      name={`entity--${script.groupId}`}
      userData={{
        hasBeenPlaced: false,
        scriptController,
        partyMemberId,
        movementController,
        rotationController,
        useScriptStateStore,
      }}
      position={script.type === 'model' ? [10,10,10] : [0,0,0]}
      visible={isVisible}
  >
    <group name={`party--${partyMemberId}`} userData={{ test: 'test' }}>
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location scriptController={scriptController} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'model' && <Model scriptController={scriptController} animationController={animationController} movementController={movementController} rotationController={rotationController} models={models} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door scriptController={scriptController} doors={doors} script={script} useScriptStateStore={useScriptStateStore} />}
    </group>
    </animated.group>
  );
}

export default Script;