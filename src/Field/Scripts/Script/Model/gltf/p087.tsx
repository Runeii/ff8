/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/p087.gltf --types --keepgroups --exportdefault --output=../gltf/p087.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'p087_action_000' | 'p087_action_001'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    p087: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    p087_texture_0: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function p087(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('p087', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="p087_armature">
          <primitive object={nodes.bone_0} />
          <skinnedMesh name="p087" geometry={nodes.p087.geometry} material={materials.p087_texture_0} skeleton={nodes.p087.skeleton} />
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('p087')
