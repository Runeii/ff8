import { Sphere } from "@react-three/drei"
import { Box3, DoubleSide, Group, Mesh } from "three";
import { ScriptMethod } from "../../types";
import {  useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import useGlobalStore from "../../../../store";

type TalkRadiusProps = {
  isTalkEnabled: boolean;
  radius: number;
  setActiveMethodId: (methodId?: string) => void;
  talkMethod: ScriptMethod,
}

const TalkRadius = ({ isTalkEnabled, radius, setActiveMethodId, talkMethod }: TalkRadiusProps) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const talkSphereRef = useRef<Mesh>(null);

  const character = useThree(({ scene }) => scene.getObjectByName('character') as Group);
  const talkSphereBox = useRef(new Box3());
  const characterBox = useRef(new Box3());
  
  useFrame(() => {
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
      console.log('In talk radius handler!')
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

  return (
    <Sphere
      args={[radius]}
      ref={talkSphereRef}
      visible={false}
    >
      <meshBasicMaterial color={isTalkEnabled ? `white` : `red`} side={DoubleSide} opacity={0.2} transparent />
    </Sphere>
  );
}

export default TalkRadius;