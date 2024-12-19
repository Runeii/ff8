import { Sphere } from "@react-three/drei"
import { Box3, DoubleSide, Group, Mesh } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useRef, useState } from "react";
import {  useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";
import { CHARACTER_HEIGHT } from "../Model/Controls/Controls";

type TalkRadiusProps = {
  radius: number;
  setActiveMethodId: (methodId?: string) => void;
  talkMethod: ScriptMethod,
}

const TalkRadius = ({ radius, setActiveMethodId, talkMethod }: TalkRadiusProps) => {
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

  useEffect(() => {
    if (!isIntersecting) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.key !== ' ') {
        return;
      }

      useGlobalStore.setState({ hasActiveTalkMethod: true });
      setActiveMethodId(talkMethod?.methodId);
    }

    window.addEventListener('keydown', onKeyDown, {
      once: true,
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [isIntersecting, talkMethod, setActiveMethodId]);

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <Sphere
      args={[radius]}
      position={[0, 0, (CHARACTER_HEIGHT / 2)]}
      ref={talkSphereRef}
      visible={isDebugMode}
    >
      <meshBasicMaterial color={`white`} side={DoubleSide} opacity={1} transparent />
    </Sphere>
  );
}

export default TalkRadius;