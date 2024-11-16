import { Script, ScriptState } from "../../types";
import {  ComponentType, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {  Bone, Euler, Group, Quaternion } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame } from "@react-three/fiber";
import { playAnimation, playBaseAnimation } from "../common";

type ModelProps = {
  models: string[];
  script: Script;
  state: ScriptState;
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({ models, script, state }: ModelProps) => {
  const modelId = state.modelId;

  const partyMemberId = state.partyMemberId
  const isPlayerControlled = useGlobalStore(state => state.party[0] === partyMemberId && state.isUserControllable);

  const [animations, setAnimations] = useState<GltfHandle['animations']>();
  const [meshGroup, setMeshGroup] = useState<Group>();
  const [head, setHead] = useState<Bone>();

  let modelName = models[modelId];
  if (!modelName.includes('d')) {
    modelName = 'd070'
  }
  const ModelComponent = components[modelName];

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
    setAnimations(ref.animations);
    setMeshGroup(ref.group.current);
    setHead(ref.nodes.head);
  }, []);

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
  }, [modelName, meshGroup, state.angle]);

  const currentAction = useMemo(() => {
    const currentAnimationId = state.currentAnimationId ?? state.idleAnimationId
    if (!animations || !animations.mixer || currentAnimationId === undefined || isPlayerControlled) {
      return;
    }

    const mixer = animations.mixer;
    animations.mixer.stopAllAction();

    const clip = animations.clips[currentAnimationId ?? -1]
    if (!clip) {
      return;
    }

    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    action.time = 0;
    animations.mixer.update(0);
    return action;
  }, [animations, isPlayerControlled, state.currentAnimationId, state.idleAnimationId]);

  useFrame(() => {
    if (!currentAction || isPlayerControlled) {
      return;
    }
    currentAction.time = state.animationProgress.get() * currentAction.getClip().duration;
  });

  useFrame(() => {
    if (!head) {
      return;
    }
    head.rotation.y = state.headAngle.get();
  })

  const modelJsx = (
    <group name={`model--${script.groupId}`}>
      <ModelComponent
        name={`party--${partyMemberId ?? 'none'}`}
        scale={0.06}
        // @ts-expect-error The typing for a lazy import with func ref setter seems obscure and bigger fish
        ref={setModelRef}
      />
    </group>
  );

  if (isPlayerControlled) {
    return (
      <Controls animations={animations} state={state}>
        {modelJsx}
      </Controls>
    );
  }

  return modelJsx;
};

export default Model;