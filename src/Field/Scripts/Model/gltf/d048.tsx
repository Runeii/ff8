/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d048.glb --types --exportdefault --output=./gltf/d048.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd048_act0' | 'd048_act1' | 'd048_act2' | 'd048_act3' | 'd048_act4' | 'd048_act5' | 'd048_act6' | 'd048_act7' | 'd048_act8'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d048: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d048: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d048(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d048.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d048_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d048" geometry={nodes.d048.geometry} material={materials.d048} skeleton={nodes.d048.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d048.glb')