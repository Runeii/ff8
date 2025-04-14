import { Script } from "../../types";
import {  ComponentType, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Euler, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from "three";
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

type ModelProps = {
  animationController: ReturnType<typeof createAnimationController>;
  models: string[];
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  setActiveMethodId: (methodId?: string) => void;
  script: Script;
  useScriptStateStore: ScriptStateStore,
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({animationController, models, scriptController, movementController, rotationController, script,setActiveMethodId, useScriptStateStore }: ModelProps) => {
  const modelId = useScriptStateStore(state => state.modelId);

  const [meshGroup, setMeshGroup] = useState<Group>();

  let modelName = models[modelId];

  if (modelName === 'd001') {
    modelName = 'd000'
  }
  if (!modelName.includes('d')) {
    modelName = 'd070'
  }

  const ModelComponent = components[modelName];

  const convertMaterialsToBasic = useCallback((group: Group) => {
    group.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const meshBasicMaterial = new MeshBasicMaterial();
        meshBasicMaterial.color = child.material.color;
        meshBasicMaterial.map = child.material.map;

        child.material = meshBasicMaterial;
      }
    });
  }, []);

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
  
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
    animationController.setHeadBone(ref.nodes.head);
    convertMaterialsToBasic(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);


  useEffect(() => {
    if (!meshGroup) {
      return;
    }

    meshGroup.rotation.set(0, 0, 0);
    meshGroup.quaternion.identity();
  
    const eulerRotation = new Euler(Math.PI / 2, 0, 0); // Define your Euler rotation
    const quaternionFromEuler = new Quaternion();
    quaternionFromEuler.setFromEuler(eulerRotation);
    meshGroup.applyQuaternion(quaternionFromEuler);
    meshGroup.updateMatrix(); 
    meshGroup.updateMatrixWorld(true);
  }, [modelName, meshGroup]);

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const framesSinceMovementRef = useRef(0);
  useFrame(() => {
    const { ladderAnimationId } = animationController.getState();
    const { isAnimationEnabled, isClimbingLadder, movementSpeed, position } = movementController.getState();

    if (!isAnimationEnabled) {
      animationController.stopAnimation();
      return;
    }

    if (!position.isAnimating && framesSinceMovementRef.current > 5) {
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
  useFrame(({ camera, scene }) => {
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
    <group>
      {talkMethod && !isLeadCharacter && !isFollower && meshGroup && (
        <TalkRadius
          meshGroup={meshGroup}
          setActiveMethodId={setActiveMethodId}
          scriptController={scriptController}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
      <ModelComponent
        name={`party--${partyMemberId ?? 'none'}`}
        scale={0.06}
        position={[0, 0, -0.004]}
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