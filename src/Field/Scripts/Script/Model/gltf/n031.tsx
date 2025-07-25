/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/n031.gltf --types --keepgroups --exportdefault --output=../gltf/n031.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'n031_action_000'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    n031_mesh: THREE.SkinnedMesh
    n031_mesh_1: THREE.SkinnedMesh
    n031_mesh_2: THREE.SkinnedMesh
    n031_mesh_3: THREE.SkinnedMesh
    n031_mesh_4: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    n031_texture_0: THREE.MeshStandardMaterial
    n031_texture_1: THREE.MeshStandardMaterial
    n031_texture_2: THREE.MeshStandardMaterial
    n031_texture_3: THREE.MeshStandardMaterial
    n031_texture_4: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function n031(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('n031', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="n031_armature">
          <primitive object={nodes.bone_0} />
          <group name="n031">
            <skinnedMesh name="n031_mesh" geometry={nodes.n031_mesh.geometry} material={materials.n031_texture_0} skeleton={nodes.n031_mesh.skeleton} />
            <skinnedMesh name="n031_mesh_1" geometry={nodes.n031_mesh_1.geometry} material={materials.n031_texture_1} skeleton={nodes.n031_mesh_1.skeleton} />
            <skinnedMesh name="n031_mesh_2" geometry={nodes.n031_mesh_2.geometry} material={materials.n031_texture_2} skeleton={nodes.n031_mesh_2.skeleton} />
            <skinnedMesh name="n031_mesh_3" geometry={nodes.n031_mesh_3.geometry} material={materials.n031_texture_3} skeleton={nodes.n031_mesh_3.skeleton} />
            <skinnedMesh name="n031_mesh_4" geometry={nodes.n031_mesh_4.geometry} material={materials.n031_texture_4} skeleton={nodes.n031_mesh_4.skeleton} />
          </group>
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('n031')
