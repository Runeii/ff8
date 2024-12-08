import { Script } from "../../types";
import {  ComponentType, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Bone, Euler, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame } from "@react-three/fiber";
import Follower from "./Follower/Follower";
import { ScriptStateStore } from "../state";

type ModelProps = {
  models: string[];
  script: Script;
  useScriptStateStore: ScriptStateStore
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({ models, script, useScriptStateStore }: ModelProps) => {
  const animationProgress = useScriptStateStore(state => state.animationProgress);
  const currentAnimationId = useScriptStateStore(state => state.currentAnimationId);
  const headAngle = useScriptStateStore(state => state.headAngle);
  const idleAnimationId = useScriptStateStore(state => state.idleAnimationId);
  const modelId = useScriptStateStore(state => state.modelId);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);

  const isPlayerControlled = useGlobalStore(state => state.party[0] === partyMemberId);
  const [animations, setAnimations] = useState<GltfHandle['animations']>();
  const [meshGroup, setMeshGroup] = useState<Group>();
  const [head, setHead] = useState<Bone>();

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

    setAnimations(ref.animations);
    setMeshGroup(ref.group.current);
    setHead(ref.nodes.head);
    convertMaterialsToBasic(ref.group.current);
  }, [convertMaterialsToBasic]);

  useEffect(() => {
    if (!animations) {
      return;
    }
    const durations = animations.clips.map((clip) => clip.duration);
    useScriptStateStore.setState({
      animationDurations: durations
    });
  }, [animations, modelName, useScriptStateStore]);


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

  const playAnimationIndex = useGlobalStore(state => state.playerAnimationIndex);
  const activeIdleAnimationId = partyMemberId !== undefined ? playAnimationIndex : idleAnimationId;
  const activeAnimationId = currentAnimationId ?? activeIdleAnimationId

  const currentAction = useMemo(() => {
    if (!animations || !animations.mixer || activeAnimationId === undefined) {
      return;
    }
    const mixer = animations.mixer;
    animations.mixer.stopAllAction();

    const clip = animations.clips[activeAnimationId ?? -1]
    if (!clip) {
      return;
    }
    
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    action.time = 0;
    animations.mixer.update(0);
    useScriptStateStore.getState().animationProgress.set(0);
  
    return action;
  }, [activeAnimationId, animations, useScriptStateStore]);


  const isTransitioningMap = useGlobalStore(state => !!state.pendingFieldId);
  useFrame(() => {
    if (!currentAction || activeAnimationId !== activeIdleAnimationId) {
      return;
    }
    
    if (isTransitioningMap) {
      currentAction.paused = true;
      return;
    }
    currentAction.paused = false;
  });

  useFrame(() => {
    if (!currentAction || activeAnimationId === activeIdleAnimationId || isTransitioningMap) {
      return;
    }
    
    currentAction.time = animationProgress.get() * currentAction.getClip().duration;
  });

  useFrame(() => {
    if (!head) {
      return;
    }

    head.rotation.y = headAngle.get();
  })

  const modelJsx = (
    <group name={`model--${script.groupId}`}>
      <Follower partyMemberId={partyMemberId} useScriptStateStore={useScriptStateStore}>
        <ModelComponent
          name={`party--${partyMemberId ?? 'none'}`}
          scale={0.06}
          // @ts-expect-error The typing for a lazy import with func ref setter seems obscure and bigger fish
          ref={setModelRef}
        />
      </Follower>
    </group>
  );

  if (isPlayerControlled) {
    return (
      <Controls modelName={modelName} useScriptStateStore={useScriptStateStore}>
        {modelJsx}
      </Controls>
    );
  }

  return modelJsx;
};

export default Model;