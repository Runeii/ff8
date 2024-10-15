/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.2 ./models/d022.glb --types --exportdefault --output=./gltf/d022.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd022_act0' | 'd022_act1' | 'd022_act2' | 'd022_act3' | 'd022_act4' | 'd022_act5' | 'd022_act6' | 'd022_act7' | 'd022_act8' | 'd022_act9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d022: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d022: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d022(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: any }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d022.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d022_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d022" geometry={nodes.d022.geometry} material={materials.d022} skeleton={nodes.d022.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d022.glb')