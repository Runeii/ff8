/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d041.glb --types --exportdefault --output=./gltf/d041.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    d041: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d041: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d041(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const { scene } = useGLTF('/models/d041.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <skinnedMesh geometry={nodes.d041.geometry} material={materials.d041} skeleton={nodes.d041.skeleton} />
      <primitive object={nodes.root} />
    </group>
    ); })

useGLTF.preload('/models/d041.glb')
