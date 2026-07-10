import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { buildShelfBooks } from '../library'

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
function makeSpineTexture({ color, title, author, titleColor }) {
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
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(64, 128)
  ctx.rotate(-Math.PI / 2)
  ctx.font = `bold ${title.length > 22 ? 12 : 15}px Georgia, serif`
  ctx.fillText(title.toUpperCase(), 0, -3, 190)
  ctx.globalAlpha = 0.72
  ctx.font = '8px Arial, sans-serif'
  ctx.fillText(author.toUpperCase(), 0, 12, 170)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Book({ book, selected, onSelect }) {
  const groupRef = useRef()
  const { gl } = useThree()
  const { author, color, title, titleColor } = book
  const spineTexture = useMemo(
    () => makeSpineTexture({ author, color, title, titleColor }),
    [author, color, title, titleColor]
  )

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      selected ? 0.82 : 0,
      8,
      delta
    )
    const scale = THREE.MathUtils.damp(
      groupRef.current.scale.x,
      selected ? 1.04 : 1,
      8,
      delta
    )
    groupRef.current.scale.setScalar(scale)
    groupRef.current.rotation.z = THREE.MathUtils.damp(
      groupRef.current.rotation.z,
      selected ? 0 : book.tilt || 0,
      8,
      delta
    )
  })

  return (
    <group
      ref={groupRef}
      position={book.position}
      rotation={[0, 0, book.tilt || 0]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(selected ? null : book.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        gl.domElement.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'auto'
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[book.width, book.height, book.depth]} />
        <meshStandardMaterial
          map={spineTexture}
          roughness={0.55}
          metalness={0.05}
        />
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
  const { author, color, title, titleColor } = book

  const spineTexture = useMemo(
    () => makeSpineTexture({ author, color, title, titleColor }),
    [author, color, title, titleColor]
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
      </group>
    </RigidBody>
  )
}

/* ------------------------------------------------------------------ */
/* Shelf (horizontal plank with books)                                 */
/* ------------------------------------------------------------------ */
function Shelf({
  y,
  woodTex,
  mode,
  library,
  shelfIndex,
  selectedBookId,
  onSelectBook,
}) {
  const books = useMemo(
    () => buildShelfBooks(library, shelfIndex),
    [library, shelfIndex]
  )

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
          <PhysicsBook key={b.id} book={b} mode={mode} />
        ) : (
          <Book
            key={b.id}
            book={b}
            selected={selectedBookId === b.id}
            onSelect={onSelectBook}
          />
        )
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Bookshelf frame (sides + back)                                      */
/* ------------------------------------------------------------------ */
function Bookshelf({ mode, library, selectedBookId, onSelectBook }) {
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
      {[-1.6, 0.4, 2.4, 4.4].map((y, shelfIndex) => (
        <Shelf
          key={y}
          y={y}
          woodTex={woodTex}
          mode={mode}
          library={library}
          shelfIndex={shelfIndex}
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
        />
      ))}

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

export default Bookshelf
