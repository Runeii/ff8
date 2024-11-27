/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d055.glb --types --exportdefault --output=./gltf/d055.tsx 
*/

import * as THREE from 'three'
import React, { useImperativeHandle } from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd055_act0' | 'd055_act1' | 'd055_act2' | 'd055_act3'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d055: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d055: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d055(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d055.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d055_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d055" geometry={nodes.d055.geometry} material={materials.d055} skeleton={nodes.d055.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d055.glb')
