/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/o222.gltf --types --keepgroups --exportdefault --output=../gltf/o222.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'o222_action_000'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    o222_mesh: THREE.SkinnedMesh
    o222_mesh_1: THREE.SkinnedMesh
    o222_mesh_2: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    o222_texture_0: THREE.MeshStandardMaterial
    o222_texture_1: THREE.MeshStandardMaterial
    o222_texture_2: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function o222(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('o222', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="o222_armature">
          <primitive object={nodes.bone_0} />
          <group name="o222">
            <skinnedMesh name="o222_mesh" geometry={nodes.o222_mesh.geometry} material={materials.o222_texture_0} skeleton={nodes.o222_mesh.skeleton} />
            <skinnedMesh name="o222_mesh_1" geometry={nodes.o222_mesh_1.geometry} material={materials.o222_texture_1} skeleton={nodes.o222_mesh_1.skeleton} />
            <skinnedMesh name="o222_mesh_2" geometry={nodes.o222_mesh_2.geometry} material={materials.o222_texture_2} skeleton={nodes.o222_mesh_2.skeleton} />
          </group>
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('o222')
