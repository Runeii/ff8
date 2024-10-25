import { Sphere } from "@react-three/drei"
import { Box3, DoubleSide, Group, Mesh } from "three";
import { Script } from "../../types";
import {  useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";

type TalkRadiusProps = {
  isTalkEnabled: boolean;
  radius: number;
  script: Script,
  setActiveMethodId: (methodId?: number) => void;
}

const TalkRadius = ({ isTalkEnabled, radius, script, setActiveMethodId }: TalkRadiusProps) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const talkSphereRef = useRef<Mesh>(null);

  const character = useThree(({ scene }) => scene.getObjectByName('character') as Group);
  const talkSphereBox = useRef(new Box3());
  const characterBox = useRef(new Box3());
  
  useFrame(() => {
    if (!talkSphereRef.current || !character) return;
  
    // Update the world matrix to get accurate positions
    talkSphereRef.current.updateMatrixWorld();
    character.updateMatrixWorld();
  
    // Set Box3 bounds from objects
    talkSphereBox.current.setFromObject(talkSphereRef.current);
    characterBox.current.setFromObject(character);
  
    // Check intersection and update state
    const isIntersecting = talkSphereBox.current.intersectsBox(characterBox.current);
    setIsIntersecting(isIntersecting);
  });

  if (isIntersecting) {
  console.log(script.groupId, isIntersecting);
  }

  useEffect(() => {
    if (!isIntersecting) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ') {
        return;
      }

      const talkMethod = script.methods.find(method => method.methodId === 'talk');
      setActiveMethodId(talkMethod?.scriptLabel);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [isIntersecting, script.methods, setActiveMethodId]);

  return (
    <Sphere
      args={[radius]}
      ref={talkSphereRef}
      visible={true}
    >
      <meshBasicMaterial color={isTalkEnabled ? `white` : `red`} side={DoubleSide} />
    </Sphere>
  );
}

export default TalkRadius;