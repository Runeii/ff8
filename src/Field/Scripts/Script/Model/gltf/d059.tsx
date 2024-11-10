/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d059.glb --types --exportdefault --output=./gltf/d059.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    d059: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d059: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d059(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const { scene } = useGLTF('/models/d059.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <skinnedMesh geometry={nodes.d059.geometry} material={materials.d059} skeleton={nodes.d059.skeleton} />
      <primitive object={nodes.root} />
    </group>
    ); })

useGLTF.preload('/models/d059.glb')
