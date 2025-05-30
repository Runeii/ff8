/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/p201.glb --types --exportdefault --output=./gltf/p201.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'p201_action_0' | 'p201_action_1' | 'p201_action_2' | 'p201_action_3' | 'p201_action_4' | 'p201_action_5' | 'p201_action_6' | 'p201_action_7' | 'p201_action_8' | 'p201_action_9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    p201: THREE.SkinnedMesh
    bone_1: THREE.Bone
    bone_2: THREE.Bone
  }
  materials: {
    p201: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function p201(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/p201.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="p201_armature">
          <primitive object={nodes.bone_1} />
          <primitive object={nodes.bone_2} />
          <skinnedMesh name="p201" geometry={nodes.p201.geometry} material={materials.p201} skeleton={nodes.p201.skeleton} />
        </group>
      </group>
    </group>
    ); })

useGLTF.preload('/models/p201.glb')
