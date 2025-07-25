import { Cylinder } from "@react-three/drei"
import { Box3, DoubleSide, Mesh } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useMemo, useRef, useState } from "react";
import {  useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { ScriptStateStore } from "../state";
import createScriptController from "../ScriptController/ScriptController";
import { getPlayerEntity } from "../Model/modelUtils";

type TalkRadiusProps = {
  scriptController: ReturnType<typeof createScriptController>;
  talkMethod: ScriptMethod,
  useScriptStateStore: ScriptStateStore,
}

const TalkRadius = ({ scriptController, talkMethod, useScriptStateStore }: TalkRadiusProps) => {
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const isTalkable = useScriptStateStore(state => state.isTalkable);
  const hasActiveText = useGlobalStore(state => state.currentMessages.length > 0);
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);

  const hasValidTalkMethod = useMemo(() => {
    if (!talkMethod) {
      return false;
    }
    return talkMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [talkMethod]);

  
  const isPlayerAbleToTalk = isUserControllable && isTalkable && !hasActiveTalkMethod && hasValidTalkMethod && !hasActiveText;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const talkCylinderRef = useRef<Mesh>(null);
  const talkRadius = useScriptStateStore(state => state.talkRadius / 4096);
  const characterHeight = useScriptStateStore(state => state.characterHeight);

  const talkSphereBoxRef = useRef<Box3>(new Box3());
  const characterBoxRef = useRef<Box3>(new Box3());

  useFrame(({scene}) => {
    if (!isPlayerAbleToTalk || !talkCylinderRef.current) {
      return;
    }

    const player = getPlayerEntity(scene);
    if (!player) {
      return;
    }
    const meshHitbox = player.getObjectByName("hitbox") as Mesh;

    if (!meshHitbox) {
      return;
    }
  
    talkSphereBoxRef.current.setFromObject(talkCylinderRef.current);
    characterBoxRef.current.setFromObject(meshHitbox);

    const isIntersecting = talkSphereBoxRef.current.intersectsBox(characterBoxRef.current);
    setIsIntersecting(isIntersecting);
  });

  useEffect(() => {
    if (!isIntersecting || !isPlayerAbleToTalk) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.key !== ' ') {
        return;
      }

      useGlobalStore.setState({ hasActiveTalkMethod: true });
      scriptController.triggerMethod('talk').then(() => {
        useGlobalStore.setState({ hasActiveTalkMethod: false });
      });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [isIntersecting, talkMethod, scriptController, isPlayerAbleToTalk]);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);
 

  if (!isPlayerAbleToTalk) {
    return null;
  }

  return (
    <Cylinder
      args={[talkRadius,talkRadius, characterHeight * 1.5]}
      position={[0, 0, (characterHeight / 3)]}
      ref={talkCylinderRef}
      rotation={[Math.PI / 2, 0, 0]}
      visible={isDebugMode}
    >
      <meshBasicMaterial color={`white`} side={DoubleSide} opacity={0} transparent />
    </Cylinder>
  );
}

export default TalkRadius;