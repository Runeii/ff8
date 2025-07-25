/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/n019.gltf --types --keepgroups --exportdefault --output=../gltf/n019.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'n019_action_000' | 'n019_action_001'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    n019_mesh: THREE.SkinnedMesh
    n019_mesh_1: THREE.SkinnedMesh
    n019_mesh_2: THREE.SkinnedMesh
    n019_mesh_3: THREE.SkinnedMesh
    n019_mesh_4: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    n019_texture_0: THREE.MeshStandardMaterial
    n019_texture_1: THREE.MeshStandardMaterial
    n019_texture_2: THREE.MeshStandardMaterial
    n019_texture_3: THREE.MeshStandardMaterial
    n019_texture_4: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function n019(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('n019', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="n019_armature">
          <primitive object={nodes.bone_0} />
          <group name="n019">
            <skinnedMesh name="n019_mesh" geometry={nodes.n019_mesh.geometry} material={materials.n019_texture_0} skeleton={nodes.n019_mesh.skeleton} />
            <skinnedMesh name="n019_mesh_1" geometry={nodes.n019_mesh_1.geometry} material={materials.n019_texture_1} skeleton={nodes.n019_mesh_1.skeleton} />
            <skinnedMesh name="n019_mesh_2" geometry={nodes.n019_mesh_2.geometry} material={materials.n019_texture_2} skeleton={nodes.n019_mesh_2.skeleton} />
            <skinnedMesh name="n019_mesh_3" geometry={nodes.n019_mesh_3.geometry} material={materials.n019_texture_3} skeleton={nodes.n019_mesh_3.skeleton} />
            <skinnedMesh name="n019_mesh_4" geometry={nodes.n019_mesh_4.geometry} material={materials.n019_texture_4} skeleton={nodes.n019_mesh_4.skeleton} />
          </group>
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('n019')
