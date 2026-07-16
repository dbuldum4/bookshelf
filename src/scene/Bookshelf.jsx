import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
function shade(hex, amt) {
  const c = new THREE.Color(hex)
  if (amt > 0) c.lerp(new THREE.Color('#ffffff'), amt)
  else c.lerp(new THREE.Color('#000000'), -amt)
  return '#' + c.getHexString()
}

function makeSpineTexture({ color, title, author, titleColor, coverImage = null }) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const ctx = c.getContext('2d')

  if (coverImage) {
    // Sample cover art as a vertical strip for the camera-facing spine.
    const srcW = coverImage.naturalWidth || coverImage.width
    const srcH = coverImage.naturalHeight || coverImage.height
    const sampleW = Math.max(1, Math.floor(srcW * 0.22))
    const sampleX = Math.max(0, Math.floor((srcW - sampleW) / 2))
    ctx.drawImage(coverImage, sampleX, 0, sampleW, srcH, 0, 0, 128, 256)
    const wash = ctx.createLinearGradient(0, 0, 128, 0)
    wash.addColorStop(0, 'rgba(0,0,0,0.35)')
    wash.addColorStop(0.45, 'rgba(0,0,0,0.12)')
    wash.addColorStop(1, 'rgba(0,0,0,0.4)')
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, 128, 256)
  } else {
    const g = ctx.createLinearGradient(0, 0, 128, 0)
    g.addColorStop(0, shade(color, -0.25))
    g.addColorStop(0.5, color)
    g.addColorStop(1, shade(color, -0.25))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 256)
  }

  ctx.fillStyle = coverImage ? 'rgba(0,0,0,0.45)' : shade(color, -0.45)
  ctx.fillRect(0, 0, 128, 10)
  ctx.fillRect(0, 246, 128, 10)

  ctx.strokeStyle = coverImage ? 'rgba(255,255,255,0.45)' : shade(color, 0.4)
  ctx.lineWidth = 1.5
  ctx.strokeRect(6, 24, 116, 18)
  ctx.strokeRect(6, 214, 116, 18)

  ctx.fillStyle = titleColor || '#f5e6c8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(64, 128)
  ctx.rotate(-Math.PI / 2)
  if (coverImage) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 4
  }
  ctx.font = `bold ${title.length > 22 ? 12 : 15}px Georgia, serif`
  ctx.fillText(title.toUpperCase(), 0, -3, 190)
  ctx.globalAlpha = 0.85
  ctx.font = '8px Arial, sans-serif'
  ctx.fillText(author.toUpperCase(), 0, 12, 170)
  ctx.restore()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function makeCoverFaceTexture({ color, coverImage = null }) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 384
  const ctx = c.getContext('2d')

  if (coverImage) {
    const srcW = coverImage.naturalWidth || coverImage.width
    const srcH = coverImage.naturalHeight || coverImage.height
    const scale = Math.max(256 / srcW, 384 / srcH)
    const drawW = srcW * scale
    const drawH = srcH * scale
    ctx.drawImage(coverImage, (256 - drawW) / 2, (384 - drawH) / 2, drawW, drawH)
  } else {
    const g = ctx.createLinearGradient(0, 0, 256, 384)
    g.addColorStop(0, shade(color, 0.08))
    g.addColorStop(1, shade(color, -0.2))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 384)
  }

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** url -> HTMLImageElement | null (null means a cached load failure). */
const COVER_CACHE_MAX = 128
const coverImageCache = new Map()
const coverImageWaiters = new Map()

function setCoverCache(url, value) {
  if (coverImageCache.has(url)) coverImageCache.delete(url)
  coverImageCache.set(url, value)
  while (coverImageCache.size > COVER_CACHE_MAX) {
    const oldest = coverImageCache.keys().next().value
    coverImageCache.delete(oldest)
  }
}

function loadCoverImage(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null)
  if (coverImageCache.has(url)) return Promise.resolve(coverImageCache.get(url))
  if (coverImageWaiters.has(url)) return coverImageWaiters.get(url)

  const promise = new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      setCoverCache(url, image)
      coverImageWaiters.delete(url)
      resolve(image)
    }
    image.onerror = () => {
      setCoverCache(url, null)
      coverImageWaiters.delete(url)
      resolve(null)
    }
    image.src = url
  })

  coverImageWaiters.set(url, promise)
  return promise
}

function useCoverImage(coverUrl) {
  const [coverImage, setCoverImage] = useState(() =>
    coverUrl && coverImageCache.has(coverUrl) ? coverImageCache.get(coverUrl) : null
  )

  useEffect(() => {
    let cancelled = false
    if (!coverUrl) {
      setCoverImage(null)
      return undefined
    }

    // Seed immediately from cache (including negative entries) so remounts and
    // URL swaps do not flash the wrong cover or solid-color fallback.
    if (coverImageCache.has(coverUrl)) {
      setCoverImage(coverImageCache.get(coverUrl))
    } else {
      setCoverImage(null)
    }

    loadCoverImage(coverUrl).then((image) => {
      if (!cancelled) setCoverImage(image)
    })

    return () => {
      cancelled = true
    }
  }, [coverUrl])

  return coverImage
}

/**
 * Box materials: +x, -x, +y, -y, +z, -z.
 * +z faces the camera (spine). +x is the front cover edge of the book.
 */
function BookMesh({ book }) {
  const { author, color, title, titleColor, coverUrl, width, height, depth } = book
  const coverImage = useCoverImage(coverUrl)

  const spineTexture = useMemo(
    () => makeSpineTexture({ author, color, title, titleColor, coverImage }),
    [author, color, title, titleColor, coverImage]
  )
  const coverFaceTexture = useMemo(
    () => makeCoverFaceTexture({ color, coverImage }),
    [color, coverImage]
  )

  useEffect(() => () => {
    spineTexture?.dispose()
  }, [spineTexture])

  useEffect(() => () => {
    coverFaceTexture?.dispose()
  }, [coverFaceTexture])

  const materials = useMemo(() => {
    const spine = new THREE.MeshStandardMaterial({
      map: spineTexture,
      roughness: 0.55,
      metalness: 0.05,
    })
    const cover = new THREE.MeshStandardMaterial({
      map: coverFaceTexture,
      roughness: 0.62,
      metalness: 0.03,
    })
    const board = new THREE.MeshStandardMaterial({
      color: shade(color, -0.12),
      roughness: 0.72,
      metalness: 0.04,
    })
    const pageEdge = new THREE.MeshStandardMaterial({
      color: '#e8dcc4',
      roughness: 0.88,
      metalness: 0,
    })

    // +x front cover, -x back board, +y top, -y bottom, +z spine, -z back edge
    return [cover, board, board, board, spine, pageEdge]
  }, [spineTexture, coverFaceTexture, color])

  useEffect(() => () => {
    const seen = new Set()
    for (const material of materials) {
      if (seen.has(material)) continue
      seen.add(material)
      material.dispose()
    }
  }, [materials])

  return (
    <mesh castShadow receiveShadow material={materials}>
      <boxGeometry args={[width, height, depth]} />
    </mesh>
  )
}

function Book({ book, selected, onSelect }) {
  const groupRef = useRef()
  const { gl } = useThree()

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
      <BookMesh book={book} />
    </group>
  )
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
        <BookMesh book={book} />
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
