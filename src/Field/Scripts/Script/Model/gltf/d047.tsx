/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d047.glb --types --exportdefault --output=./gltf/d047.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd047_act0'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d047: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d047: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d047(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d047.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, group, nodes, materials }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d047_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d047" geometry={nodes.d047.geometry} material={materials.d047} skeleton={nodes.d047.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d047.glb')
