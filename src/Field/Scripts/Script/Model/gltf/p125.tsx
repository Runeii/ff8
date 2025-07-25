/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/p125.gltf --types --keepgroups --exportdefault --output=../gltf/p125.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'p125_action_000' | 'p125_action_001' | 'p125_action_002' | 'p125_action_003' | 'p125_action_004' | 'p125_action_005' | 'p125_action_006' | 'p125_action_007' | 'p125_action_008' | 'p125_action_009' | 'p125_action_010' | 'p125_action_011' | 'p125_action_012' | 'p125_action_013' | 'p125_action_014' | 'p125_action_015' | 'p125_action_016' | 'p125_action_017' | 'p125_action_018' | 'p125_action_019' | 'p125_action_020' | 'p125_action_021' | 'p125_action_022' | 'p125_action_023' | 'p125_action_024' | 'p125_action_025' | 'p125_action_026' | 'p125_action_027' | 'p125_action_028' | 'p125_action_029' | 'p125_action_030' | 'p125_action_031' | 'p125_action_032'

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
