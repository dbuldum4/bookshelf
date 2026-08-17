import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { isLookLocked, resetLookLock } from './lookLock'

/** First-person walk / look modes (WASD + Space jump + one-finger / left-drag look). Rotate is a separate auto-orbit. */
const WALK_MODES = new Set(['fixed', 'play'])
const EYE_HEIGHT = 4.15
const MOVE_SPEED = 6.5
const JUMP_VELOCITY = 7.5
const GRAVITY = 20
const LOOK_SENSITIVITY = 0.0022
const PITCH_LIMIT = Math.PI * 0.42

const DEFAULT_POSITION = new THREE.Vector3(0, EYE_HEIGHT, 11)
const ARRANGE_POSITION = new THREE.Vector3(0, 10, 18)
const ARRANGE_TARGET = new THREE.Vector3(0, 1.5, 0)
const ROTATE_TARGET = new THREE.Vector3(0, 1.5, 0)
const ROTATE_RADIUS = 16
const ROTATE_HEIGHT = 3.2
const ROTATE_SPEED = 0.18

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false
  const el = target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
  if (!el) return false
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase()
    if (['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color', 'image'].includes(type)) {
      return false
    }
  }
  return true
}

function CameraRig({
  mode,
  reducedMotion = false,
  focusPoint = null,
}) {
  const { camera, controls, gl } = useThree()
  const keysRef = useRef(new Set())
  const lookingRef = useRef(false)
  const lookPointerIdRef = useRef(null)
  const yawRef = useRef(0)
  const pitchRef = useRef(-0.08)
  const positionRef = useRef(DEFAULT_POSITION.clone())
  const verticalVelocityRef = useRef(0)
  const jumpQueuedRef = useRef(false)
  const focusTokenRef = useRef(null)
  const angleRef = useRef(Math.atan2(
    DEFAULT_POSITION.z - ROTATE_TARGET.z,
    DEFAULT_POSITION.x - ROTATE_TARGET.x,
  ))
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const wish = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())
  const orbitDesired = useRef(new THREE.Vector3())

  // Clear look-lock when leaving play so grabs can't leave look stuck.
  useEffect(() => {
    if (mode !== 'play') resetLookLock()
  }, [mode])

  // Seed walk pose when entering a walk mode.
  useEffect(() => {
    if (!WALK_MODES.has(mode)) return
    positionRef.current.set(camera.position.x, EYE_HEIGHT, camera.position.z)
    if (positionRef.current.lengthSq() < 0.01) {
      positionRef.current.copy(DEFAULT_POSITION)
    }
    verticalVelocityRef.current = 0
    jumpQueuedRef.current = false
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    yawRef.current = Math.atan2(-dir.x, -dir.z)
    pitchRef.current = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)),
      -PITCH_LIMIT,
      PITCH_LIMIT,
    )
  }, [mode, camera])

  // Seed auto-orbit angle from the current camera when entering rotate.
  useEffect(() => {
    if (mode !== 'rotate') return
    angleRef.current = Math.atan2(
      camera.position.z - ROTATE_TARGET.z,
      camera.position.x - ROTATE_TARGET.x,
    )
  }, [mode, camera])

  useEffect(() => {
    if (!WALK_MODES.has(mode)) return undefined

    const stopLooking = (pointerId) => {
      if (pointerId != null && lookPointerIdRef.current != null && pointerId !== lookPointerIdRef.current) {
        return
      }
      lookingRef.current = false
      lookPointerIdRef.current = null
    }

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysRef.current.add(key)
        event.preventDefault()
        return
      }
      // Space jumps (edge-triggered; ignored while mid-air).
      if (key === ' ' || event.code === 'Space') {
        if (!event.repeat) jumpQueuedRef.current = true
        event.preventDefault()
      }
    }
    const onKeyUp = (event) => {
      keysRef.current.delete(event.key.toLowerCase())
    }
    const clearInput = () => {
      keysRef.current.clear()
      jumpQueuedRef.current = false
      stopLooking()
    }
    const onBlur = () => {
      clearInput()
    }
    const onVisibilityChange = () => {
      if (document.hidden) clearInput()
    }

    const canvas = gl.domElement
    const previousTouchAction = canvas.style.touchAction
    // Prevent browser pan/zoom from eating one-finger look drags.
    canvas.style.touchAction = 'none'

    const lookSensitivity = LOOK_SENSITIVITY * (reducedMotion ? 0.5 : 1)

    const onPointerDown = (event) => {
      // Primary (left / one-finger) or secondary (right) starts look.
      if (event.button !== 0 && event.button !== 2) return
      if (event.target !== canvas) return
      if (isLookLocked()) return
      // One look gesture at a time — ignore extra fingers.
      if (lookingRef.current) return
      event.preventDefault()
      lookingRef.current = true
      lookPointerIdRef.current = event.pointerId
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        // Some browsers reject capture during certain gestures; look still works via window move.
      }
    }
    const onPointerUp = (event) => {
      stopLooking(event.pointerId)
    }
    const onLostPointerCapture = (event) => {
      if (lookingRef.current) stopLooking(event.pointerId)
    }
    const onPointerMove = (event) => {
      if (!lookingRef.current) return
      if (lookPointerIdRef.current != null && event.pointerId !== lookPointerIdRef.current) return
      if (isLookLocked()) {
        stopLooking(event.pointerId)
        return
      }
      yawRef.current -= event.movementX * lookSensitivity
      pitchRef.current -= event.movementY * lookSensitivity
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, -PITCH_LIMIT, PITCH_LIMIT)
    }
    const onContextMenu = (event) => {
      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('lostpointercapture', onLostPointerCapture)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('lostpointercapture', onLostPointerCapture)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      canvas.style.touchAction = previousTouchAction
      keysRef.current = new Set()
      lookingRef.current = false
      lookPointerIdRef.current = null
    }
  }, [mode, gl, reducedMotion])

  // When the library list selects a book, gently face / approach it.
  useEffect(() => {
    if (!focusPoint) {
      focusTokenRef.current = null
      return
    }
    if (!WALK_MODES.has(mode)) return
    const token = [
      focusPoint.x,
      focusPoint.y,
      focusPoint.z,
      focusPoint.cameraX,
      focusPoint.cameraZ,
      focusPoint.id || '',
    ].join(',')
    if (focusTokenRef.current === token) return
    focusTokenRef.current = token

    const target = new THREE.Vector3(focusPoint.x, focusPoint.y, focusPoint.z)
    let desired
    if (Number.isFinite(focusPoint.cameraX) && Number.isFinite(focusPoint.cameraZ)) {
      desired = new THREE.Vector3(focusPoint.cameraX, EYE_HEIGHT, focusPoint.cameraZ)
    } else {
      const away = new THREE.Vector3().subVectors(positionRef.current, target)
      away.y = 0
      if (away.lengthSq() < 0.01) away.set(0, 0, 1)
      away.normalize()
      desired = target.clone().addScaledVector(away, 4.2)
      desired.y = EYE_HEIGHT
    }
    // Softer approach under reduced motion.
    positionRef.current.lerp(desired, reducedMotion ? 0.35 : 0.85)
    positionRef.current.y = EYE_HEIGHT
    verticalVelocityRef.current = 0
    jumpQueuedRef.current = false

    const look = target.clone().sub(positionRef.current).normalize()
    yawRef.current = Math.atan2(-look.x, -look.z)
    pitchRef.current = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(look.y, -1, 1)),
      -PITCH_LIMIT,
      PITCH_LIMIT,
    )
  }, [focusPoint, mode, reducedMotion])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    // Soften camera follow rates when reduced motion is preferred.
    const followRate = reducedMotion ? 1.2 : 2.5
    const orbitFollowRate = reducedMotion ? 1.5 : 3

    if (mode === 'arrange') {
      if (controls) {
        // OrbitControls owns arrange framing.
        return
      }
      camera.position.lerp(ARRANGE_POSITION, Math.min(1, dt * followRate))
      lookTarget.current.lerp(ARRANGE_TARGET, Math.min(1, dt * followRate))
      camera.lookAt(lookTarget.current)
      return
    }

    if (mode === 'custom') {
      // OrbitControls handles custom mode.
      return
    }

    if (mode === 'rotate') {
      if (!reducedMotion) {
        angleRef.current += dt * ROTATE_SPEED
      }
      orbitDesired.current.set(
        ROTATE_TARGET.x + Math.cos(angleRef.current) * ROTATE_RADIUS,
        ROTATE_HEIGHT,
        ROTATE_TARGET.z + Math.sin(angleRef.current) * ROTATE_RADIUS,
      )
      camera.position.lerp(orbitDesired.current, Math.min(1, dt * orbitFollowRate))
      camera.lookAt(ROTATE_TARGET)
      // Keep OrbitControls target in sync without update() — update() would
      // rewrite camera pose from its spherical state and fight the orbit rig.
      if (controls) {
        controls.target.copy(ROTATE_TARGET)
      }
      return
    }

    if (!WALK_MODES.has(mode)) return

    const keys = keysRef.current
    euler.current.set(pitchRef.current, yawRef.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(euler.current)

    forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.current.y = 0
    if (forward.current.lengthSq() > 1e-6) forward.current.normalize()
    right.current.set(1, 0, 0).applyQuaternion(camera.quaternion)
    right.current.y = 0
    if (right.current.lengthSq() > 1e-6) right.current.normalize()

    wish.current.set(0, 0, 0)
    if (keys.has('w')) wish.current.add(forward.current)
    if (keys.has('s')) wish.current.sub(forward.current)
    if (keys.has('a')) wish.current.sub(right.current)
    if (keys.has('d')) wish.current.add(right.current)
    if (wish.current.lengthSq() > 1e-6) {
      wish.current.normalize().multiplyScalar(MOVE_SPEED * (reducedMotion ? 0.65 : 1) * dt)
      positionRef.current.add(wish.current)
    }

    // Jump / fall. Orientation is still controlled solely by look-drag (yaw/pitch above).
    const grounded = positionRef.current.y <= EYE_HEIGHT + 1e-4 && verticalVelocityRef.current <= 0
    if (jumpQueuedRef.current) {
      if (grounded) {
        verticalVelocityRef.current = JUMP_VELOCITY * (reducedMotion ? 0.75 : 1)
      }
      jumpQueuedRef.current = false
    }
    if (!grounded || verticalVelocityRef.current > 0) {
      verticalVelocityRef.current -= GRAVITY * dt
      positionRef.current.y += verticalVelocityRef.current * dt
    }
    if (positionRef.current.y <= EYE_HEIGHT) {
      positionRef.current.y = EYE_HEIGHT
      verticalVelocityRef.current = 0
    }

    // Soft room bounds on the walk plane only — no mesh collision against shelves/books.
    positionRef.current.x = THREE.MathUtils.clamp(positionRef.current.x, -40, 40)
    positionRef.current.z = THREE.MathUtils.clamp(positionRef.current.z, -40, 40)

    camera.position.copy(positionRef.current)

    // Do not call OrbitControls.update() here. Even when disabled, update()
    // rewrites camera position/orientation from its spherical orbit state and
    // would fight first-person walk + look.
    if (controls) {
      const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position)
      controls.target.copy(look)
    }
  })

  return null
}

export default CameraRig
