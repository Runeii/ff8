/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d010.glb --types --exportdefault --output=./gltf/d010.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd010_action_0' | 'd010_action_1' | 'd010_action_10' | 'd010_action_11' | 'd010_action_12' | 'd010_action_2' | 'd010_action_3' | 'd010_action_4' | 'd010_action_5' | 'd010_action_6' | 'd010_action_7' | 'd010_action_8' | 'd010_action_9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d010: THREE.SkinnedMesh
    bone_1: THREE.Bone
    bone_2: THREE.Bone
  }
  materials: {
    d010: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d010(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d010.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d010_armature">
          <primitive object={nodes.bone_1} />
          <primitive object={nodes.bone_2} />
          <skinnedMesh name="d010" geometry={nodes.d010.geometry} material={materials.d010} skeleton={nodes.d010.skeleton} />
        </group>
      </group>
    </group>
    ); })

useGLTF.preload('/models/d010.glb')
