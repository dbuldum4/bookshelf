import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFAULT_GRAPHICS_QUALITY, getGraphicsPreset } from '../graphicsQuality'

function resolveGraphics(graphics) {
  return graphics || getGraphicsPreset(DEFAULT_GRAPHICS_QUALITY)
}

function Galaxy({ graphics: graphicsProp } = {}) {
  const graphics = resolveGraphics(graphicsProp)
  const pointsRef = useRef()
  const dustRef = useRef()

  const { positions, colors, dustPositions, dustColors } = useMemo(() => {
    const count = graphics.galaxyCount
    const dustCount = graphics.galaxyDustCount
    const radius = 72
    const branches = 4
    const spin = 1.35
    const randomnessPower = 2.4
    const insideColor = new THREE.Color('#ff9b6b')
    const outsideColor = new THREE.Color('#6b8cff')
    const dustCyan = new THREE.Color('#3edcff')
    const dustViolet = new THREE.Color('#b36bff')

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const dustPositions = new Float32Array(dustCount * 3)
    const dustColors = new Float32Array(dustCount * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 1.35) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin * 0.055

      const rx =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.42 *
        r
      const ry =
        (Math.random() - 0.5) *
        (2.5 + r * 0.12)
      const rz =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.42 *
        r

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      positions[i3 + 1] = ry
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz

      const mixed = insideColor.clone().lerp(outsideColor, r / radius)
      colors[i3] = mixed.r
      colors[i3 + 1] = mixed.g
      colors[i3 + 2] = mixed.b
    }

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3
      const r = 18 + Math.pow(Math.random(), 0.7) * radius
      const armBias = ((i % branches) / branches) * Math.PI * 2
      const angle = armBias + r * spin * 0.05 + (Math.random() - 0.5) * 0.75
      const height = (Math.random() - 0.5) * (8 + r * 0.22)
      const depthOffset = (Math.random() - 0.5) * (12 + r * 0.35)
      dustPositions[i3] = Math.cos(angle) * r + depthOffset
      dustPositions[i3 + 1] = height
      dustPositions[i3 + 2] = Math.sin(angle) * r + depthOffset * 0.35
      const c = dustCyan.clone().lerp(dustViolet, Math.random())
      dustColors[i3] = c.r
      dustColors[i3 + 1] = c.g
      dustColors[i3 + 2] = c.b
    }

    return { positions, colors, dustPositions, dustColors }
  }, [graphics.galaxyCount, graphics.galaxyDustCount])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
    }
    if (dustRef.current) {
      dustRef.current.rotation.y -= delta * 0.01
    }
  })

  return (
    <group>
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[dustColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.9}
          sizeAttenuation
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
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
          size={0.38}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
    </group>
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
  // Soft core + faint diffraction bloom for toy-star read
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.08, 'rgba(255,255,255,0.92)')
  grad.addColorStop(0.22, 'rgba(255,255,255,0.45)')
  grad.addColorStop(0.48, 'rgba(255,255,255,0.1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  // Tiny cross sparkle for bright giants (reads only at larger point sizes)
  ctx.globalCompositeOperation = 'lighter'
  const cx = size / 2
  const cy = size / 2
  const spike = ctx.createLinearGradient(cx, 0, cx, size)
  spike.addColorStop(0, 'rgba(255,255,255,0)')
  spike.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  spike.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spike
  ctx.fillRect(cx - 0.8, 4, 1.6, size - 8)
  const spikeH = ctx.createLinearGradient(0, cy, size, cy)
  spikeH.addColorStop(0, 'rgba(255,255,255,0)')
  spikeH.addColorStop(0.5, 'rgba(255,255,255,0.28)')
  spikeH.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spikeH
  ctx.fillRect(4, cy - 0.8, size - 8, 1.6)
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
  // Soft toy-core glow: warm gold center, faint cool fringe — not harsh
  grad.addColorStop(0, 'rgba(255,248,230,0.92)')
  grad.addColorStop(0.1, 'rgba(255,228,170,0.48)')
  grad.addColorStop(0.28, 'rgba(210,185,255,0.1)')
  grad.addColorStop(0.58, 'rgba(130,120,210,0.025)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function seededRandom(seed) {
  let t = seed
  return () => {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function makeNebulaTexture(seed, pixelated = false, detail = {}) {
  const baseSize = pixelated ? Math.min(detail.textureSize || 512, 512) : (detail.textureSize || 1024)
  const size = baseSize
  const blobCount = detail.blobCount || 34
  const particleCount = detail.particleCount || (pixelated ? 9000 : 15000)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const rand = seededRandom(seed)
  // Pixelated keeps punchy sticker colors; realistic path is cleaner blues/pinks/golds
  const palette = pixelated
    ? ['80,64,255', '26,220,255', '255,96,190', '255,190,105']
    : ['90,120,255', '70,160,240', '255,150,190', '255,210,150']

  ctx.clearRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < blobCount; i++) {
    const x = size * (0.25 + rand() * 0.55)
    const y = size * (0.22 + rand() * 0.58)
    const r = size * (0.16 + rand() * 0.28)
    const color = palette[Math.floor(rand() * palette.length)]
    const blobAlpha = pixelated ? 0.16 + rand() * 0.18 : 0.12 + rand() * 0.14
    const midAlpha = pixelated ? 0.045 + rand() * 0.06 : 0.035 + rand() * 0.045
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${color},${blobAlpha})`)
    grad.addColorStop(0.45, `rgba(${color},${midAlpha})`)
    grad.addColorStop(1, `rgba(${color},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  const centerX = size * (0.42 + (rand() - 0.5) * 0.16)
  const centerY = size * (0.48 + (rand() - 0.5) * 0.12)
  const particles = particleCount
  for (let i = 0; i < particles; i++) {
    const r = Math.pow(rand(), 0.58) * size * 0.52
    const branch = (i % 3) * (Math.PI * 2 / 3)
    const angle = branch + r * 0.014 + (rand() - 0.5) * 0.6
    const drift = (rand() - 0.5) * size * 0.14
    const x = centerX + Math.cos(angle) * r + drift
    const y = centerY + Math.sin(angle) * r * 0.46 + (rand() - 0.5) * (20 + r * 0.12)
    const alphaBase = pixelated ? 0.22 : 0.18
    const alpha = Math.max(0.02, alphaBase - r / size * 0.28) * (0.4 + rand() * 0.8)
    // Realistic: bias palette by radius — gold near core, blue outward, soft pink mid
    let color
    if (pixelated) {
      color = palette[Math.floor(rand() * palette.length)]
    } else {
      const t = r / (size * 0.52)
      if (t < 0.22) color = palette[3] // soft gold
      else if (t < 0.55) color = rand() < 0.22 ? palette[2] : palette[1] // soft pink or cyan-blue
      else color = palette[0] // deep blue
    }

    ctx.fillStyle = `rgba(${color},${alpha})`
    if (pixelated) {
      const px = 1 + Math.floor(rand() * 3)
      ctx.fillRect(Math.floor(x), Math.floor(y), px, px)
    } else {
      ctx.beginPath()
      ctx.arc(x, y, 0.45 + rand() * 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.12)
  coreGrad.addColorStop(0, pixelated ? 'rgba(190,90,255,0.45)' : 'rgba(255,246,220,0.48)')
  coreGrad.addColorStop(0.28, pixelated ? 'rgba(115,135,255,0.18)' : 'rgba(120,145,255,0.14)')
  coreGrad.addColorStop(1, 'rgba(115,135,255,0)')
  ctx.fillStyle = coreGrad
  ctx.fillRect(0, 0, size, size)

  const alpha = ctx.getImageData(0, 0, size, size)
  const data = alpha.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const nx = x / size
      const ny = y / size
      const edgeFade = Math.min(nx, 1 - nx, ny, 1 - ny)
      const edgeMask = THREE.MathUtils.smoothstep(edgeFade, 0.02, 0.24)
      const dx = (x - centerX) / (size * 0.64)
      const dy = (y - centerY) / (size * 0.42)
      const radialMask = 1 - THREE.MathUtils.smoothstep(dx * dx + dy * dy, 0.52, 1.08)
      data[i + 3] = Math.floor(data[i + 3] * edgeMask * radialMask)
    }
  }
  ctx.putImageData(alpha, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter
  tex.magFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter
  return tex
}

function DeepSpaceStars({ graphics: graphicsProp } = {}) {
  const graphics = resolveGraphics(graphicsProp)
  const starTex = useMemo(() => makeStarTexture(), [])
  const nearRef = useRef()
  const farRef = useRef()

  const { near, far } = useMemo(() => {
    const makeShell = (count, innerRadius, outerRadius, colorA, colorB) => {
      const pos = new Float32Array(count * 3)
      const col = new Float32Array(count * 3)
      const a = new THREE.Color(colorA)
      const b = new THREE.Color(colorB)

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const radius = innerRadius + Math.pow(Math.random(), 0.72) * (outerRadius - innerRadius)
        const theta = Math.random() * Math.PI * 2
        const u = Math.random() * 2 - 1
        const horizontalBias = 0.75 + Math.random() * 0.55
        const y = u * radius * 0.55
        const ringRadius = Math.sqrt(Math.max(0, radius * radius - y * y)) * horizontalBias

        pos[i3] = Math.cos(theta) * ringRadius
        pos[i3 + 1] = y + 3
        pos[i3 + 2] = Math.sin(theta) * ringRadius

        const c = a.clone().lerp(b, Math.random())
        col[i3] = c.r
        col[i3 + 1] = c.g
        col[i3 + 2] = c.b
      }

      return { pos, col }
    }

    return {
      // Cool blue ↔ warm white only (no neon / magenta)
      near: makeShell(graphics.starNearCount, 38, 85, '#7a92ff', '#fff4e4'),
      far: makeShell(graphics.starFarCount, 90, 165, '#2a4498', '#9ab4ff'),
    }
  }, [graphics.starNearCount, graphics.starFarCount])

  useFrame((_, delta) => {
    if (nearRef.current) nearRef.current.rotation.y += delta * 0.004
    if (farRef.current) farRef.current.rotation.y -= delta * 0.0015
  })

  return (
    <group>
      <points ref={farRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[far.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[far.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.25}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.5}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
      <points ref={nearRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[near.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[near.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.7}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.62}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>
    </group>
  )
}

function NebulaLayer({ seed, pixelated, graphics: graphicsProp, position, scale, opacity, rotation = 0 }) {
  const graphics = resolveGraphics(graphicsProp)
  // Create+dispose in one effect so StrictMode / quality toggles cannot leak or free live maps
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    const next = makeNebulaTexture(seed, pixelated, {
      textureSize: graphics.nebulaTextureSize,
      blobCount: graphics.nebulaBlobCount,
      particleCount: graphics.nebulaParticleCount,
    })
    setTexture(next)
    return () => {
      setTexture(null)
      next.dispose()
    }
  }, [seed, pixelated, graphics.nebulaTextureSize, graphics.nebulaBlobCount, graphics.nebulaParticleCount])

  if (!texture) return null

  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        rotation={rotation}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

function RealisticGalaxy({ graphics: graphicsProp } = {}) {
  const graphics = resolveGraphics(graphicsProp)
  const starTex = useMemo(() => makeStarTexture(), [])
  const glowTex = useMemo(() => makeGlowTexture(), [])
  const coreRef = useRef()
  const armsRef = useRef()
  const giantsRef = useRef()
  const haloRef = useRef()
  const dustRef = useRef()
  const farRef = useRef()

  const { core, arms, giants, halo, dust, far } = useMemo(() => {
    const radius = 72

    // ---- Core (dense bright bulge) — warm white / gold only ----
    const coreCount = graphics.realisticCore
    const corePos = new Float32Array(coreCount * 3)
    const coreCol = new Float32Array(coreCount * 3)
    const coreWhite = new THREE.Color('#fff8e8')
    const coreGold = new THREE.Color('#ffdc9a')
    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 2.35) * 10
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      corePos[i3] = r * Math.sin(phi) * Math.cos(theta)
      corePos[i3 + 1] = r * Math.cos(phi) * 0.65
      corePos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = coreWhite.clone().lerp(coreGold, r / 10)
      coreCol[i3] = c.r
      coreCol[i3 + 1] = c.g
      coreCol[i3 + 2] = c.b
    }

    // ---- Spiral arms — white → soft blue → deep blue ----
    const armCount = graphics.realisticArms
    const armPos = new Float32Array(armCount * 3)
    const armCol = new Float32Array(armCount * 3)
    const branches = 2
    const spin = 0.82
    const randomnessPower = 2.35
    const innerWhite = new THREE.Color('#ffffff')
    const midBlue = new THREE.Color('#a0c4ff')
    const outerBlue = new THREE.Color('#3a58e8')
    const softPink = new THREE.Color('#ff8eb0')
    for (let i = 0; i < armCount; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 0.78) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin * 0.075

      const rx =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.42 *
        r
      const ry =
        (Math.random() - 0.5) *
        (2 + r * 0.12)
      const rz =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.42 *
        r

      armPos[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      armPos[i3 + 1] = ry
      armPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz

      let c
      if (r < 12) {
        c = innerWhite.clone().lerp(midBlue, r / 12 * 0.45)
      } else if (r < 40) {
        c = midBlue.clone().lerp(outerBlue, (r - 12) / 28)
      } else {
        c = outerBlue.clone()
      }
      // Soft pink sprinkle — rare, restrained
      if (Math.random() < 0.018 && r > 10 && r < 45) {
        c.lerp(softPink, 0.28 + Math.random() * 0.22)
      }
      armCol[i3] = c.r
      armCol[i3 + 1] = c.g
      armCol[i3 + 2] = c.b
    }

    // ---- Bright giants (size variation without custom shaders) ----
    // ~4% of arm count, capped; plus a few core sparkles
    const armGiantCount = Math.min(800, Math.max(40, Math.floor(armCount * 0.04)))
    const coreGiantCount = Math.min(60, Math.max(12, Math.floor(coreCount * 0.03)))
    const giantCount = armGiantCount + coreGiantCount
    const giantPos = new Float32Array(giantCount * 3)
    const giantCol = new Float32Array(giantCount * 3)
    const giantWarm = new THREE.Color('#fff4dc')
    const giantGold = new THREE.Color('#ffd89a')
    const giantSoftBlue = new THREE.Color('#c8dcff')
    for (let i = 0; i < armGiantCount; i++) {
      const i3 = i * 3
      const r = 8 + Math.pow(Math.random(), 0.85) * (radius * 0.72)
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin * 0.075
      const rx =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.32 *
        r
      const ry = (Math.random() - 0.5) * (1.6 + r * 0.08)
      const rz =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.32 *
        r
      giantPos[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      giantPos[i3 + 1] = ry
      giantPos[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz
      const c = giantWarm.clone().lerp(
        r < 22 ? giantGold : giantSoftBlue,
        0.35 + Math.random() * 0.45,
      )
      giantCol[i3] = c.r
      giantCol[i3 + 1] = c.g
      giantCol[i3 + 2] = c.b
    }
    for (let i = 0; i < coreGiantCount; i++) {
      const i3 = (armGiantCount + i) * 3
      const r = Math.pow(Math.random(), 1.8) * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      giantPos[i3] = r * Math.sin(phi) * Math.cos(theta)
      giantPos[i3 + 1] = r * Math.cos(phi) * 0.55
      giantPos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = giantWarm.clone().lerp(giantGold, 0.4 + Math.random() * 0.5)
      giantCol[i3] = c.r
      giantCol[i3 + 1] = c.g
      giantCol[i3 + 2] = c.b
    }

    // ---- Halo — faint cool blues ----
    const haloCount = graphics.realisticHalo
    const haloPos = new Float32Array(haloCount * 3)
    const haloCol = new Float32Array(haloCount * 3)
    const haloBlue = new THREE.Color('#5a78ff')
    const haloFaint = new THREE.Color('#2c3458')
    for (let i = 0; i < haloCount; i++) {
      const i3 = i * 3
      const r = 28 + Math.pow(Math.random(), 0.48) * 62
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      haloPos[i3] = r * Math.sin(phi) * Math.cos(theta)
      haloPos[i3 + 1] = r * Math.cos(phi) * 0.5
      haloPos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = haloBlue.clone().lerp(haloFaint, Math.random())
      haloCol[i3] = c.r
      haloCol[i3 + 1] = c.g
      haloCol[i3 + 2] = c.b
    }

    // ---- Dust — cooler blues + soft rose; gold only near core ----
    const dustCount = graphics.realisticDust
    const dustPos = new Float32Array(dustCount * 3)
    const dustCol = new Float32Array(dustCount * 3)
    const dustBlue = new THREE.Color('#6a8cff')
    const dustCool = new THREE.Color('#4a6ec8')
    const dustRose = new THREE.Color('#ff9aba')
    const dustGold = new THREE.Color('#ffd8a0')
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3
      const r = 12 + Math.pow(Math.random(), 0.62) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const angle = branchAngle + r * spin * 0.072 + (Math.random() - 0.5) * 0.9
      const spread = 7 + r * 0.28
      dustPos[i3] = Math.cos(angle) * r + (Math.random() - 0.5) * spread
      dustPos[i3 + 1] = (Math.random() - 0.5) * (5 + r * 0.18)
      dustPos[i3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * spread
      const c = dustBlue.clone().lerp(dustCool, Math.random() * 0.55)
      if (Math.random() < 0.35) c.lerp(dustRose, 0.25 + Math.random() * 0.3)
      // Gold only near the core radius
      if (r < 22 && Math.random() < 0.18) c.lerp(dustGold, 0.3)
      dustCol[i3] = c.r
      dustCol[i3 + 1] = c.g
      dustCol[i3 + 2] = c.b
    }

    // ---- Far field — soft blue-white only ----
    const farCount = graphics.realisticFar
    const farPos = new Float32Array(farCount * 3)
    const farCol = new Float32Array(farCount * 3)
    const farBlue = new THREE.Color('#9ab8ff')
    const farWhite = new THREE.Color('#eef4ff')
    for (let i = 0; i < farCount; i++) {
      const i3 = i * 3
      const x = (Math.random() - 0.5) * 180
      const y = (Math.random() - 0.5) * 80
      const z = -35 - Math.random() * 70
      farPos[i3] = x
      farPos[i3 + 1] = y
      farPos[i3 + 2] = z
      const c = farBlue.clone().lerp(farWhite, Math.random())
      farCol[i3] = c.r
      farCol[i3 + 1] = c.g
      farCol[i3 + 2] = c.b
    }

    return {
      core: { pos: corePos, col: coreCol, count: coreCount },
      arms: { pos: armPos, col: armCol, count: armCount },
      giants: { pos: giantPos, col: giantCol, count: giantCount },
      halo: { pos: haloPos, col: haloCol, count: haloCount },
      dust: { pos: dustPos, col: dustCol, count: dustCount },
      far: { pos: farPos, col: farCol, count: farCount },
    }
  }, [
    graphics.realisticCore,
    graphics.realisticArms,
    graphics.realisticHalo,
    graphics.realisticDust,
    graphics.realisticFar,
  ])

  useFrame((_, delta) => {
    // Elegant differential rotation — core/arms faster, far almost still
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.012
    if (armsRef.current) armsRef.current.rotation.y += delta * 0.012
    if (giantsRef.current) giantsRef.current.rotation.y += delta * 0.012
    if (haloRef.current) haloRef.current.rotation.y += delta * 0.007
    if (dustRef.current) dustRef.current.rotation.y -= delta * 0.004
    if (farRef.current) farRef.current.rotation.y += delta * 0.001
  })

  return (
    <group>
      {/* Central glow billboards — layered soft toy core */}
      <sprite scale={[28, 28, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#c8b0ff"
        />
      </sprite>
      <sprite scale={[20, 20, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.72}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffe8b8"
        />
      </sprite>

      {/* Distant star field */}
      <points ref={farRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[far.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[far.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.32}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>

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

      {/* Bright giants — larger, fewer, warmer (size break-up) */}
      <points ref={giantsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[giants.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[giants.col, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.35}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.9}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </points>

      {/* Nebula dust volume */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[dust.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.55}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.16}
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
          opacity={0.32}
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

export { DeepSpaceStars, Galaxy, NebulaLayer, RealisticGalaxy }

