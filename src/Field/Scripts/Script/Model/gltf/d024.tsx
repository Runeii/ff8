/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d024.glb --types --exportdefault --output=./gltf/d024.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd024_act0' | 'd024_act1' | 'd024_act2'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d024: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d024: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d024(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d024.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d024_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d024" geometry={nodes.d024.geometry} material={materials.d024} skeleton={nodes.d024.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d024.glb')
