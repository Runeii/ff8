import { Script } from "../../types";
import {  ComponentType, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { AnimationClip, AnimationMixer, Bone, Euler, Group, LoopOnce, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame } from "@react-three/fiber";
import Follower from "./Follower/Follower";
import { ScriptStateStore } from "../state";
import { createAnimationController } from "../AnimationController";

type ModelProps = {
  animationController: ReturnType<typeof createAnimationController>;
  controlDirection: number;
  models: string[];
  script: Script;
  useScriptStateStore: ScriptStateStore,
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({ animationController, controlDirection, models, script, useScriptStateStore }: ModelProps) => {
  const headAngle = useScriptStateStore(state => state.headAngle);
  const modelId = useScriptStateStore(state => state.modelId);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);

  const isPlayerControlled = useGlobalStore(state => state.party[0] === partyMemberId);
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
  
    animationController.initialize(ref.animations.mixer, ref.animations.clips);
    setMeshGroup(ref.group.current);
    setHead(ref.nodes.head);
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

  useFrame(() => {
    if (!head) {
      return;
    }

    head.rotation.y = headAngle.get();
  })

  const modelJsx = (
    <group name={`model--${script.groupId}`}>
      <Follower animationController={animationController} partyMemberId={partyMemberId} useScriptStateStore={useScriptStateStore}>
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
      <Controls controlDirection={controlDirection} modelName={modelName} useScriptStateStore={useScriptStateStore}>
        {modelJsx}
      </Controls>
    );
  }

  return modelJsx;
};

export default Model;