/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d066.glb --types --exportdefault --output=./gltf/d066.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd066_act0' | 'd066_act1' | 'd066_act2' | 'd066_act3' | 'd066_act4'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d066: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d066: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d066(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d066.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d066_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d066" geometry={nodes.d066.geometry} material={materials.d066} skeleton={nodes.d066.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d066.glb')
