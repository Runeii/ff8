import { Script, ScriptState } from "../../types";
import { lazy, useCallback, useEffect, useRef, useState } from "react";
import { AnimationAction, Euler, Group, Quaternion, SkinnedMesh, Vector3 } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame, useThree } from "@react-three/fiber";
import { getCameraDirections, getCharacterForwardDirection } from "../../../Camera/cameraUtils";
import { WORLD_DIRECTIONS } from "../../../../utils";

type ModelProps = {
  models: string[];
  script: Script;
  state: ScriptState;
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: React.ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({ models, script, state }: ModelProps) => {
  const modelId = state.modelId;

  const partyMemberId = state.partyMemberId
  const isPlayerControlled = useGlobalStore(state => state.party[0] === partyMemberId);

  const [actions, setActions] = useState<Record<string, AnimationAction>>({});
  const [scene, setScene] = useState<Group>();

  let modelName = models[modelId];
  if (modelName.includes('p')) {
    modelName = 'd010'
  }
  const ModelComponent = components['d001'] ?? components['fallback'];
  modelName = 'd001';
  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || ref.actions === actions) {
      return;
    }
    setActions(ref.actions);
    setScene(ref.group.current);
  }, [actions]);

  useEffect(() => {
    if (!scene) {
      return;
    }

    scene.rotation.set(0, 0, 0);
    scene.quaternion.identity();
  
    const eulerRotation = new Euler(Math.PI / 2, 0, 0); // Define your Euler rotation
    const quaternionFromEuler = new Quaternion();
    quaternionFromEuler.setFromEuler(eulerRotation);
    scene.applyQuaternion(quaternionFromEuler);
    scene.updateMatrix(); 
    scene.updateMatrixWorld(true);
  }, [modelName, scene, state.angle]);

  const modelJsx = (
    <group name={`model--${script.groupId}`}>
      <ModelComponent
        name={`party--${partyMemberId ?? 'none'}`}
        scale={0.06}
        // @ts-expect-error Need to use same ref format on all models
        ref={setModelRef}
        userData={{
          scriptId: script.groupId,
          actions: actions,
        }}
      />
    </group>
  );

  if (isPlayerControlled) {
    return (
      <Controls actions={actions} state={state}>
        {modelJsx}
      </Controls>
    );
  }

  return modelJsx;
};

export default Model;