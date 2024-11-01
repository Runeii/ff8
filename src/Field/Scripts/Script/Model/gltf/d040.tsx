/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d040.glb --types --exportdefault --output=./gltf/d040.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd040_act0'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d040: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d040: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d040(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d040.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d040_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d040" geometry={nodes.d040.geometry} material={materials.d040} skeleton={nodes.d040.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d040.glb')
