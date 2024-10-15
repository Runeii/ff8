/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d012.glb --types --exportdefault --output=./gltf/d012.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd012_act0' | 'd012_act1' | 'd012_act2'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d012: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d012: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d012(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d012.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d012_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d012" geometry={nodes.d012.geometry} material={materials.d012} skeleton={nodes.d012.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d012.glb')