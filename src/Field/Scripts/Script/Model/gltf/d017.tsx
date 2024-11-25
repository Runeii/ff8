/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d017.glb --types --exportdefault --output=./gltf/d017.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    d017: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d017: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d017(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const { scene } = useGLTF('/models/d017.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <skinnedMesh geometry={nodes.d017.geometry} material={materials.d017} skeleton={nodes.d017.skeleton} />
      <primitive object={nodes.root} />
    </group>
    ); })

useGLTF.preload('/models/d017.glb')
