import { useEffect, useMemo, useRef } from "react";
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
import createSFXController from "./SFXController/SFXController";
import { CHARACTER_HEIGHT } from "./Model/Controls/Controls";

type ScriptProps = {
  doors: Door[];
  isActive: boolean;
  onSetupCompleted: () => void;
  models: string[];
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ doors, isActive, models, onSetupCompleted, script }: ScriptProps) => {
  const entityRef = useRef<Group>(null);
  
  const scene = useThree(state => state.scene);
  const useScriptStateStore = useMemo(() => createScriptState(script), [script]);
  const movementController = useMemo(() => createMovementController(script.groupId), [script.groupId]);
  const headController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const rotationController = useMemo(() => createRotationController(script.groupId, movementController, entityRef), [script.groupId, movementController]);
  const animationController = useMemo(() => createAnimationController(script.groupId, headController), [script.groupId, headController]);
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
  const isSolid = useScriptStateStore(state => state.isSolid);
  
  const activeParty = useGlobalStore(storeState => storeState.party);
  
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
    if (!hasTriggeredDefaultRef.current && entityRef.current && isActive) {
      hasTriggeredDefaultRef.current = true;
      scriptController.triggerMethod('default', true)
    }
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
        scriptController
      }}
      visible={isVisible}
    >
      {isDebugMode && <Text fontSize={0.07}>{script.groupId}-{partyMemberId}</Text>}
      {isSolid && (
        <Box 
          args={[0.04,0.04, CHARACTER_HEIGHT * 1.5]}
          position={[0, 0, (CHARACTER_HEIGHT / 3)]}
          name={`entity--${script.groupId}-hitbox`}
          visible={isDebugMode}
          userData={{ isSolid: true }}
          >
          <meshBasicMaterial color="red" transparent opacity={0.5} />
        </Box>
      )}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location scriptController={scriptController} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'model' && <Model scriptController={scriptController} animationController={animationController} movementController={movementController} rotationController={rotationController} models={models} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door scriptController={scriptController} doors={doors} script={script} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;