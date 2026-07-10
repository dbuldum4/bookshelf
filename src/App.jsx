import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Controls from './components/Controls'
import Scene from './scene/Scene'

export default function App() {
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#05010f' }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 11], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Scene mode={mode} resetKey={resetKey} galaxyMode={galaxyMode} />
      </Canvas>

      <Controls
        mode={mode}
        setMode={setMode}
        galaxyMode={galaxyMode}
        setGalaxyMode={setGalaxyMode}
        onReset={() => setResetKey((key) => key + 1)}
      />
    </div>
  )
}
