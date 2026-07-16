import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DEFAULT_GRAPHICS_QUALITY, getGraphicsPreset } from '../graphicsQuality'

function resolveGraphics(graphics) {
  const base = getGraphicsPreset(DEFAULT_GRAPHICS_QUALITY)
  if (!graphics || typeof graphics !== 'object') return base
  return { ...base, ...graphics }
}

function makeDummyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Galaxy({ graphics: graphicsProp, reducedMotion = false } = {}) {
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
    if (reducedMotion) return
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
          toneMapped={false}
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
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
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
  if (!ctx) return makeDummyTexture()
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
  if (!ctx) return makeDummyTexture()
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
  if (!ctx) return makeDummyTexture()
  const rand = seededRandom(seed)
  const palette = pixelated
    ? ['80,64,255', '26,220,255', '255,96,190', '255,190,105']
    : ['82,105,255', '54,190,255', '255,112,176', '255,205,130']

  ctx.clearRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < blobCount; i++) {
    const x = size * (0.25 + rand() * 0.55)
    const y = size * (0.22 + rand() * 0.58)
    const r = size * (0.16 + rand() * 0.28)
    const color = palette[Math.floor(rand() * palette.length)]
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${color},${0.16 + rand() * 0.18})`)
    grad.addColorStop(0.45, `rgba(${color},${0.045 + rand() * 0.06})`)
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
    const alpha = Math.max(0.02, 0.22 - r / size * 0.28) * (0.4 + rand() * 0.8)
    const color = palette[Math.floor(rand() * palette.length)]

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
  coreGrad.addColorStop(0, pixelated ? 'rgba(190,90,255,0.45)' : 'rgba(255,244,220,0.5)')
  coreGrad.addColorStop(0.28, 'rgba(115,135,255,0.18)')
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

function DeepSpaceStars({ graphics: graphicsProp, reducedMotion = false } = {}) {
  const graphics = resolveGraphics(graphicsProp)
  const starTex = useMemo(() => makeStarTexture(), [])
  useEffect(() => () => { starTex.dispose() }, [starTex])
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
      near: makeShell(graphics.starNearCount, 38, 85, '#718cff', '#fff3dc'),
      far: makeShell(graphics.starFarCount, 90, 165, '#243d96', '#8aa9ff'),
    }
  }, [graphics.starNearCount, graphics.starFarCount])

  useFrame((_, delta) => {
    if (reducedMotion) return
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
          toneMapped={false}
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
          toneMapped={false}
          vertexColors
        />
      </points>
    </group>
  )
}

function NebulaLayer({ seed, pixelated, graphics: graphicsProp, position, scale, opacity, rotation = 0 }) {
  const graphics = resolveGraphics(graphicsProp)
  const texture = useMemo(
    () => makeNebulaTexture(seed, pixelated, {
      textureSize: graphics.nebulaTextureSize,
      blobCount: graphics.nebulaBlobCount,
      particleCount: graphics.nebulaParticleCount,
    }),
    [seed, pixelated, graphics.nebulaTextureSize, graphics.nebulaBlobCount, graphics.nebulaParticleCount],
  )
  useEffect(() => () => { texture.dispose() }, [texture])

  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        rotation={rotation}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}

function RealisticGalaxy({ graphics: graphicsProp, reducedMotion = false } = {}) {
  const graphics = resolveGraphics(graphicsProp)
  const starTex = useMemo(() => makeStarTexture(), [])
  const glowTex = useMemo(() => makeGlowTexture(), [])
  useEffect(() => () => { starTex.dispose() }, [starTex])
  useEffect(() => () => { glowTex.dispose() }, [glowTex])
  const coreRef = useRef()
  const armsRef = useRef()
  const haloRef = useRef()
  const dustRef = useRef()
  const farRef = useRef()

  const { core, arms, halo, dust, far } = useMemo(() => {
    const radius = 72

    // ---- Core (dense bright bulge) ----
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

    // ---- Spiral arms ----
    const armCount = graphics.realisticArms
    const armPos = new Float32Array(armCount * 3)
    const armCol = new Float32Array(armCount * 3)
    const branches = 2
    const spin = 0.82
    const randomnessPower = 2.35
    const innerWhite = new THREE.Color('#ffffff')
    const midBlue = new THREE.Color('#8fb8ff')
    const outerBlue = new THREE.Color('#3d5cff')
    const nebulaPink = new THREE.Color('#ff6b9d')
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
    const haloCount = graphics.realisticHalo
    const haloPos = new Float32Array(haloCount * 3)
    const haloCol = new Float32Array(haloCount * 3)
    const haloBlue = new THREE.Color('#4a6aff')
    const haloFaint = new THREE.Color('#2a2a55')
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

    // ---- Faint volumetric dust clouds between arm and halo layers ----
    const dustCount = graphics.realisticDust
    const dustPos = new Float32Array(dustCount * 3)
    const dustCol = new Float32Array(dustCount * 3)
    const dustBlue = new THREE.Color('#5e83ff')
    const dustRose = new THREE.Color('#ff6fa8')
    const dustGold = new THREE.Color('#ffc783')
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3
      const r = 12 + Math.pow(Math.random(), 0.62) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const angle = branchAngle + r * spin * 0.072 + (Math.random() - 0.5) * 0.9
      const spread = 7 + r * 0.28
      dustPos[i3] = Math.cos(angle) * r + (Math.random() - 0.5) * spread
      dustPos[i3 + 1] = (Math.random() - 0.5) * (5 + r * 0.18)
      dustPos[i3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * spread
      const c = dustBlue.clone().lerp(dustRose, Math.random() * 0.7)
      if (Math.random() < 0.25) c.lerp(dustGold, 0.35)
      dustCol[i3] = c.r
      dustCol[i3 + 1] = c.g
      dustCol[i3 + 2] = c.b
    }

    // ---- Very distant star field behind the main galaxy ----
    const farCount = graphics.realisticFar
    const farPos = new Float32Array(farCount * 3)
    const farCol = new Float32Array(farCount * 3)
    const farBlue = new THREE.Color('#8fb8ff')
    const farWhite = new THREE.Color('#fff4df')
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
    if (reducedMotion) return
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.015
    if (armsRef.current) armsRef.current.rotation.y += delta * 0.015
    if (haloRef.current) haloRef.current.rotation.y += delta * 0.008
    if (dustRef.current) dustRef.current.rotation.y -= delta * 0.006
    if (farRef.current) farRef.current.rotation.y += delta * 0.002
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
          toneMapped={false}
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
          opacity={0.34}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
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
          toneMapped={false}
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
          toneMapped={false}
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
          size={1.45}
          sizeAttenuation
          map={starTex}
          transparent
          opacity={0.18}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
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
          toneMapped={false}
          vertexColors
        />
      </points>
    </group>
  )
}

export { DeepSpaceStars, Galaxy, NebulaLayer, RealisticGalaxy }
