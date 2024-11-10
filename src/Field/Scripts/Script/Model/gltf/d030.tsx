/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d030.glb --types --exportdefault --output=./gltf/d030.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useRef, useMemo, useImperativeHandle } from 'react';
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd030_act0' | 'd030_act1' | 'd030_act2' | 'd030_act3' | 'd030_act4' | 'd030_act5' | 'd030_act6' | 'd030_act7' | 'd030_act8'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d030: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d030: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d030(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d030.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
        // Expose actions to the parent via the ref
      useImperativeHandle(ref, () => ({ actions, mesh: group }));
        return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d030_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d030" geometry={nodes.d030.geometry} material={materials.d030} skeleton={nodes.d030.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d030.glb')
