/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d025.glb --types --exportdefault --output=./gltf/d025.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd025_act0' | 'd025_act1' | 'd025_act10' | 'd025_act11' | 'd025_act2' | 'd025_act3' | 'd025_act4' | 'd025_act5' | 'd025_act6' | 'd025_act7' | 'd025_act8' | 'd025_act9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d025: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d025: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d025(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d025.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d025_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d025" geometry={nodes.d025.geometry} material={materials.d025} skeleton={nodes.d025.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d025.glb')
