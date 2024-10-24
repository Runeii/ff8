import { useEffect, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import { Sphere } from "@react-three/drei";
import { DoubleSide } from "three";
import Background from "./Background/Background";
import Location from "./Location/Location";

type ScriptProps = {
  script: ScriptType;
}

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

  return (
    <group position={scriptState.position}>
      <Sphere
        args={[scriptState.talkRadius / 4000]}
        visible={true}
      >
        <meshBasicMaterial color="white" side={DoubleSide} />
      </Sphere>
      {script.type === 'background' && <Background script={script} state={scriptState} />}
      {script.type === 'location' && <Location script={script} state={scriptState} setActiveMethodId={setActiveMethodId} />}
    </group>
  );
}

export default Script;