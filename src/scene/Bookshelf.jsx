import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  buildShelfCaseLayout,
  DEFAULT_SHELF_WIDTH,
  insertionIndexFromLocalPoint,
  shelfRowYs,
} from '../library'
import { lockLook, unlockLook } from './lookLock'

function makeCaseLabelTexture(name, selected = false, aspect = 4) {
  const canvas = document.createElement('canvas')
  const height = 160
  const width = Math.round(Math.min(Math.max(height * aspect, 256), 1024))
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, selected ? '#4a3570' : '#3a2818')
  bg.addColorStop(1, selected ? '#2a1c48' : '#24180f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  const pad = Math.max(6, Math.round(height * 0.06))
  ctx.strokeStyle = selected ? 'rgba(200, 170, 255, 0.55)' : 'rgba(210, 180, 130, 0.35)'
  ctx.lineWidth = Math.max(3, Math.round(height * 0.035))
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2)

  const label = String(name || 'Shelf').trim() || 'Shelf'
  const maxTextW = width - pad * 4
  let fontSize = Math.floor(height * 0.62)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = selected ? '#f0e8ff' : '#f4eadc'
  for (; fontSize >= 18; fontSize -= 2) {
    ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`
    if (ctx.measureText(label).width <= maxTextW) break
  }
  ctx.fillText(label, width / 2, height / 2 + fontSize * 0.04)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function CaseNamePlaque({ name, topY, width, selected }) {
  const plaqueW = Math.min(Math.max(width * 0.55, 1.4), width - 0.4, 4.5)
  const plaqueH = 0.72
  const aspect = plaqueW / plaqueH

  const texture = useMemo(
    () => makeCaseLabelTexture(name, selected, aspect),
    [name, selected, aspect],
  )
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={[0, topY + 0.48, 0.72]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[plaqueW + 0.1, plaqueH + 0.08, 0.1]} />
        <meshStandardMaterial color={selected ? '#5a4278' : '#4a3220'} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.055]} castShadow>
        <planeGeometry args={[plaqueW, plaqueH]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55}
          metalness={0.05}
          transparent={false}
        />
      </mesh>
    </group>
  )
}

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
      // Do not cache null — allow retries on transient failures / CORS race.
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

const REORDER_DRAG_THRESHOLD_PX = 8

function Book({
  book,
  selected,
  onSelect,
  interactive,
  reorderable = false,
  isReorderSource = false,
  /** Row-local override while dragging; null keeps rest pose. */
  dragLift = null,
  onReorderPointerDown,
}) {
  const groupRef = useRef()
  const { gl } = useThree()
  const rest = book.position
  const pose = dragLift
    ? [dragLift.x, dragLift.y, dragLift.z]
    : rest

  useFrame((_, delta) => {
    if (!groupRef.current) return
    // While dragging, position is driven by the pose prop; only animate select pull-out.
    if (!dragLift) {
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        selected ? 0.82 : rest[2] || 0,
        8,
        delta,
      )
    }
    const targetScale = isReorderSource ? 1.08 : selected ? 1.04 : 1
    const scale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 8, delta)
    groupRef.current.scale.setScalar(scale)
    groupRef.current.rotation.z = THREE.MathUtils.damp(
      groupRef.current.rotation.z,
      selected || isReorderSource ? 0 : book.tilt || 0,
      8,
      delta,
    )
  })

  return (
    <group
      ref={groupRef}
      position={pose}
      rotation={[0, 0, book.tilt || 0]}
      onPointerDown={reorderable && onReorderPointerDown
        ? (event) => onReorderPointerDown(event, book)
        : undefined}
      onClick={interactive ? (event) => {
        event.stopPropagation()
        onSelect(selected ? null : book.id)
      } : undefined}
      onPointerOver={interactive || reorderable ? (event) => {
        event.stopPropagation()
        gl.domElement.style.cursor = reorderable ? 'grab' : 'pointer'
      } : undefined}
      onPointerOut={interactive || reorderable ? () => {
        if (!isReorderSource) gl.domElement.style.cursor = 'auto'
      } : undefined}
    >
      <BookMesh book={book} />
    </group>
  )
}

function ReorderInsertMarker({ x, y, height }) {
  return (
    <mesh position={[x, y, 0.55]} castShadow={false} receiveShadow={false}>
      <boxGeometry args={[0.06, height || 1.1, 0.08]} />
      <meshStandardMaterial
        color="#c4a0ff"
        emissive="#6a3dcc"
        emissiveIntensity={0.55}
        roughness={0.35}
        metalness={0.15}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

const dragPlane = new THREE.Plane()
const raycaster = new THREE.Raycaster()
const dragPoint = new THREE.Vector3()
const cameraDir = new THREE.Vector3()
const instantVel = new THREE.Vector3()

function PhysicsBook({ book, mode }) {
  const bodyRef = useRef()
  const dragging = useRef(false)
  const grabOffset = useRef(new THREE.Vector3())
  const lastPos = useRef(new THREE.Vector3())
  const velocity = useRef(new THREE.Vector3())
  const lastTime = useRef(0)
  const dragHandlers = useRef({ onMove: null, onUp: null, endDrag: null })
  const { camera, gl } = useThree()

  // Keep drag handlers current without attaching global listeners until grab.
  useEffect(() => {
    const removeListeners = () => {
      const { onMove, onUp } = dragHandlers.current
      if (!onMove || !onUp) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
    }

    const endDrag = (applyVelocity) => {
      if (!dragging.current) return
      dragging.current = false
      unlockLook()
      gl.domElement.style.cursor = 'auto'
      removeListeners()
      const body = bodyRef.current
      if (!body) return
      body.setBodyType(0, true)
      if (applyVelocity) {
        const v = velocity.current
        const max = 18
        const speed = v.length()
        if (speed > max) v.multiplyScalar(max / speed)
        body.setLinvel({ x: v.x, y: v.y, z: v.z }, true)
        body.setAngvel({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4,
          z: (Math.random() - 0.5) * 4,
        }, true)
      } else {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    const onMove = (e) => {
      if (!dragging.current) return
      const body = bodyRef.current
      if (!body) return
      const rect = gl.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
      const ny = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
      if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return
      const now = performance.now()
      const dt = Math.max(0.001, (now - lastTime.current) / 1000)
      instantVel.copy(dragPoint).sub(lastPos.current).divideScalar(dt)
      velocity.current.lerp(instantVel, 0.45)
      lastPos.current.copy(dragPoint)
      lastTime.current = now
      const tx = dragPoint.x + grabOffset.current.x
      const ty = dragPoint.y + grabOffset.current.y
      const tz = dragPoint.z + grabOffset.current.z
      body.setNextKinematicTranslation({ x: tx, y: ty, z: tz })
    }

    const onUp = () => endDrag(true)

    dragHandlers.current = { onMove, onUp, endDrag }

    return () => {
      if (dragging.current) {
        endDrag(false)
      }
    }
  }, [camera, gl])

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
      if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        dragging.current = false
        unlockLook()
        body.setBodyType(0, true)
        return
      }
      grabOffset.current.set(p.x - dragPoint.x, p.y - dragPoint.y, p.z - dragPoint.z)
      lastPos.current.copy(dragPoint)
      velocity.current.set(0, 0, 0)
      lastTime.current = performance.now()
      gl.domElement.style.cursor = 'grabbing'
      const { onMove, onUp } = dragHandlers.current
      if (onMove && onUp) {
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        window.addEventListener('blur', onUp)
      }
    },
    [mode, camera, gl]
  )

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={[book.position[0], book.position[1] + 0.08, book.position[2]]}
      colliders="cuboid"
      mass={0.4}
      restitution={0.35}
      friction={0.6}
      linearDamping={0.3}
      angularDamping={0.4}
      ccd
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
  reorderable,
  reorderState,
  onReorderPointerDown,
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
            reorderable={reorderable}
            isReorderSource={reorderState?.bookId === b.id && reorderState?.active}
            dragLift={
              reorderState?.bookId === b.id && reorderState?.active
                ? {
                    x: reorderState.localX,
                    y: reorderState.localY - y,
                    z: 0.95,
                  }
                : null
            }
            onReorderPointerDown={onReorderPointerDown}
          />
        )
      )}
    </group>
  )
}

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const arrangeHit = new THREE.Vector3()

const reorderHit = new THREE.Vector3()
const reorderPlane = new THREE.Plane()
const reorderNormal = new THREE.Vector3()
const reorderOrigin = new THREE.Vector3()

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
  onReorderBookToIndex,
  onBookDragChange,
}) {
  const woodTex = useWoodTexture()
  const woodTex2 = useWoodTexture()
  const { camera, gl } = useThree()
  const caseRef = useRef()
  const dragging = useRef(false)
  const dragOffset = useRef(new THREE.Vector3())
  const dragHandlers = useRef({ onMove: null, onUp: null, endDrag: null })
  const reorderDrag = useRef(null)
  const reorderHandlers = useRef({ onMove: null, onUp: null, endDrag: null })
  const [reorderState, setReorderState] = useState(null)

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
  const reorderable = interactiveBooks && typeof onReorderBookToIndex === 'function'

  const projectPointerToCaseLocal = useCallback((clientX, clientY) => {
    const caseGroup = caseRef.current
    if (!caseGroup) return null
    const rect = gl.domElement.getBoundingClientRect()
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1
    const ny = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
    caseGroup.updateWorldMatrix(true, false)
    reorderNormal.set(0, 0, 1).transformDirection(caseGroup.matrixWorld)
    reorderOrigin.set(0, midY, 0.35).applyMatrix4(caseGroup.matrixWorld)
    reorderPlane.setFromNormalAndCoplanarPoint(reorderNormal, reorderOrigin)
    if (!raycaster.ray.intersectPlane(reorderPlane, reorderHit)) return null
    caseGroup.worldToLocal(reorderHit)
    return { x: reorderHit.x, y: reorderHit.y }
  }, [camera, gl, midY])

  // Keep arrange drag handlers current; attach window listeners only while dragging.
  useEffect(() => {
    if (!arrange) return undefined

    const removeListeners = () => {
      const { onMove, onUp } = dragHandlers.current
      if (!onMove || !onUp) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
    }

    const endDrag = () => {
      if (!dragging.current) return
      dragging.current = false
      onShelfDragChange?.(false)
      gl.domElement.style.cursor = 'auto'
      removeListeners()
    }

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

    const onUp = () => endDrag()

    dragHandlers.current = { onMove, onUp, endDrag }

    return () => {
      if (dragging.current) {
        endDrag()
      }
    }
  }, [arrange, camera, gl, onMoveShelf, onShelfDragChange, shelf.id])

  // Spine drag-to-reorder: pointer listeners only while a potential/active drag lives.
  useEffect(() => {
    if (!reorderable) return undefined

    const removeListeners = () => {
      const { onMove, onUp } = reorderHandlers.current
      if (!onMove || !onUp) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
    }

    const endDrag = (commit) => {
      const session = reorderDrag.current
      if (!session) return
      reorderDrag.current = null
      unlockLook()
      onBookDragChange?.(false)
      gl.domElement.style.cursor = 'auto'
      removeListeners()

      const didDrag = session.active
      const bookId = session.bookId
      const insertIndex = session.insertIndex
      setReorderState(null)

      if (commit && didDrag && typeof insertIndex === 'number') {
        onReorderBookToIndex?.(bookId, insertIndex)
        // Swallow the trailing click so a completed drag does not toggle selection.
        const blockClick = (event) => {
          event.preventDefault()
          event.stopPropagation()
          window.removeEventListener('click', blockClick, true)
        }
        window.addEventListener('click', blockClick, true)
        window.setTimeout(() => window.removeEventListener('click', blockClick, true), 0)
      }
    }

    const onMove = (event) => {
      const session = reorderDrag.current
      if (!session) return

      const dx = event.clientX - session.startClientX
      const dy = event.clientY - session.startClientY
      if (!session.active) {
        if (Math.hypot(dx, dy) < REORDER_DRAG_THRESHOLD_PX) return
        session.active = true
        lockLook()
        onBookDragChange?.(true)
        gl.domElement.style.cursor = 'grabbing'
      }

      const local = projectPointerToCaseLocal(event.clientX, event.clientY)
      if (!local) return
      const insertIndex = insertionIndexFromLocalPoint(
        books,
        shelf,
        local.x,
        local.y,
        session.bookId,
      )
      session.insertIndex = insertIndex
      session.localX = local.x
      session.localY = local.y

      // Marker position: gap among remaining books in layout space.
      const others = books.filter((entry) => entry.id !== session.bookId)
      const layout = buildShelfCaseLayout(others, shelf)
      const ys = shelfRowYs(shelf.rows)
      let markerX = local.x
      let markerY = local.y
      let markerH = session.bookHeight || 1.1
      const flat = []
      for (let r = 0; r < layout.length; r += 1) {
        for (const entry of layout[r]) {
          flat.push({
            x: entry.position[0],
            y: (ys[r] || 0) + entry.position[1],
            width: entry.width,
            height: entry.height,
          })
        }
      }
      if (flat.length === 0) {
        markerX = 0
        markerY = (ys[0] || 0) + markerH / 2
      } else if (insertIndex <= 0) {
        markerX = flat[0].x - flat[0].width / 2 - 0.08
        markerY = flat[0].y
        markerH = flat[0].height
      } else if (insertIndex >= flat.length) {
        const last = flat[flat.length - 1]
        markerX = last.x + last.width / 2 + 0.08
        markerY = last.y
        markerH = last.height
      } else {
        const prev = flat[insertIndex - 1]
        const next = flat[insertIndex]
        markerX = (prev.x + next.x) / 2
        markerY = (prev.y + next.y) / 2
        markerH = Math.max(prev.height, next.height)
      }

      setReorderState({
        bookId: session.bookId,
        active: true,
        localX: local.x,
        localY: local.y,
        insertIndex,
        markerX,
        markerY,
        markerH,
      })
    }

    const onUp = () => endDrag(true)

    reorderHandlers.current = { onMove, onUp, endDrag }

    return () => {
      if (reorderDrag.current) endDrag(false)
    }
  }, [
    books,
    gl,
    onBookDragChange,
    onReorderBookToIndex,
    projectPointerToCaseLocal,
    reorderable,
    shelf,
  ])

  const onReorderPointerDown = useCallback((event, book) => {
    if (!reorderable || event.button !== 0) return
    event.stopPropagation()
    const local = projectPointerToCaseLocal(event.clientX, event.clientY)
    reorderDrag.current = {
      bookId: book.id,
      bookHeight: book.height || 1.1,
      startClientX: event.clientX,
      startClientY: event.clientY,
      active: false,
      insertIndex: books.findIndex((entry) => entry.id === book.id),
      localX: local?.x ?? book.position[0],
      localY: local?.y ?? book.position[1],
    }
    const { onMove, onUp } = reorderHandlers.current
    if (onMove && onUp) {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('blur', onUp)
    }
  }, [books, projectPointerToCaseLocal, reorderable])

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
    const { onMove, onUp } = dragHandlers.current
    if (onMove && onUp) {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('blur', onUp)
    }
  }

  // Insertion marker sits in case-local space (not row-local).
  const marker = reorderState?.active
    ? {
        x: reorderState.markerX,
        y: reorderState.markerY,
        height: reorderState.markerH,
      }
    : null

  return (
    <group ref={caseRef} position={[shelf.x, 0, shelf.z]} rotation={[0, shelf.yaw || 0, 0]}>
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

        <CaseNamePlaque
          name={shelf.name}
          topY={topY}
          width={width}
          selected={selected}
        />

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
            reorderable={reorderable}
            reorderState={reorderState}
            onReorderPointerDown={onReorderPointerDown}
          />
        ))}

        {marker && (
          <ReorderInsertMarker x={marker.x} y={marker.y} height={marker.height} />
        )}

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
  onReorderBookToIndex,
  onBookDragChange,
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
          onReorderBookToIndex={onReorderBookToIndex}
          onBookDragChange={onBookDragChange}
        />
      ))}

      {mode === 'play' && (
        // Hidden physics floor; top surface at y=-0.5 (matches the visible room floor).
        <CuboidCollider position={[0, -1.0, 0]} args={[80, 0.5, 80]} />
      )}
    </group>
  )
}

export default Bookshelf
