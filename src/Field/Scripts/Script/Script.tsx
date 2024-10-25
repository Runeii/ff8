import { act, useEffect, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import { Sphere } from "@react-three/drei";
import { DoubleSide } from "three";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";

type ScriptProps = {
  script: ScriptType;
}

const Script = ({ script }: ScriptProps) => {
  const [activeMethodId, setActiveMethodId] = useState<number>();
  const scriptState = useMethod(script, activeMethodId, setActiveMethodId);

  if (activeMethodId) {
    console.log('activeMethodId', activeMethodId);
  }

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

  return (
    <group position={scriptState.position}>
      <TalkRadius isTalkEnabled={scriptState.isTalkable} radius={scriptState.talkRadius / 4000} script={script} setActiveMethodId={setActiveMethodId} />
      {script.type === 'background' && <Background script={script} state={scriptState} />}
      {script.type === 'location' && <Location script={script} state={scriptState} setActiveMethodId={setActiveMethodId} />}
    </group>
  );
}

export default Script;