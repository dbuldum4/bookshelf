import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const FIXED_TARGET = new THREE.Vector3(0, 0.5, 0)
const FIXED_POSITION = new THREE.Vector3(0, 2, 13)

// Scratch vectors — avoid per-frame allocations
const scratchPos = new THREE.Vector3()
const scratchLook = new THREE.Vector3()

function holdFraming(camera, controls, position, delta) {
  camera.position.lerp(position, Math.min(1, delta * 3))
  camera.lookAt(FIXED_TARGET)
  if (controls) {
    controls.target.lerp(FIXED_TARGET, Math.min(1, delta * 3))
    controls.update()
  }
}

function CameraRig({ mode, reducedMotion = false }) {
  const { camera, controls } = useThree()
  const angleRef = useRef(Math.atan2(camera.position.z - FIXED_TARGET.z, camera.position.x - FIXED_TARGET.x))
  const shakeRef = useRef(0)

  useFrame((_, delta) => {
    if (mode === 'rotate') {
      if (reducedMotion) {
        // Keep the current framing without auto-rotating.
        camera.lookAt(FIXED_TARGET)
        if (controls) {
          controls.target.lerp(FIXED_TARGET, Math.min(1, delta * 3))
          controls.update()
        }
        return
      }

      // Slowly orbit around the bookshelf
      angleRef.current += delta * 0.18
      const radius = 13
      const x = FIXED_TARGET.x + Math.cos(angleRef.current) * radius
      const z = FIXED_TARGET.z + Math.sin(angleRef.current) * radius
      const y = 2
      scratchPos.set(x, y, z)
      camera.position.lerp(scratchPos, Math.min(1, delta * 3))
      camera.lookAt(FIXED_TARGET)
      if (controls) {
        controls.target.lerp(FIXED_TARGET, Math.min(1, delta * 3))
        controls.update()
      }
    } else if (mode === 'fixed' || mode === 'play') {
      if (reducedMotion) {
        holdFraming(camera, controls, FIXED_POSITION, delta)
        return
      }

      // Hold framing with a very subtle handheld breathe (toy diorama, not found-footage)
      shakeRef.current += delta
      const t = shakeRef.current
      scratchPos.set(
        FIXED_POSITION.x + Math.sin(t * 0.55) * 0.028 + Math.sin(t * 1.4) * 0.01,
        FIXED_POSITION.y + Math.sin(t * 0.4) * 0.02 + Math.sin(t * 1.7) * 0.008,
        FIXED_POSITION.z + Math.cos(t * 0.48) * 0.028 + Math.sin(t * 1.25) * 0.01,
      )
      camera.position.lerp(scratchPos, Math.min(1, delta * 3))
      scratchLook.set(
        FIXED_TARGET.x + Math.sin(t * 0.6) * 0.01,
        FIXED_TARGET.y + Math.cos(t * 0.45) * 0.008,
        FIXED_TARGET.z,
      )
      camera.lookAt(scratchLook)
      if (controls) {
        controls.target.lerp(FIXED_TARGET, Math.min(1, delta * 3))
        controls.update()
      }
    }
  })

  // When switching back to custom, sync controls with camera
  useEffect(() => {
    if (mode === 'custom' && controls) {
      controls.target.copy(FIXED_TARGET)
      controls.update()
    }
  }, [mode, controls])

  return null
}

export default CameraRig
