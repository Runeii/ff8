import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, InstancedMesh, Matrix4, Vector3 } from 'three'

type FF8DrawParticlesProps = {
  count?: number
  height?: number
  colour?: string
  lineWidth?: number
  lineOpacity?: number
  curveWidth?: number
}

const FF8DrawParticles = ({
  count = 100,
  height = 8,
  colour = 'pink',
  lineWidth = 0.2,
  lineOpacity = 0.8,
  curveWidth = 2.0,
}: FF8DrawParticlesProps) => {
  const instancedMeshRef = useRef<InstancedMesh>(null)
  
  const tempObjects = useMemo(() => ({
    matrix: new Matrix4(),
    color: new Color(),
    scale: new Vector3(lineWidth, lineWidth * 0.3, lineWidth * 0.1),
    baseColor: new Color(colour)
  }), [colour, lineWidth])
  
  const particleData = useMemo(() => {
    const particles = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      particles.push({
        cosAngle: Math.cos(angle),
        sinAngle: Math.sin(angle),
        curveStrength: 0.5 + Math.random() * 0.5,
        speed: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      })
    }
    return particles
  }, [count])
  
  useFrame((state) => {
    const instancedMesh = instancedMeshRef.current
    if (!instancedMesh) return
    
    const time = state.clock.elapsedTime
    const { matrix, color, scale, baseColor } = tempObjects
    
    for (let i = 0; i < count; i++) {
      const particle = particleData[i]
      const rawProgress = (time * particle.speed + particle.phase) % 4
      
      if (rawProgress >= 1) {
        matrix.makeScale(0, 0, 0)
        instancedMesh.setMatrixAt(i, matrix)
        continue
      }
      
      const progress = rawProgress
      const sinProgress = Math.sin(progress * Math.PI)
      const vaseRadius = sinProgress * curveWidth * particle.curveStrength
      
      const x = particle.cosAngle * vaseRadius
      const y = particle.sinAngle * vaseRadius
      const z = progress * height
      
      matrix.makeTranslation(x, y, z)
      matrix.scale(scale)
      instancedMesh.setMatrixAt(i, matrix)
      
      const alpha = 1 - progress * 0.8
      color.copy(baseColor).multiplyScalar(alpha)
      instancedMesh.setColorAt(i, color)
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true
    }
  })
  
  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, count]} renderOrder={100}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        transparent
        opacity={lineOpacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

export default FF8DrawParticles