import React, { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations  } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'
import { Group, AnimationClip, Bone,  LoopRepeat, SkinnedMesh, MeshPhysicalMaterial } from 'three'

const ActionNames = ['d001_act0', 'd001_act1', 'd001_act2', 'd001_act3'] as const
export type ActionName = typeof ActionNames[number]

interface GLTFAction extends AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d001: SkinnedMesh
    root: Bone
  }
  materials: {
    d001: MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}


const Squall = forwardRef((props: JSX.IntrinsicElements['group'] & {
  currentAction: ActionName
}, ref: ForwardedRef<Group>) => {
  const localRef = useRef<Group>(new Group());
  useImperativeHandle(ref, () => localRef.current);

const { scene, animations } = useGLTF('/models/d001.glb') as GLTFResult
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions, mixer } = useAnimations(animations, localRef)

  useEffect(() => {
    const action = actions[props.currentAction] ?? actions.d001_act1
    if (!action) {
      return;
    }

    action.setLoop(LoopRepeat, Infinity)
    action.enabled = true
    action.play()

    return () => {
      action.enabled = false
      action.stop()
    }
  }, [actions, mixer, props.currentAction]);

  return (
    <group ref={localRef} {...props} dispose={null}>
      <group name="Scene" position={[0,-1,0.9]} rotation={[0, Math.PI / 2, 0]}>
        <group name="d001_armature" >
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d001" geometry={nodes.d001.geometry} material={materials.d001} skeleton={nodes.d001.skeleton} />
      </group>
      {props.children}
    </group>
  )
});

export default Squall