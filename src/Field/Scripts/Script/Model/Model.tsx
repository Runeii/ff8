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
  const isUserControllable = useGlobalStore(state => state.isUserControllable);

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

  const animationGroupRef = useRef<Group>(null);
  const [boundingbox, setBoundingBox] = useState(new Box3());

  const sphereRef = useRef<Mesh>(null);
  useFrame(({scene}) => {
    if (!animationGroupRef.current) {
      return;
    }
    animationGroupRef.current.position.z = 0;
    animationGroupRef.current.updateMatrixWorld(true);
    boundingbox.makeEmpty();
    boundingbox.expandByObject(animationGroupRef.current, true);

    setBoundingBox(boundingbox);

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
  })

  const isDebugMode = useGlobalStore(state => state.isDebugMode);

  return (
    <group>
      {talkMethod && !isLeadCharacter && !isFollower && meshGroup && (
        <TalkRadius
          scriptController={scriptController}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
      <Sphere args={[0.01, 16, 16]} ref={sphereRef} visible={isDebugMode}>
        <meshBasicMaterial color="green" side={DoubleSide} />
      </Sphere>
      <group name="animation-adjustment-group" ref={animationGroupRef}>
          <ModelComponent
            name={`party--${partyMemberId ?? 'none'}`}
            mapName={fieldId}
            ref={setModelRef}
            scale={0.06}
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
  );
};

export default Model;