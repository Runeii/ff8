import { useEffect, useMemo, useRef } from "react";
import { Script as ScriptType } from "../types";
import Background from "./Background/Background";
import Location from "./Location/Location";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, Group, Vector3 } from "three";
import createScriptState from "./state";
import { createAnimationController } from "./AnimationController/AnimationController";
import { Sphere, Text } from "@react-three/drei";
import createMovementController from "./MovementController/MovementController";
import createRotationController from "./RotationController/RotationController";
import createScriptController from "./ScriptController/ScriptController";
import createSFXController from "./SFXController/SFXController";
import { getPlayerEntity } from "./Model/modelUtils";

type ScriptProps = {
  doors: Door[];
  isActive: boolean;
  onSetupCompleted: () => void;
  onStarted?: () => void;
  models: string[];
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ doors, isActive, models, onSetupCompleted, onStarted, script }: ScriptProps) => {
  const entityRef = useRef<Group>(null);
  
  const scene = useThree(state => state.scene);
  const useScriptStateStore = useMemo(() => createScriptState(script), [script]);
  const animationController = useMemo(() => createAnimationController(script.groupId), [script.groupId]);
  const movementController = useMemo(() => createMovementController(script.groupId, animationController), [script.groupId, animationController]);
  const headController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const rotationController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const sfxController = useMemo(() => createSFXController(script.groupId), [script.groupId]);
  const scriptController = useMemo(() => createScriptController({
    animationController,
    headController,
    movementController,
    rotationController,
    sfxController,
    script,
    scene,
    useScriptStateStore,
    isDebugging: false
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
    if (isUnused && hasTriggeredDefaultRef.current) {
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
      window.scriptDump({
        timestamps: [Date.now()],
        action: `Heard request to execute script ${scriptLabel} with key ${key}`,
        methodId: matchingMethod.methodId,
        opcode: undefined,
        payload: key,
        index: undefined,
        isAsync: false,
        scriptLabel
      });
      try {
        await scriptController.triggerMethod(matchingMethod.methodId, priority)
        window.scriptDump({
          timestamps: [Date.now()],
          action: `Completed remote execution of script ${scriptLabel} with key ${key}`,
          methodId: matchingMethod.methodId,
          opcode: undefined,
          payload: key,
          index: undefined,
          isAsync: false,
          scriptLabel
        })

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
  }, [animationController, isTransitioningMap, movementController, useScriptStateStore]);

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

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  if (isUnused) {
    return null;
  }

  return (
    <animated.group
      ref={entityRef}
      name={`entity--${script.groupId}`}
      userData={{
        scriptController
      }}
      visible={isVisible}
    >
      {script.groupId === 4 && <Sphere args={[0.02,10,10]} position={[0, 0, 0]} name="entity--4--collision" visible={true} userData={{ isSolid: true }}>
        <meshBasicMaterial color="purple" transparent opacity={1} side={DoubleSide} />
      </Sphere>}
      {isDebugMode && <Text fontSize={0.07}>{script.groupId}-{partyMemberId}</Text>}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location scriptController={scriptController} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'model' && <Model scriptController={scriptController} animationController={animationController} movementController={movementController} rotationController={rotationController} models={models} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door scriptController={scriptController} doors={doors} script={script} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;