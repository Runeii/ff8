import { Script } from "../../types";
import {  ComponentType, lazy, useCallback, useEffect, useState } from "react";
import { Bone, Euler, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion } from "three";
import useGlobalStore from "../../../../store";
import Controls from "./Controls/Controls";
import { useFrame } from "@react-three/fiber";
import Follower from "./Follower/Follower";
import { ScriptStateStore } from "../state";
import { createAnimationController } from "../AnimationController/AnimationController";
import TalkRadius from "../TalkRadius/TalkRadius";

type ModelProps = {
  animationController: ReturnType<typeof createAnimationController>;
  models: string[];
  setActiveMethodId: (methodId?: string) => void;
  script: Script;
  useScriptStateStore: ScriptStateStore,
}

const modelFiles = import.meta.glob('./gltf/*.tsx');

const components = Object.fromEntries(Object.keys(modelFiles).map((path) => {
  const name = path.replace('./gltf/', '').replace('.tsx', '');
  return [name, lazy(modelFiles[path] as () => Promise<{default: ComponentType<JSX.IntrinsicElements['group']>}>)];
}));

const Model = ({animationController, models, script,setActiveMethodId, useScriptStateStore }: ModelProps) => {
  const headAngle = useScriptStateStore(state => state.headAngle);
  const modelId = useScriptStateStore(state => state.modelId);

  const [meshGroup, setMeshGroup] = useState<Group>();
  const [head, setHead] = useState<Bone>();

  let modelName = models[modelId];

  if (modelName === 'd001') {
    modelName = 'd000'
  }
  if (!modelName.includes('d')) {
    modelName = 'd070'
  }

  const ModelComponent = components[modelName];

  const convertMaterialsToBasic = useCallback((group: Group) => {
    group.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const meshBasicMaterial = new MeshBasicMaterial();
        meshBasicMaterial.color = child.material.color;
        meshBasicMaterial.map = child.material.map;

        child.material = meshBasicMaterial;
      }
    });
  }, []);

  const setModelRef = useCallback((ref: GltfHandle) => {
    if (!ref || !ref.group) {
      return;
    }
  
    animationController.initialize(ref.animations.mixer, ref.animations.clips, ref.group.current);
    setMeshGroup(ref.group.current);
    setHead(ref.nodes.head);
    convertMaterialsToBasic(ref.group.current);
  }, [convertMaterialsToBasic, animationController]);


  useEffect(() => {
    if (!meshGroup) {
      return;
    }

    meshGroup.rotation.set(0, 0, 0);
    meshGroup.quaternion.identity();
  
    const eulerRotation = new Euler(Math.PI / 2, 0, 0); // Define your Euler rotation
    const quaternionFromEuler = new Quaternion();
    quaternionFromEuler.setFromEuler(eulerRotation);
    meshGroup.applyQuaternion(quaternionFromEuler);
    meshGroup.updateMatrix(); 
    meshGroup.updateMatrixWorld(true);
  }, [modelName, meshGroup]);

  useFrame(() => {
    if (!head) {
      return;
    }

    head.rotation.y = headAngle.get();
  })


  const partyMemberId = useScriptStateStore(state => state.partyMemberId);
  const isLeadCharacter = useGlobalStore(state => state.party[0] === partyMemberId);
  const isFollower = useGlobalStore(state => partyMemberId && state.party.includes(partyMemberId) && state.isPartyFollowing && !isLeadCharacter);

  const playerMovementSpeed = useGlobalStore(state => state.playerMovementSpeed);
  const movementSpeed = useScriptStateStore(state => isFollower ? playerMovementSpeed : state.movementSpeed);
  const position = useScriptStateStore(state => state.position);

  const [isMoving, setIsMoving] = useState(false);
  useFrame(() => {
    if (position.isAnimating !== isMoving) {
      setIsMoving(position.isAnimating);
    }
  });

  const isControllingLeadCharacter = isLeadCharacter && playerMovementSpeed > 0;

  useEffect(() => {
    if ((!isMoving || movementSpeed === 0) && !isControllingLeadCharacter) {
      animationController.setIdleAnimation(0);
      animationController.requestIdleAnimation();  
      return;
    }

    const WALK_ANIMATION = 1;
    const RUN_ANIMATION = 2;

    animationController.setIdleAnimation(movementSpeed > 4000 ? RUN_ANIMATION : WALK_ANIMATION);
    animationController.requestIdleAnimation();
  }, [movementSpeed, animationController, isControllingLeadCharacter, script.groupId, script, isMoving]);

  const talkMethod = script.methods.find(method => method.methodId === 'talk');

  const modelJsx = (
    <group>
      {talkMethod && !isLeadCharacter && !isFollower && (
        <TalkRadius
          setActiveMethodId={setActiveMethodId}
          talkMethod={talkMethod}
          useScriptStateStore={useScriptStateStore}
        />
      )}
      <ModelComponent
        name={`party--${partyMemberId ?? 'none'}`}
        scale={0.06}
        position={[0, 0, -0.004]}
        // @ts-expect-error The typing for a lazy import with func ref setter seems obscure and bigger fish
        ref={setModelRef}
        userData={{
          partyMemberId,
          useScriptStateStore
        }}
      />
    </group>
  );

  if (isLeadCharacter) {
    return (
      <Controls useScriptStateStore={useScriptStateStore}>
        {modelJsx}
      </Controls>
    );
  } else if (isFollower) {
    return (
      <Follower partyMemberId={partyMemberId} useScriptStateStore={useScriptStateStore}>
        {modelJsx}
      </Follower>
    )
  } else {
    return modelJsx;
  }
};

export default Model;