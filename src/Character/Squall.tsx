import React, { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'
import { Group, AnimationClip, Bone,  LoopRepeat, MeshBasicMaterial, SkinnedMesh } from 'three'

const ActionNames = ['run', 'stand', 'walk'] as const
export type ActionName = typeof ActionNames[number]

interface GLTFAction extends AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d000: SkinnedMesh
    root: Bone
  }
  materials: {
    d000: MeshBasicMaterial
  }
  animations: GLTFAction[]
}

const Squall = forwardRef((props: JSX.IntrinsicElements['group'] & {
  currentAction: ActionName
}, ref: ForwardedRef<Group>) => {
  const localRef = useRef<Group>(new Group());
  useImperativeHandle(ref, () => localRef.current);

  const { scene, animations } = useGLTF('/squall2.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, localRef)

  useEffect(() => {
    const action = actions[props.currentAction] ?? actions.stand
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
  }, [actions, props.currentAction]);

  return (
    <group ref={localRef} {...props} dispose={null}>
      <group name="Scene">
        <group name="d000_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d000" geometry={nodes.d000.geometry} material={materials.d000} skeleton={nodes.d000.skeleton} />
      </group>
      {props.children}
    </group>
  )
});

export default Squall

useGLTF.preload('/squall2.glb')
