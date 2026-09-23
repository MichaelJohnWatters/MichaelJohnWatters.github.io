import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import Room from './Room'
import CameraRig from './CameraRig'
import Player from './Player'
import { clickDown } from './sfx'

function Scene({ hintRef, mode, onSeated, onNearSeat, onSit, view, zoom, onZoom, onZoomExit }) {
  return (
    <>
      {/* No scene background: the canvas stays TRANSPARENT so the screen UIs
          (which sit behind it — blending occlusion) show through their holes.
          The page CSS supplies the same #0a0a0f behind everything. */}
      <fog attach="fog" args={['#0a0a0f', 8, 18]} />

      {/* NIGHT GARAGE — coding in the dark. The monitors are the key lights:
          cool blue wash from the desktop, warm Claude-orange from the
          terminal. Everything else is just enough fill to navigate by. */}
      <hemisphereLight intensity={0.18} color="#2e3a55" groundColor="#14141a" />
      <directionalLight position={[6, 2.5, 3]} intensity={0.15} color="#5a6a9a" />
      {/* primary monitor glow (cool) */}
      <pointLight position={[-0.33, 1.35, -2.15]} intensity={3.5} color="#7fb3ff" distance={5.5} decay={2} />
      {/* terminal glow (warm terracotta) */}
      <pointLight position={[0.5, 1.3, -2.15]} intensity={2.2} color="#ffab7a" distance={4.5} decay={2} />
      {/* No Environment IBL — it floods the night scene with daylight. */}
      <Room mode={mode} onZoom={onZoom} />
      {mode === 'desk' && (
        <CameraRig hintRef={hintRef} onSeated={onSeated} zoom={zoom} onZoomExit={onZoomExit} />
      )}
      {mode === 'explore' && <Player onNearSeat={onNearSeat} onSit={onSit} view={view} />}
    </>
  )
}

export default function App() {
  const hintRef = useRef()
  const [mode, setMode] = useState('desk') // 'desk' | 'explore'
  const [seated, setSeated] = useState(false)
  const [nearSeat, setNearSeat] = useState(false)
  const [view, setView] = useState('first') // 'first' | 'third' (explore camera)
  const [zoomScreen, setZoomScreen] = useState(null) // null | 'A' | 'B'

  // V toggles first/third person while exploring.
  useEffect(() => {
    if (mode !== 'explore') return
    const onKey = (e) => {
      if (e.code === 'KeyV') setView((v) => (v === 'third' ? 'first' : 'third'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // Seated: 1 / 2 lean in to a screen, Esc (or 0) sits back. Capture phase so
  // it beats the terminal's typing listener — but only when the terminal
  // input is empty, so typing digits still works.
  useEffect(() => {
    if (mode !== 'desk') return
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === '0') {
        setZoomScreen(null)
        return
      }
      if ((e.key === '1' || e.key === '2') && !window.__termTyping) {
        e.preventDefault()
        e.stopPropagation()
        setZoomScreen(e.key === '1' ? 'A' : 'B')
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [mode])

  const sitDown = () => {
    clickDown()
    setNearSeat(false)
    setMode('desk')
  }
  const stepAway = () => {
    clickDown()
    setSeated(false)
    setZoomScreen(null)
    setView('first') // stepping away always starts in first person
    setMode('explore')
  }
  // Double-clicking a screen's background (bridged from Monitors) toggles the lean-in.
  const zoomToggle = (which) => setZoomScreen((z) => (z === which ? null : which))

  return (
    <>
      <Canvas shadows camera={{ position: [5.63, 4.0, 0.42], fov: 45 }}>
        {/* pages=3 gives 300vh of scroll to drive the camera dive */}
        <ScrollControls pages={3} damping={0.3} enabled={mode === 'desk'}>
          <Scene
            hintRef={hintRef}
            mode={mode}
            onSeated={setSeated}
            onNearSeat={setNearSeat}
            onSit={sitDown}
            view={view}
            zoom={zoomScreen}
            onZoom={zoomToggle}
            onZoomExit={() => setZoomScreen(null)}
          />
        </ScrollControls>
      </Canvas>

      {/* DOM overlays */}
      {mode === 'desk' && (
        <>
          <div className="title">
            <h1>Michael Watters</h1>
            <p>Developer &middot; enter my world</p>
          </div>

          <div className="scroll-hint" ref={hintRef}>
            ↓ scroll to sit down at the desk
          </div>

          {seated && !zoomScreen && (
            <button className="ctl ctl-step" onClick={stepAway}>
              ⎋ step away from desk
            </button>
          )}
          {zoomScreen && <div className="zoom-hint">esc · scroll · double-click → sit back</div>}
        </>
      )}

      {mode === 'explore' && (
        <>
          <button className="ctl ctl-back" onClick={sitDown}>
            ↩ back to desk
          </button>
          <button
            className="ctl ctl-view"
            onClick={() => setView((v) => (v === 'third' ? 'first' : 'third'))}
          >
            👁 {view === 'third' ? 'first person' : 'third person'} (V)
          </button>
          {nearSeat ? (
            <button className="ctl ctl-sit" onClick={sitDown}>
              ⏎ press E to sit back down
            </button>
          ) : (
            <div className="explore-hint">
              WASD to walk · V toggles view{view === 'first' ? ' · mouse to look' : ''}
            </div>
          )}
        </>
      )}
    </>
  )
}
