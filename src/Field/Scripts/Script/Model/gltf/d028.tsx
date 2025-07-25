/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d028.gltf --types --keepgroups --exportdefault --output=../gltf/d028.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd028_action_000' | 'd028_action_001' | 'd028_action_002' | 'd028_action_003' | 'd028_action_004' | 'd028_action_005'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d028_mesh: THREE.SkinnedMesh
    d028_mesh_1: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    d028_texture_0: THREE.MeshStandardMaterial
    d028_texture_1: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d028(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('d028', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d028_armature">
          <primitive object={nodes.bone_0} />
          <group name="d028">
            <skinnedMesh name="d028_mesh" geometry={nodes.d028_mesh.geometry} material={materials.d028_texture_0} skeleton={nodes.d028_mesh.skeleton} />
            <skinnedMesh name="d028_mesh_1" geometry={nodes.d028_mesh_1.geometry} material={materials.d028_texture_1} skeleton={nodes.d028_mesh_1.skeleton} />
          </group>
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('d028')
