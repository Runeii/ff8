import { Script } from "../../types";
import {  ComponentType, type JSX, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Bone, Box3, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import useGlobalStore from "../../../../store";
import { useFrame } from "@react-three/fiber";
import { ScriptStateStore } from "../state";
import { createAnimationController } from "../AnimationController/AnimationController";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import createScriptController from "../ScriptController/ScriptController";
import { getPositionOnWalkmesh } from "../../../../utils";
import { Box, Sphere } from "@react-three/drei";
import useControls from "./useControls";
import useFootsteps from "./useFootsteps";
import useTalkRadius from "../TalkRadius/useTalkRadius";
import useFollower from "./useFollower";

type ModelProps = {
  animationController: ReturnType<typeof createAnimationController>;
  models: string[];
  movementController: ReturnType<typeof createMovementController>;
  rotationController: ReturnType<typeof createRotationController>;
  scriptController: ReturnType<typeof createScriptController>;
  script: Script;
  useScriptStateStore: ScriptStateStore,
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

type GenericModelProps = JSX.IntrinsicElements['group'] & {
  mapName: string;
}
const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<GenericModelProps>}>)];
}))

const Model = ({animationController, models, scriptController, movementController, rotationController, script, useScriptStateStore }: ModelProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const modelId = useScriptStateStore(state => state.modelId);

  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const modelName = models[modelId]
  const ModelComponent = components[modelName];
  
  const [meshGroup, setMeshGroup] = useState<Group>();

  const convertMaterialsToBasic = useCallback((group: Group) => {
    group.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const meshBasicMaterial = new MeshBasicMaterial();
        meshBasicMaterial.color = child.material.color;
        meshBasicMaterial.userData.originalColor = child.material.color.clone();
        meshBasicMaterial.map = child.material.map;
        meshBasicMaterial.side = DoubleSide
        child.material = meshBasicMaterial;
      }
    });
  }, []);

  const globalMeshTint = useGlobalStore(state => state.globalMeshTint);
  const meshTintColor = useScriptStateStore(state => state.meshTintColor);
  useEffect(() => {
    if (!meshGroup) {
      return;
    }
    const color = new Color(...(meshTintColor ?? globalMeshTint ?? [0, 0, 0]).map((c) => c / 255));
    meshGroup.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshBasicMaterial) {
        child.material.color = child.material.userData.originalColor.clone().add(color);
      }
    });
  }, [globalMeshTint, meshGroup, meshTintColor]);

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
    convertMaterialsToBasic(ref.group.current);
    animationController.setHeadBone(ref.nodes.head as unknown as Bone);
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);

  useEffect(() => {
    if (!isLeadCharacter) {
      return;
    }
    const {fieldDirection, initialAngle} = useGlobalStore.getState();
    rotationController.turnToFaceAngle(initialAngle ?? fieldDirection, 1)
  }, [isLeadCharacter, rotationController]);

  const [currentAngle, setCurrentAngle] = useState<number>(0);
  useEffect(() => {
    if (!isLeadCharacter) {
      return;
    }
    useGlobalStore.setState({
      initialAngle: currentAngle,
    });
  }, [isLeadCharacter, currentAngle]);

  useFrame(() => {
    const angle = rotationController.getState().angle.get();
    if (angle !== currentAngle) {
      setCurrentAngle(angle);
    }
  });

  const talkMethod = script.methods.find(method => method.methodId === 'talk');

  useFootsteps({ movementController });

  const [characterDimensions, setCharacterDimensions] = useState<Vector3>(new Vector3());

  useControls({
    characterHeight: characterDimensions.y,
    isActive: isLeadCharacter,
    movementController,
    rotationController,
  });

  const animationGroupRef = useRef<Group>(null);
  const [boundingbox] = useState(new Box3());
  const sphereRef = useRef<Mesh>(null);

  useFrame(({scene}) => {
    const needsZAdjustment = animationController.getState().needsZAdjustment || movementController.getState().needsZAdjustment;

    if (!animationGroupRef.current || !needsZAdjustment) {
      return;
    }

    animationGroupRef.current.position.z = 0;
    animationGroupRef.current.updateMatrixWorld(true);
    boundingbox.setFromObject(animationGroupRef.current, true);
    
    const walkmesh = scene.getObjectByName('walkmesh');
    if (!walkmesh) {
      return;
    }
    const centre = boundingbox.getCenter(new Vector3());
    const walkmeshPoint = getPositionOnWalkmesh(centre, walkmesh);
    if (!walkmeshPoint) {
      return;
    }

    const z = walkmeshPoint.z - boundingbox.min.z;
    animationGroupRef.current.position.z = z;

    setCharacterDimensions(new Vector3(
      boundingbox.max.x - boundingbox.min.x,
      boundingbox.max.y - boundingbox.min.y,
      boundingbox.max.z - boundingbox.min.z
    ));

    movementController.setHasAdjustedZ(true);
    animationController.setHasAdjustedZ(true);
  })

  const talkRadiusRef = useRef<Mesh>(null);

  useTalkRadius({
    isActive: !!talkMethod && !isLeadCharacter && !isFollower && !!meshGroup,
    scriptController,
    talkMethod,
    useScriptStateStore,
    talkTargetRef: talkRadiusRef
  })
  
  useFollower({
    isActive: !!isFollower,
    animationController,
    movementController,
    rotationController,
    partyMemberId
  })

  const isDebugMode = useGlobalStore(state => state.isDebugMode);
  const isSolid = useScriptStateStore(state => state.isSolid);

  const talkRadius = useScriptStateStore(state => state.talkRadius);
  return (
    <group>
      <Sphere args={[0.01, 16, 16]} ref={sphereRef} visible={isDebugMode}>
        <meshBasicMaterial color="green" side={DoubleSide} />
      </Sphere>
      <Box
        args={characterDimensions.toArray().map(i => i * talkRadius/ 50) as [number, number, number]}
        position={[0, 0, characterDimensions.z / 2.5]}
        name="talkRadius"
        ref={talkRadiusRef}
        userData={{ isSolid: false }}
        visible={isDebugMode}
        >
        <meshBasicMaterial color="white" opacity={1} wireframe />
      </Box>
      <Box
        args={characterDimensions.toArray()}
        position={[0, 0, characterDimensions.z / 2.5]}
        name="hitbox"
        userData={{ isSolid }}
        visible={isDebugMode}
        >
        <meshBasicMaterial color={isSolid ? 'red' : 'green'} transparent opacity={0.5} />
      </Box>
      <group name="animation-adjustment-group" ref={animationGroupRef} userData={{
        boundingbox
      }}>
        <ModelComponent
          mapName={fieldId}
          ref={setModelRef}
          scale={0.06}
        />
      </group>
    </group>
  );
};

export default Model;