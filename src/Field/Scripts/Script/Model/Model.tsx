import { Script, ScriptState } from "../../types";
import { lazy, useRef } from "react";
import { AnimationAction } from "three";

type ModelProps = {
  models: string[];
  script: Script;
  state: ScriptState;
}

const modelFiles = import.meta.glob('./gltf/d*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: React.ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({ models, state }: ModelProps) => {
  const modelId = state.modelId;

  //const idleAnimationId = state.idleAnimationId;
  //const isSolid = state.isSolid;
  //const angle = state.angle
  const partyMemberId = state.partyMemberId

  const modelRef = useRef<{ actions: AnimationAction[] }>();

  const setModelRef = (ref: { actions: AnimationAction[] } | null) => {
    if (!ref) {
      return;
    }
    modelRef.current = ref;
    Object.values(ref.actions)[0]?.play();
  }

  let modelName = models[modelId];
  if (modelName === 'd000') {
    modelName = 'd001'
  }
  const ModelComponent = components[modelName] ?? components[''];

  if (!ModelComponent) {
    return null;
  }

  return (
    <group rotation={[Math.PI / 2,0,Math.PI / -2]} position={[-0.055,0,0.054]}>
      <ModelComponent
        name={partyMemberId === undefined ? 'model' : `party--${partyMemberId}`}
        scale={0.058}
        ref={setModelRef}
      />
    </group>
  );
};

export default Model;