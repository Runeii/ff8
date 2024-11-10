/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d033.glb --types --exportdefault --output=./gltf/d033.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd033_act0' | 'd033_act1' | 'd033_act2' | 'd033_act3' | 'd033_act4' | 'd033_act5' | 'd033_act6' | 'd033_act7' | 'd033_act8'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d033: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d033: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d033(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d033.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, mesh: group }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d033_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d033" geometry={nodes.d033.geometry} material={materials.d033} skeleton={nodes.d033.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d033.glb')
