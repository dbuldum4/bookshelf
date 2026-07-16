import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  buildShelfCaseLayout,
  DEFAULT_SHELF_WIDTH,
  shelfRowYs,
} from '../library'
import { lockLook, unlockLook } from './lookLock'

function useWoodTexture() {
  const texture = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, size, 0)
    grad.addColorStop(0, '#6b3f1d')
    grad.addColorStop(0.5, '#8a5a2b')
    grad.addColorStop(1, '#5a3417')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

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

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

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

function Book({ book, selected, onSelect, interactive }) {
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
      onClick={interactive ? (event) => {
        event.stopPropagation()
        onSelect(selected ? null : book.id)
      } : undefined}
      onPointerOver={interactive ? (event) => {
        event.stopPropagation()
        gl.domElement.style.cursor = 'pointer'
      } : undefined}
      onPointerOut={interactive ? () => {
        gl.domElement.style.cursor = 'auto'
      } : undefined}
    >
      <BookMesh book={book} />
    </group>
  )
}

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
      if (mode !== 'play' || e.button !== 0) return
      e.stopPropagation()
      const body = bodyRef.current
      if (!body) return
      dragging.current = true
      lockLook()
      body.setBodyType(2, true)
      const p = body.translation()
      camera.getWorldDirection(cameraDir)
      dragPlane.setFromNormalAndCoplanarPoint(cameraDir.negate(), new THREE.Vector3(p.x, p.y, p.z))
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
      const rect = gl.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
      const ny = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
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
      unlockLook()
      gl.domElement.style.cursor = 'auto'
      const body = bodyRef.current
      if (!body) return
      body.setBodyType(0, true)
      const v = velocity.current
      const max = 18
      const speed = v.length()
      if (speed > max) v.multiplyScalar(max / speed)
      body.setLinvel({ x: v.x, y: v.y, z: v.z }, true)
      body.setAngvel({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 }, true)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
      if (dragging.current) {
        dragging.current = false
        unlockLook()
        gl.domElement.style.cursor = 'auto'
      }
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

function ShelfRow({
  y,
  woodTex,
  mode,
  books,
  width,
  selectedBookId,
  onSelectBook,
  interactiveBooks,
}) {
  const plankWidth = width || DEFAULT_SHELF_WIDTH

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[plankWidth, 0.24, 1.4]} />
        <meshStandardMaterial map={woodTex} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.13, 0.71]}>
        <planeGeometry args={[plankWidth, 0.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      {mode === 'play' && (
        <CuboidCollider
          position={[0, -0.12, 0]}
          args={[plankWidth / 2, 0.12, 0.7]}
        />
      )}
      {books.map((b) =>
        mode === 'play' ? (
          <PhysicsBook key={b.id} book={b} mode={mode} />
        ) : (
          <Book
            key={b.id}
            book={b}
            selected={selectedBookId === b.id}
            onSelect={onSelectBook}
            interactive={interactiveBooks}
          />
        )
      )}
    </group>
  )
}

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const arrangeHit = new THREE.Vector3()

function BookshelfCase({
  shelf,
  books,
  mode,
  selectedBookId,
  onSelectBook,
  selectedShelfId,
  onSelectShelf,
  onMoveShelf,
  onShelfDragChange,
}) {
  const woodTex = useWoodTexture()
  const woodTex2 = useWoodTexture()
  const { camera, gl } = useThree()
  const dragging = useRef(false)
  const dragOffset = useRef(new THREE.Vector3())

  const width = shelf.width || DEFAULT_SHELF_WIDTH
  const rows = shelf.rows || 4
  const rowYs = shelfRowYs(rows)
  const halfW = width / 2
  const sideX = halfW + 0.15
  const topY = rowYs[rowYs.length - 1] + 1.35
  const bottomY = -0.35
  const midY = (topY + bottomY) / 2
  const frameH = topY - bottomY

  const rowLayouts = useMemo(
    () => buildShelfCaseLayout(books, shelf),
    [books, shelf]
  )

  const selected = selectedShelfId === shelf.id
  const arrange = mode === 'arrange'
  const interactiveBooks = mode !== 'arrange' && mode !== 'play'

  const onPointerDownCase = (event) => {
    if (!arrange || event.button !== 0) return
    event.stopPropagation()
    onSelectShelf?.(shelf.id)
    raycaster.setFromCamera(event.pointer, camera)
    if (!raycaster.ray.intersectPlane(floorPlane, arrangeHit)) return
    dragOffset.current.set(shelf.x - arrangeHit.x, 0, shelf.z - arrangeHit.z)
    dragging.current = true
    onShelfDragChange?.(true)
    gl.domElement.style.cursor = 'grabbing'
  }

  useEffect(() => {
    if (!arrange) return undefined
    const onMove = (event) => {
      if (!dragging.current) return
      const rect = gl.domElement.getBoundingClientRect()
      const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
      const ny = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
      if (!raycaster.ray.intersectPlane(floorPlane, arrangeHit)) return
      onMoveShelf?.(shelf.id, {
        x: arrangeHit.x + dragOffset.current.x,
        z: arrangeHit.z + dragOffset.current.z,
      })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      onShelfDragChange?.(false)
      gl.domElement.style.cursor = 'auto'
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
      if (dragging.current) {
        dragging.current = false
        onShelfDragChange?.(false)
        gl.domElement.style.cursor = 'auto'
      }
    }
  }, [arrange, camera, gl, onMoveShelf, onShelfDragChange, shelf.id])

  return (
    <group position={[shelf.x, 0, shelf.z]} rotation={[0, shelf.yaw || 0, 0]}>
      <group position={[0, 0, 0]}>
        {selected && arrange && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[halfW + 0.4, halfW + 0.65, 48]} />
            <meshBasicMaterial color="#a983ff" transparent opacity={0.85} />
          </mesh>
        )}

        <group
          onPointerDown={onPointerDownCase}
          onClick={(event) => {
            if (!arrange) return
            event.stopPropagation()
            onSelectShelf?.(shelf.id)
          }}
          onPointerOver={(event) => {
            if (!arrange || dragging.current) return
            event.stopPropagation()
            gl.domElement.style.cursor = 'grab'
          }}
          onPointerOut={() => {
            if (arrange && !dragging.current) gl.domElement.style.cursor = 'auto'
          }}
        >
          <mesh position={[0, midY, -0.75]} receiveShadow>
            <boxGeometry args={[width, frameH, 0.15]} />
            <meshStandardMaterial
              map={woodTex2}
              roughness={0.6}
              color={selected && arrange ? '#c4a574' : '#ffffff'}
            />
          </mesh>
          <mesh position={[-sideX, midY, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, frameH, 1.5]} />
            <meshStandardMaterial map={woodTex} roughness={0.45} />
          </mesh>
          <mesh position={[sideX, midY, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, frameH, 1.5]} />
            <meshStandardMaterial map={woodTex} roughness={0.45} />
          </mesh>
          <mesh position={[0, topY, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 0.5, 0.3, 1.6]} />
            <meshStandardMaterial map={woodTex} roughness={0.45} />
          </mesh>
          <mesh position={[0, bottomY, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 0.5, 0.3, 1.6]} />
            <meshStandardMaterial map={woodTex} roughness={0.45} />
          </mesh>
        </group>

        {rowYs.map((y, shelfIndex) => (
          <ShelfRow
            key={`${shelf.id}-row-${shelfIndex}`}
            y={y}
            woodTex={woodTex}
            mode={mode}
            books={rowLayouts[shelfIndex] || []}
            width={width}
            selectedBookId={selectedBookId}
            onSelectBook={onSelectBook}
            interactiveBooks={interactiveBooks}
          />
        ))}

        {mode === 'play' && (
          <>
            <CuboidCollider position={[0, midY, -0.75]} args={[halfW, frameH / 2, 0.08]} />
            <CuboidCollider position={[-sideX, midY, 0]} args={[0.15, frameH / 2, 0.75]} />
            <CuboidCollider position={[sideX, midY, 0]} args={[0.15, frameH / 2, 0.75]} />
            <CuboidCollider position={[0, topY, 0]} args={[halfW + 0.25, 0.15, 0.8]} />
            <CuboidCollider position={[0, bottomY, 0]} args={[halfW + 0.25, 0.15, 0.8]} />
          </>
        )}
      </group>
    </group>
  )
}

function Bookshelf({
  mode,
  library,
  shelves,
  selectedBookId,
  onSelectBook,
  selectedShelfId,
  onSelectShelf,
  onMoveShelf,
  onShelfDragChange,
}) {
  const cases = Array.isArray(shelves) ? shelves : []
  const books = Array.isArray(library) ? library : []

  return (
    <group>
      {cases.map((shelf) => (
        <BookshelfCase
          key={shelf.id}
          shelf={shelf}
          books={books.filter((book) => book.shelfId === shelf.id)}
          mode={mode}
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
          selectedShelfId={selectedShelfId}
          onSelectShelf={onSelectShelf}
          onMoveShelf={onMoveShelf}
          onShelfDragChange={onShelfDragChange}
        />
      ))}

      {mode === 'play' && (
        <CuboidCollider position={[0, -1.2, 0]} args={[80, 0.5, 80]} />
      )}

      {/* Floor disc for grounding the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[48, 64]} />
        <meshStandardMaterial color="#12081f" roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  )
}

export default Bookshelf
