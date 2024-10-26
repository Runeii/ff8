import { useEffect, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";
import Model from "./Model/Model";
import useLerpPosition from "./useLerpPosition";
import useGlobalStore from "../../../store";

type ScriptProps = {
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ script }: ScriptProps) => {
  const [activeMethodId, setActiveMethodId] = useState<number>();
  const scriptState = useMethod(script, activeMethodId, setActiveMethodId);

  useEffect(() => {
    const handleExecutionRequest = ({ detail: { scriptId, methodId } }: {detail: ExecuteScriptEventDetail}) => {
      if (scriptId !== script.groupId) {
        return;
      }
      const matchingMethod = script.methods.find(method => method.scriptLabel === methodId);
      if (!matchingMethod) {
        return;
      }
      setActiveMethodId(matchingMethod?.scriptLabel);
    }

    document.addEventListener('executeScript', handleExecutionRequest);

    return () => {
      document.removeEventListener('executeScript', handleExecutionRequest);
    }
  }, [script.groupId, script.methods]);

  const talkMethod = script.methods.find(method => method.methodId === 'talk');
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);

  const currentPosition = useLerpPosition(scriptState.position, scriptState.movementSpeed / (4096 * 2));

  return (
    <group position={currentPosition} visible={scriptState.isVisible}>
      {scriptState.isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          isTalkEnabled={scriptState.isTalkable}
          radius={scriptState.talkRadius / 4096 / 2}
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
        />
      )}
      {script.type === 'background' && <Background script={script} state={scriptState} />}
      {script.type === 'location' && <Location script={script} state={scriptState} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model script={script} state={scriptState} />}
    </group>
  );
}

export default Script;