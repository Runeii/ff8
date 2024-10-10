import { useEffect, useMemo, useRef, useState } from "react";
import { Script } from "../types";
import { executeOpcodes } from "../scriptUtils";
import { Line, Mesh, Vector3 } from "three";
import {Text, Line as DreiLine, Sphere } from "@react-three/drei";
import { vectorToFloatingPoint } from "../../../utils";
import { useFrame, useThree } from "@react-three/fiber";
import { checkForIntersection } from "../../Gateways/gatewayUtils";
import useScript from "../useScript";
import { is } from "@react-three/fiber/dist/declarations/src/core/utils";

type LocationProps = {
  script: Script;
};

const Location = ({ script }: LocationProps) => {
  const [line, setLine] = useState<Vector3[]>();


  const constructorReturnValue = useScript<{isLineOff: boolean, line: [Vector3, Vector3]}>(script, 'constructor?', {
    once: true
  }, (result) => {
    if (!result || !result.line) {
      return { isLineOff: false, line: undefined };
    }
    console.log(result)
    const isLineOff = (result as {isLineOff: boolean})?.isLineOff ? true : false;
    const lineStart = vectorToFloatingPoint(result.line.start);
    const lineEnd = vectorToFloatingPoint(result.line.end);

    return {
      isLineOff,
      line: [lineStart, lineEnd]
    }
  });

  useEffect(() => {
    if (!constructorReturnValue?.line) {
      return;
    }
    const line = constructorReturnValue.line;
    setLine(line);
  }, [constructorReturnValue?.line]);

  const defaultReturnValue = useScript<boolean>(script, 'default', {
    condition: constructorReturnValue?.isLineOff,
  }, (result) => {
    return (result as {isLineOff: boolean})?.isLineOff ? true : false;
  });

  const isLineOff = constructorReturnValue?.isLineOff || defaultReturnValue;
  
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