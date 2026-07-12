import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { buildShelfBooks } from '../library'

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic 0–1 RNG from a seed + salt. */
function seeded(seed, salt = 0) {
  const x = Math.imul(seed ^ Math.imul(salt + 1, 2654435761), 1597334677) >>> 0
  return (x % 10000) / 10000
}

function shade(hex, amt) {
  const c = new THREE.Color(hex)
  if (amt > 0) c.lerp(new THREE.Color('#ffffff'), amt)
  else c.lerp(new THREE.Color('#000000'), -amt)
  return `#${c.getHexString()}`
}

function canvasTexture(canvas, { repeat = false, filter = 'linear' } = {}) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  if (filter === 'nearest') {
    tex.minFilter = tex.magFilter = THREE.NearestFilter
  } else {
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
  }
  tex.anisotropy = 4
  return tex
}

/* ------------------------------------------------------------------ */
/* Painted wood — bold game-set grain                                  */
/* ------------------------------------------------------------------ */

function makeWoodTexture(seed = 1, { size = 512 } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const r = (n) => seeded(seed, n)

  // Warm painted base
  const grad = ctx.createLinearGradient(0, 0, size * 0.15, size)
  grad.addColorStop(0, '#6e3f1a')
  grad.addColorStop(0.3, r(1) > 0.5 ? '#96582c' : '#8a5028')
  grad.addColorStop(0.55, '#a06834')
  grad.addColorStop(0.8, '#7a4a24')
  grad.addColorStop(1, '#4e2c12')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Broad warm/cool varnish planks
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * size + r(10 + i) * 18
    const strip = ctx.createLinearGradient(x, 0, x + 56, 0)
    const warm = r(20 + i) > 0.5
    strip.addColorStop(0, 'rgba(0,0,0,0)')
    strip.addColorStop(0.5, warm ? 'rgba(255,190,100,0.07)' : 'rgba(30,12,4,0.14)')
    strip.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = strip
    ctx.fillRect(x - 8, 0, 64, size)
  }

  // Bold grain strokes
  const grainCount = 48 + Math.floor(r(30) * 24)
  for (let i = 0; i < grainCount; i++) {
    const y = r(40 + i) * size
    const alpha = 0.1 + r(50 + i) * 0.28
    const light = r(60 + i) > 0.48
    ctx.strokeStyle = light
      ? `rgba(200,140,80,${alpha})`
      : `rgba(45,20,6,${alpha})`
    ctx.lineWidth = 1.6 + r(70 + i) * 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, y)
    let x = 0
    let yy = y
    while (x < size) {
      yy = y + Math.sin(x * 0.012 + i * 0.7) * (5 + r(80 + i) * 4) + (r(90 + i + x) - 0.5) * 3
      ctx.lineTo(x, yy)
      x += 12
    }
    ctx.stroke()
  }

  // Knots (2–3)
  const knotCount = 2 + (seed % 2)
  for (let i = 0; i < knotCount; i++) {
    const x = 70 + r(100 + i) * (size - 140)
    const y = 70 + r(110 + i) * (size - 140)
    const rad = 12 + r(120 + i) * 24
    const knot = ctx.createRadialGradient(x, y, 0, x, y, rad)
    knot.addColorStop(0, 'rgba(28,12,4,0.95)')
    knot.addColorStop(0.4, 'rgba(75,38,14,0.55)')
    knot.addColorStop(0.75, 'rgba(90,50,20,0.18)')
    knot.addColorStop(1, 'rgba(40,20,8,0)')
    ctx.fillStyle = knot
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(25,10,3,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, rad * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Soft contact AO on bottom + corners
  const bottomAO = ctx.createLinearGradient(0, size * 0.68, 0, size)
  bottomAO.addColorStop(0, 'rgba(0,0,0,0)')
  bottomAO.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = bottomAO
  ctx.fillRect(0, 0, size, size)

  for (const [cx, cy] of [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ]) {
    const corner = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.42)
    corner.addColorStop(0, 'rgba(0,0,0,0.3)')
    corner.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = corner
    ctx.fillRect(0, 0, size, size)
  }

  // Subtle top highlight for toy lip catch
  const topHi = ctx.createLinearGradient(0, 0, 0, size * 0.18)
  topHi.addColorStop(0, 'rgba(255,220,160,0.1)')
  topHi.addColorStop(1, 'rgba(255,220,160,0)')
  ctx.fillStyle = topHi
  ctx.fillRect(0, 0, size, size)

  const tex = canvasTexture(canvas, { repeat: true })
  tex.repeat.set(1, 1)
  return tex
}

function useWoodTexture(seed) {
  return useMemo(() => makeWoodTexture(seed), [seed])
}

function WoodMaterial({ map, roughness = 0.48, clearcoat = 0.24 }) {
  return (
    <meshPhysicalMaterial
      map={map}
      roughness={roughness}
      metalness={0.03}
      clearcoat={clearcoat}
      clearcoatRoughness={0.38}
      envMapIntensity={0.55}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Prop book textures (no photo covers)                                */
/* ------------------------------------------------------------------ */

// Shared page-block textures (all books use the same prop pages — cheaper, still readable)
let sharedPageFore = null
let sharedPageTop = null
function getPageTextures() {
  if (!sharedPageFore) sharedPageFore = makePageEdgeTexture(42, 'fore')
  if (!sharedPageTop) sharedPageTop = makePageEdgeTexture(77, 'top')
  return { pageFore: sharedPageFore, pageTop: sharedPageTop }
}

/** Page block: orientation 'fore' (vertical lines) or 'top' (horizontal). */
function makePageEdgeTexture(seed, orientation = 'fore') {
  const w = 96
  const h = 192
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const r = (n) => seeded(seed, n)

  const base = ctx.createLinearGradient(0, 0, orientation === 'fore' ? w : 0, orientation === 'fore' ? 0 : h)
  base.addColorStop(0, '#d8c9a8')
  base.addColorStop(0.45, '#f3e8d0')
  base.addColorStop(1, '#cbb896')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // Thick structural bands
  const bands = 2 + Math.floor(r(1) * 3)
  for (let i = 0; i < bands; i++) {
    const t = 0.12 + (i / bands) * 0.7 + r(2 + i) * 0.04
    ctx.fillStyle = `rgba(165,140,100,${0.22 + r(5 + i) * 0.18})`
    if (orientation === 'fore') {
      ctx.fillRect(t * w, 0, 3 + r(8 + i) * 4, h)
    } else {
      ctx.fillRect(0, t * h, w, 3 + r(8 + i) * 4)
    }
  }

  // Fine page lines
  const step = 2 + Math.floor(r(10) * 2)
  if (orientation === 'fore') {
    for (let x = 3; x < w - 3; x += step) {
      ctx.fillStyle = `rgba(140,115,80,${0.05 + r(20 + x) * 0.09})`
      ctx.fillRect(x, 0, 1, h)
    }
  } else {
    for (let y = 3; y < h - 3; y += step) {
      ctx.fillStyle = `rgba(140,115,80,${0.05 + r(20 + y) * 0.09})`
      ctx.fillRect(0, y, w, 1)
    }
  }

  // Edge vignette
  const edge = orientation === 'fore'
    ? ctx.createLinearGradient(0, 0, 0, h)
    : ctx.createLinearGradient(0, 0, w, 0)
  edge.addColorStop(0, 'rgba(0,0,0,0.2)')
  edge.addColorStop(0.12, 'rgba(0,0,0,0)')
  edge.addColorStop(0.88, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.22)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, w, h)

  // Soft side darken (spine side vs open)
  const side = orientation === 'fore'
    ? ctx.createLinearGradient(0, 0, w, 0)
    : ctx.createLinearGradient(0, 0, 0, h)
  side.addColorStop(0, 'rgba(0,0,0,0.14)')
  side.addColorStop(0.2, 'rgba(0,0,0,0)')
  side.addColorStop(0.8, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = side
  ctx.fillRect(0, 0, w, h)

  return canvasTexture(canvas)
}

/** Stylized cover face — geometric prop art, never a real jacket photo. */
function makeCoverTexture({ color, title, titleColor, seed }) {
  const w = 192
  const h = 288
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const r = (n) => seeded(seed, n)
  const ink = titleColor || '#f5e6c8'

  // Base volume gradient
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, shade(color, 0.12))
  g.addColorStop(0.45, color)
  g.addColorStop(1, shade(color, -0.28))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Soft diagonal light catch
  const shine = ctx.createLinearGradient(0, 0, w, h * 0.6)
  shine.addColorStop(0, 'rgba(255,255,255,0.12)')
  shine.addColorStop(0.5, 'rgba(255,255,255,0)')
  shine.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = shine
  ctx.fillRect(0, 0, w, h)

  // Decorative panel motif (3 styles)
  const style = seed % 4
  ctx.save()
  if (style === 0) {
    // Nested frames
    ctx.strokeStyle = shade(ink, 0)
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 3
    ctx.strokeRect(18, 22, w - 36, h - 44)
    ctx.lineWidth = 1.5
    ctx.strokeRect(28, 34, w - 56, h - 68)
  } else if (style === 1) {
    // Circle medallion
    ctx.globalAlpha = 0.28
    ctx.strokeStyle = ink
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.42, 42, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.42, 28, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.2
    ctx.fillStyle = shade(color, 0.2)
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.42, 22, 0, Math.PI * 2)
    ctx.fill()
  } else if (style === 2) {
    // Diagonal stripe band
    ctx.globalAlpha = 0.22
    ctx.fillStyle = shade(color, r(2) > 0.5 ? 0.25 : -0.25)
    ctx.translate(w / 2, h / 2)
    ctx.rotate(-0.45)
    ctx.fillRect(-w, -18, w * 2, 36)
    ctx.rotate(0.45)
    ctx.translate(-w / 2, -h / 2)
  } else {
    // Corner blocks
    ctx.globalAlpha = 0.3
    ctx.fillStyle = shade(color, -0.2)
    ctx.fillRect(0, 0, 28, 28)
    ctx.fillRect(w - 28, 0, 28, 28)
    ctx.fillRect(0, h - 28, 28, 28)
    ctx.fillRect(w - 28, h - 28, 28, 28)
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = ink
    ctx.lineWidth = 2
    ctx.strokeRect(22, 28, w - 44, h - 56)
  }
  ctx.restore()

  // Tiny title block at bottom (readable prop, not full jacket text)
  const short = (title || '').length > 18 ? `${title.slice(0, 16)}…` : title
  ctx.globalAlpha = 0.55
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(20, h - 58, w - 40, 28)
  ctx.globalAlpha = 0.75
  ctx.fillStyle = ink
  ctx.font = 'bold 11px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((short || '').toUpperCase(), w / 2, h - 44, w - 48)

  // Edge darken
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)

  return canvasTexture(canvas)
}

function makeSpineTexture({ color, title, author, titleColor, seed }) {
  const w = 160
  const h = 384
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const r = (n) => seeded(seed, n)
  const ink = titleColor || '#f5e6c8'

  // Volume gradient across spine thickness
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, shade(color, -0.38))
  g.addColorStop(0.14, shade(color, -0.1))
  g.addColorStop(0.45, shade(color, 0.12))
  g.addColorStop(0.72, shade(color, 0.02))
  g.addColorStop(0.9, shade(color, -0.12))
  g.addColorStop(1, shade(color, -0.4))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Soft fabric noise (cheap)
  for (let i = 0; i < 120; i++) {
    const x = r(200 + i) * w
    const y = r(300 + i) * h
    ctx.fillStyle = `rgba(${r(400 + i) > 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r(500 + i) * 0.04})`
    ctx.fillRect(x, y, 1 + r(600 + i) * 2, 1 + r(700 + i) * 2)
  }

  // Caps
  const paintCap = (y0, y1, flip) => {
    const cap = ctx.createLinearGradient(0, y0, 0, y1)
    if (!flip) {
      cap.addColorStop(0, 'rgba(0,0,0,0.5)')
      cap.addColorStop(1, 'rgba(0,0,0,0)')
    } else {
      cap.addColorStop(0, 'rgba(0,0,0,0)')
      cap.addColorStop(1, 'rgba(0,0,0,0.5)')
    }
    ctx.fillStyle = cap
    ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0))
  }
  paintCap(0, 36, false)
  paintCap(h - 36, h, true)

  // Decorative bands
  const bandCount = 2 + (seed % 2)
  const bandYs = [44, h * 0.5, h - 50]
  for (let i = 0; i < bandCount; i++) {
    const by = bandYs[i === 0 ? 0 : i === bandCount - 1 ? 2 : 1]
    const bh = 6 + r(10 + i) * 8
    const light = r(20 + i) > 0.45
    ctx.fillStyle = shade(color, light ? 0.28 : -0.32)
    ctx.globalAlpha = 0.88
    ctx.fillRect(10, by - bh / 2, w - 20, bh)
    ctx.globalAlpha = 0.4
    ctx.fillStyle = shade(color, 0.5)
    ctx.fillRect(10, by - bh / 2, w - 20, 1.5)
    ctx.globalAlpha = 1
  }

  // Foil title panel
  const hasFoil = r(40) > 0.28
  const foilY = h * 0.34
  const foilH = 52 + r(41) * 14
  if (hasFoil) {
    const foil = ctx.createLinearGradient(0, foilY, w, foilY + foilH)
    foil.addColorStop(0, shade(color, -0.12))
    foil.addColorStop(0.5, shade(color, 0.32))
    foil.addColorStop(1, shade(color, -0.18))
    ctx.fillStyle = foil
    ctx.globalAlpha = 0.58
    ctx.fillRect(12, foilY, w - 24, foilH)
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = shade(ink, 0.2)
    ctx.lineWidth = 1.8
    ctx.strokeRect(16, foilY + 4, w - 32, foilH - 8)
    ctx.globalAlpha = 1
  }

  // Motifs
  const motif = seed % 4
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.5
  if (motif === 0) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(40 + i * 40, 58, 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (motif === 1) {
    const dx = w / 2
    const dy = h - 64
    ctx.beginPath()
    ctx.moveTo(dx, dy - 7)
    ctx.lineTo(dx + 6, dy)
    ctx.lineTo(dx, dy + 7)
    ctx.lineTo(dx - 6, dy)
    ctx.closePath()
    ctx.fill()
  } else if (motif === 2) {
    ctx.fillRect(w / 2 - 14, h - 66, 28, 3)
    ctx.fillRect(w / 2 - 8, h - 58, 16, 3)
  } else {
    ctx.beginPath()
    ctx.arc(w / 2 - 12, h - 62, 2.4, 0, Math.PI * 2)
    ctx.arc(w / 2 + 12, h - 62, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Vertical title + author
  const titleSize = title.length > 26 ? 13 : title.length > 18 ? 15 : 17
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 2)

  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.font = `bold ${titleSize}px Georgia, serif`
  ctx.fillText(title.toUpperCase(), 1.5, -1.5, 250)

  ctx.fillStyle = ink
  ctx.fillText(title.toUpperCase(), 0, -3, 250)

  ctx.globalAlpha = 0.58
  ctx.fillStyle = shade(ink, -0.12)
  ctx.font = '9px Arial, sans-serif'
  ctx.fillText((author || '').toUpperCase(), 0, 14, 220)
  ctx.restore()

  // Thin highlight edge (left = light catch)
  const edgeHi = ctx.createLinearGradient(0, 0, 10, 0)
  edgeHi.addColorStop(0, 'rgba(255,255,255,0.18)')
  edgeHi.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = edgeHi
  ctx.fillRect(0, 0, 10, h)

  return canvasTexture(canvas)
}

/* ------------------------------------------------------------------ */
/* Shared stylized book mesh                                           */
/* ------------------------------------------------------------------ */

function StylizedBookMesh({ book, castShadow = true, selected = false }) {
  const { author, color, title, titleColor, width, height, depth, id } = book
  const seed = useMemo(() => hashString(`${id}|${title}|${author}|${color}`), [id, title, author, color])

  const spineTexture = useMemo(
    () => makeSpineTexture({ author, color, title, titleColor, seed }),
    [author, color, title, titleColor, seed],
  )
  const coverTexture = useMemo(
    () => makeCoverTexture({ color, title, titleColor, seed }),
    [color, title, titleColor, seed],
  )
  const { pageFore: pageForeTexture, pageTop: pageTopTexture } = useMemo(() => getPageTextures(), [])

  const materialStyle = useMemo(() => {
    const isLeather = (seed % 3) !== 0
    return {
      isLeather,
      coverRoughness: isLeather ? 0.36 : 0.68,
      coverClearcoat: isLeather ? 0.38 : 0.12,
      spineRoughness: isLeather ? 0.4 : 0.62,
      spineClearcoat: isLeather ? 0.28 : 0.1,
    }
  }, [seed])

  // Declarative multi-materials — R3F owns lifecycle (avoids StrictMode dispose use-after-free).
  // Face order: +X, -X, +Y, -Y, +Z, -Z
  // ±X covers, +Y top pages, -Y bottom, +Z spine, -Z fore-edge pages
  return (
    <mesh castShadow={castShadow} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshPhysicalMaterial
        attach="material-0"
        map={coverTexture}
        roughness={materialStyle.coverRoughness}
        metalness={0.03}
        clearcoat={materialStyle.coverClearcoat}
        clearcoatRoughness={0.42}
        envMapIntensity={0.6}
      />
      <meshPhysicalMaterial
        attach="material-1"
        map={coverTexture}
        roughness={materialStyle.coverRoughness + 0.04}
        metalness={0.03}
        clearcoat={materialStyle.coverClearcoat * 0.85}
        clearcoatRoughness={0.48}
        envMapIntensity={0.5}
      />
      <meshStandardMaterial
        attach="material-2"
        map={pageTopTexture}
        roughness={0.92}
        metalness={0}
      />
      <meshStandardMaterial
        attach="material-3"
        color="#b8a888"
        roughness={0.94}
        metalness={0}
      />
      <meshPhysicalMaterial
        attach="material-4"
        map={spineTexture}
        roughness={materialStyle.spineRoughness}
        metalness={0.05}
        clearcoat={materialStyle.spineClearcoat}
        clearcoatRoughness={0.48}
        emissive={color}
        emissiveIntensity={selected ? 0.14 : 0.025}
        envMapIntensity={0.5}
      />
      <meshStandardMaterial
        attach="material-5"
        map={pageForeTexture}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Browse-mode book                                                    */
/* ------------------------------------------------------------------ */

function Book({ book, selected, onSelect }) {
  // Outer group holds shelf placement; inner animates select juice without fighting layout z.
  // Rotation is driven only by useFrame (no rotation prop) so re-renders cannot reset tilt juice.
  const animRef = useRef()
  const tilt = book.tilt || 0
  const { gl } = useThree()

  useEffect(() => {
    if (animRef.current) animRef.current.rotation.z = tilt
  }, [tilt])

  useFrame((_, delta) => {
    if (!animRef.current) return
    const lambda = 12
    animRef.current.position.z = THREE.MathUtils.damp(
      animRef.current.position.z,
      selected ? 0.48 : 0,
      lambda,
      delta,
    )
    animRef.current.position.y = THREE.MathUtils.damp(
      animRef.current.position.y,
      selected ? 0.05 : 0,
      lambda,
      delta,
    )
    const scale = THREE.MathUtils.damp(
      animRef.current.scale.x,
      selected ? 1.04 : 1,
      lambda,
      delta,
    )
    animRef.current.scale.setScalar(scale)
    animRef.current.rotation.z = THREE.MathUtils.damp(
      animRef.current.rotation.z,
      selected ? 0 : tilt,
      lambda,
      delta,
    )
  })

  return (
    <group
      position={book.position}
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
      <group ref={animRef}>
        <StylizedBookMesh book={book} selected={selected} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Physics book                                                        */
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

  const mass = useMemo(
    () => Math.max(0.28, book.width * book.height * book.depth * 2.8),
    [book.width, book.height, book.depth],
  )

  const onPointerDown = useCallback(
    (e) => {
      if (mode !== 'play') return
      e.stopPropagation()
      const body = bodyRef.current
      if (!body) return
      dragging.current = true
      body.setBodyType(2, true)
      const p = body.translation()
      camera.getWorldDirection(cameraDir)
      dragPlane.setFromNormalAndCoplanarPoint(
        cameraDir.negate(),
        new THREE.Vector3(p.x, p.y, p.z),
      )
      raycaster.setFromCamera(e.pointer, camera)
      raycaster.ray.intersectPlane(dragPlane, dragPoint)
      lastPos.current.copy(dragPoint)
      velocity.current.set(0, 0, 0)
      lastTime.current = performance.now()
      gl.domElement.style.cursor = 'grabbing'
    },
    [mode, camera, gl],
  )

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const body = bodyRef.current
      if (!body) return
      raycaster.setFromCamera(
        new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1,
        ),
        camera,
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
      body.setBodyType(0, true)
      const v = velocity.current
      const max = 12
      const speed = v.length()
      if (speed > max) v.multiplyScalar(max / speed)
      body.setLinvel({ x: v.x, y: v.y, z: v.z }, true)
      body.setAngvel(
        {
          x: (Math.random() - 0.5) * 1.8,
          y: (Math.random() - 0.5) * 1.8,
          z: (Math.random() - 0.5) * 1.8,
        },
        true,
      )
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
      mass={mass}
      restitution={0.06}
      friction={0.98}
      linearDamping={0.58}
      angularDamping={0.7}
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
        <StylizedBookMesh book={book} />
      </group>
    </RigidBody>
  )
}

/* ------------------------------------------------------------------ */
/* Shelf plank + books                                                 */
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
    [library, shelfIndex],
  )

  return (
    <group position={[0, y, 0]}>
      {/* Main plank */}
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.22, 1.4]} />
        <WoodMaterial map={woodTex} />
      </mesh>
      {/* Front lip — catches light like a carved edge */}
      <mesh position={[0, -0.02, 0.68]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.08, 0.08]} />
        <WoodMaterial map={woodTex} roughness={0.42} clearcoat={0.3} />
      </mesh>
      {/* Contact AO on plank top */}
      <mesh position={[0, 0.002, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.45, 1.25]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {/* Front underside shadow */}
      <mesh position={[0, -0.16, 0.7]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[7.55, 0.1]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {mode === 'play' && (
        <CuboidCollider position={[0, -0.12, 0]} args={[3.8, 0.12, 0.7]} />
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
          />
        ),
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Bookshelf frame                                                     */
/* ------------------------------------------------------------------ */

function Bookshelf({ mode, library, selectedBookId, onSelectBook }) {
  const woodTex = useWoodTexture(11)
  const woodTexBack = useWoodTexture(29)
  const woodTexSide = useWoodTexture(47)

  return (
    <group position={[0, -1.5, 0]}>
      {/* Back panel */}
      <mesh position={[0, 2, -0.75]} receiveShadow>
        <boxGeometry args={[7.6, 7.6, 0.15]} />
        <WoodMaterial map={woodTexBack} roughness={0.58} clearcoat={0.14} />
      </mesh>
      {/* Interior back AO veil — sells depth inside the case */}
      <mesh position={[0, 2, -0.66]}>
        <planeGeometry args={[7.4, 7.4]} />
        <meshBasicMaterial color="#1a0c06" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Soft vertical interior shade */}
      <mesh position={[0, 2, -0.64]}>
        <planeGeometry args={[7.35, 7.35]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Left side */}
      <mesh position={[-3.85, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 7.6, 1.5]} />
        <WoodMaterial map={woodTexSide} />
      </mesh>
      {/* Right side */}
      <mesh position={[3.85, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 7.6, 1.5]} />
        <WoodMaterial map={woodTexSide} />
      </mesh>
      {/* Inner side AO strips */}
      <mesh position={[-3.68, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 7.4]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[3.68, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 7.4]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* Top crown */}
      <mesh position={[0, 5.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.15, 0.28, 1.6]} />
        <WoodMaterial map={woodTex} roughness={0.44} clearcoat={0.28} />
      </mesh>
      {/* Top front lip */}
      <mesh position={[0, 5.68, 0.72]} castShadow receiveShadow>
        <boxGeometry args={[8.15, 0.1, 0.12]} />
        <WoodMaterial map={woodTex} roughness={0.4} clearcoat={0.32} />
      </mesh>
      {/* Bottom plinth */}
      <mesh position={[0, -1.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.15, 0.32, 1.65]} />
        <WoodMaterial map={woodTex} roughness={0.5} clearcoat={0.2} />
      </mesh>
      {/* Bottom front lip */}
      <mesh position={[0, -1.66, 0.74]} castShadow receiveShadow>
        <boxGeometry args={[8.15, 0.1, 0.12]} />
        <WoodMaterial map={woodTex} roughness={0.42} clearcoat={0.28} />
      </mesh>

      {[-1.6, 0.4, 2.4, 4.4].map((shelfY, shelfIndex) => (
        <Shelf
          key={shelfY}
          y={shelfY}
          woodTex={woodTex}
          mode={mode}
          library={library}
          shelfIndex={shelfIndex}
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
        />
      ))}

      {mode === 'play' && (
        <>
          <CuboidCollider position={[0, 2, -0.75]} args={[3.8, 3.8, 0.08]} />
          <CuboidCollider position={[-3.85, 2, 0]} args={[0.15, 3.8, 0.75]} />
          <CuboidCollider position={[3.85, 2, 0]} args={[0.15, 3.8, 0.75]} />
          <CuboidCollider position={[0, 5.85, 0]} args={[4.05, 0.15, 0.8]} />
          <CuboidCollider position={[0, -1.85, 0]} args={[4.05, 0.15, 0.8]} />
          <CuboidCollider position={[0, -5.5, 0]} args={[30, 0.5, 30]} />
        </>
      )}
    </group>
  )
}

export default Bookshelf
