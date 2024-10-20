import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Script } from "../types";
import useScript from "../useScript";
import { AnimationAction, Box3, DoubleSide, Group, LoopRepeat, MathUtils, Mesh, Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {animated, useSpring } from "@react-spring/three";
import { Sphere } from "@react-three/drei";
import { getAnimationById, playAnimation } from "./modelUtils";
import { getPositionOnWalkmesh } from "../../../utils";

const modelFiles = import.meta.glob('./gltf/d*.tsx');

// Create an object to hold lazy-loaded components
const models = Object.keys(modelFiles).reduce((acc, path) => {
  const fileName = path.match(/d(\d+)\.tsx$/)?.[0];
  if (fileName) {
    const modelId = Number(fileName.replace(/\.tsx$/, '').replace('d', ''));
    acc[modelId] = lazy(modelFiles[path] as () => Promise<{default: React.ComponentType<JSX.IntrinsicElements['group']>}>);
  }
  return acc;
}, {} as Record<number, React.LazyExoticComponent<React.ComponentType<JSX.IntrinsicElements['group']>>>);

const Model = ({ script }: { script: Script }) => {
  const walkmesh = useThree(({ scene }) => scene.getObjectByName('walkmesh') as Mesh);

  const [modelId, setModelId] = useState<number | undefined>();
  const [partyMemberId, setPartyMemberId] = useState<number | undefined>();
  const [idleAnimationId, setIdleAnimationId] = useState<number | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<Group>(null);

  const [movementSpeed, setMovementSpeed] = useState(0);
  const [position, setPosition] = useSpring(() => ({
    x: 0,
    y: 0,
    z: 0,
    onChange: ({ value }) => {
      if (!containerRef.current) {
        return;
      }
      containerRef.current.position.set(value.x, value.y, value.z);
    },
  }));

  const [angle, setAngle] = useState(0);
  const [isUnused, setIsUnused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [, setIsSolid] = useState(true);
  
  const [, setIsPushable] = useState(false);
  const [, setPushRadius] = useState(0);

  const [isTalkable, setIsTalkable] = useState(true);
  const [talkRadius, setTalkRadius] = useState(200);
  const [isIntersectingTalkSphere, setIsIntersectingTalkSphere] = useState(false);

  const ModelComponent = modelId ? models[modelId] : null;

  // Typing here is not ideal, but it works for now
  const ref = useRef<{actions: Record<string, AnimationAction>, mesh: Group} | null>(null);
  const setComponentRef = useCallback((node: unknown) => {
    if (!node) {
      return;
    }
    ref.current = node as typeof ref.current;
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (idleAnimationId === undefined || !ref.current || !isMounted) {
      return;
    }

    const action = getAnimationById(ref.current.actions, idleAnimationId);

    if (!action) {
      return;
    }

    action.setLoop(LoopRepeat, Infinity)
    action.enabled = true
    action.play();

    return () => {
     action.stop();
    }
  }, [idleAnimationId, isMounted, modelId]);

  type CompletionResult = {
    animationId: number,
    idleAnimationId: number,
    isLooping: boolean,
    isHoldingFinalFrame: boolean,
    modelId: number,
    isSolid: boolean,
    isUnused: boolean,
    isVisible: boolean,
    position: [number, number, number],
    movementDuration: number,
    isPushable: boolean,
    isTalkable: boolean
    movementSpeed: number
    angle: number
    talkRadius: number
    pushRadius: number
    partyMemberId: number
  }

  const completionHandler = (data: Partial<CompletionResult>) => {
    if (data.modelId !== undefined) {
      setModelId(data.modelId < 75 ? data.modelId : 1);
    }

    if (data.partyMemberId !== undefined) {
      setPartyMemberId(data.partyMemberId);
    }
  
    if (data.idleAnimationId !== undefined) {
      setIdleAnimationId(data.idleAnimationId);
    }

    if (data.animationId !== undefined && ref.current) {
      playAnimation(
        ref!.current!.actions,
        data.animationId,
        idleAnimationId!,
        data.isHoldingFinalFrame,
        data.isLooping
      );
    }

    if (data.isUnused !== undefined) {
      setIsUnused(data.isUnused);
    }

    if (data.isSolid !== undefined) {
      setIsSolid(data.isSolid);
    }

    if (data.isVisible !== undefined) {
      setIsVisible(data.isVisible);
    }

    if (data.position !== undefined) {
      setPosition.start({
        x: data.position[0],
        y: data.position[1],
        z: data.position[2] ?? getPositionOnWalkmesh(new Vector3(data.position[0], data.position[1], 0), walkmesh)?.z,
        immediate: movementSpeed === 0,
        config: { duration: movementSpeed * 2 },
      })
    }

    if (data.isPushable !== undefined) {
      setIsPushable(data.isPushable);
    }

    if (data.isTalkable !== undefined) {
      setIsTalkable(data.isTalkable);
    }

    if (data.movementSpeed !== undefined) {
      setMovementSpeed(data.movementSpeed);
    }

    if (data.angle !== undefined) {
      setAngle(data.angle);
    }

    if (data.talkRadius !== undefined) {
      setTalkRadius(data.talkRadius);
    }

    if (data.pushRadius !== undefined) {
      setPushRadius(data.pushRadius);
    }
  };

  const hasCompletedConstructor = useScript<CompletionResult>(script, 'constructor?', completionHandler, {
    once: true,
  });

  useEffect(() => {
    if (!hasCompletedConstructor || !containerRef.current) {
      return;
    }

    containerRef.current.position.set(position.x.get(), position.y.get(), position.z.get());
  }, [hasCompletedConstructor, position.x, position.y, position.z]);

  useScript<CompletionResult>(script, 'default', completionHandler, {
    condition: hasCompletedConstructor,
  })

  const talkSphereRef = useRef<Mesh>(null);
  const character = useThree(({ scene }) => scene.getObjectByName('character') as Group);
  useFrame(() => {
    // Check for interesction
    if (!talkSphereRef.current || !character) {
      return;
    }

    const talkSphere = new Box3().setFromObject(talkSphereRef.current);
    const characterBox = new Box3().setFromObject(character);

    const isIntersecting = talkSphere.intersectsBox(characterBox);
    setIsIntersectingTalkSphere(isIntersecting);
  })

  useScript(script, 'talk', () => null, {
    condition: isTalkable && isIntersectingTalkSphere,
    trigger: 'Space',
    once: false
  });

  const [rotationSpring, setRotationSpring] = useSpring(() => ({
    rotation: [0, 0, 0],
  }), [angle]);

  useEffect(() => {
    const base = 0.5;
    const angleInDegrees = (angle / 255) * 360;
    const angleInRadians = MathUtils.degToRad(angleInDegrees);
    setRotationSpring({
      rotation: [angleInRadians,0,0]
    });
  }, [angle, setRotationSpring]);


  if (!ModelComponent || isUnused) {
    return null;
  }
console.log('model--', script.modelId, partyMemberId)
  return (
    <Suspense fallback={null}>
      <animated.group ref={containerRef} rotation={[0,Math.PI / 2, 0]}>
        <animated.group rotation={rotationSpring.rotation as unknown as [number, number, number]}>
          <ModelComponent
            name={`model--${script.modelId}`}
            ref={setComponentRef}
            position={[-0.053,-0.05,0]}
            scale={0.058}
            userData={{
              partyMemberId
            }}
            visible={isVisible}
          />
          <Sphere
            args={[talkRadius / 4000]}
            position={[0, 0, 0]}
            ref={talkSphereRef}
            visible={false}
          >
            <meshBasicMaterial color="white" side={DoubleSide} />
          </Sphere>
        </animated.group>
      </animated.group>
    </Suspense>
  )
}

export default Model;