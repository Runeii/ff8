/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d026.glb --types --exportdefault --output=./gltf/d026.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd026_act0' | 'd026_act1' | 'd026_act10' | 'd026_act2' | 'd026_act3' | 'd026_act4' | 'd026_act5' | 'd026_act6' | 'd026_act7' | 'd026_act8' | 'd026_act9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d026: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d026: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d026(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d026.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, mesh: group }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d026_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d026" geometry={nodes.d026.geometry} material={materials.d026} skeleton={nodes.d026.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d026.glb')