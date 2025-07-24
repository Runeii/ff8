import { Script } from "../../types";
import {  ComponentType, type JSX, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Bone, Box3, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import useGlobalStore from "../../../../store";
import { useFrame } from "@react-three/fiber";
import { ScriptStateStore } from "../state";
import { createAnimationController } from "../AnimationController/AnimationController";
import TalkRadius from "../TalkRadius/TalkRadius";
import createMovementController from "../MovementController/MovementController";
import createRotationController from "../RotationController/RotationController";
import createScriptController from "../ScriptController/ScriptController";
import { getPositionOnWalkmesh } from "../../../../utils";
import { Sphere } from "@react-three/drei";
import useControls from "./useControls";
import useFootsteps from "./useFootsteps";

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
  const modelId = useScriptStateStore(state => state.modelId);

  const [meshGroup, setMeshGroup] = useState<Group>();

  const modelName = models[modelId]
  const ModelComponent = components[modelName];

  const convertMaterialsToBasic = useCallback((group: Group) => {
    group.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const meshBasicMaterial = new MeshBasicMaterial();
        meshBasicMaterial.color = child.material.color;
        meshBasicMaterial.map = child.material.map;
        meshBasicMaterial.side = DoubleSide
        child.material = meshBasicMaterial;
      }
    });
  }, []);

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
    convertMaterialsToBasic(ref.group.current);
    animationController.setHeadBone(ref.nodes.head as unknown as Bone);
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);

  const animationGroupRef = useRef<Group>(null);
  const [boundingbox, setBoundingBox] = useState(new Box3());
  const [centre] = useState(new Vector3(0, 0, 0));

  const sphereRef = useRef<Mesh>(null);
  useFrame(({ scene }) => {
    if (!meshGroup || !animationGroupRef.current) {
      return;
    }
    const walkmesh = scene.getObjectByName("walkmesh") as Mesh;
    animationGroupRef.current.position.z = 0;
    
    // Get reference to the scaled group
    const scaledGroup = animationGroupRef.current.children[0] as Group;
    if (!scaledGroup) return;
    
    // Update world matrices before calculating bounding box
    scaledGroup.updateMatrixWorld(true);
    
  const topGroup = isLeadCharacter ? 
    animationGroupRef.current.parent : // Start from wrapper for lead
    animationGroupRef.current;         // Start from animation group for others
  
  topGroup.updateMatrixWorld(true);
    // Update the animations on the scaled model group
  scaledGroup.traverse((child) => {
    if (child instanceof Mesh && child.isSkinnedMesh) {
      // Force skeleton to recalculate bone matrices with correct world matrices
      child.skeleton.update();
    }
  });
    
  // Instead of setFromObject() which uses world coordinates:
const newBoundingBox = new Box3();
scaledGroup.children.forEach(child => {
  if (child.type !== 'Box3Helper' && child.geometry) {
    const childBox = new Box3();
    // Calculate in the child's LOCAL space, then apply only the child's matrix
    childBox.setFromBufferAttribute(child.geometry.attributes.position);
    
    // Apply the child's local transform (but NOT parent transforms)
    childBox.applyMatrix4(child.matrix);
    newBoundingBox.union(childBox);
  }
});

// Now newBoundingBox is already in scaledGroup's coordinate space
setBoundingBox(newBoundingBox);

    
    return;
    const localCentre = sphereRef.current?.parent.worldToLocal(centre.clone());
    sphereRef.current?.position.copy(localCentre);
    const pointOnWalkmesh = getPositionOnWalkmesh(centre, walkmesh)
    if (!pointOnWalkmesh) {
      console.warn("Model is not on walkmesh, resetting position to (0, 0, 0)");
      return;
    }
    console.log(modelId, "Model position on walkmesh:", pointOnWalkmesh);
    const zDistance = pointOnWalkmesh.z - centre.z;
    animationGroupRef.current.position.z = -zDistance;
  })

  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isUserControllable = useGlobalStore(state => state.isUserControllable);
  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

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

  useControls({
    isActive: isUserControllable && isLeadCharacter,
    movementController,
    rotationController,
    script
  });

  return (
    <group>
      {talkMethod && !isLeadCharacter && !isFollower && meshGroup && (
        <TalkRadius
          scriptController={scriptController}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
      <Sphere args={[0.01, 16, 16]} ref={sphereRef}>
        <meshBasicMaterial color="green" side={DoubleSide} />
      </Sphere>
      <group name="animation-adjustment-group" ref={animationGroupRef}>
        <group scale={0.06}>
          <box3Helper args={[boundingbox, 'pink']} />
          <ModelComponent
            name={`party--${partyMemberId ?? 'none'}`}
            mapName={fieldId}
            ref={setModelRef}
            userData={{
              partyMemberId,
              movementController,
              rotationController,
              useScriptStateStore,
              scriptController
            }}
            />
        </group>
      </group>
    </group>
  );
};

export default Model;