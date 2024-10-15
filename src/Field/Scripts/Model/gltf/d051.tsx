/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d051.glb --types --exportdefault --output=./gltf/d051.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd051_act0' | 'd051_act1' | 'd051_act2'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d051: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d051: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d051(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d051.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d051_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d051" geometry={nodes.d051.geometry} material={materials.d051} skeleton={nodes.d051.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d051.glb')