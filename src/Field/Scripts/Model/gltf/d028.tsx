/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d028.glb --types --exportdefault --output=./gltf/d028.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd028_act0' | 'd028_act1' | 'd028_act2'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d028: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d028: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d028(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d028.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d028_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d028" geometry={nodes.d028.geometry} material={materials.d028} skeleton={nodes.d028.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d028.glb')