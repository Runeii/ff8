import { Script, ScriptState } from "../../types";
import { lazy, useCallback, useRef } from "react";
import { AnimationAction } from "three";

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

  const modelRef = useRef<{ actions: AnimationAction[] }>();

  const setModelRef = useCallback((ref: { actions: AnimationAction[] } | null) => {
    if (!ref) {
      return;
    }
    modelRef.current = ref;
  }, []);
  
  let modelName = models[modelId];
  if (modelName === 'd000') {
    modelName = 'd001'
  }
  const ModelComponent = components['d001'] ?? components['fallback'];


  if (!ModelComponent) {
    return null;
  }
  return (
    <group rotation={[0,0,0]}>
      <ModelComponent
        name={partyMemberId === undefined ? `model--${script.groupId}` : `party--${partyMemberId}`}
        scale={0.06}
        // @ts-expect-error Need to use same ref format on all models
        ref={setModelRef}
        userData={{
          scriptId: script.groupId,
          actions: modelRef.current?.actions ?? [],
        }}
      />
    </group>
  );
};

export default Model;