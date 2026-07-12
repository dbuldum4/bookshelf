import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const FIXED_TARGET = new THREE.Vector3(0, 0.5, 0)
const FIXED_POSITION = new THREE.Vector3(0, 2, 11)

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
      const radius = 11
      const x = FIXED_TARGET.x + Math.cos(angleRef.current) * radius
      const z = FIXED_TARGET.z + Math.sin(angleRef.current) * radius
      const y = 2
      camera.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, delta * 3))
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

      // Hold a static framing with a gentle handheld "shake"
      shakeRef.current += delta
      const t = shakeRef.current
      const shake = new THREE.Vector3(
        Math.sin(t * 0.7) * 0.06 + Math.sin(t * 1.9) * 0.02,
        Math.sin(t * 0.5) * 0.04 + Math.sin(t * 2.3) * 0.015,
        Math.cos(t * 0.6) * 0.06 + Math.sin(t * 1.7) * 0.02
      )
      camera.position.lerp(FIXED_POSITION.clone().add(shake), Math.min(1, delta * 3))
      // Look at target with a tiny wobble so the framing breathes
      const wobble = new THREE.Vector3(
        Math.sin(t * 0.8) * 0.02,
        Math.cos(t * 0.6) * 0.015,
        0
      )
      camera.lookAt(FIXED_TARGET.clone().add(wobble))
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
