/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d021.glb --types --exportdefault --output=./gltf/d021.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    d021: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d021: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d021(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const { scene } = useGLTF('/models/d021.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  return (
    <group {...props} dispose={null}>
      <skinnedMesh geometry={nodes.d021.geometry} material={materials.d021} skeleton={nodes.d021.skeleton} />
      <primitive object={nodes.root} />
    </group>
    ); })

useGLTF.preload('/models/d021.glb')
