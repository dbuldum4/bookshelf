import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ContactShadows, Environment, Float, OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { DEFAULT_GRAPHICS_QUALITY, getGraphicsPreset } from '../graphicsQuality'
import Bookshelf from './Bookshelf'
import CameraRig from './CameraRig'
import { DeepSpaceStars, Galaxy, NebulaLayer, RealisticGalaxy } from './Galaxy'

const GALAXY_BACKDROP_POSITION = [-7, 5.4, -24]
const GALAXY_BACKDROP_ROTATION = [Math.PI * 0.42, 0.22, -0.28]
const GALAXY_BACKDROP_SCALE = [0.46, 0.46, 0.46]

const ARRANGE_TARGET = [0, 1.5, 0]
const ORBIT_TARGET = [0, 0.5, 0]
const ROTATE_TARGET = [0, 1.5, 0]

const NEBULA_LAYERS = [
  {
    seed: { pixelated: 31, realistic: 17 },
    position: [-6, 4.8, -18],
    scale: [30, 20, 1],
    opacity: { pixelated: 0.72, realistic: 0.58 },
    rotation: -0.08,
  },
  {
    seed: { pixelated: 47, realistic: 23 },
    position: [7, 1.2, -30],
    scale: [44, 28, 1],
    opacity: { pixelated: 0.46, realistic: 0.34 },
    rotation: 0.22,
  },
  {
    seed: { pixelated: 59, realistic: 41 },
    position: [-3, 10, -46],
    scale: [66, 40, 1],
    opacity: { pixelated: 0.34, realistic: 0.24 },
    rotation: 0.04,
  },
]

function Scene({
  mode,
  resetKey,
  galaxyMode,
  graphics: graphicsProp,
  reducedMotion = false,
  library,
  shelves,
  selectedBookId,
  onSelectBook,
  selectedShelfId,
  onSelectShelf,
  onMoveShelf,
  onReorderBookToIndex,
  focusPoint = null,
}) {
  const graphics = graphicsProp || getGraphicsPreset(DEFAULT_GRAPHICS_QUALITY)
  const pixelatedGalaxy = galaxyMode === 'pixelated'
  const styleKey = pixelatedGalaxy ? 'pixelated' : 'realistic'
  const nebulaLayers = NEBULA_LAYERS.slice(0, graphics.nebulaLayerCount)
  const controlsRef = useRef(null)
  const modeRef = useRef(mode)
  const [shelfDragging, setShelfDragging] = useState(false)
  const [bookDragging, setBookDragging] = useState(false)
  modeRef.current = mode

  const handleShelfDragChange = useCallback((dragging) => {
    setShelfDragging(dragging)
    if (controlsRef.current) {
      const orbitMode = modeRef.current === 'custom' || modeRef.current === 'arrange'
      controlsRef.current.enabled = orbitMode && !dragging && !bookDragging
    }
  }, [bookDragging])

  const handleBookDragChange = useCallback((dragging) => {
    setBookDragging(dragging)
    if (controlsRef.current) {
      const orbitMode = modeRef.current === 'custom' || modeRef.current === 'arrange'
      controlsRef.current.enabled = orbitMode && !dragging && !shelfDragging
    }
  }, [shelfDragging])

  // Only bob the room in free Orbit mode — walk/rotate/arrange stay stable.
  const floatRoom = !reducedMotion && mode === 'custom'
  const room = (
    <Bookshelf
      mode={mode}
      library={library}
      shelves={shelves}
      selectedBookId={selectedBookId}
      onSelectBook={onSelectBook}
      selectedShelfId={selectedShelfId}
      onSelectShelf={onSelectShelf}
      onMoveShelf={onMoveShelf}
      onShelfDragChange={handleShelfDragChange}
      onReorderBookToIndex={onReorderBookToIndex}
      onBookDragChange={handleBookDragChange}
      reducedMotion={reducedMotion}
    />
  )

  // Seed orbit target once per mode change so continuous re-renders (shelf
  // drags) do not yank the pan target back to room center every frame.
  // Only call controls.update() for orbit modes (custom/arrange); CameraRig
  // owns the camera in fixed/play/rotate.
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    if (mode === 'arrange') {
      controls.target.set(...ARRANGE_TARGET)
      controls.update()
    } else if (mode === 'custom') {
      controls.target.set(...ORBIT_TARGET)
      controls.update()
    } else if (mode === 'rotate') {
      controls.target.set(...ROTATE_TARGET)
      // do NOT call controls.update() — CameraRig drives camera
    }
    // fixed/play: do not call update()
  }, [mode])

  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#05010f', 22, 70]} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.4}
        castShadow={graphics.shadows}
        shadow-mapSize={[graphics.shadowMapSize, graphics.shadowMapSize]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <pointLight position={[-6, 4, 6]} intensity={0.6} color="#9bb8ff" />
      <pointLight position={[0, 8, -4]} intensity={0.4} color="#ffb86b" />

      <DeepSpaceStars graphics={graphics} reducedMotion={reducedMotion} />

      {nebulaLayers.map((layer) => (
        <NebulaLayer
          key={`${layer.seed.realistic}-${styleKey}`}
          seed={layer.seed[styleKey]}
          pixelated={pixelatedGalaxy}
          graphics={graphics}
          position={layer.position}
          scale={layer.scale}
          opacity={layer.opacity[styleKey]}
          rotation={layer.rotation}
        />
      ))}

      <group
        position={GALAXY_BACKDROP_POSITION}
        rotation={GALAXY_BACKDROP_ROTATION}
        scale={GALAXY_BACKDROP_SCALE}
      >
        {pixelatedGalaxy ? (
          <Galaxy graphics={graphics} reducedMotion={reducedMotion} />
        ) : (
          <RealisticGalaxy graphics={graphics} reducedMotion={reducedMotion} />
        )}
      </group>

      {mode === 'play' ? (
        <Suspense fallback={null}>
          <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
            <Bookshelf
              mode={mode}
              library={library}
              shelves={shelves}
              reducedMotion={reducedMotion}
            />
          </Physics>
        </Suspense>
      ) : floatRoom ? (
        <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
          {room}
        </Float>
      ) : (
        room
      )}

      {graphics.contactShadows && (
        <ContactShadows
          position={[0, -0.48, 0]}
          opacity={graphics.contactShadowOpacity}
          scale={40}
          blur={graphics.contactShadowBlur}
          far={12}
        />
      )}

      {graphics.environment && (
        <Suspense fallback={null}>
          <Environment preset="night" />
        </Suspense>
      )}

      <CameraRig mode={mode} reducedMotion={reducedMotion} focusPoint={focusPoint} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={(mode === 'custom' || mode === 'arrange') && !shelfDragging && !bookDragging}
        enablePan={mode === 'arrange'}
        minDistance={mode === 'arrange' ? 4 : 6}
        maxDistance={mode === 'arrange' ? 48 : 22}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={mode === 'arrange' ? Math.PI * 0.48 : Math.PI * 0.62}
      />
    </>
  )
}

export default Scene
