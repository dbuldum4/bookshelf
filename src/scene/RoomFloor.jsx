import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// Share the hidden Play collider top / case bottoms so nothing clips through.
const FLOOR_Y = -0.5
const FLOOR_RADIUS = 22

function makeFloorGrainTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  ctx.fillStyle = '#1a1410'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 70; i++) {
    const y = (i / 70) * size + (Math.random() - 0.5) * 3
    const shade = 18 + Math.random() * 28
    ctx.strokeStyle = `rgba(${shade + 8},${shade},${shade - 6},${0.12 + Math.random() * 0.22})`
    ctx.lineWidth = 0.6 + Math.random() * 1.6
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 1.8 + (Math.random() - 0.5) * 1.5)
    }
    ctx.stroke()
  }

  for (let i = 0; i < 280; i++) {
    ctx.fillStyle = `rgba(8,6,6,${0.08 + Math.random() * 0.18})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random(), 1)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(7, 7)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function RoomFloor({ graphics }) {
  // Low preset turns environment off; skip the grain canvas there.
  const useGrain = Boolean(graphics?.environment)
  const texture = useMemo(
    () => (useGrain ? makeFloorGrainTexture() : null),
    [useGrain],
  )
  useEffect(() => () => texture?.dispose(), [texture])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      receiveShadow={Boolean(graphics?.shadows)}
    >
      <circleGeometry args={[FLOOR_RADIUS, useGrain ? 48 : 24]} />
      <meshStandardMaterial
        map={texture}
        color={useGrain ? '#8a7a6c' : '#161018'}
        roughness={0.94}
        metalness={0.02}
        envMapIntensity={0.18}
      />
    </mesh>
  )
}

export default RoomFloor
