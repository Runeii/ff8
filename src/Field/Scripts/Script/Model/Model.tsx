import { Script } from "../../types";
import {  ComponentType, lazy, useCallback, useRef, useState } from "react";
import { Bone, Box3, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Vector3 } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame } from "@react-three/fiber";
import Follower from "./Follower/Follower";
import { ScriptStateStore } from "../state";
import { createAnimationController } from "../AnimationController/AnimationController";
import TalkRadius from "../TalkRadius/TalkRadius";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import { clamp } from "three/src/math/MathUtils.js";
import createScriptController from "../ScriptController/ScriptController";

type ModelProps = {
  animationController: ReturnType<typeof createAnimationController>;
  models: string[];
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  scriptController: ReturnType<typeof createScriptController>;
  script: Script;
  useScriptStateStore: ScriptStateStore,
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({animationController, models, scriptController, movementController, rotationController, script, useScriptStateStore }: ModelProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);
  const modelId = useScriptStateStore(state => state.modelId);

  const [meshGroup, setMeshGroup] = useState<Group>();

  const modelName = models[modelId]
  const ModelComponent = components[modelName];

  const convertMaterialsToBasic = useCallback((group: Group) => {
    group.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const meshBasicMaterial = new MeshBasicMaterial();
        meshBasicMaterial.color = child.material.color;
        meshBasicMaterial.map = child.material.map;
        meshBasicMaterial.side = DoubleSide
        child.material = meshBasicMaterial;
      }
    });
  }, []);

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
    convertMaterialsToBasic(ref.group.current);
    animationController.setHeadBone(ref.nodes.head as unknown as Bone);
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);


  const groupRef = useRef<Group>(null);
  const modelContainerRef = useRef<Group>(null);
  useFrame(() => {
    if (!groupRef.current || !modelContainerRef.current) {
      return;
    }
    groupRef.current.position.z = 0;
    modelContainerRef.current.updateMatrixWorld(true);
    modelContainerRef.current.updateMatrix();
    modelContainerRef.current.updateWorldMatrix(true, false);
    const boundingBox = new Box3().setFromObject(modelContainerRef.current);
    const height = (boundingBox.max.z - boundingBox.min.z);

    groupRef.current.position.z = height / 2
  });

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const framesSinceMovementRef = useRef(0);
  useFrame(() => {
    const { idle: {animationId: idleAnimationId}, ladderAnimationId } = animationController.getState();
    const { isAnimationEnabled, isClimbingLadder, movementSpeed, position } = movementController.getState();

    const isTransitioningMap = !!useGlobalStore.getState().pendingFieldId;

    if (!isAnimationEnabled || isTransitioningMap) {
      animationController.pauseAnimation();
      return;
    }
    
    if (!position.isAnimating && idleAnimationId === 0) {
      return;
    }

    if (!position.isAnimating && framesSinceMovementRef.current > 8) {
      animationController.setIdleAnimation(0);
      animationController.requestIdleAnimation();
      return;
    }

    if (!position.isAnimating) {
      framesSinceMovementRef.current++;
      return;
    }

    framesSinceMovementRef.current = 0;

    const WALK_ANIMATION = 1;
    const RUN_ANIMATION = 2;
    const LADDER_ANIMATION = ladderAnimationId;

    if (isClimbingLadder && LADDER_ANIMATION) {
      animationController.setIdleAnimation(LADDER_ANIMATION);
      animationController.requestIdleAnimation();
      return;
    }
  
    animationController.setIdleAnimation(movementSpeed > 2695 ? RUN_ANIMATION : WALK_ANIMATION);
    animationController.requestIdleAnimation();
  });

  // Footstep
  const previousFootstepRef = useRef<'left' | 'right' | undefined>();
  const isBetweenFootstepsRef = useRef(false);
  const [playerPosition] = useState<Vector3>(new Vector3(0, 0, 0));
  const FOOTSTEP_DELAY_RUNNING = 420;
  const FOOTSTEP_DELAY_WALKING = 500;
  useFrame(({ scene }) => {
    const camera = scene.getObjectByName("sceneCamera") as PerspectiveCamera;
    const isAnimating = movementController.getState().position.isAnimating;
    const hasFootsteps = movementController.getState().footsteps.isActive;
    const isWalking = movementController.getState().movementSpeed < 2695
  
    if (!isAnimating || hasFootsteps || isBetweenFootstepsRef.current) {
      return;
    }

    const { leftSound, rightSound } = movementController.getState().footsteps;

    if (!leftSound || !rightSound) {
      return;
    }
    
    const player = scene.getObjectByName("character") as Mesh;
    player.getWorldPosition(playerPosition);
    const distance = playerPosition.distanceTo(camera.position);

    const nextFootstep = previousFootstepRef.current === 'right' ? leftSound : rightSound;
    isBetweenFootstepsRef.current = true;
    nextFootstep.seek(0);
    nextFootstep.volume(clamp(0.2, (isWalking ? 0.5 : 1) * (2 - distance), 1));
    nextFootstep.play();
    previousFootstepRef.current = previousFootstepRef.current === 'right' ? 'left' : 'right';

    window.setTimeout(() => {
      isBetweenFootstepsRef.current = false;
    }, isWalking ? FOOTSTEP_DELAY_WALKING : FOOTSTEP_DELAY_RUNNING);
  });

  const talkMethod = script.methods.find(method => method.methodId === 'talk');

  const modelJsx = (
    <group ref={groupRef}>
      {talkMethod && !isLeadCharacter && !isFollower && meshGroup && (
        <TalkRadius
          scriptController={scriptController}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
      <group ref={modelContainerRef}>
      <ModelComponent
        name={`party--${partyMemberId ?? 'none'}`}
        scale={0.06}
        mapName={fieldId}
        // @ts-expect-error The typing for a lazy import with func ref setter seems obscure and bigger fish
        ref={setModelRef}
        userData={{
          partyMemberId,
          movementController,
          rotationController,
          useScriptStateStore,
          scriptController
        }}
        />
      </group>
    </group>
  );

  if (isLeadCharacter) {
    return (
      <Controls movementController={movementController} rotationController={rotationController}>
        {modelJsx}
      </Controls>
    );
  } else if (isFollower) {
    return (
      <Follower movementController={movementController} partyMemberId={partyMemberId} rotationController={rotationController} useScriptStateStore={useScriptStateStore}>
        {modelJsx}
      </Follower>
    )
  } else {
    return modelJsx;
  }
};

export default Model;