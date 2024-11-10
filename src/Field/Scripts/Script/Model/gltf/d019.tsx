/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d019.glb --types --exportdefault --output=./gltf/d019.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd019_act0' | 'd019_act1' | 'd019_act2'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d019: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d019: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d019(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d019.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, mesh: group }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d019_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d019" geometry={nodes.d019.geometry} material={materials.d019} skeleton={nodes.d019.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d019.glb')
