import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import Room from './Room'
import CameraRig from './CameraRig'
import Player from './Player'
import Joystick from './Joystick'
import Phone from './Phone'
import { clickDown, startRoomTone, setMuted, isMuted, doorMotor } from './sfx'
import { IS_TOUCH } from './touch'
import { complete, onComplete } from './tasks'
import { TV_PRESETS, ytSearch } from './content'

// Global brightness: lights-on raises the tone-mapping exposure — the one
// knob that brightens every surface uniformly.
function Exposure({ lights }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = lights ? 1.75 : 1.0
  }, [gl, lights])
  return null
}

function Scene({ hintRef, mode, onSeated, onNearSeat, onSit, zoom, onZoom, onZoomExit, joyRef, lights, onToggleLights, tv, tvMuted, onTvToggle, onPhone, phoneHeld, sofa, onSofaToggle, onNearSofa, doors, onDoorToggle }) {
  return (
    <>
      {/* No scene background: the canvas stays TRANSPARENT so the screen UIs
          (which sit behind it — blending occlusion) show through their holes.
          The page CSS supplies the same #0a0a0f behind everything. */}
      <fog attach="fog" args={['#0a0a0f', 12, 30]} />
      <Exposure lights={lights} />

      {/* WORKSHOP LIGHTING — the wall switch (or L / 💡) toggles between
          "lights on" and moody night mode (monitors + neon only). */}
      <hemisphereLight intensity={lights ? 1.4 : 0.2} color="#4a5570" groundColor="#26262e" />
      <directionalLight position={[4, 7, 2]} intensity={lights ? 0.9 : 0.14} color="#8a94b0" />
      {lights && <ambientLight intensity={0.3} color="#5a627a" />}
      {/* Monitor glow pools — only in night mode (with the workshop lights on
          they wash out anyway; skipping them halves the dynamic light count) */}
      {!lights && (
        <>
          <pointLight position={[-0.33, 1.35, -2.15]} intensity={3.5} color="#7fb3ff" distance={5.5} decay={2} />
          <pointLight position={[0.5, 1.3, -2.15]} intensity={2.2} color="#ffab7a" distance={4.5} decay={2} />
        </>
      )}
      {/* No Environment IBL — it floods the night scene with daylight. */}
      <Room mode={mode} onZoom={onZoom} lights={lights} onToggleLights={onToggleLights} fp={mode === 'explore' && !IS_TOUCH} tv={tv} tvMuted={tvMuted} onTvToggle={onTvToggle} onPhone={onPhone} phoneHeld={phoneHeld} doors={doors} onDoorToggle={onDoorToggle} />
      {mode === 'desk' && (
        <CameraRig hintRef={hintRef} onSeated={onSeated} zoom={zoom} onZoomExit={onZoomExit} />
      )}
      {mode === 'explore' && (
        <Player onNearSeat={onNearSeat} onSit={onSit} joyRef={joyRef} sofa={sofa} onSofaToggle={onSofaToggle} onNearSofa={onNearSofa} doors={doors} />
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
  const [zoomScreen, setZoomScreen] = useState(null) // null | 'A' | 'B'
  const [muted, setMutedUI] = useState(false)
  const [lights, setLights] = useState(true) // workshop lights on by default
  const [toast, setToast] = useState(null) // task-complete popup
  const [tv, setTv] = useState(null) // cave TV: casting videoId, or null = off
  const [phone, setPhone] = useState(false) // the cast-remote phone overlay
  const [nearSofa, setNearSofa] = useState(false)
  const [sofa, setSofa] = useState(false) // sat on the couch, watching the TV
  const [doors, setDoors] = useState([false, false]) // roller doors open?

  const toggleDoor = (i) => {
    doorMotor()
    setDoors((d) => {
      const next = [...d]
      next[i] = !next[i]
      if (next[i]) complete('garage') // whiteboard task
      return next
    })
  }

  const sofaToggle = () => {
    clickDown()
    setSofa((s) => !s)
  }

  const cast = (id) => {
    clickDown()
    setTv(id)
    complete('tv') // whiteboard task
  }
  // Clicking the TV itself: off → quick-cast the default channel; on → off.
  const tvToggle = () => {
    clickDown()
    if (tv) {
      setTv(null)
      return
    }
    ytSearch(TV_PRESETS[0].q).then((items) => {
      if (items[0]) cast(items[0].id)
      else setPhone(true) // no worker/results: hand over the remote
    })
  }
  // Phone up: free the mouse (exit pointer lock) so the buttons are
  // clickable; Player ignores keys/look while it's open.
  useEffect(() => {
    window.__phoneOpen = phone
    if (phone && document.pointerLockElement) document.exitPointerLock()
    // the input can unmount while focused — its onBlur never fires, so the
    // typing flag would stay stuck and eat the P/L keys
    if (!phone) window.__termTyping = false
    return () => {
      window.__phoneOpen = false
    }
  }, [phone])
  const closePhone = () => {
    setPhone(false)
    // back to FP mouse-look — we're inside the click's user activation
    if (mode === 'explore' && !IS_TOUCH)
      document.querySelector('canvas')?.requestPointerLock?.()?.catch?.(() => {})
  }

  // Task completions surface a toast alongside the ding.
  useEffect(() => {
    let timer
    const off = onComplete((task) => {
      setToast(task?.label || 'task')
      clearTimeout(timer)
      timer = setTimeout(() => setToast(null), 3200)
    })
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [])

  const toggleLights = () => {
    clickDown() // satisfying switch clack
    complete('lights') // whiteboard task
    setLights((l) => !l)
  }

  // DOM surfaces that are PAPER (whiteboard, post-its) must not glow in the
  // dark — they're not screens. CSS dims them via this class.
  useEffect(() => {
    document.documentElement.classList.toggle('lights-off', !lights)
  }, [lights])

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

  // P picks up the cast phone while exploring.
  useEffect(() => {
    if (mode !== 'explore') return
    const onKey = (e) => {
      if (window.__termTyping) return
      if (e.code === 'KeyP') setPhone(true)
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
    setSofa(false)
    setNearSofa(false)
    setMode('desk')
  }
  const stepAway = () => {
    clickDown()
    setSeated(false)
    setZoomScreen(null)
    complete('stepaway') // whiteboard task
    setMode('explore')
    // Capture the mouse NOW — we're inside the click's user activation,
    // which is the only time Chrome allows pointer lock.
    if (!IS_TOUCH) document.querySelector('canvas')?.requestPointerLock?.()?.catch?.(() => {})
  }
  // Double-clicking a screen's background (bridged from Monitors) toggles the lean-in.
  const zoomToggle = (which) => setZoomScreen((z) => (z === which ? null : which))

  // First person: hide the native cursor — the centre crosshair is the pointer.
  const isFp = mode === 'explore' && !IS_TOUCH
  useEffect(() => {
    document.documentElement.classList.toggle('fp-cursor', isFp)
    if (!isFp) document.documentElement.classList.remove('aim-hit')
    return () => document.documentElement.classList.remove('fp-cursor')
  }, [isFp])

  // At the desk the native cursor never shows either: off the screens it's
  // the same dot as everywhere else (on-glass, the retro cursor takes over).
  useEffect(() => {
    if (mode !== 'desk' || IS_TOUCH) return
    document.documentElement.classList.add('desk-cursor')
    const mm = (e) => {
      const d = document.getElementById('desk-dot')
      if (d) {
        d.style.left = e.clientX + 'px'
        d.style.top = e.clientY + 'px'
      }
    }
    window.addEventListener('pointermove', mm)
    return () => {
      document.documentElement.classList.remove('desk-cursor')
      window.removeEventListener('pointermove', mm)
    }
  }, [mode])

  return (
    <>
      <Canvas dpr={[1, 1.25]} camera={{ position: [-8.23, 5.2, 1.92], fov: 45 }}>
        {/* pages=3 gives 300vh of scroll to drive the camera dive */}
        <ScrollControls pages={3} damping={0.3} enabled={mode === 'desk'}>
          <Scene
            hintRef={hintRef}
            mode={mode}
            onSeated={setSeated}
            onNearSeat={setNearSeat}
            onSit={sitDown}
            zoom={zoomScreen}
            onZoom={zoomToggle}
            onZoomExit={() => setZoomScreen(null)}
            joyRef={joyRef}
            lights={lights}
            onToggleLights={toggleLights}
            tv={tv}
            tvMuted={muted}
            onTvToggle={tvToggle}
            onPhone={() => setPhone(true)}
            phoneHeld={phone}
            sofa={sofa}
            onSofaToggle={sofaToggle}
            onNearSofa={setNearSofa}
            doors={doors}
            onDoorToggle={toggleDoor}
          />
        </ScrollControls>
      </Canvas>

      {/* DOM overlays */}
      {toast && <div className="toast">✔ task complete — {toast}</div>}
      <Phone
        open={phone}
        tv={tv}
        onCast={cast}
        onStop={() => setTv(null)}
        onClose={closePhone}
      />
      <button className="ctl ctl-mute" onClick={toggleMute} title="toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
      <button className="ctl ctl-lights" onClick={toggleLights} title="toggle lights (L)">
        {lights ? '💡' : '🌙'}
      </button>
      {mode === 'desk' && !IS_TOUCH && <div id="desk-dot" className="crosshair desk-dot" />}
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
          {sofa ? (
            <div className="aim-label show sit-label" onClick={sofaToggle}>
              {IS_TOUCH ? 'tap to stand up' : 'press E to stand up'}
            </div>
          ) : nearSeat ? (
            IS_TOUCH ? (
              <button className="ctl ctl-sit" onClick={sitDown}>
                ⏎ tap to sit back down
              </button>
            ) : (
              // same style as the crosshair aim labels — consistent HUD
              <div className="aim-label show sit-label" onClick={sitDown}>
                press E to sit back down
              </div>
            )
          ) : nearSofa ? (
            <div className="aim-label show sit-label" onClick={sofaToggle}>
              {IS_TOUCH ? 'tap to sit on the sofa' : 'press E to sit on the sofa'}
            </div>
          ) : (
            <div className="explore-hint">
              {IS_TOUCH
                ? 'stick walks · drag the screen to look'
                : 'WASD to walk · click to capture the mouse · esc frees it'}
            </div>
          )}
          {IS_TOUCH && <Joystick vecRef={joyRef} />}
          {isFp && (
            <>
              <div className="crosshair" />
              <div id="aim-label" className="aim-label" />
            </>
          )}
        </>
      )}
    </>
  )
}
