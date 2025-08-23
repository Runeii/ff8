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
import useTalkRadius from "./useTalkRadius";
import useFollower from "./useFollower";
import usePushRadius from "./usePushRadius";

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
  const fieldId = useGlobalStore(state => state.fieldId)!;

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const modelId = useScriptStateStore(state => state.modelId);

  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const modelName = models[modelId];
  const ModelComponent = components[modelName] ?? components['d000'];
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
    const color = new Color(...(meshTintColor ?? globalMeshTint ?? [128, 128, 128]).map((c) => ((c / 256) - 0.5) * 2));

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
    animationController.setHeadBone(ref.nodes.bone_4 as unknown as Bone);
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);

  useEffect(() => {
    if (!isLeadCharacter) {
      return;
    }
    const {fieldDirection, initialAngle} = useGlobalStore.getState();
    rotationController.turnToFaceAngle(initialAngle ?? fieldDirection, 0)
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
  const pushMethod = script.methods.find(method => method.methodId === 'push');

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
  const [standingBoundingBox] = useState(new Box3());
  const pushableSphereRef = useRef<Mesh>(null);

  const baseRootBoneZOffset = useRef<number>(0);
  const baseBoundingBoxZOffset = useRef<number>(0);
  const [boundingBoxCentre] = useState(new Vector3());
  const rootBoneDistanceFromStanding = useRef<number>(0);

  const walkmeshController = useGlobalStore(state => state.walkmeshController);
  useFrame(({scene}) => {
    if (!animationGroupRef.current) {
      return;
    }

    if (!walkmeshController) {
      return;
    }

    animationGroupRef.current.position.z = 0;
    animationGroupRef.current.updateMatrixWorld(true);
    boundingbox.setFromObject(animationGroupRef.current, true);
    
    const position = movementController.getPosition();

    const rootBone = animationGroupRef.current.getObjectByName('bone_0');
    if (!rootBone) {
      return;
    }
    const rootBonePosition = rootBone.getWorldPosition(new Vector3());
    const needsZAdjustment = animationController.getState().needsZAdjustment || movementController.getState().needsZAdjustment;

    if (needsZAdjustment) {
      if (!animationController.getState().animations.currentAnimation || animationController.getState().animations.currentAnimation?.animationId === animationController.getMovementAnimationId('stand')) {
        standingBoundingBox.setFromObject(animationGroupRef.current, true);
      }

      setCharacterDimensions(new Vector3(
        boundingbox.max.x - boundingbox.min.x,
        boundingbox.max.y - boundingbox.min.y,
        boundingbox.max.z - boundingbox.min.z
      ));
      
      baseRootBoneZOffset.current = rootBone.position.z;
      baseBoundingBoxZOffset.current = boundingbox.min.z;
      rootBoneDistanceFromStanding.current = rootBonePosition.z - boundingbox.min.z;
      
      const centrePointOnWalkmesh = walkmeshController.getPositionOnWalkmesh(boundingbox.getCenter(boundingBoxCentre), boundingbox.max.z - boundingbox.min.z);
      const zPosition = centrePointOnWalkmesh?.z ?? position.z
      const z = zPosition - boundingbox.min.z
      animationGroupRef.current.position.z = z
      
      movementController.setHasAdjustedZ(true);
      animationController.setHasAdjustedZ(true);
    }
    
    if (!animationController.getState().animations.isCurrentAnimationABaseAnime) {
      const centrePointOnWalkmesh = walkmeshController.getPositionOnWalkmesh(boundingbox.getCenter(boundingBoxCentre), boundingbox.max.z - boundingbox.min.z)
      const zPosition = centrePointOnWalkmesh?.z ?? position.z
      const z = zPosition - boundingbox.min.z
      animationGroupRef.current.position.z = z
    }
  })

  const talkRadiusRef = useRef<Mesh>(null);

  const hasTalkableSphere = !!talkMethod && !isLeadCharacter && !isFollower && !!meshGroup;
  useTalkRadius({
    isActive: hasTalkableSphere,
    scriptController,
    talkMethod,
    useScriptStateStore,
    talkTargetRef: talkRadiusRef
  })

  const hasPushableSphere = !!pushMethod && !isLeadCharacter && !isFollower && !!meshGroup;
  usePushRadius({
    isActive: hasPushableSphere,
    scriptController,
    pushMethod,
    useScriptStateStore,
    pushTargetRef: pushableSphereRef
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
  const pushRadius = useScriptStateStore(state => state.pushRadius);

  return (
    <group>
      {
        hasPushableSphere && (
          <Sphere args={[0.1 / 500 * pushRadius, 16, 16]} ref={pushableSphereRef} visible={isDebugMode}>
            <meshBasicMaterial color="green" side={DoubleSide} opacity={0.2} transparent />
          </Sphere>
        )
      }
      {
        hasTalkableSphere && (
          <Box
            args={characterDimensions.toArray().map(i => i * talkRadius / 50) as [number, number, number]}
            position={[0, 0, characterDimensions.z / 2.5]}
            name="talkRadius"
            ref={talkRadiusRef}
            userData={{ isSolid: false }}
            visible={isDebugMode}
            >
            <meshBasicMaterial color="white" opacity={1} wireframe />
          </Box>
        )
      }
      <Box
        args={characterDimensions.toArray().map(i => i + 0.01) as [number, number]}
        position={[0, 0, characterDimensions.z / 2.5]}
        name="hitbox"
        userData={{
          isSolid: isSolid && (!isLeadCharacter && !isFollower)
        }}
        visible={isDebugMode}
        >
        <meshBasicMaterial color={isSolid ? 'red' : 'green'} transparent opacity={0.5} />
      </Box>
      <group name="model" ref={animationGroupRef} userData={{
        boundingbox,
        standingBoundingBox
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