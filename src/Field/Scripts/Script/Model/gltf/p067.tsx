/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/p067.glb --types --exportdefault --output=./gltf/p067.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'p067_action_0' | 'p067_action_1' | 'p067_action_10' | 'p067_action_2' | 'p067_action_3' | 'p067_action_4' | 'p067_action_5' | 'p067_action_6' | 'p067_action_7' | 'p067_action_8' | 'p067_action_9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    p067: THREE.SkinnedMesh
    bone_1: THREE.Bone
    bone_2: THREE.Bone
  }
  materials: {
    p067: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function p067(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/p067.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="p067_armature">
          <primitive object={nodes.bone_1} />
          <primitive object={nodes.bone_2} />
          <skinnedMesh name="p067" geometry={nodes.p067.geometry} material={materials.p067} skeleton={nodes.p067.skeleton} />
        </group>
      </group>
    </group>
    ); })

useGLTF.preload('/models/p067.glb')
