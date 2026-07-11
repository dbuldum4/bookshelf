import { ContactShadows, Environment, Float, OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Bookshelf from './Bookshelf'
import CameraRig from './CameraRig'
import { DeepSpaceStars, Galaxy, NebulaLayer, RealisticGalaxy } from './Galaxy'

const GALAXY_BACKDROP_POSITION = [-7, 5.4, -24]
const GALAXY_BACKDROP_ROTATION = [Math.PI * 0.42, 0.22, -0.28]
const GALAXY_BACKDROP_SCALE = [0.46, 0.46, 0.46]

function Scene({
  mode,
  resetKey,
  galaxyMode,
  library,
  selectedBookId,
  onSelectBook,
}) {
  const pixelatedGalaxy = galaxyMode === 'pixelated'

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

      <DeepSpaceStars />

      <NebulaLayer
        seed={pixelatedGalaxy ? 31 : 17}
        pixelated={pixelatedGalaxy}
        position={[-6, 4.8, -18]}
        scale={[30, 20, 1]}
        opacity={pixelatedGalaxy ? 0.72 : 0.58}
        rotation={-0.08}
      />
      <NebulaLayer
        seed={pixelatedGalaxy ? 47 : 23}
        pixelated={pixelatedGalaxy}
        position={[7, 1.2, -30]}
        scale={[44, 28, 1]}
        opacity={pixelatedGalaxy ? 0.46 : 0.34}
        rotation={0.22}
      />
      <NebulaLayer
        seed={pixelatedGalaxy ? 59 : 41}
        pixelated={pixelatedGalaxy}
        position={[-3, 10, -46]}
        scale={[66, 40, 1]}
        opacity={pixelatedGalaxy ? 0.34 : 0.24}
        rotation={0.04}
      />

      <group
        position={GALAXY_BACKDROP_POSITION}
        rotation={GALAXY_BACKDROP_ROTATION}
        scale={GALAXY_BACKDROP_SCALE}
      >
        {pixelatedGalaxy ? <Galaxy /> : <RealisticGalaxy />}
      </group>

      {mode === 'play' ? (
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep="vary">
          <Bookshelf mode={mode} library={library} />
        </Physics>
      ) : (
        <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
          <Bookshelf
            mode={mode}
            library={library}
            selectedBookId={selectedBookId}
            onSelectBook={onSelectBook}
          />
        </Float>
      )}

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

export default Scene
