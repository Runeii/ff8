import { useEffect, useRef, useState } from "react";
import { Script as ScriptType } from "../types";
import useMethod from "./useMethod";
import Background from "./Background/Background";
import Location from "./Location/Location";
import TalkRadius from "./TalkRadius/TalkRadius";
import Model from "./Model/Model";
import useGlobalStore from "../../../store";
import { animated, useSpring } from "@react-spring/three";
import Door from "./Door/Door";
import { FieldData } from "../../Field";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";

type ScriptProps = {
  doors: FieldData['doors'],
  models: string[];
  script: ScriptType;
}

// Not implemented
// * Pushable
const Script = ({ doors, models, script }: ScriptProps) => {
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

  const [movementSpring, setSpring] = useSpring(() => ({
    config: {
      duration: 100,
    },
    position: [0,0,0]
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
  
  const activeParty = useGlobalStore(storeState => storeState.party);

  const camera = useThree().camera;
  const containerRef = useRef<Group>(null);

  const [modelQuaternion] = useState(new Quaternion());
  const [upAxis] = useState(new Vector3(0, 1, 0)); // TODO: Can this be better? Sometimes meshes are on an angle
  useFrame(({camera}) => {
    if (!containerRef.current || !camera.userData.initialPosition || script.type !== 'model') {
      return;
    }

    const quaternion = camera.userData.initialQuaternion.clone();

    const baseAngle = Math.PI / 2; // facing 'down';
    quaternion.multiply(modelQuaternion.setFromAxisAngle(upAxis, baseAngle));
    containerRef.current.quaternion.copy(quaternion);
  
    if (scriptState.lookTarget) {
      const targetDirection = scriptState.lookTarget.clone().sub(containerRef.current.position).normalize();
      const projectedTargetDirection = targetDirection.clone().projectOnPlane(upAxis).normalize();
      
      const baseForward = new Vector3(0, 0, 1).applyQuaternion(quaternion).projectOnPlane(upAxis).normalize();

      const angle = Math.acos(baseForward.dot(projectedTargetDirection));
      const cross = new Vector3().crossVectors(baseForward, projectedTargetDirection);
      
      const signedAngle = cross.dot(upAxis) < 0 ? -angle : angle;

      const rotationQuat = new Quaternion();
      rotationQuat.setFromAxisAngle(upAxis, signedAngle);

      const finalQuaternion = quaternion.clone().multiply(rotationQuat);
      containerRef.current.quaternion.copy(finalQuaternion);

      return;
    }
    const angle = baseAngle + ((Math.PI * 2) / 255 * scriptState.angle);
    quaternion.multiply(modelQuaternion.setFromAxisAngle(upAxis, angle));
    containerRef.current.quaternion.copy(quaternion);

    //const currentRotation = containerRef.current.rotation.clone();
    //containerRef.current.lookAt(camera.userData.initialPosition);
    //containerRef.current.rotation.z += (Math.PI * 2) / 255 * 255;
  });

  if (scriptState.isUnused) {
    return null;
  }

  if (scriptState.partyMemberId !== undefined && !activeParty.includes(scriptState.partyMemberId)) {
    return null;
  }


  return (
    <animated.group
      position={movementSpring.position as unknown as [number,number,number]}
      rotation={[0, 0, 0]}
      ref={containerRef}
      visible={scriptState.isVisible}
    >
      {scriptState.isTalkable && talkMethod && !hasActiveTalkMethod && (
        <TalkRadius
          isTalkEnabled={scriptState.isTalkable}
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