import { useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Float,
} from '@react-three/drei'
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

function Book({ position, color, height, width, depth, titleColor }) {
  const spineCanvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 256
    const ctx = c.getContext('2d')
    // Spine base with vertical gradient
    const g = ctx.createLinearGradient(0, 0, 128, 0)
    g.addColorStop(0, shade(color, -0.25))
    g.addColorStop(0.5, color)
    g.addColorStop(1, shade(color, -0.25))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 256)

    // Top/bottom bands (cap effect)
    ctx.fillStyle = shade(color, -0.45)
    ctx.fillRect(0, 0, 128, 10)
    ctx.fillRect(0, 246, 128, 10)

    // Decorative lines
    ctx.strokeStyle = shade(color, 0.4)
    ctx.lineWidth = 1.5
    ctx.strokeRect(6, 24, 116, 18)
    ctx.strokeRect(6, 214, 116, 18)

    // Title
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
  }, [color, titleColor])

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          map={spineCanvas}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      {/* Pages edge (fore-edge) highlight */}
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
/* Shelf (horizontal plank with books)                                 */
/* ------------------------------------------------------------------ */
function Shelf({ y, woodTex }) {
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
      {/* Plank */}
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
      {books.map((b) => (
        <group key={b.key} position={b.position} rotation={[0, 0, b.tilt]}>
          <Book
            color={b.color}
            height={b.height}
            width={b.width}
            depth={b.depth}
          />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Bookshelf frame (sides + back)                                      */
/* ------------------------------------------------------------------ */
function Bookshelf() {
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
      <Shelf y={-1.6} woodTex={woodTex} />
      <Shelf y={0.4} woodTex={woodTex} />
      <Shelf y={2.4} woodTex={woodTex} />
      <Shelf y={4.4} woodTex={woodTex} />
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
    } else if (mode === 'fixed') {
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

function Scene({ mode }) {
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

      <Galaxy />

      <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
        <Bookshelf />
      </Float>

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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#05010f' }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 11], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Scene mode={mode} />
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
        {['fixed', 'rotate', 'custom'].map((m) => {
          const active = mode === m
          const label =
            m === 'fixed' ? 'Fixed View' : m === 'rotate' ? 'Rotate' : 'Customize'
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
    </div>
  )
}
