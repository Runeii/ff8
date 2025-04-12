import { Sphere } from "@react-three/drei"
import { Box3, DoubleSide, Group, Mesh } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useMemo, useRef, useState } from "react";
import {  useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { CHARACTER_HEIGHT } from "../Model/Controls/Controls";
import { ScriptStateStore } from "../state";

type TalkRadiusProps = {
  setActiveMethodId: (methodId?: string) => void;
  talkMethod: ScriptMethod,
  useScriptStateStore: ScriptStateStore,
}

const TalkRadius = ({ setActiveMethodId, scriptController, talkMethod, useScriptStateStore }: TalkRadiusProps) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const talkSphereRef = useRef<Mesh>(null);

  const talkSphereBox = useRef(new Box3());
  const characterBox = useRef(new Box3());

  useFrame(({scene}) => {
    const character = scene.getObjectByName("character") as Group;

    if (!talkSphereRef.current || !character) return;
  
    talkSphereRef.current.updateMatrixWorld();
    character.updateMatrixWorld();
  
    talkSphereBox.current.setFromObject(talkSphereRef.current);
    characterBox.current.setFromObject(character);

    const isIntersecting = talkSphereBox.current.intersectsBox(characterBox.current);
    setIsIntersecting(isIntersecting);
  });

  const isTalkable = useScriptStateStore(state => state.isTalkable);
  const hasActiveTalkMethod = useGlobalStore(state => state.hasActiveTalkMethod);

  const hasValidTalkMethod = useMemo(() => {
    if (!talkMethod) {
      return false;
    }
    return talkMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [talkMethod]);

  const hasActiveText = useGlobalStore(state => state.currentMessages.length > 0);
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  
  const isPlayerAbleToTalk = isUserControllable && isTalkable && !hasActiveTalkMethod && hasValidTalkMethod && !hasActiveText;

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
      scriptController.triggerMethod('talk', false).then(() => {
        useGlobalStore.setState({ hasActiveTalkMethod: false });
      });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [isIntersecting, talkMethod, scriptController, setActiveMethodId, isPlayerAbleToTalk]);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);
 
  const talkRadius = useScriptStateStore(state => state.talkRadius / 4096 / 1.5);

  if (!isPlayerAbleToTalk) {
    return null;
  }

  return (
    <Sphere
      args={[talkRadius]}
      position={[0, 0, (CHARACTER_HEIGHT / 2)]}
      ref={talkSphereRef}
      userData={{
        isSolid: true,
      }}
      visible={isDebugMode}
    >
      <meshBasicMaterial color={`white`} side={DoubleSide} opacity={1} transparent />
    </Sphere>
  );
}

export default TalkRadius;