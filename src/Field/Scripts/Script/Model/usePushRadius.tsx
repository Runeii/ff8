import { Box3, Group, Mesh, Sphere, Vector3 } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useMemo, useRef, useState } from "react";
import {  useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { ScriptStateStore } from "../state";
import createScriptController from "../ScriptController/ScriptController";
import { getPlayerEntity } from "./modelUtils";

type usePushRadiusProps = {
  isActive: boolean;
  scriptController: ReturnType<typeof createScriptController>;
  pushMethod?: ScriptMethod,
  pushTargetRef: React.RefObject<Mesh | null>;
  useScriptStateStore: ScriptStateStore,
}

const usePushRadius = ({ isActive, scriptController, pushMethod, useScriptStateStore, pushTargetRef }: usePushRadiusProps) => {
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const isPushable = useScriptStateStore(state => state.isPushable);
  const hasActiveText = useGlobalStore(state => state.currentMessages.length > 0);
  const hasActivePushMethod = useGlobalStore(state => state.hasActivePushMethod);

  const hasValidPushMethod = useMemo(() => {
    if (!pushMethod) {
      return false;
    }
    return pushMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [pushMethod]);

  const isPlayerAbleToPush = isUserControllable && isPushable && !hasActivePushMethod && hasValidPushMethod && !hasActiveText;

  const [isIntersecting, setIsIntersecting] = useState(false);

  const reusableBox = useRef(new Box3());
  const reusableSphere = useRef(new Sphere());
  const tempVector = useRef(new Vector3());
  const frameCounter = useRef(0);

  useFrame(({scene}) => {
    frameCounter.current++;
  
    if (frameCounter.current < 30) {
      return;
    }

    if (!isActive || !isPlayerAbleToPush || !pushTargetRef.current) {
      return;
    }
    
    const player = getPlayerEntity(scene);
    if (!player) {
      return
    };

    const hasPlayerBeenPositioned = player.userData.hasBeenPlaced;
    if (!hasPlayerBeenPositioned) {
      return;
    }

    const playerMesh = player.getObjectByName("model") as Group;

    if (!playerMesh) {
      return;
    }

    // Reuse the same Box3 and Sphere instances
    const worldBox = reusableBox.current.setFromObject(playerMesh);
    
    // For sphere: reuse and transform
    if (!pushTargetRef.current.geometry.boundingSphere) {
      pushTargetRef.current.geometry.computeBoundingSphere();
      return;
    }
    
    const sphere = reusableSphere.current.copy(pushTargetRef.current.geometry.boundingSphere);
    pushTargetRef.current.getWorldPosition(tempVector.current);
    sphere.center.copy(tempVector.current);
    
    // Apply world scale to radius
    const worldScale = Math.max(
      pushTargetRef.current.scale.x,
      pushTargetRef.current.scale.y, 
      pushTargetRef.current.scale.z
    );
    sphere.radius *= worldScale;

    const isIntersecting = sphere.intersectsBox(worldBox);
    setIsIntersecting(isIntersecting);
  });

  useEffect(() => {
    if (!isActive || !isIntersecting || !isPlayerAbleToPush) {
      return;
    }

    useGlobalStore.setState({ hasActivePushMethod: true });
    scriptController.triggerMethod('push').then(() => {
      useGlobalStore.setState({ hasActivePushMethod: false });
    });
  }, [isActive, isIntersecting, scriptController, isPlayerAbleToPush]);
}

export default usePushRadius;