import { Script } from "../../types";
import {  ComponentType, type JSX, lazy, useCallback, useRef, useState } from "react";
import { Bone, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Vector3 } from "three";
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

type GenericModelProps = JSX.IntrinsicElements['group'] & {
  mapName: string;
}
const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<GenericModelProps>}>)];
}))

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

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const lastMovementTimeRef = useRef(0);
  useFrame(() => {
    const { isClimbingLadder, movementSpeed, position } = movementController.getState();

    if (isClimbingLadder) {
      return;
    }

    if (!position.isAnimating && lastMovementTimeRef.current + 60 < Date.now()) {
      animationController.setIdleAnimation(0);
      return;
    }

    if (!position.isAnimating) {
      return;
    }

    lastMovementTimeRef.current = Date.now();

    const WALK_ANIMATION = 1;
    const RUN_ANIMATION = 2;

    animationController.setIdleAnimation(movementSpeed > 2695 ? RUN_ANIMATION : WALK_ANIMATION);
  });

  // Footstep
  const previousFootstepRef = useRef<'left' | 'right' | undefined>(undefined);
  const isBetweenFootstepsRef = useRef(false);
  const [playerPosition] = useState<Vector3>(new Vector3(0, 0, 0));
  const FOOTSTEP_DELAY_RUNNING = 420;
  const FOOTSTEP_DELAY_WALKING = 500;
  useFrame(({ scene }) => {
    const { isClimbingLadder, footsteps, movementSpeed, position } = movementController.getState();

    const camera = scene.getObjectByName("sceneCamera") as PerspectiveCamera;
    const isAnimating = position.isAnimating;
    const hasFootsteps = footsteps.isActive;
    const isWalking = movementSpeed < 2695
  
    if (!isAnimating || hasFootsteps || isBetweenFootstepsRef.current || isClimbingLadder) {
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
          scriptController={scriptController}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
        <ModelComponent
          name={`party--${partyMemberId ?? 'none'}`}
          scale={0.06}
          mapName={fieldId}
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