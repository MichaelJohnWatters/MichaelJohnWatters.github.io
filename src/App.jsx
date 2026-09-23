import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import Room from './Room'
import CameraRig from './CameraRig'
import Player from './Player'
import Joystick from './Joystick'
import { clickDown, startRoomTone, setMuted, isMuted } from './sfx'
import { IS_TOUCH } from './touch'

// Global brightness: lights-on raises the tone-mapping exposure — the one
// knob that brightens every surface uniformly.
function Exposure({ lights }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = lights ? 1.45 : 1.0
  }, [gl, lights])
  return null
}

function Scene({ hintRef, mode, onSeated, onNearSeat, onSit, view, zoom, onZoom, onZoomExit, joyRef, lights, onToggleLights }) {
  return (
    <>
      {/* No scene background: the canvas stays TRANSPARENT so the screen UIs
          (which sit behind it — blending occlusion) show through their holes.
          The page CSS supplies the same #0a0a0f behind everything. */}
      <fog attach="fog" args={['#0a0a0f', 12, 30]} />
      <Exposure lights={lights} />

      {/* WORKSHOP LIGHTING — the wall switch (or L / 💡) toggles between
          "lights on" and moody night mode (monitors + neon only). */}
      <hemisphereLight intensity={lights ? 1.1 : 0.2} color="#4a5570" groundColor="#26262e" />
      <directionalLight position={[4, 7, 2]} intensity={lights ? 0.9 : 0.14} color="#8a94b0" />
      {lights && <ambientLight intensity={0.18} color="#5a627a" />}
      {/* primary monitor glow (cool) */}
      <pointLight position={[-0.33, 1.35, -2.15]} intensity={3.5} color="#7fb3ff" distance={5.5} decay={2} />
      {/* terminal glow (warm terracotta) */}
      <pointLight position={[0.5, 1.3, -2.15]} intensity={2.2} color="#ffab7a" distance={4.5} decay={2} />
      {/* No Environment IBL — it floods the night scene with daylight. */}
      <Room mode={mode} onZoom={onZoom} lights={lights} onToggleLights={onToggleLights} />
      {mode === 'desk' && (
        <CameraRig hintRef={hintRef} onSeated={onSeated} zoom={zoom} onZoomExit={onZoomExit} />
      )}
      {mode === 'explore' && (
        <Player onNearSeat={onNearSeat} onSit={onSit} view={view} joyRef={joyRef} />
      )}
    </>
  )
}

export default function App() {
  const hintRef = useRef()
  const joyRef = useRef({ x: 0, y: 0 }) // virtual joystick vector (touch)
  const [mode, setMode] = useState('desk') // 'desk' | 'explore'
  const [seated, setSeated] = useState(false)
  const [nearSeat, setNearSeat] = useState(false)
  const [view, setView] = useState('first') // 'first' | 'third' (explore camera)
  const [zoomScreen, setZoomScreen] = useState(null) // null | 'A' | 'B'
  const [muted, setMutedUI] = useState(false)
  const [lights, setLights] = useState(true) // workshop lights on by default

  const toggleLights = () => {
    clickDown() // satisfying switch clack
    setLights((l) => !l)
  }

  // L toggles the workshop lights from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyL' && !window.__termTyping) toggleLights()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Ambient room tone starts on the first user gesture (autoplay policy).
  useEffect(() => {
    const start = () => startRoomTone()
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])

  const toggleMute = () => {
    setMuted(!isMuted())
    setMutedUI(isMuted())
  }

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
      if (e.key === 'Escape') {
        setZoomScreen(null)
        return
      }
      if ((e.key === '1' || e.key === '2' || e.key === '3' || e.key === '0') && !window.__termTyping) {
        e.preventDefault()
        e.stopPropagation()
        setZoomScreen(e.key === '1' ? 'A' : e.key === '2' ? 'B' : null) // 3/0 = sit back
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
    // Desktop: first person. Touch: third person (auto-cam, no mouse-look).
    setView(IS_TOUCH ? 'third' : 'first')
    setMode('explore')
  }
  // Double-clicking a screen's background (bridged from Monitors) toggles the lean-in.
  const zoomToggle = (which) => setZoomScreen((z) => (z === which ? null : which))

  return (
    <>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [-8.23, 5.2, 1.92], fov: 45 }}>
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
            joyRef={joyRef}
            lights={lights}
            onToggleLights={toggleLights}
          />
        </ScrollControls>
      </Canvas>

      {/* DOM overlays */}
      <button className="ctl ctl-mute" onClick={toggleMute} title="toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
      <button className="ctl ctl-lights" onClick={toggleLights} title="toggle lights (L)">
        {lights ? '💡' : '🌙'}
      </button>
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
          {zoomScreen && <div className="zoom-hint">3 · esc · scroll · double-click → sit back</div>}
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
              {IS_TOUCH ? '⏎ tap to sit back down' : '⏎ press E to sit back down'}
            </button>
          ) : (
            <div className="explore-hint">
              {IS_TOUCH
                ? 'drag the stick to walk'
                : `WASD to walk · V toggles view${view === 'first' ? ' · mouse to look' : ''}`}
            </div>
          )}
          {IS_TOUCH && <Joystick vecRef={joyRef} />}
        </>
      )}
    </>
  )
}
