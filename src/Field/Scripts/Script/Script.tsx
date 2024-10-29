import { useEffect, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated, useSpring } from "@react-spring/three";

type ScriptProps = {
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ script }: ScriptProps) => {
  const [activeMethodId, setActiveMethodId] = useState<string>();
  const [remoteExecutionKey, setRemoteExecutionKey] = useState<string>();

  useEffect(() => {
    if (activeMethodId) {
      return;
    }
  
    if (!remoteExecutionKey) {
      return;
    }

    document.dispatchEvent(new CustomEvent('scriptFinished', { detail: { key: remoteExecutionKey } }));
  }, [activeMethodId, remoteExecutionKey]);

  const [movementSpring, setSpring] = useSpring(() => ({
    config: {
      duration: 100,
    },
    position: [0,0,0],
  }), []);

  const scriptState = useMethod(script, activeMethodId, setActiveMethodId, setSpring);

  useEffect(() => {
    if (scriptState.isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel, partyMemberId } }: {detail: ExecuteScriptEventDetail}) => {
      if (partyMemberId !== undefined && partyMemberId !== scriptState.partyMemberId) {
        return;
      }
      const matchingMethod = script.methods.find((method, index) => {
        if (partyMemberId !== undefined) {
          return index === scriptLabel;
        }
        return method.scriptLabel === scriptLabel
      });
      if (!matchingMethod) {
        return;
      }

      setActiveMethodId(matchingMethod?.methodId);
      setRemoteExecutionKey(key);
    }

    document.addEventListener('executeScript', handleExecutionRequest);

    return () => {
      document.removeEventListener('executeScript', handleExecutionRequest);
    }
  }, [activeMethodId, script.groupId, script.methods, scriptState.isUnused, scriptState.partyMemberId, setActiveMethodId]);

  const talkMethod = script.methods.find(method => method.methodId === 'talk');
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);

  if (scriptState.isUnused) {
    return null;
  }

  return (
    <animated.group position={movementSpring.position as unknown as [number,number,number]} visible={scriptState.isVisible}>
      {scriptState.isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          isTalkEnabled={scriptState.isTalkable}
          radius={scriptState.talkRadius / 4096 / 2}
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
        />
      )}
      {script.type === 'background' && <Background script={script} state={scriptState} />}
      {script.type === 'location' && <Location activeMethodId={activeMethodId} script={script} state={scriptState} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model script={script} state={scriptState} />}
    </animated.group>
  );
}

export default Script;