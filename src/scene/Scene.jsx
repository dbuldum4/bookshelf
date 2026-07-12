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
      <fog attach="fog" args={['#05010f', 18, 55]} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.4}
        castShadow={graphics.shadows}
        shadow-mapSize={[graphics.shadowMapSize, graphics.shadowMapSize]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[-6, 4, 6]} intensity={0.6} color="#9bb8ff" />
      <pointLight position={[0, 8, -4]} intensity={0.4} color="#ffb86b" />

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
        <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
          {shelf}
        </Float>
      )}

      {graphics.contactShadows && (
        <ContactShadows
          position={[0, -3.45, 0]}
          opacity={graphics.contactShadowOpacity}
          scale={20}
          blur={graphics.contactShadowBlur}
          far={8}
        />
      )}

      {graphics.environment && <Environment preset="night" />}

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
