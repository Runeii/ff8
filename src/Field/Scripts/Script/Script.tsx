import { useEffect, useRef, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated } from "@react-spring/three";
import Door from "./Door/Door";
import { FieldData } from "../../Field";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, Group, Quaternion, Vector3 } from "three";
import { getCameraDirections, getCharacterForwardDirection } from "../../Camera/cameraUtils";
import { Line } from "@react-three/drei";
import { WORLD_DIRECTIONS } from "../../../utils";

type ScriptProps = {
  doors: FieldData['doors'],
  models: string[];
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ doors, models, script }: ScriptProps) => {
  const entityRef = useRef<Group>(null);

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
    setRemoteExecutionKey(undefined);
  }, [activeMethodId, remoteExecutionKey]);
  

  const scriptState = useMethod(script, activeMethodId, setActiveMethodId, entityRef);

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
  
  const activeParty = useGlobalStore(storeState => storeState.party);

  const camera = useThree().camera;

  const [test, setTest] = useState(new Vector3(0, 0, 0));
  useFrame(({camera}) => {
    if (!entityRef.current) {
      return;
    }

    entityRef.current.rotation.set(0, 0, 0);
    entityRef.current.quaternion.identity();

    const downVector = new Vector3().subVectors(camera.getWorldPosition(new Vector3()), entityRef.current.position);
    downVector.z = 0;
    downVector.normalize();

    const meshForward = new Vector3(-1, 0, 0).applyQuaternion(entityRef.current.quaternion).normalize();
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();

    const baseAngle = meshForward.angleTo(downVector);

    const liveAngle = baseAngle - ((Math.PI * 2) / 255 * scriptState.angle.get());
    const rotationQuaternion = new Quaternion();
    rotationQuaternion.setFromAxisAngle(meshUp, liveAngle);
    entityRef.current.quaternion.multiply(rotationQuaternion);
  });


  if (scriptState.isUnused) {
    return null;
  }

  if (scriptState.partyMemberId !== undefined && !activeParty.includes(scriptState.partyMemberId)) {
    return null;
  }

  if (!camera.userData.initialLookAt) {
    return;
  }


  return (
    <animated.group
      position={scriptState.position}
      ref={entityRef}
      visible={scriptState.isVisible}
    >
      {scriptState.isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          radius={scriptState.talkRadius / 4096 / 1.5}
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
        />
      )}
      {script.type === 'background' && <Background script={script} state={scriptState} />}
      {script.type === 'location' && <Location script={script} state={scriptState} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model models={models} script={script} state={scriptState} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} state={scriptState} />}
    </animated.group>
  );
}

export default Script;