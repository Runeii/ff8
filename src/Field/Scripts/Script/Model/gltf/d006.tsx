/* eslint-disable */
// @ts-nocheck

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 ./models/d006.glb --types --exportdefault --output=./gltf/d006.tsx 
*/

import * as THREE from 'three'
import React from 'react'
import { useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName = 'd006_act0' | 'd006_act1' | 'd006_act10' | 'd006_act11' | 'd006_act12' | 'd006_act13' | 'd006_act14' | 'd006_act15' | 'd006_act16' | 'd006_act17' | 'd006_act18' | 'd006_act2' | 'd006_act3' | 'd006_act4' | 'd006_act5' | 'd006_act6' | 'd006_act7' | 'd006_act8' | 'd006_act9'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    d006: THREE.SkinnedMesh
    root: THREE.Bone
  }
  materials: {
    d006: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

export default React.forwardRef(function d006(props: JSX.IntrinsicElements['group'], ref: React.Ref<{ actions: Record<ActionName, AnimationAction>, mesh: Group }>) {
  const group = React.useRef<THREE.Group>()
  const { scene, animations } = useGLTF('/models/d006.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
    
    const formattedAnimations = useAnimations(animations, group);
    useImperativeHandle(ref, () => ({ animations: formattedAnimations, group, nodes, materials }));
      return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="d006_armature">
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh name="d006" geometry={nodes.d006.geometry} material={materials.d006} skeleton={nodes.d006.skeleton} />
      </group>
    </group>
    ); })

useGLTF.preload('/models/d006.glb')
