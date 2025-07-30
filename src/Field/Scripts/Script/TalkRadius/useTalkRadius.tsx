import { Box3, DoubleSide, Mesh, Object3D } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useMemo, useRef, useState } from "react";
import {  useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { ScriptStateStore } from "../state";
import createScriptController from "../ScriptController/ScriptController";
import { getPlayerEntity } from "../Model/modelUtils";

type useTalkRadiusProps = {
  isActive: boolean;
  scriptController: ReturnType<typeof createScriptController>;
  talkMethod?: ScriptMethod,
  talkTargetRef: React.RefObject<Object3D | null>;
  useScriptStateStore: ScriptStateStore,
}

const useTalkRadius = ({ isActive, scriptController, talkMethod, useScriptStateStore, talkTargetRef }: useTalkRadiusProps) => {
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

  const talkSphereBoxRef = useRef<Box3>(new Box3());
  const characterBoxRef = useRef<Box3>(new Box3());

  useFrame(({scene}) => {
    if (!isActive || !isPlayerAbleToTalk || !talkTargetRef.current) {
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
  
    talkSphereBoxRef.current.setFromObject(talkTargetRef.current);
    characterBoxRef.current.setFromObject(meshHitbox);

    const isIntersecting = talkSphereBoxRef.current.intersectsBox(characterBoxRef.current);
    setIsIntersecting(isIntersecting);
  });

  useEffect(() => {
    if (!isActive || !isIntersecting || !isPlayerAbleToTalk) {
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
  }, [isActive,isIntersecting, talkMethod, scriptController, isPlayerAbleToTalk]);
}

export default useTalkRadius;