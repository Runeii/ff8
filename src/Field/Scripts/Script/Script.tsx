import { useEffect, useMemo, useRef, useState } from "react";
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
import { useFrame } from "@react-three/fiber";
import {  Group, Quaternion, Vector3 } from "three";
import createScriptState from "./state";
import { computeSignedAngleTo, getDirectionToCamera, getLocalViewportTop } from "../../../utils";

type ScriptProps = {
  doors: FieldData['doors'],
  models: string[];
  script: ScriptType;
  onSetupCompleted: () => void;
}

// Not implemented
// * Pushable
const Script = ({ doors, models, script, onSetupCompleted }: ScriptProps) => {
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
  

  const useScriptStateStore = useMemo(() => createScriptState(), []);

  const hasCompletedConstructor = useMethod(script, useScriptStateStore, activeMethodId, setActiveMethodId);

  useEffect(() => {
    if (!hasCompletedConstructor) {
      return;
    }

    onSetupCompleted();
  }, [hasCompletedConstructor, onSetupCompleted]);

  const isVisible = useScriptStateStore(state => state.isVisible);
  const isUnused = useScriptStateStore(state => state.isUnused);
  const position = useScriptStateStore(state => state.position);
  const isTalkable = useScriptStateStore(state => state.isTalkable);
  const talkRadius = useScriptStateStore(state => state.talkRadius);
  const partyMemberId = useScriptStateStore(state => state.partyMemberId);

  useEffect(() => {
    if (isUnused) {
      return;
    }

    const handleExecutionRequest = async ({ detail: { key, scriptLabel, partyMemberId: requestedPartyMemberId, source } }: {detail: ExecuteScriptEventDetail}) => {
      if (requestedPartyMemberId !== undefined && partyMemberId !== requestedPartyMemberId) {
        console.warn('Party member mismatch', requestedPartyMemberId, partyMemberId);
        return;
      }
      const matchingMethod = script.methods.find((method, index) => {
       // if (requestedPartyMemberId !== undefined) {
       //   console.log('Was checking partymember?', partyMemberId)
       //   return index === scriptLabel; // this seems broken?
       // }
      //  console.log(scriptLabel, method.scriptLabel, method.scriptLabel === scriptLabel);
        return method.scriptLabel === scriptLabel
      });

      if (!matchingMethod) {
       // console.warn('No matching method found', scriptLabel, script);
        return;
      }

   //   console.log('Remote execution', script.groupId, source);
      setActiveMethodId(matchingMethod?.methodId);
      setRemoteExecutionKey(key);
    }

    document.addEventListener('executeScript', handleExecutionRequest);

    return () => {
      document.removeEventListener('executeScript', handleExecutionRequest);
    }
  }, [activeMethodId, isUnused, partyMemberId, script.groupId, script.methods, setActiveMethodId]);

  const talkMethod = script.methods.find(method => method.methodId === 'talk');
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);
  
  const activeParty = useGlobalStore(storeState => storeState.party);

  useFrame(({camera}) => {
    if (!entityRef.current) {
      return;
    }

    entityRef.current.rotation.set(0, 0, 0);
    entityRef.current.quaternion.identity();
    let toCamera = getDirectionToCamera(entityRef.current, camera);

    if (toCamera.z > 0.9) {
      toCamera = getLocalViewportTop(entityRef.current, camera).negate();
    }
    toCamera.z = 0;

    const meshForward = new Vector3(-1,0,0).applyQuaternion(entityRef.current.quaternion).normalize();
    meshForward.z = 0;
    
    const meshUp = new Vector3(0, 0, 1).applyQuaternion(entityRef.current.quaternion).normalize();
    
    const baseAngle = computeSignedAngleTo(meshForward, toCamera, meshUp);

    const liveAngle = baseAngle - ((Math.PI * 2) / 255 * useScriptStateStore.getState().angle.get());
    const rotationQuaternion = new Quaternion().setFromAxisAngle(meshUp, liveAngle);

    entityRef.current.quaternion.multiply(rotationQuaternion);
  });

  if (isUnused) {
    return null;
  }

  if (partyMemberId !== undefined && !activeParty.includes(partyMemberId)) {
    return null;
  }

  return (
    <animated.group
      position={position as unknown as Vector3}
      ref={entityRef}
      visible={isVisible}
    >
      {isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          radius={talkRadius / 4096 / 1.5}
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
        />
      )}
      {script.type === 'background' && <Background script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'location' && <Location script={script} useScriptStateStore={useScriptStateStore} setActiveMethodId={setActiveMethodId} />}
      {script.type === 'model' && <Model models={models} script={script} useScriptStateStore={useScriptStateStore} />}
      {script.type === 'door' && <Door doors={doors} script={script} setActiveMethodId={setActiveMethodId} useScriptStateStore={useScriptStateStore} />}
    </animated.group>
  );
}

export default Script;