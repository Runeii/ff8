/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d007.glb --types --exportdefault --output=./gltf/d007.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd007_act0' | 'd007_act1' | 'd007_act2' | 'd007_act3' | 'd007_act4' | 'd007_act5' | 'd007_act6' | 'd007_act7' | 'd007_act8' | 'd007_act9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d007: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d007: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d007(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d007.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, group, nodes, materials }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d007_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d007" geometry={nodes.d007.geometry} material={materials.d007} skeleton={nodes.d007.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d007.glb')
