import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Float,
} from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* Galaxy background                                                   */
/* ------------------------------------------------------------------ */
function Galaxy() {
  const pointsRef = useRef()

  const { positions, colors } = useMemo(() => {
    const count = 6000
    const radius = 60
    const branches = 4
    const spin = 1.1
    const randomnessPower = 3
    const insideColor = new THREE.Color('#ff9b6b')
    const outsideColor = new THREE.Color('#6b8cff')

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 1.6) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin

      const rx =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.6 *
        r
      const ry =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.15 *
        r
      const rz =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.6 *
        r

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      positions[i3 + 1] = ry
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz

      const mixed = insideColor.clone().lerp(outsideColor, r / radius)
      colors[i3] = mixed.r
      colors[i3 + 1] = mixed.g
      colors[i3 + 2] = mixed.b
    }
    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Realistic galaxy (soft sprites, core glow, nebula tints)            */
/* ------------------------------------------------------------------ */
function makeStarTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.15, 'rgba(255,255,255,0.7)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.15)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  grad.addColorStop(0, 'rgba(255,245,220,0.9)')
  grad.addColorStop(0.08, 'rgba(255,230,180,0.5)')
  grad.addColorStop(0.25, 'rgba(200,180,255,0.12)')
  grad.addColorStop(0.6, 'rgba(120,100,200,0.03)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function RealisticGalaxy() {
  const starTex = useMemo(() => makeStarTexture(), [])
  const glowTex = useMemo(() => makeGlowTexture(), [])
  const coreRef = useRef()
  const armsRef = useRef()
  const haloRef = useRef()

  const { core, arms, halo } = useMemo(() => {
    const radius = 60

    // ---- Core (dense bright bulge) ----
    const coreCount = 3000
    const corePos = new Float32Array(coreCount * 3)
    const coreCol = new Float32Array(coreCount * 3)
    const coreWhite = new THREE.Color('#fff8e8')
    const coreGold = new THREE.Color('#ffdc9a')
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 2.5) * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      corePos[i3] = r * Math.sin(phi) * Math.cos(theta)
      corePos[i3 + 1] = r * Math.cos(phi) * 0.4
      corePos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = coreWhite.clone().lerp(coreGold, r / 8)
      coreCol[i3] = c.r
      coreCol[i3 + 1] = c.g
      coreCol[i3 + 2] = c.b
    }

    // ---- Spiral arms ----
    const armCount = 14000
    const armPos = new Float32Array(armCount * 3)
    const armCol = new Float32Array(armCount * 3)
    const branches = 2
    const spin = 0.5
    const randomnessPower = 2.8
    const innerWhite = new THREE.Color('#ffffff')
    const midBlue = new THREE.Color('#8fb8ff')
    const outerBlue = new THREE.Color('#3d5cff')
    const nebulaPink = new THREE.Color('#ff6b9d')
    for (let i = 0; i < armCount; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 0.8) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin * 0.12

      const rx =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.5 *
        r
      const ry =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.08 *
        r
      const rz =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.5 *
        r

      armPos[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      armPos[i3 + 1] = ry
      armPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz

      let c
      if (r < 12) {
        c = innerWhite.clone().lerp(midBlue, r / 12 * 0.5)
      } else if (r < 40) {
        c = midBlue.clone().lerp(outerBlue, (r - 12) / 28)
      } else {
        c = outerBlue.clone()
      }
      // Sprinkle nebula pinks
      if (Math.random() < 0.04 && r > 10 && r < 45) {
        c.lerp(nebulaPink, 0.5 + Math.random() * 0.4)
      }
      armCol[i3] = c.r
      armCol[i3 + 1] = c.g
      armCol[i3 + 2] = c.b
    }

    // ---- Halo (diffuse outer stars) ----
    const haloCount = 4000
    const haloPos = new Float32Array(haloCount * 3)
    const haloCol = new Float32Array(haloCount * 3)
    const haloBlue = new THREE.Color('#4a6aff')
    const haloFaint = new THREE.Color('#2a2a55')
    for (let i = 0; i < haloCount; i++) {
      const i3 = i * 3
      const r = 30 + Math.pow(Math.random(), 0.5) * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      haloPos[i3] = r * Math.sin(phi) * Math.cos(theta)
      haloPos[i3 + 1] = r * Math.cos(phi) * 0.3
      haloPos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = haloBlue.clone().lerp(haloFaint, Math.random())
      haloCol[i3] = c.r
      haloCol[i3 + 1] = c.g
      haloCol[i3 + 2] = c.b
    }

    return {
      core: { pos: corePos, col: coreCol, count: coreCount },
      arms: { pos: armPos, col: armCol, count: armCount },
      halo: { pos: haloPos, col: haloCol, count: haloCount },
    }
  }, [])

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.015
    if (armsRef.current) armsRef.current.rotation.y += delta * 0.015
    if (haloRef.current) haloRef.current.rotation.y += delta * 0.008
  })

  return (
    <group>
      {/* Central glow billboard */}
      <sprite scale={[22, 22, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Core stars */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[core.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[core.col, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.45}
          sizeAttenuation
          map={starTex}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>

      {/* Spiral arms */}
      <points ref={armsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[arms.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[arms.col, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.6}
          sizeAttenuation
          map={starTex}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>

      {/* Halo */}
      <points ref={haloRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[halo.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[halo.col, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.35}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.4}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Procedural wood texture                                            */
/* ------------------------------------------------------------------ */
function useWoodTexture() {
  return useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, size, 0)
    grad.addColorStop(0, '#6b3f1d')
    grad.addColorStop(0.5, '#8a5a2b')
    grad.addColorStop(1, '#5a3417')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    // Grain lines
    for (let i = 0; i < 220; i++) {
      const y = Math.random() * size
      const alpha = 0.05 + Math.random() * 0.22
      const shade = Math.random() > 0.5 ? '60,30,10' : '180,120,70'
      ctx.strokeStyle = `rgba(${shade},${alpha})`
      ctx.lineWidth = 0.5 + Math.random() * 1.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      let x = 0
      while (x < size) {
        const yy = y + Math.sin(x * 0.02) * 3 + (Math.random() - 0.5) * 4
        ctx.lineTo(x, yy)
        x += 6
      }
      ctx.stroke()
    }

    // Knots
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const r = 6 + Math.random() * 14
      const knot = ctx.createRadialGradient(x, y, 0, x, y, r)
      knot.addColorStop(0, 'rgba(40,20,8,0.9)')
      knot.addColorStop(1, 'rgba(40,20,8,0)')
      ctx.fillStyle = knot
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/* ------------------------------------------------------------------ */
/* A single book                                                       */
/* ------------------------------------------------------------------ */
const BOOK_COLORS = [
  '#b3303a', '#2d5a8a', '#2e7d52', '#c98a2b', '#6a3d8a',
  '#8a2b3c', '#1f4d6b', '#5a7a2b', '#a83a2b', '#3a4a8a',
  '#7a5a2b', '#2b6a6a',
]

function makeSpineTexture(color, titleColor) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, shade(color, -0.25))
  g.addColorStop(0.5, color)
  g.addColorStop(1, shade(color, -0.25))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 256)

  ctx.fillStyle = shade(color, -0.45)
  ctx.fillRect(0, 0, 128, 10)
  ctx.fillRect(0, 246, 128, 10)

  ctx.strokeStyle = shade(color, 0.4)
  ctx.lineWidth = 1.5
  ctx.strokeRect(6, 24, 116, 18)
  ctx.strokeRect(6, 214, 116, 18)

  ctx.fillStyle = titleColor || '#f5e6c8'
  ctx.font = 'bold 16px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.save()
  ctx.translate(64, 128)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('BOOK', 0, 5)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Book({ position, color, height, width, depth, titleColor, tilt }) {
  const spineTexture = useMemo(
    () => makeSpineTexture(color, titleColor),
    [color, titleColor]
  )

  return (
    <group position={position} rotation={[0, 0, tilt || 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          map={spineTexture}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.001]}>
        <planeGeometry args={[width * 0.96, height * 0.96]} />
        <meshStandardMaterial color="#f0ead6" roughness={0.85} />
      </mesh>
    </group>
  )
}

function shade(hex, amt) {
  const c = new THREE.Color(hex)
  if (amt > 0) c.lerp(new THREE.Color('#ffffff'), amt)
  else c.lerp(new THREE.Color('#000000'), -amt)
  return '#' + c.getHexString()
}

/* ------------------------------------------------------------------ */
/* Physics-enabled book (grab & fling)                                 */
/* ------------------------------------------------------------------ */
const dragPlane = new THREE.Plane()
const raycaster = new THREE.Raycaster()
const dragPoint = new THREE.Vector3()
const cameraDir = new THREE.Vector3()

function PhysicsBook({ book, mode }) {
  const bodyRef = useRef()
  const dragging = useRef(false)
  const lastPos = useRef(new THREE.Vector3())
  const velocity = useRef(new THREE.Vector3())
  const lastTime = useRef(0)
  const { camera, gl } = useThree()

  const spineTexture = useMemo(
    () => makeSpineTexture(book.color, book.titleColor),
    [book.color, book.titleColor]
  )

  const onPointerDown = useCallback(
    (e) => {
      if (mode !== 'play') return
      e.stopPropagation()
      const body = bodyRef.current
      if (!body) return
      dragging.current = true
      // Set kinematic while dragging so we control position
      body.setBodyType(2, true) // 2 = KinematicPositionBased
      // Build a drag plane facing the camera through the book center
      const p = body.translation()
      camera.getWorldDirection(cameraDir)
      dragPlane.setFromNormalAndCoplanarPoint(cameraDir.negate(), new THREE.Vector3(p.x, p.y, p.z))
      // Project pointer onto plane to get offset
      raycaster.setFromCamera(e.pointer, camera)
      raycaster.ray.intersectPlane(dragPlane, dragPoint)
      lastPos.current.copy(dragPoint)
      velocity.current.set(0, 0, 0)
      lastTime.current = performance.now()
      gl.domElement.style.cursor = 'grabbing'
    },
    [mode, camera, gl]
  )

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const body = bodyRef.current
      if (!body) return
      raycaster.setFromCamera(
        new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1
        ),
        camera
      )
      raycaster.ray.intersectPlane(dragPlane, dragPoint)
      const now = performance.now()
      const dt = Math.max(0.001, (now - lastTime.current) / 1000)
      velocity.current.copy(dragPoint).sub(lastPos.current).divideScalar(dt)
      lastPos.current.copy(dragPoint)
      lastTime.current = now
      body.setNextKinematicTranslation({ x: dragPoint.x, y: dragPoint.y, z: dragPoint.z })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      const body = bodyRef.current
      if (!body) return
      body.setBodyType(0, true) // 0 = Dynamic
      // Apply fling velocity (clamped)
      const v = velocity.current
      const max = 18
      const speed = v.length()
      if (speed > max) v.multiplyScalar(max / speed)
      body.setLinvel({ x: v.x, y: v.y, z: v.z }, true)
      body.setAngvel({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 }, true)
      gl.domElement.style.cursor = 'auto'
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [camera, gl])

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={[book.position[0], book.position[1] + 0.3, book.position[2]]}
      colliders="cuboid"
      mass={0.4}
      restitution={0.35}
      friction={0.6}
      linearDamping={0.3}
      angularDamping={0.4}
      enabled={mode === 'play'}
    >
      <group
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          if (mode === 'play') {
            e.stopPropagation()
            gl.domElement.style.cursor = 'grab'
          }
        }}
        onPointerOut={() => {
          if (mode === 'play' && !dragging.current) {
            gl.domElement.style.cursor = 'auto'
          }
        }}
        rotation={[0, 0, book.tilt || 0]}
      >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[book.width, book.height, book.depth]} />
            <meshStandardMaterial
              map={spineTexture}
              roughness={0.55}
              metalness={0.05}
            />
          </mesh>
        <mesh position={[0, 0, book.depth / 2 + 0.001]}>
          <planeGeometry args={[book.width * 0.96, book.height * 0.96]} />
          <meshStandardMaterial color="#f0ead6" roughness={0.85} />
        </mesh>
      </group>
    </RigidBody>
  )
}

/* ------------------------------------------------------------------ */
/* Shelf (horizontal plank with books)                                 */
/* ------------------------------------------------------------------ */
function Shelf({ y, woodTex, mode }) {
  const books = useMemo(() => {
    const items = []
    let x = -3.4
    let i = 0
    while (x < 3.4) {
      const w = 0.22 + Math.random() * 0.22
      const h = 1.0 + Math.random() * 0.35
      const d = 0.5 + Math.random() * 0.2
      const tilt = Math.random() < 0.12 ? (Math.random() - 0.5) * 0.18 : 0
      items.push({
        key: i,
        position: [x + w / 2, h / 2, 0],
        color: BOOK_COLORS[i % BOOK_COLORS.length],
        height: h,
        width: w,
        depth: d,
        tilt,
      })
      x += w + 0.005
      i++
    }
    return items
  }, [y])

  return (
    <group position={[0, y, 0]}>
      {/* Plank mesh */}
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.24, 1.4]} />
        <meshStandardMaterial
          map={woodTex}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>
      {/* Shadow strip under plank */}
      <mesh position={[0, -0.13, 0.71]}>
        <planeGeometry args={[7.6, 0.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      {/* Plank collider (physics only) */}
      {mode === 'play' && (
        <CuboidCollider
          position={[0, -0.12, 0]}
          args={[3.8, 0.12, 0.7]}
        />
      )}
      {/* Books */}
      {books.map((b) =>
        mode === 'play' ? (
          <PhysicsBook key={b.key} book={b} mode={mode} />
        ) : (
          <Book
            key={b.key}
            position={b.position}
            color={b.color}
            height={b.height}
            width={b.width}
            depth={b.depth}
            tilt={b.tilt}
          />
        )
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Bookshelf frame (sides + back)                                      */
/* ------------------------------------------------------------------ */
function Bookshelf({ mode }) {
  const woodTex = useWoodTexture()
  const woodTex2 = useWoodTexture()

  return (
    <group position={[0, -1.5, 0]}>
      {/* Back panel */}
      <mesh position={[0, 2, -0.75]} receiveShadow>
        <boxGeometry args={[7.6, 7.6, 0.15]} />
        <meshStandardMaterial map={woodTex2} roughness={0.6} />
      </mesh>
      {/* Left side */}
      <mesh position={[-3.85, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 7.6, 1.5]} />
        <meshStandardMaterial map={woodTex} roughness={0.45} />
      </mesh>
      {/* Right side */}
      <mesh position={[3.85, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 7.6, 1.5]} />
        <meshStandardMaterial map={woodTex} roughness={0.45} />
      </mesh>
      {/* Top */}
      <mesh position={[0, 5.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.1, 0.3, 1.6]} />
        <meshStandardMaterial map={woodTex} roughness={0.45} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -1.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.1, 0.3, 1.6]} />
        <meshStandardMaterial map={woodTex} roughness={0.45} />
      </mesh>
      {/* Shelves with books */}
      <Shelf y={-1.6} woodTex={woodTex} mode={mode} />
      <Shelf y={0.4} woodTex={woodTex} mode={mode} />
      <Shelf y={2.4} woodTex={woodTex} mode={mode} />
      <Shelf y={4.4} woodTex={woodTex} mode={mode} />

      {/* Physics colliders for frame + floor */}
      {mode === 'play' && (
        <>
          <CuboidCollider position={[0, 2, -0.75]} args={[3.8, 3.8, 0.08]} />
          <CuboidCollider position={[-3.85, 2, 0]} args={[0.15, 3.8, 0.75]} />
          <CuboidCollider position={[3.85, 2, 0]} args={[0.15, 3.8, 0.75]} />
          <CuboidCollider position={[0, 5.85, 0]} args={[4.05, 0.15, 0.8]} />
          <CuboidCollider position={[0, -1.85, 0]} args={[4.05, 0.15, 0.8]} />
          {/* Floor to catch fallen books */}
          <CuboidCollider position={[0, -5.5, 0]} args={[30, 0.5, 30]} />
        </>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
const FIXED_TARGET = new THREE.Vector3(0, 0.5, 0)

function CameraRig({ mode }) {
  const { camera, controls } = useThree()
  const angleRef = useRef(Math.atan2(camera.position.z - FIXED_TARGET.z, camera.position.x - FIXED_TARGET.x))
  const shakeRef = useRef(0)

  useFrame((_, delta) => {
    if (mode === 'rotate') {
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
      // Hold a static framing with a gentle handheld "shake"
      shakeRef.current += delta
      const t = shakeRef.current
      const base = new THREE.Vector3(0, 2, 11)
      const shake = new THREE.Vector3(
        Math.sin(t * 0.7) * 0.06 + Math.sin(t * 1.9) * 0.02,
        Math.sin(t * 0.5) * 0.04 + Math.sin(t * 2.3) * 0.015,
        Math.cos(t * 0.6) * 0.06 + Math.sin(t * 1.7) * 0.02
      )
      camera.position.lerp(base.clone().add(shake), Math.min(1, delta * 3))
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

function Scene({ mode, resetKey, galaxyMode }) {
  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#05010f', 18, 55]} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[-6, 4, 6]} intensity={0.6} color="#9bb8ff" />
      <pointLight position={[0, 8, -4]} intensity={0.4} color="#ffb86b" />

      {galaxyMode === 'pixelated' ? <Galaxy /> : <RealisticGalaxy />}

      {mode === 'play' ? (
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep="vary">
          <Bookshelf mode={mode} />
        </Physics>
      ) : (
        <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
          <Bookshelf mode={mode} />
        </Float>
      )}

      <ContactShadows
        position={[0, -3.45, 0]}
        opacity={0.6}
        scale={20}
        blur={2.5}
        far={8}
      />

      <Environment preset="night" />

      <CameraRig mode={mode} />
      <OrbitControls
        makeDefault
        enabled={mode === 'custom'}
        enablePan={false}
        minDistance={6}
        maxDistance={22}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.62}
      />
    </>
  )
}

export default function App() {
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#05010f' }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 11], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Scene mode={mode} resetKey={resetKey} galaxyMode={galaxyMode} />
      </Canvas>

      {/* Toggle in top-left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 0,
          padding: 4,
          background: 'rgba(20, 18, 35, 0.55)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {['fixed', 'rotate', 'custom', 'play'].map((m) => {
          const active = mode === m
          const label =
            m === 'fixed'
              ? 'Fixed View'
              : m === 'rotate'
              ? 'Rotate'
              : m === 'custom'
              ? 'Customize'
              : 'Play'
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.2,
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: active
                  ? 'rgba(255,255,255,0.16)'
                  : 'transparent',
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Galaxy toggle in top-right */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 0,
          padding: 4,
          background: 'rgba(20, 18, 35, 0.55)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {['pixelated', 'realistic'].map((g) => {
          const active = galaxyMode === g
          const label = g === 'pixelated' ? 'Pixelated' : 'Realistic'
          return (
            <button
              key={g}
              onClick={() => setGalaxyMode(g)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.2,
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: active
                  ? 'rgba(255,255,255,0.16)'
                  : 'transparent',
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Play mode hint + reset */}
      {mode === 'play' && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <div
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontWeight: 500,
              background: 'rgba(20, 18, 35, 0.55)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '8px 18px',
            }}
          >
            Drag a book to grab it — release to fling
          </div>
          <button
            onClick={() => setResetKey((k) => k + 1)}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(20, 18, 35, 0.55)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              borderRadius: 10,
              padding: '8px 16px',
              transition: 'all 0.2s ease',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
