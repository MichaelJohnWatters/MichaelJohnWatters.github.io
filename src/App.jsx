import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { ScrollControls, Environment, Lightformer } from '@react-three/drei'
import Room from './Room'
import CameraRig from './CameraRig'
import Player from './Player'
import Drive from './Drive'
import Playground from './Playground'
import Joystick from './Joystick'
import Phone from './Phone'
import { CIVIC, BIKES, PARKED } from './layout'
import { CARS, TUNE, TYPE_PROFILE } from './cars'
import { clickDown, startRoomTone, setMuted, isMuted, doorMotor } from './sfx'
import { IS_TOUCH } from './touch'
import { complete, onComplete } from './tasks'
import { TV_PRESETS, ytSearch } from './content'

// Global brightness: lights-on raises the tone-mapping exposure — the one
// knob that brightens every surface uniformly. Daytime overrides.
function Exposure({ lights, daytime }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = daytime ? 1.5 : lights ? 1.95 : 1.65
  }, [gl, lights, daytime])
  return null
}

// A glowing sun (day) / moon (dusk) disc in the sky. Follows the camera
// horizontally so it reads as a distant celestial body, sits in the key light's
// direction, and ignores fog so it stays crisp on the horizon.
function SkyBody({ daytime }) {
  const ref = useRef()
  const off = daytime ? [150, 235, 100] : [175, 145, 100] // ~ the directional light dir, far out
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.set(camera.position.x + off[0], off[1], camera.position.z + off[2])
  })
  const color = daytime ? '#fff2c8' : '#e7ecff'
  const r = daytime ? 15 : 11
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[r, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} fog={false} />
      </mesh>
      {/* soft glow halo */}
      <mesh>
        <sphereGeometry args={[r * 2.3, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={daytime ? 0.14 : 0.1} toneMapped={false} fog={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({ hintRef, mode, onSeated, onNearSeat, onSit, zoom, onZoom, onZoomExit, joyRef, lights, daytime, onToggleLights, tv, tvMuted, onTvToggle, onPhone, phoneHeld, sofa, onSofaToggle, onNearSofa, doors, onDoorToggle, vehiclesRef, driving, onNearVehicle, onDrive, onExitDrive, spawn, playerPosRef, torch, physicsMode, carProfile, carSpawn, idleCars, onNearCar, onEnterCar, auto }) {
  const carPhysicsDrive = physicsMode && mode === 'drive' && driving === 0
  return (
    <>
      {/* No scene background: the canvas stays TRANSPARENT so the screen UIs
          (which sit behind it — blending occlusion) show through their holes.
          The page CSS supplies the same #0a0a0f behind everything. */}
      <fog attach="fog" args={[daytime ? '#a9c6de' : '#3b3352', 14, daytime ? 90 : 80]} />
      <Exposure lights={lights} daytime={daytime} />
      <SkyBody daytime={daytime} />

      {/* LIGHTING — default mood is DUSK (warm low sun + dusky-blue sky). The
          wall switch (or L / 💡) toggles the shop work-lights; the ☀️/🌃 toggle
          overrides the whole WORLD to full daylight. */}
      <hemisphereLight
        intensity={daytime ? 1.6 : lights ? 1.7 : 1.05}
        color={daytime ? '#bdd7ee' : '#7182b8'}
        groundColor={daytime ? '#8f8f80' : '#6a4c40'}
      />
      <directionalLight
        position={daytime ? [18, 28, 12] : [16, 13, 9]}
        intensity={daytime ? 2.2 : lights ? 1.4 : 0.95}
        color={daytime ? '#fff3dd' : '#c3cdec'}
      />
      {/* soft warm fill so nothing sits in pure black (dusk tone at night) */}
      <ambientLight intensity={daytime ? 0.5 : lights ? 0.42 : 0.36} color={daytime ? '#5a627a' : '#6a5f74'} />
      {/* Monitor glow pools — only in night mode (with the workshop lights on
          they wash out anyway; skipping them halves the dynamic light count) */}
      {!lights && !daytime && (
        <>
          <pointLight position={[-0.33, 1.35, -2.15]} intensity={3.5} color="#7fb3ff" distance={5.5} decay={2} />
          <pointLight position={[0.5, 1.3, -2.15]} intensity={2.2} color="#ffab7a" distance={4.5} decay={2} />
        </>
      )}
      {/* Reflection environment from Lightformers (no HDRI file, no flood) —
          dusk tones: cool sky above, warm sun-side glow so paint/glass/metal
          catch a twilight sheen. */}
      <Environment resolution={128} environmentIntensity={daytime ? 0.6 : 0.5} background={false}>
        <Lightformer intensity={1.4} color="#9fb0d8" position={[0, 7, -9]} scale={[16, 7, 1]} />
        <Lightformer intensity={1.6} color="#ffb072" position={[10, 4, 6]} scale={[8, 8, 1]} />
        <Lightformer intensity={0.7} color="#6a6fa0" position={[-10, 3, 5]} scale={[7, 7, 1]} />
        <Lightformer intensity={0.6} color="#4a4360" position={[0, -5, 0]} scale={[16, 16, 1]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>
      <Room mode={mode} onZoom={onZoom} lights={lights} daytime={daytime} onToggleLights={onToggleLights} fp={mode === 'explore' && !IS_TOUCH} tv={tv} tvMuted={tvMuted} onTvToggle={onTvToggle} onPhone={onPhone} phoneHeld={phoneHeld} doors={doors} onDoorToggle={onDoorToggle} vehiclesRef={vehiclesRef} headlights={mode === 'drive' ? driving : -1} physicsMode={physicsMode} carColor={carProfile.color} carType={carProfile.type} idleCars={idleCars} />
      {mode === 'desk' && (
        <CameraRig hintRef={hintRef} onSeated={onSeated} zoom={zoom} onZoomExit={onZoomExit} />
      )}
      {mode === 'explore' && (
        <Player start={spawn} onNearSeat={onNearSeat} onSit={onSit} joyRef={joyRef} sofa={sofa} onSofaToggle={onSofaToggle} onNearSofa={onNearSofa} doors={doors} vehiclesRef={vehiclesRef} onNearVehicle={onNearVehicle} onDrive={onDrive} idleCars={idleCars} onNearCar={onNearCar} onEnterCar={onEnterCar} posOutRef={playerPosRef} torch={torch} />
      )}
      {/* kinematic controller drives everything EXCEPT the physics Civic */}
      {mode === 'drive' && !carPhysicsDrive && (
        <Drive vehiclesRef={vehiclesRef} index={driving} doors={doors} onExit={onExitDrive} joyRef={joyRef} />
      )}
      {/* the cannon-es physics playground (paused while at the desk) — also
          hosts the real raycast-vehicle Civic when physics mode is on */}
      <Playground
        vehiclesRef={vehiclesRef}
        playerPosRef={playerPosRef}
        paused={mode === 'desk'}
        carActive={carPhysicsDrive}
        onExitDrive={onExitDrive}
        carProfile={carProfile}
        carSpawn={carSpawn}
        idleCars={idleCars}
        joyRef={joyRef}
        auto={auto}
      />
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
  const [daytime, setDaytime] = useState(false) // ☀️ world time-of-day
  const [toast, setToast] = useState(null) // task-complete popup
  const [tv, setTv] = useState(null) // cave TV: casting videoId, or null = off
  const [phone, setPhone] = useState(false) // the cast-remote phone overlay
  const [nearSofa, setNearSofa] = useState(false)
  const [sofa, setSofa] = useState(false) // sat on the couch, watching the TV
  const [doors, setDoors] = useState([false, true]) // roller doors open? (Civic's bay open to start)
  const [nearVehicle, setNearVehicle] = useState(-1)
  const [torch, setTorch] = useState(false) // hand torch while on foot
  // the car is always the real raycast-physics car now. Transmission: mobile is
  // automatic (no shift keys); desktop is manual by default but can toggle to auto.
  const physicsMode = true
  const [autoBox, setAutoBox] = useState(IS_TOUCH)
  const [cars, setCars] = useState(() => CARS.map((c) => ({ ...c, gears: [...c.gears] })))
  // Every drivable car physically in the world: the bay Civic + the 4 parked
  // ones. Exactly one (carSlot) is the live raycast-physics car; the rest render
  // as static models you can walk up to and get into. `prof` = tuning (into cars).
  // home[2] is the car's DISPLAY rotation (CompleteCar rotY); the physics driving
  // heading is that + PI/2 (the driven car's rig carries a -PI/2 nose offset).
  const [carSlots, setCarSlots] = useState(() => [
    { type: 'hatch', color: CARS[0].color, home: [CIVIC.pos[0], CIVIC.pos[2], -Math.PI / 2], prof: 0 },
    ...PARKED.map((p) => ({ type: p.type, color: p.color, home: [p.x, p.z, p.rotY], prof: TYPE_PROFILE[p.type] })),
  ])
  const [carSlot, setCarSlot] = useState(0) // which slot is the live physics car
  const [spawnN, setSpawnN] = useState(0) // bumps to teleport the physics car into its slot
  const [nearCar, setNearCar] = useState(-1) // idle car slot in reach, or -1
  const liveSlot = carSlots[carSlot]
  const carProfile = { ...cars[liveSlot.prof], color: liveSlot.color, type: liveSlot.type }
  const carSpawn = { x: liveSlot.home[0], z: liveSlot.home[1], heading: liveSlot.home[2] + Math.PI / 2, n: spawnN }
  const idleCars = carSlots.map((s, i) => ({ ...s, i })).filter((s) => s.i !== carSlot)
  const tuneCar = (field, value) =>
    setCars((cs) => cs.map((c, i) => (i === liveSlot.prof ? { ...c, [field]: value } : c)))
  // picker morphs the car you're in into a class (type/colour/tuning) — for testing
  const pickCar = (i) => {
    clickDown()
    setCarSlots((s) => s.map((sp, idx) => (idx === carSlot ? { ...sp, type: CARS[i].type, color: CARS[i].color, prof: i } : sp)))
  }
  const [driving, setDriving] = useState(0) // which vehicle Drive controls
  const [spawn, setSpawn] = useState([0.9, 0, 0.4]) // where Player mounts
  // Live vehicle poses — they persist wherever you park them. r = the
  // circle other things collide with. Civic heading 0 = nose to its door.
  const playerPosRef = useRef({ x: 0.9, z: 0.4 }) // fed to the physics pusher
  const vehiclesRef = useRef([
    { kind: 'car', x: CIVIC.pos[0], z: CIVIC.pos[2], heading: 0, lean: 0, r: 1.5 },
    { kind: 'bike', x: BIKES[0].pos[0], z: BIKES[0].pos[2], heading: BIKES[0].rotY, lean: 0, r: 0.6 },
    { kind: 'bike', x: BIKES[1].pos[0], z: BIKES[1].pos[2], heading: BIKES[1].rotY, lean: 0, r: 0.6 },
  ])

  const enterDrive = (idx) => {
    clickDown()
    complete('drive') // whiteboard task
    setDriving(idx)
    setNearVehicle(-1)
    setPhone(false)
    setMode('drive')
  }
  // get into one of the idle parked cars: make it the live physics car (teleport
  // the chassis to its spot + adopt its profile), then drive.
  const enterCar = (s) => {
    // save the car you're leaving exactly where it's parked, so it stays put
    const cur = vehiclesRef.current[0]
    if (cur) setCarSlots((slots) => slots.map((sp, i) => (i === carSlot ? { ...sp, home: [cur.x, cur.z, cur.heading - Math.PI / 2] } : sp)))
    setCarSlot(s)
    setSpawnN((n) => n + 1)
    setNearCar(-1)
    enterDrive(0)
  }
  if (import.meta.env.DEV) window.__enterCar = enterCar // test-only get-in hook
  const exitDrive = () => {
    clickDown()
    const c = vehiclesRef.current[driving]
    // step out beside the driver's door
    setSpawn([c.x + Math.cos(c.heading) * 2.0, 0, c.z - Math.sin(c.heading) * 2.0])
    setMode('explore')
  }
  const [tvVol, setTvVol] = useState(70) // TV volume, driven from the phone

  // Drive the embed's player via the IFrame API postMessage channel
  // (enablejsapi=1 on the iframe).
  const sendTvVolume = (v) => {
    const f = document.querySelector('.cave-tv iframe')
    f?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }),
      '*',
    )
  }
  useEffect(() => {
    sendTvVolume(tvVol)
  }, [tvVol])
  // Fresh cast: apply the volume once the player has booted.
  useEffect(() => {
    if (!tv) return
    const t = setTimeout(() => sendTvVolume(tvVol), 1800)
    return () => clearTimeout(t)
  }, [tv])

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
  useEffect(() => {
    document.documentElement.classList.toggle('daytime', daytime)
  }, [daytime])
  useEffect(() => {
    if (mode !== 'drive') document.documentElement.classList.remove('clutch-in')
  }, [mode])

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

  // P picks up the cast phone while exploring; F toggles the hand torch.
  useEffect(() => {
    if (mode !== 'explore') return
    const onKey = (e) => {
      if (window.__termTyping || window.__phoneOpen) return
      if (e.code === 'KeyP') setPhone(true)
      if (e.code === 'KeyF') {
        clickDown()
        setTorch((t) => !t)
      }
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
    setSpawn([0.9, 0, 0.4]) // beside the desk
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
  // Track pointer-lock so the cursor is only hidden when actually captured
  // (otherwise an invisible, un-locked mouse reads as "click to capture broken").
  useEffect(() => {
    const onLock = () =>
      document.documentElement.classList.toggle('locked', !!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onLock)
    onLock()
    return () => {
      document.removeEventListener('pointerlockchange', onLock)
      document.documentElement.classList.remove('locked')
    }
  }, [])

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
      {/* Mobile is a landscape experience (wide screens + driving HUD). In
          portrait on a touch device, prompt a rotate and block interaction. */}
      <div className="rotate-gate">
        <div className="rotate-gate-icon">📱↻</div>
        <p>Rotate your device</p>
        <small>this world runs in landscape</small>
      </div>
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [-8.23, 5.2, 1.92], fov: 45 }}
        onCreated={() => {
          // scene is live — fade the static boot screen away
          const b = document.getElementById('boot')
          if (b) {
            b.classList.add('done')
            setTimeout(() => b.remove(), 800)
          }
        }}
      >
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
            daytime={daytime}
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
            vehiclesRef={vehiclesRef}
            driving={driving}
            onNearVehicle={setNearVehicle}
            onDrive={enterDrive}
            onExitDrive={exitDrive}
            spawn={spawn}
            playerPosRef={playerPosRef}
            torch={torch}
            physicsMode={physicsMode}
            carProfile={carProfile}
            carSpawn={carSpawn}
            idleCars={idleCars}
            onNearCar={setNearCar}
            onEnterCar={enterCar}
            auto={autoBox}
          />
        </ScrollControls>
      </Canvas>

      {/* DOM overlays */}
      {toast && <div className="toast">✔ task complete — {toast}</div>}
      <Phone
        open={phone}
        tv={tv}
        vol={tvVol}
        onVol={setTvVol}
        onCast={cast}
        onStop={() => setTv(null)}
        onClose={closePhone}
      />
      <button className="ctl ctl-mute" onClick={toggleMute} title="toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
      {/* workshop-lights toggle is a garage/scene control — hide it while driving
          so the only 💡 in the car is the headlight flash (no duplicate bulbs) */}
      {mode !== 'drive' && (
        <button className="ctl ctl-lights" onClick={toggleLights} title="toggle lights (L)">
          {lights ? '💡' : '🌙'}
        </button>
      )}
      <button
        className="ctl ctl-day"
        onClick={() => {
          clickDown()
          setDaytime((d) => !d)
        }}
        title="toggle day / night"
      >
        {daytime ? '☀️' : '🌃'}
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
          {!IS_TOUCH && (
            <div className="tune tune-pick">
              <div className="tune-label">car to drive</div>
              <div className="tune-cars">
                {cars.map((car, i) => (
                  <button
                    key={car.name}
                    className={'tune-car' + (i === liveSlot.prof ? ' on' : '')}
                    onClick={() => pickCar(i)}
                  >
                    {car.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          ) : nearCar >= 0 ? (
            <div className="aim-label show sit-label" onClick={() => enterCar(nearCar)}>
              {(IS_TOUCH ? 'tap to ' : 'press E to ') + 'drive the ' + cars[carSlots[nearCar].prof].name}
            </div>
          ) : nearVehicle >= 0 ? (
            <div className="aim-label show sit-label" onClick={() => enterDrive(nearVehicle)}>
              {(IS_TOUCH ? 'tap to ' : 'press E to ') +
                (vehiclesRef.current[nearVehicle]?.kind === 'bike' ? 'ride the bike' : 'drive the civic')}
            </div>
          ) : (
            <div className="explore-hint">
              {IS_TOUCH
                ? 'stick walks · drag the screen to look'
                : 'WASD to walk · click to capture the mouse · esc frees it'}
            </div>
          )}
          <button
            className="ctl ctl-cam"
            onClick={() => {
              clickDown()
              setTorch((t) => !t)
            }}
          >
            🔦 {torch ? 'off' : 'torch'} (F)
          </button>
          {IS_TOUCH && <Joystick vecRef={joyRef} />}
          {isFp && (
            <>
              <div className="crosshair" />
              <div id="aim-label" className="aim-label" />
            </>
          )}
        </>
      )}

      {mode === 'drive' && (
        <>
          <button className="ctl ctl-back" onClick={exitDrive}>
            {vehiclesRef.current[driving]?.kind === 'bike' ? '🏍' : '🚗'} get off (E)
          </button>
          {/* reset/flip the car upright — shown on both (desktop also has R key) */}
          {driving === 0 && (
            <button className="ctl ctl-drive ctl-reset" title="flip the car back upright (R)" aria-label="reset car" onClick={() => window.dispatchEvent(new Event('car-reset'))}>↻</button>
          )}
          {/* on-screen action buttons: mobile only (desktop uses F / V / H keys) */}
          {IS_TOUCH && (
            <>
              <button className="ctl ctl-drive ctl-flash" aria-label="flash lights" onClick={() => window.dispatchEvent(new Event('vehicle-flash'))}>💡</button>
              <button className="ctl ctl-drive ctl-viewcam" aria-label="camera view" onClick={() => window.dispatchEvent(new Event('drive-cam'))}>👁</button>
              <button className="ctl ctl-drive ctl-honk" aria-label="horn" onClick={() => window.dispatchEvent(new Event('vehicle-horn'))}>📯</button>
            </>
          )}
          {!IS_TOUCH && driving === 0 && (
            <button
              className="ctl ctl-auto"
              onClick={() => {
                clickDown()
                setAutoBox((a) => !a)
              }}
              title="gearbox: automatic (no clutch/shifting) or manual"
            >
              {autoBox ? '⚙ auto' : '🖐 manual'}
            </button>
          )}
          {/* gearbox HUD — Drive writes into these each frame (no re-render) */}
          <div id="rev-warn" className="rev-warn" />
          <div className="gauge">
            <div className="gauge-gear">
              <span id="gear-num">1</span>
              <small>gear</small>
            </div>
            <div className="gauge-right">
              <div className="rpm-track">
                <div id="rpm-fill" />
              </div>
              <div className="gauge-spd">
                <span id="spd-num">0</span> km/h
                <span className="clutch-tag">CLUTCH</span>
              </div>
            </div>
          </div>
          {!IS_TOUCH && driving === 0 && (
            <div className="tune">
              <div className="tune-cars">
                {cars.map((car, i) => (
                  <button
                    key={car.name}
                    className={'tune-car' + (i === liveSlot.prof ? ' on' : '')}
                    onClick={() => pickCar(i)}
                  >
                    {car.name}
                  </button>
                ))}
              </div>
              {[
                ['mass', 'weight', 'kg'],
                ['force', 'power', 'N'],
                ['grip', 'grip', ''],
                ['balance', 'balance', ''],
                ['brake', 'brakes', ''],
              ].map(([field, label, unit]) => (
                <label key={field} className="tune-row">
                  <span>{label}</span>
                  <input
                    type="range"
                    min={TUNE[field][0]}
                    max={TUNE[field][1]}
                    step={TUNE[field][2]}
                    value={carProfile[field]}
                    onChange={(e) => tuneCar(field, +e.target.value)}
                  />
                  <b>{carProfile[field]}{unit}</b>
                </label>
              ))}
            </div>
          )}
          {IS_TOUCH ? (
            <div className="explore-hint">stick drives · auto gears · tap buttons for view/horn</div>
          ) : driving === 0 ? (
            <div className="drive-help">
              <div className="drive-help-row">
                {autoBox ? (
                  <>
                    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</span>
                    <span>⚙ automatic</span>
                    <span><kbd>H</kbd> horn · <kbd>F</kbd> lights · <kbd>E</kbd> out</span>
                  </>
                ) : (
                  <>
                    <span><kbd>I</kbd> start</span>
                    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</span>
                    <span><kbd>⇧</kbd> clutch</span>
                    <span><kbd>↑</kbd><kbd>↓</kbd> gears</span>
                    <span><kbd>H</kbd> horn · <kbd>F</kbd> lights · <kbd>E</kbd> out</span>
                  </>
                )}
              </div>
              <div className="drive-help-tip">
                🔧 <b>{carProfile.name}</b> — real physics · tune it below
              </div>
            </div>
          ) : (
            <div className="drive-help">
              <div className="drive-help-row">
                <span><kbd>I</kbd> start engine</span>
                <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive / brake</span>
                <span><kbd>⇧</kbd> clutch</span>
                <span><kbd>↑</kbd><kbd>↓</kbd> shift up / down</span>
              </div>
              <div className="drive-help-row">
                <span><kbd>V</kbd> view</span>
                <span><kbd>F</kbd> lights</span>
                <span><kbd>H</kbd> horn</span>
                <span><kbd>E</kbd> get out</span>
              </div>
              <div className="drive-help-tip">
                pull away → <b>I</b> start · <b>↑</b> into 1st · hold <b>⇧</b> · rev with <b>W</b> · drop <b>⇧</b>
              </div>
            </div>
          )}
          {IS_TOUCH && <Joystick vecRef={joyRef} />}
        </>
      )}
    </>
  )
}
