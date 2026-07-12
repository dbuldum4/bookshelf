import { ContactShadows, Environment, Float, OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { DEFAULT_GRAPHICS_QUALITY, getGraphicsPreset } from '../graphicsQuality'
import Bookshelf from './Bookshelf'
import CameraRig from './CameraRig'
import { DeepSpaceStars, Galaxy, NebulaLayer, RealisticGalaxy } from './Galaxy'

const GALAXY_BACKDROP_POSITION = [-7, 5.4, -24]
const GALAXY_BACKDROP_ROTATION = [Math.PI * 0.42, 0.22, -0.28]
const GALAXY_BACKDROP_SCALE = [0.46, 0.46, 0.46]

const NEBULA_LAYERS = [
  {
    seed: { pixelated: 31, realistic: 17 },
    position: [-6, 4.8, -18],
    scale: [30, 20, 1],
    opacity: { pixelated: 0.72, realistic: 0.52 },
    rotation: -0.08,
  },
  {
    seed: { pixelated: 47, realistic: 23 },
    position: [7, 1.2, -30],
    scale: [44, 28, 1],
    opacity: { pixelated: 0.46, realistic: 0.3 },
    rotation: 0.22,
  },
  {
    seed: { pixelated: 59, realistic: 41 },
    position: [-3, 10, -46],
    scale: [66, 40, 1],
    opacity: { pixelated: 0.34, realistic: 0.2 },
    rotation: 0.04,
  },
  // Extra far veil used by ultra graphics quality
  {
    seed: { pixelated: 73, realistic: 53 },
    position: [4, 6.5, -62],
    scale: [90, 54, 1],
    opacity: { pixelated: 0.22, realistic: 0.14 },
    rotation: -0.14,
  },
]

function Scene({
  mode,
  resetKey,
  galaxyMode,
  graphics: graphicsProp,
  reducedMotion = false,
  library,
  selectedBookId,
  onSelectBook,
}) {
  const graphics = graphicsProp || getGraphicsPreset(DEFAULT_GRAPHICS_QUALITY)
  const pixelatedGalaxy = galaxyMode === 'pixelated'
  const styleKey = pixelatedGalaxy ? 'pixelated' : 'realistic'
  const nebulaLayers = NEBULA_LAYERS.slice(0, graphics.nebulaLayerCount)
  const shelf = (
    <Bookshelf
      mode={mode}
      library={library}
      selectedBookId={selectedBookId}
      onSelectBook={onSelectBook}
    />
  )

  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#060214', 14, 48]} />

      {/* Product-shot diorama lighting: warm key + cool galaxy fill + warm rim */}
      <ambientLight intensity={0.12} color="#c8d4ff" />
      <directionalLight
        position={[5.5, 11, 7.5]}
        intensity={1.45}
        color="#fff1dc"
        castShadow={graphics.shadows}
        shadow-mapSize={[graphics.shadowMapSize, graphics.shadowMapSize]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={12}
        shadow-camera-bottom={-10}
      />
      {/* Galaxy fill — cool light from backdrop */}
      <directionalLight position={[-8, 4.5, -14]} intensity={0.48} color="#8aa8ff" />
      {/* Warm rim — separates shelf silhouette from deep space */}
      <pointLight position={[5, 2.5, -7]} intensity={0.55} color="#ffb06a" distance={28} decay={2} />
      {/* Soft front fill for spine readability */}
      <pointLight position={[0, 1.5, 11]} intensity={0.32} color="#eaf0ff" distance={30} decay={2} />
      {/* Subtle under-shelf bounce (warm wood bounce light) */}
      <pointLight position={[0, -2.2, 2]} intensity={0.18} color="#ffc48a" distance={14} decay={2} />

      <DeepSpaceStars graphics={graphics} />

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
        {pixelatedGalaxy ? <Galaxy graphics={graphics} /> : <RealisticGalaxy graphics={graphics} />}
      </group>

      {mode === 'play' ? (
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep="vary">
          <Bookshelf mode={mode} library={library} />
        </Physics>
      ) : reducedMotion ? (
        shelf
      ) : (
        <Float speed={0.55} rotationIntensity={0.015} floatIntensity={0.045}>
          {shelf}
        </Float>
      )}

      {graphics.contactShadows && (
        <ContactShadows
          position={[0, -3.45, 0]}
          opacity={graphics.contactShadowOpacity}
          scale={22}
          blur={graphics.contactShadowBlur}
          far={9}
          color="#1a0a20"
        />
      )}

      {graphics.environment && (
        <Environment preset="warehouse" environmentIntensity={0.28} background={false} />
      )}

      <CameraRig mode={mode} reducedMotion={reducedMotion} />
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

export default Scene
