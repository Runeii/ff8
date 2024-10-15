import {  useState } from "react";
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
  const [isLineOff, setIsLineOff] = useState(false);

  useScript<{isLineOff: boolean, line: {start: VectorLike, end: VectorLike}}>(script, 'constructor?', (result) => {
    if (result.line !== undefined) {
      const lineStart = vectorToFloatingPoint(result.line.start);
      const lineEnd = vectorToFloatingPoint(result.line.end);
      setLine([lineStart, lineEnd]);
    }

    if (result.isLineOff !== undefined) {
      setIsLineOff(!!result.isLineOff);
    }
  }, {
    once: true,
  });

  useScript<{ isLineOff: boolean }>(script, 'default', (result) => {
    setIsLineOff(!!result.isLineOff);
  }, {
    condition: isLineOff,
  });

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

  useScript(script, 'talk', () => null, {
    condition: isIntersecting,
    trigger: 'Space',
    once: false
  });

  useScript(script, 'touchon', () => null, {
    condition: isIntersecting,
    once: true
  });

  useScript(script, 'touch', () => null, {
    condition: isIntersecting,
    once: false
  });

  useScript(script, 'touchoff', () => {
    setWasIntersecting(false);
  },{
    condition: !isIntersecting && wasIntersecting,
    once: true,
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
      <Text position={line[0]} color="black" fontSize={0.05}>{script.name}</Text>
    </>
  );
}

export default Location;