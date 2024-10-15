/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d067.glb --types --exportdefault --output=./gltf/d067.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd067_act0' | 'd067_act1' | 'd067_act2' | 'd067_act3'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d067: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d067: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d067(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d067.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d067_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d067" geometry={nodes.d067.geometry} material={materials.d067} skeleton={nodes.d067.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d067.glb')