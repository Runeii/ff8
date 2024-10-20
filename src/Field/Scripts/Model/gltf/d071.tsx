/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d071.glb --types --exportdefault --output=./gltf/d071.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd071_act0' | 'd071_act1' | 'd071_act2' | 'd071_act3'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d071: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d071: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d071(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d071.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d071_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d071" geometry={nodes.d071.geometry} material={materials.d071} skeleton={nodes.d071.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d071.glb')
