import { useEffect, useState } from "react";
import { Script } from "../types";
import {  Mesh, Vector3 } from "three";
import {Text, Line as DreiLine } from "@react-three/drei";
import { vectorToFloatingPoint } from "../../../utils";
import { useFrame, useThree } from "@react-three/fiber";
import { checkForIntersection } from "../../Gateways/gatewayUtils";
import useScript from "../useScript";

type LocationProps = {
  script: Script;
};

const Location = ({ script }: LocationProps) => {
  const [line, setLine] = useState<Vector3[]>();

  const constructorReturnValue = useScript<{isLineOff: boolean, line: {start: VectorLike, end: VectorLike}}>(script, 'constructor?', {
    once: true
  });

  useEffect(() => {
    if (!constructorReturnValue?.line) {
      return;
    }
    const line = constructorReturnValue.line;
    const lineStart = vectorToFloatingPoint(line.start);
    const lineEnd = vectorToFloatingPoint(line.end);
    setLine([lineStart, lineEnd]);
  }, [constructorReturnValue?.line]);

  const defaultReturnValue = useScript<{ isLineOff: boolean }>(script, 'default', {
    condition: constructorReturnValue?.isLineOff,
  });

  const isLineOff = constructorReturnValue?.isLineOff ?? defaultReturnValue?.isLineOff;
  
  const player = useThree(({ scene }) => scene.getObjectByName('character') as Mesh);

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [wasIntersecting, setWasIntersecting] = useState(false);
  useFrame(() => {
    if (!line || isLineOff) {
      return false;
    }

    const isIntersecting = checkForIntersection(player, line);
    setIsIntersecting(isIntersecting);

    if (isIntersecting && !wasIntersecting) {
      setWasIntersecting(true);
    }
  });

  useScript(script, 'touchon', {
    condition: isIntersecting,
    once: true
  });

  useScript(script, 'touch', {
    condition: isIntersecting,
    once: false
  });

  useScript(script, 'touchoff', {
    condition: !isIntersecting && wasIntersecting,
    once: true,
    onComplete: () => {
      setWasIntersecting(false);
    }
  });

  if (!line || isLineOff) {
    return null;
  }

  return (
    <>
      <DreiLine
        points={line}
        lineWidth={5}
        color="red"
      />
      <Text position={line[0]} color="black" fontSize={0.1}>{script.name}</Text>
    </>
  );
}

export default Location;