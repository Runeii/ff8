import { Script, ScriptState } from "../../types";
import { lazy, useCallback, useState } from "react";
import { AnimationAction } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";

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

  const setModelRef = useCallback((ref: { actions: Record<string, AnimationAction> } | null) => {
    if (!ref || ref.actions === actions) {
      return;
    }
    setActions(ref.actions);
  }, [actions]);
  
  let modelName = models[modelId];
  if (modelName.includes('p')) {
    modelName = 'd010'
  }
  const ModelComponent = components['d001'] ?? components['fallback'];

  if (!ModelComponent) {
    return null;
  }

  const modelJsx = (
    <group rotation={[Math.PI / 2,0,0]} name={`model--${script.groupId}`}>
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