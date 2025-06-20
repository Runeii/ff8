/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/p125.gltf --types --keepgroups --exportdefault --output=./gltf/p125.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'p125_action_0' | 'p125_action_1' | 'p125_action_10' | 'p125_action_11' | 'p125_action_12' | 'p125_action_13' | 'p125_action_14' | 'p125_action_15' | 'p125_action_16' | 'p125_action_17' | 'p125_action_18' | 'p125_action_19' | 'p125_action_2' | 'p125_action_20' | 'p125_action_21' | 'p125_action_22' | 'p125_action_23' | 'p125_action_24' | 'p125_action_25' | 'p125_action_26' | 'p125_action_27' | 'p125_action_28' | 'p125_action_29' | 'p125_action_3' | 'p125_action_30' | 'p125_action_31' | 'p125_action_32' | 'p125_action_4' | 'p125_action_5' | 'p125_action_6' | 'p125_action_7' | 'p125_action_8' | 'p125_action_9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    p125: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    p125_texture_0: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function p125(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('p125', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="p125_armature">
          <primitive object={nodes.bone_0} />
          <skinnedMesh name="p125" geometry={nodes.p125.geometry} material={materials.p125_texture_0} skeleton={nodes.p125.skeleton} />
        </group>
      </group>
    </group>
    ); })

useFragmentedGLTFLoader.preload('p125')
