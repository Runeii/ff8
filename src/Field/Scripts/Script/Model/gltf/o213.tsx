/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/o213.gltf --types --keepgroups --exportdefault --output=../gltf/o213.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei';
import { useFragmentedGLTFLoader } from '../useFragmentedGLTFLoader'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'o213_action_000' | 'o213_action_001'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    o213_mesh: THREE.SkinnedMesh
    o213_mesh_1: THREE.SkinnedMesh
    bone_0: THREE.Bone
  }
  materials: {
    o213_texture_0: THREE.MeshStandardMaterial
    o213_texture_1: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function o213(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useFragmentedGLTFLoader('o213', props.mapName)
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)

 const formattedAnimations = useAnimations(animations, group);
 useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
   return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="o213_armature">
          <primitive object={nodes.bone_0} />
          <group name="o213">
            <skinnedMesh name="o213_mesh" geometry={nodes.o213_mesh.geometry} material={materials.o213_texture_0} skeleton={nodes.o213_mesh.skeleton} />
            <skinnedMesh name="o213_mesh_1" geometry={nodes.o213_mesh_1.geometry} material={materials.o213_texture_1} skeleton={nodes.o213_mesh_1.skeleton} />
          </group>
        </group>
      </group>
    </group>
 ); })

useFragmentedGLTFLoader.preload('o213')
