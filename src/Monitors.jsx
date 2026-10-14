import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { MONITORS, CAVE } from './layout'
import ComputerOS from './ComputerOS'
import { respond, CLEAR } from './claudeTerm'
import { downloadCV } from './content'
import { clickDown, clickUp, keyClack, doorMotor } from './sfx'
import { IS_TOUCH } from './touch'
import { TASKS, complete, useTasks, resetTasks } from './tasks'

// --- Cave TV config ---
const TV_START = 5 // seconds: where a fresh cast of the video begins
const TV_RATE = 2 // playback speed
const TV_VOL = 25 // initial low-ish volume (App refines it by distance)
// Render the embed at 720p worth of DOM pixels so YouTube serves HD on the
// big screen instead of the ~360p it picks from a small player (the blur).
const TV_PX = { w: 1280, h: 720 }

// Load the YouTube IFrame Player API once. Resolves with window.YT. Using the
// real API (not a bare <iframe>) gets us getCurrentTime (resume), setPlaybackRate
// (2x), and reliable mute/unmute around the browser autoplay policy.
let ytApi
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApi) return ytApi
  ytApi = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return ytApi
}

// Whiteboard on the back wall, left of the desk — live task list.
function Whiteboard({ portal, eraserRef }) {
  const done = useTasks()
  return (
    <group position={[-2.05, 1.5, -2.96]}>
      {/* frame + tray (recessed BEHIND the punch plane, or it covers it) */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[1.5, 1.06, 0.03]} />
        <meshStandardMaterial color="#a8a8ae" />
      </mesh>
      <mesh position={[0, -0.56, 0.02]}>
        <boxGeometry args={[0.6, 0.03, 0.07]} />
        <meshStandardMaterial color="#8a8a90" />
      </mesh>
      {/* the ERASER — click it to wipe every tick off the board */}
      <group position={[0.18, -0.525, 0.045]}>
        <mesh ref={eraserRef}>
          <boxGeometry args={[0.16, 0.05, 0.07]} />
          <meshStandardMaterial color="#3a4a7a" />
        </mesh>
        <mesh position={[0, 0.028, 0]}>
          <boxGeometry args={[0.16, 0.012, 0.07]} />
          <meshStandardMaterial color="#d8d4c8" />
        </mesh>
      </group>
      {/* depth punch for the blending Html */}
      <mesh>
        <planeGeometry args={[1.42, 0.98]} />
        <meshStandardMaterial colorWrite={false} />
      </mesh>
      <Html
        transform
        occlude="blending"
        portal={portal}
        distanceFactor={(400 * 1.4) / 300}
        position={[0, 0, 0.004]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="whiteboard">
          {TASKS.map((t) => (
            <div key={t.id} className={`wb-item${done[t.id] ? ' wb-done' : ''}`}>
              <span className="wb-label">{t.label}</span>
              {done[t.id] && <span className="wb-tick">✓</span>}
            </div>
          ))}
        </div>
      </Html>
    </group>
  )
}

// Both monitors render their UI onto the glass permanently via drei
// <Html transform occlude="blending">. One shared retro cursor travels between
// the displays; clicks are bridged from a camera raycast to real DOM clicks;
// keyboard input routes to whichever surface has FOCUS.

// drei transform mode: world width = px * distanceFactor / 400.
const df = (m) => (400 * m.w) / m.pxW

// One shared cursor: classic Windows arrow (white, black outline), sized so
// its PHYSICAL size matches on both monitors despite different px densities.
const CURSOR_PHYS_W = 0.013 // metres wide on the glass
const cursorPx = (m) => (CURSOR_PHYS_W * m.pxW) / m.w
function WinCursor({ refEl, mon }) {
  const w = cursorPx(mon)
  return (
    <svg
      className="os-cursor"
      ref={refEl}
      width={w}
      height={(w * 22) / 14}
      viewBox="0 0 14 22"
    >
      <path
        d="M1 1 L1 17.5 L4.7 14.1 L7 19.8 L9.6 18.7 L7.3 13.1 L12.4 13.1 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Hit-test interactive elements in FRAMEBUFFER (layout) coordinates.
// offsetLeft/Top are layout values — unaffected by the CSS 3D transform — so
// this is exact regardless of screen angle. Last match wins (= topmost).
function rectOf(root, el) {
  let ox = 0
  let oy = 0
  let n = el
  while (n && n !== root) {
    ox += n.offsetLeft
    oy += n.offsetTop
    n = n.offsetParent
  }
  return { ox, oy, w: el.offsetWidth, h: el.offsetHeight }
}

function hitTest(root, x, y) {
  if (!root) return null
  let best = null
  for (const el of root.querySelectorAll('[data-click], [data-drag]')) {
    const r = rectOf(root, el)
    if (x >= r.ox && x <= r.ox + r.w && y >= r.oy && y <= r.oy + r.h) best = el
  }
  if (best) return best
  // Tolerant second pass so skinny resize strips are still grabbable
  // despite sub-pixel projection error.
  const PAD = 4
  for (const el of root.querySelectorAll('[data-drag]')) {
    const r = rectOf(root, el)
    if (x >= r.ox - PAD && x <= r.ox + r.w + PAD && y >= r.oy - PAD && y <= r.oy + r.h + PAD) {
      best = el
    }
  }
  return best
}

const STATUS_LINES = [
  'michael@garage ~ $ ./status.sh',
  '─────────────────────────────',
  ' host: garage-workstation',
  ' uptime: 14d 03:12',
  ' build: passing ✔',
  ' mx5_na/restoration: 12% ▓░░░░░░░░',
  ' parts_needed: [engine, doors x2, bonnet, wheels x4]',
]

// The terminal: tabs (status.sh | claude), typed input when focused.
function TerminalScreen({ mon, active, focused, onFocusClick }) {
  const [tab, setTab] = useState('claude')
  const [history, setHistory] = useState([
    { who: 'claude', text: "Hey — I'm the garage AI. Ask about Michael, or type `help`." },
  ])
  const [input, setInput] = useState('')
  const inputRef = useRef('') // authoritative value; state is just for render
  const hidRef = useRef() // hidden <input> that summons the mobile keyboard

  const submit = () => {
    const q = inputRef.current.trim()
    inputRef.current = ''
    setInput('')
    if (hidRef.current) hidRef.current.value = ''
    window.__termTyping = false
    if (!q) return
    setTab('claude')
    if (/^(cv|download( cv)?|resume)$/i.test(q)) {
      downloadCV()
      setHistory((h) =>
        [...h, { who: 'user', text: q }, { who: 'claude', text: 'downloading Michael Watters — CV.pdf ⬇' }].slice(-40),
      )
      return
    }
    complete('terminal') // whiteboard task
    const r = respond(q)
    setHistory((h) =>
      r === CLEAR
        ? []
        : [...h, { who: 'user', text: q }, ...r.map((t) => ({ who: 'claude', text: t }))].slice(-40),
    )
  }

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // The hidden mobile input handles its own keystrokes.
      if (document.activeElement === hidRef.current) return
      if (e.key === 'Enter') {
        submit()
      } else if (e.key === 'Backspace') {
        inputRef.current = inputRef.current.slice(0, -1)
        setInput(inputRef.current)
      } else if (e.key.length === 1) {
        if (inputRef.current.length < 44) {
          inputRef.current += e.key
          setInput(inputRef.current)
        }
      } else {
        return
      }
      // Lets the screen-zoom keys (1/2) know whether we're mid-sentence.
      window.__termTyping = inputRef.current.length > 0
      keyClack() // mechanical keyboard
      setTab('claude') // typing always lands in the claude tab
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.__termTyping = false
    }
  }, [active])

  return (
    <div
      className={`os-screen term${focused ? '' : ' term-unfocused'}`}
      style={{ width: mon.pxW, height: mon.pxH }}
      data-click
      onClick={() => {
        onFocusClick()
        // Touch devices: focusing the hidden input summons the keyboard.
        if (IS_TOUCH) hidRef.current?.focus()
      }}
    >
      <div className="term-tabs">
        <span
          className={`term-tab${tab === 'status' ? ' active' : ''}`}
          data-click
          onClick={() => setTab('status')}
        >
          status.sh
        </span>
        <span
          className={`term-tab${tab === 'claude' ? ' active' : ''}`}
          data-click
          onClick={() => setTab('claude')}
        >
          ✻ claude
        </span>
        <span className="term-tab-fill" />
      </div>

      {/* invisible input: receives mobile keyboard text, mirrors into the terminal */}
      <input
        ref={hidRef}
        className="hid-input"
        autoCapitalize="none"
        autoCorrect="off"
        onInput={(e) => {
          inputRef.current = e.target.value.slice(0, 44)
          setInput(inputRef.current)
          window.__termTyping = inputRef.current.length > 0
          keyClack()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      {tab === 'claude' ? (
        <div className="term-body claude">
          <div className="term-line">
            <span className="claude-logo">✻</span> <b>Claude Code</b>{' '}
            <span className="term-dim">· michael@garage</span>
          </div>
          <div className="term-line term-dim">──────────────────────────────────</div>
          {history.slice(-9).map((l, i) => (
            <div className="term-line" key={i}>
              {l.who === 'user' ? (
                <>
                  <span className="claude-user">&gt; </span>
                  {l.text}
                </>
              ) : (
                <>
                  <span className="claude-dot">● </span>
                  {l.text}
                </>
              )}
            </div>
          ))}
          <div className="term-line">
            <span className="claude-user">&gt; </span>
            {focused ? (
              <>
                {input}
                <span className="term-caret">▊</span>
              </>
            ) : (
              <span className="term-dim">· click this screen to type ·</span>
            )}
          </div>
        </div>
      ) : (
        <div className="term-body status">
          {STATUS_LINES.map((l, i) => (
            <div className="term-line" key={i}>
              {l}
            </div>
          ))}
          <div className="term-line">
            michael@garage ~ $ <span className="term-caret">▊</span>
          </div>
        </div>
      )}
    </div>
  )
}

// How close (metres) you must be to use each physical prop — you shouldn't
// be able to poke the TV from the other side of the garage. The sofa sits
// ~1.9m from the TV; the desk chair ~1.5m from the whiteboard.
const RANGE = { switch: 3.5, eraser: 3, tv: 4.5, phone: 2.5, door: 6, floppy: 2.2 }

// Paint a believable 3.5" floppy top: coloured shell, metal shutter, and a
// paper label — a home-made "NIGHT DRIVE" game disk. Drawn once to a canvas and
// mapped onto the diskette's top face.
function makeFloppyLabel() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')
  // shell (night-blue)
  g.fillStyle = '#17142e'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(255,255,255,0.15)'
  g.lineWidth = 4
  g.strokeRect(2, 2, 252, 252)
  // metal shutter across the top edge, with its window
  const sh = g.createLinearGradient(0, 0, 0, 58)
  sh.addColorStop(0, '#dcdce2')
  sh.addColorStop(0.5, '#a6a6ae')
  sh.addColorStop(1, '#cfcfd6')
  g.fillStyle = sh
  g.fillRect(40, 8, 176, 48)
  g.fillStyle = '#6a6a72'
  g.fillRect(150, 8, 42, 48)
  // paper label
  g.fillStyle = '#f3ead2'
  g.fillRect(16, 72, 224, 168)
  g.lineWidth = 3
  g.strokeStyle = '#ff50c8'
  g.strokeRect(16, 72, 224, 168)
  // neon header bar
  g.fillStyle = '#17142e'
  g.fillRect(16, 72, 224, 20)
  // title (handwritten-ish, arcade colours)
  g.textAlign = 'center'
  g.fillStyle = '#d6358f'
  g.font = 'bold 34px "DejaVu Sans Mono", monospace'
  g.fillText('NIGHT', 128, 150)
  g.fillStyle = '#2aa7c9'
  g.fillText('DRIVE', 128, 186)
  // subtitle + spec
  g.fillStyle = '#7a7360'
  g.font = 'bold 13px monospace'
  g.fillText('★ made in rust ★', 128, 212)
  g.fillStyle = '#9a927c'
  g.font = 'bold 11px monospace'
  g.fillText('3.5"  HD  1.44MB', 128, 230)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

const lerp = (a, b, t) => a + (b - a) * t

// An external 3.5" floppy drive that sits on the desk, plus its diskette.
// Ejected, the disk leans out of the slot toward the seat; inserting slides +
// flattens it into the drive. `driveRef` is the raycast target (recursive) so
// clicking either the drive or the disk toggles.
function Floppy({ driveRef, inserted }) {
  const diskRef = useRef()
  const ledRef = useRef()
  const prog = useRef(inserted ? 1 : 0)
  const label = useMemo(makeFloppyLabel, [])
  useEffect(() => () => label.dispose(), [label])

  useFrame((_, dt) => {
    const target = inserted ? 1 : 0
    prog.current += (target - prog.current) * Math.min(1, dt * 6)
    const p = prog.current
    const d = diskRef.current
    if (d) {
      // ejected (p=0): up+forward, leaning toward the viewer; inserted (p=1):
      // flat and slid back inside the drive body (which then occludes it).
      d.position.set(0, lerp(0.052, 0.03, p), lerp(0.12, -0.03, p))
      d.rotation.x = lerp(1.0, 0, p)
      d.visible = !(inserted && p > 0.97)
    }
    if (ledRef.current) {
      // activity LED: amber + flickering while the disk is inserted; dark idle
      const lit = inserted ? 0.7 + 0.3 * Math.sin(prog.current * 0 + performance.now() / 90) : 0
      ledRef.current.material.emissiveIntensity = Math.max(0, lit)
    }
  })

  return (
    // driveRef wraps BOTH the drive and the disk so a recursive raycast hits
    // either one — click the unit anywhere to insert / eject. Sits in the gap
    // between the two monitors, facing the seat.
    <group ref={driveRef} position={[0.08, 0.74, -2.68]} rotation-y={0}>
      {/* drive body */}
      <mesh position={[0, 0.028, 0]} castShadow>
        <boxGeometry args={[0.17, 0.056, 0.15]} />
        <meshStandardMaterial color="#d8d2c2" />
      </mesh>
      {/* darker front plate facing the seat (+z) */}
      <mesh position={[0, 0.028, 0.0755]}>
        <boxGeometry args={[0.172, 0.058, 0.004]} />
        <meshStandardMaterial color="#b7b1a2" />
      </mesh>
      {/* the slot */}
      <mesh position={[-0.008, 0.034, 0.078]}>
        <boxGeometry args={[0.12, 0.009, 0.006]} />
        <meshStandardMaterial color="#1a1a1e" />
      </mesh>
      {/* eject button */}
      <mesh position={[0.066, 0.02, 0.078]}>
        <boxGeometry args={[0.018, 0.012, 0.006]} />
        <meshStandardMaterial color="#9a9488" />
      </mesh>
      {/* activity LED */}
      <mesh ref={ledRef} position={[-0.07, 0.02, 0.078]}>
        <boxGeometry args={[0.01, 0.006, 0.005]} />
        <meshStandardMaterial color="#5a3a00" emissive="#ffae2a" emissiveIntensity={0} toneMapped={false} />
      </mesh>

      {/* the diskette */}
      <group ref={diskRef} position={[0, 0.052, 0.12]} rotation-x={1.0}>
        {/* shell edges (thin box) */}
        <mesh castShadow>
          <boxGeometry args={[0.092, 0.005, 0.096]} />
          <meshStandardMaterial color="#2a2d36" />
        </mesh>
        {/* labelled top face */}
        <mesh position={[0, 0.0027, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.092, 0.096]} />
          <meshStandardMaterial map={label} roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

// The arcade game (Night Drive) shown on the primary monitor while the floppy
// is in. A same-origin iframe to /game/ (built from game/night-drive, Rust →
// wasm), remounted each insert for a fresh game. The canvas is pointer-events:
// none, so this iframe gets REAL input — click the screen to focus, then drive.
function GameScreen({ mon }) {
  const [ready, setReady] = useState(false)
  return (
    <div className="game-screen" style={{ width: mon.pxW, height: mon.pxH }}>
      {!ready && (
        <div className="game-loading">
          <b>▓ DISK INSERTED</b>
          <span>loading NIGHT DRIVE…</span>
        </div>
      )}
      <iframe
        className="game-frame"
        src="game/index.html"
        title="Night Drive"
        scrolling="no"
        onLoad={() => setReady(true)}
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  )
}

// Live clock for the phone prop's lock screen.
function LockClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <>
      <b>{hh}:{mm}</b>
      <span>{date.toLowerCase()}</span>
    </>
  )
}

export default function Monitors({ mode = 'desk', onZoom, switchesRef, onToggleLights, fp = false, tv = null, tvMuted = false, onTvToggle, onPhone, phoneHeld = false, doorRefs, doors = [false, false], onDoorToggle }) {
  const screenA = useRef()
  const screenB = useRef()
  const curA = useRef()
  const curB = useRef()
  const glassA = useRef()
  const glassB = useRef()
  const scrollState = useScroll()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  // Which surface owns the keyboard: 'terminal' | 'desk' | 'win:<key>'.
  // Starts on the CV window (it opens by default); click the terminal to type.
  const [focused, setFocused] = useState('win:cv.html')

  // Hide the ScrollControls scrollbar on classic-scrollbar platforms.
  useEffect(() => {
    scrollState.el?.classList.add('no-scrollbar')
  }, [scrollState])

  // In explore mode the scroller must not eat touch drags (walk/look).
  useEffect(() => {
    const el = scrollState.el
    if (!el) return
    el.style.overflowY = mode === 'desk' ? 'auto' : 'hidden'
  }, [mode, scrollState])

  // Cursor + click bridge via OUR OWN raycast (R3F mesh events silently die in
  // the ScrollControls + blending-occlusion setup): window pointermove → ray →
  // UV on the glass → framebuffer px. Clicks hit-test [data-click] elements in
  // layout coords and fire el.click(), so the OS uses normal React handlers.
  const posRef = useRef({ screen: null, x: 0, y: 0 })
  const hoverRef = useRef(null)
  const dragRef = useRef(null) // { el, screen, lastX, lastY } while dragging
  const moveFnRef = useRef(null) // the pointermove routine, callable per-frame in FP
  const aimRay = useRef({ rc: new THREE.Raycaster(), v: new THREE.Vector2(0, 0) })
  const lastDownRef = useRef({ screen: null, t: 0, bg: false }) // dbl-click detect
  const onZoomRef = useRef(onZoom)
  onZoomRef.current = onZoom
  const switchesArrRef = useRef(switchesRef)
  switchesArrRef.current = switchesRef
  const eraserRef = useRef()
  const onToggleLightsRef = useRef(onToggleLights)
  onToggleLightsRef.current = onToggleLights
  // Man-cave TV (state owned by App — the phone remote casts to it too).
  const tvRef = useRef()
  const tvPropRef = useRef(tv)
  tvPropRef.current = tv
  const onTvToggleRef = useRef(onTvToggle)
  onTvToggleRef.current = onTvToggle
  // YouTube IFrame player + playback bookkeeping.
  const tvHostRef = useRef() // the div the YT API swaps for its <iframe>
  const tvPlayerRef = useRef(null)
  const tvResumeRef = useRef(TV_START) // last known position; survives off→on
  const tvLastVidRef = useRef(null) // detect a channel change vs a resume
  const tvArmedRef = useRef(false) // a user gesture has happened (sound unlock)
  const tvMutedRef = useRef(tvMuted)
  tvMutedRef.current = tvMuted

  // First user gesture anywhere unlocks audio: the TV autoplays muted (browser
  // policy), then we unmute once the user clicks/scrolls/types/touches.
  useEffect(() => {
    const arm = () => {
      tvArmedRef.current = true
      if (!tvMutedRef.current) {
        try {
          tvPlayerRef.current?.unMute?.()
        } catch {}
      }
    }
    const opts = { passive: true }
    window.addEventListener('pointerdown', arm, opts)
    window.addEventListener('keydown', arm)
    window.addEventListener('touchstart', arm, opts)
    window.addEventListener('wheel', arm, opts)
    return () => {
      window.removeEventListener('pointerdown', arm, opts)
      window.removeEventListener('keydown', arm)
      window.removeEventListener('touchstart', arm, opts)
      window.removeEventListener('wheel', arm, opts)
    }
  }, [])

  // Create / tear down the player when the TV turns on / off or changes channel.
  useEffect(() => {
    if (!tv) return
    let cancelled = false
    let poll
    const build = (YT, tries = 30) => {
      if (cancelled) return
      const host = tvHostRef.current
      if (!host) {
        // drei's <Html> may not have committed its DOM yet — retry next frame.
        if (tries > 0) requestAnimationFrame(() => build(YT, tries - 1))
        return
      }
      const sameVid = tv === tvLastVidRef.current
      const start = Math.max(0, Math.floor(sameVid ? tvResumeRef.current : TV_START))
      tvLastVidRef.current = tv
      // YT.Player REPLACES the node it's given with its <iframe>. Hand it a
      // plain DOM child we made (not a React node) so React never tries to
      // reconcile — otherwise unmount throws removeChild-not-a-child.
      const mount = document.createElement('div')
      host.appendChild(mount)
      tvPlayerRef.current = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com',
        videoId: tv,
        width: TV_PX.w,
        height: TV_PX.h,
        playerVars: {
          autoplay: 1,
          start,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          rel: 0,
          mute: 1, // start muted so autoplay is allowed; unmute on gesture
          loop: 1,
          playlist: tv, // required for loop of a single video
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.setPlaybackRate(TV_RATE)
              e.target.setVolume(TV_VOL) // low-ish before any unmute — no 100% blip
              if (tvArmedRef.current && !tvMutedRef.current) e.target.unMute()
            } catch {}
            // App drives positional volume through this (the API ignores the
            // raw postMessage commands a bare embed accepts).
            window.__caveTv = e.target
            poll = setInterval(() => {
              try {
                const t = e.target.getCurrentTime?.()
                if (t) tvResumeRef.current = t
              } catch {}
            }, 500)
          },
        },
      })
    }
    loadYT().then((YT) => build(YT))
    return () => {
      cancelled = true
      if (poll) clearInterval(poll)
      const p = tvPlayerRef.current
      tvPlayerRef.current = null
      if (window.__caveTv === p) window.__caveTv = null
      if (p) {
        try {
          const t = p.getCurrentTime?.()
          if (t) tvResumeRef.current = t // remember where we were, for resume
        } catch {}
        try {
          p.destroy()
        } catch {}
      }
    }
  }, [tv])

  // Site mute toggle → mute/unmute the live player without reloading it.
  useEffect(() => {
    const p = tvPlayerRef.current
    if (!p) return
    try {
      if (tvMuted) p.mute()
      else if (tvArmedRef.current) p.unMute()
    } catch {}
  }, [tvMuted])
  const onPhoneRef = useRef(onPhone)
  onPhoneRef.current = onPhone
  const phoneMeshRef = useRef() // the prop on the couch armrest
  const postitRefs = useRef([]) // punch planes double as lean-in click targets
  const doorRefsRef = useRef(doorRefs)
  doorRefsRef.current = doorRefs
  const doorsRef = useRef(doors)
  doorsRef.current = doors
  const onDoorToggleRef = useRef(onDoorToggle)
  onDoorToggleRef.current = onDoorToggle
  // Floppy drive on the desk — a clickable prop. Inserting/ejecting is a local
  // animation for now; no behaviour is wired to it yet (a future feature can
  // hook into `floppyIn` / toggleFloppy here).
  const floppyRef = useRef()
  const [floppyIn, setFloppyIn] = useState(false)
  const floppyInRef = useRef(floppyIn)
  floppyInRef.current = floppyIn
  const toggleFloppy = () => {
    doorMotor() // the drive whir
    setFloppyIn((v) => !v)
  }
  const onFloppyRef = useRef(toggleFloppy)
  onFloppyRef.current = toggleFloppy
  if (import.meta.env.DEV) window.__floppy = toggleFloppy // test-only insert/eject
  // First person: aim from the SCREEN CENTRE (crosshair), not the mouse.
  const fpRef = useRef(fp)
  fpRef.current = fp
  // Explore mode: the OS takes NO input (no typing, clicking, hovering).
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    const setHover = (el) => {
      if (el === hoverRef.current) return
      hoverRef.current?.classList.remove('ui-hover')
      el?.classList.add('ui-hover')
      hoverRef.current = el
    }

    const route = (which, cur, other, mon, root, uv) => {
      // UV spans the whole glass; layout coords start inside the 3px bezel
      // border — compensate or everything sits ~3px off.
      const BORDER = 3
      const x = uv.x * mon.pxW - BORDER
      const y = (1 - uv.y) * mon.pxH - BORDER
      posRef.current = { screen: which, x, y }
      if (cur) {
        cur.style.transform = `translate(${x}px, ${y}px)`
        cur.style.opacity = '1'
      }
      if (other) other.style.opacity = '0'
      document.documentElement.classList.add('on-glass')

      // Active drag: emit framebuffer-space deltas to the dragged element.
      const d = dragRef.current
      if (d && d.screen === which) {
        const dx = x - d.lastX
        const dy = y - d.lastY
        if (dx || dy) {
          d.el.dispatchEvent(new CustomEvent('os-drag', { bubbles: true, detail: { dx, dy } }))
          d.lastX = x
          d.lastY = y
        }
        return // no hover churn while dragging
      }
      setHover(hitTest(root, x, y))
    }

    const move = (e) => {
      if (!glassA.current || !glassB.current) return
      // Stepped away: the OS takes no pointer interaction at all.
      if (modeRef.current !== 'desk') {
        posRef.current = { screen: null, x: 0, y: 0 }
        if (curA.current) curA.current.style.opacity = '0'
        if (curB.current) curB.current.style.opacity = '0'
        setHover(null)
        document.documentElement.classList.remove('on-glass')
        return
      }
      // FP crosshair: aim is always the screen centre.
      const cx = fpRef.current ? window.innerWidth / 2 : e.clientX
      const cy = fpRef.current ? window.innerHeight / 2 : e.clientY
      ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects([glassA.current, glassB.current], false)[0]
      if (hit && hit.uv) {
        if (hit.object === glassA.current) {
          route('A', curA.current, curB.current, MONITORS.primary, screenA.current, hit.uv)
        } else {
          route('B', curB.current, curA.current, MONITORS.secondary, screenB.current, hit.uv)
        }
      } else {
        posRef.current = { screen: null, x: 0, y: 0 }
        if (curA.current) curA.current.style.opacity = '0'
        if (curB.current) curB.current.style.opacity = '0'
        setHover(null)
        document.documentElement.classList.remove('on-glass')
      }
    }

    const down = (e) => {
      // Refresh the hit from THIS event's coordinates — on touch there's no
      // hover history, the tap itself carries the position.
      move(e)

      // Wall switches + whiteboard eraser are clickable in ANY mode
      // (centre-aimed in FP).
      {
        const cx = fpRef.current ? window.innerWidth / 2 : e.clientX
        const cy = fpRef.current ? window.innerHeight / 2 : e.clientY
        ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        // Every prop has a REACH — no toggling the TV from across the room.
        // (In desk mode the switches/eraser stay clickable at any distance:
        // you're pinned to the chair, reach limits would just kill them.)
        const fpNow = fpRef.current
        const inReach = (h, r) => h && (!fpNow || h.distance <= r)
        const sws = (switchesArrRef.current?.current || []).filter(Boolean)
        if (sws.length && inReach(raycaster.intersectObjects(sws, false)[0], RANGE.switch)) {
          onToggleLightsRef.current?.()
          return
        }
        if (
          eraserRef.current &&
          inReach(raycaster.intersectObject(eraserRef.current, false)[0], RANGE.eraser)
        ) {
          clickDown()
          resetTasks() // wipe the whiteboard
          return
        }
        if (tvRef.current) {
          const h = raycaster.intersectObject(tvRef.current, false)[0]
          if (h && h.distance <= RANGE.tv) {
            onTvToggleRef.current?.()
            return
          }
        }
        if (phoneMeshRef.current) {
          const h = raycaster.intersectObject(phoneMeshRef.current, false)[0]
          if (h && h.distance <= RANGE.phone) {
            clickDown()
            onPhoneRef.current?.() // pick up the cast remote
            return
          }
        }
        if (floppyRef.current) {
          // recursive: clicking the drive OR the leaning disk both count
          const h = raycaster.intersectObject(floppyRef.current, true)[0]
          if (inReach(h, RANGE.floppy)) {
            clickDown()
            onFloppyRef.current?.() // insert / eject the floppy
            return
          }
        }
        const drs = (doorRefsRef.current?.current || []).filter(Boolean)
        if (drs.length) {
          const dh = raycaster.intersectObjects(drs, false)[0]
          if (dh && dh.distance <= RANGE.door) {
            // refs are [drum0, panel0, drum1, panel1] → door = idx / 2
            onDoorToggleRef.current?.(Math.floor(doorRefsRef.current.current.indexOf(dh.object) / 2))
            return
          }
        }
      }

      // Stepped away: no OS clicks (switches above still work).
      if (modeRef.current !== 'desk') return

      // Post-its: click to lean in and read (click again / Esc backs out).
      {
        const pr = postitRefs.current.filter(Boolean)
        const hit = pr.length ? raycaster.intersectObjects(pr, false)[0] : null
        if (hit) {
          clickDown()
          onZoomRef.current?.('P' + (postitRefs.current.indexOf(hit.object) + 1))
          return
        }
      }

      const p = posRef.current
      if (!p.screen) return
      clickDown()
      const root = p.screen === 'A' ? screenA.current : screenB.current
      const el = hitTest(root, p.x, p.y)

      // Double-click on the screen background OR a window body leans the
      // camera into that screen; double-click again to sit back. Buttons,
      // title bars and drag handles stay excluded (rapid clicks ≠ lean-in).
      const isBg =
        !el ||
        el.classList.contains('desktop') ||
        el.classList.contains('os-screen') ||
        el.classList.contains('term') ||
        el.classList.contains('win')
      const now = performance.now()
      const last = lastDownRef.current
      if (isBg && last.bg && last.screen === p.screen && now - last.t < 450) {
        lastDownRef.current = { screen: null, t: 0, bg: false }
        onZoomRef.current?.(p.screen)
        return
      }
      lastDownRef.current = { screen: p.screen, t: now, bg: isBg }

      if (!el) return
      if (el.dataset.drag !== undefined) {
        // start a drag session instead of clicking
        dragRef.current = { el, screen: p.screen, lastX: p.x, lastY: p.y }
        el.dispatchEvent(new CustomEvent('os-dragstart', { bubbles: true }))
      } else {
        // Forward modifier keys (shift-click = open in the real browser).
        el.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            ctrlKey: e.ctrlKey,
          }),
        )
      }
    }
    const up = () => {
      if (posRef.current.screen) clickUp()
      dragRef.current = null
    }

    moveFnRef.current = move
    // Coalesce pointermove (fires up to ~120Hz on gaming mice) to one
    // raycast + DOM hit-test per FRAME — the eye can't see more anyway.
    let pendingMove = null
    const onMove = (e) => {
      if (!pendingMove) {
        requestAnimationFrame(() => {
          const ev = pendingMove
          pendingMove = null
          if (ev) move(ev)
        })
      }
      pendingMove = e
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', onMove)
      pendingMove = null
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.classList.remove('on-glass')
    }
  }, [camera])

  // FP: refresh the centre-aim (the view moves while walking, no pointermove
  // needed) and flare the crosshair over interactives. Throttled to every
  // 3rd frame — the full aim path does DOM hit-testing, too hot for 60Hz.
  const aimTick = useRef(0)
  useFrame(() => {
    if (!fpRef.current) return
    if (aimTick.current++ % 3 !== 0) return
    moveFnRef.current?.({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })
    const r = aimRay.current
    r.rc.setFromCamera(r.v.set(0, 0), camera)
    // ONE raycast against every interactive (nearest hit wins) instead of
    // four sequential passes.
    const sws = (switchesArrRef.current?.current || []).filter(Boolean)
    const drs = (doorRefsRef.current?.current || []).filter(Boolean)
    const targets = [...sws, ...drs]
    if (eraserRef.current) targets.push(eraserRef.current)
    if (tvRef.current) targets.push(tvRef.current)
    if (phoneMeshRef.current) targets.push(phoneMeshRef.current)
    if (floppyRef.current) targets.push(floppyRef.current)
    // recursive so the floppy group's child meshes (drive + disk) register
    const inter = targets.length ? r.rc.intersectObjects(targets, true)[0] : null
    const hit = inter?.object || null
    const dist = inter?.distance ?? Infinity
    // is the hit the floppy unit (any descendant of its group)?
    let anc = hit
    while (anc && anc !== floppyRef.current) anc = anc.parent
    const isFloppy = !!anc && !!floppyRef.current
    let label = ''
    if (hit) {
      if (isFloppy && dist <= RANGE.floppy)
        label = floppyInRef.current ? 'eject the floppy' : 'insert the floppy'
      else if (hit === eraserRef.current && dist <= RANGE.eraser) label = 'wipe the whiteboard'
      else if (hit === tvRef.current && dist <= RANGE.tv)
        label = tvPropRef.current ? 'turn the TV off' : 'turn the TV on'
      else if (hit === phoneMeshRef.current && dist <= RANGE.phone) label = 'pick up the phone'
      else if (drs.includes(hit)) {
        if (dist <= RANGE.door) {
          const di = Math.floor(doorRefsRef.current.current.indexOf(hit) / 2)
          label = doorsRef.current[di] ? 'close the garage door' : 'open the garage door'
        }
      } else if (sws.includes(hit) && dist <= RANGE.switch) label = 'flip the lights'
    }
    document.documentElement.classList.toggle('aim-hit', !!label)
    const el = document.getElementById('aim-label')
    if (el) {
      el.textContent = label
      el.classList.toggle('show', !!label)
    }
  })

  // Portal target: the R3F container (canvas parent) — NOT the default, which
  // is ScrollControls' scrolling element (screens would scroll away with the
  // page). occlude="blending" lifts the CANVAS to a huge positive z-index and
  // slots the UI just beneath it: 3D objects in front cover the UI per-pixel
  // through the transparent canvas. (DOM overlays in index.css sit above the
  // canvas via z-index — keep default zIndexRange, negative values break it.)
  const portal = useRef(gl.domElement.parentNode)
  portal.current = gl.domElement.parentNode

  const common = {
    transform: true,
    occlude: 'blending',
    portal,
    style: { pointerEvents: 'none' },
  }

  // Monitor hardware. The "glass" is invisible but WRITES DEPTH: it punches
  // the see-through hole for the UI behind the canvas, blocks the wall behind,
  // and is the raycast surface for the cursor.
  const hardware = (m, glassRef) => (
    <group position={[m.x, 0, m.z]} rotation-y={m.rotY}>
      <mesh position={[0, 0.82, -0.035]} castShadow>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial color="#1a1a1f" />
      </mesh>
      <mesh position={[0, m.y, -0.035]} castShadow>
        <boxGeometry args={[m.w + 0.05, m.h + 0.05, 0.05]} />
        <meshStandardMaterial color="#15151a" />
      </mesh>
      <mesh ref={glassRef} position={[0, m.y, 0]}>
        <planeGeometry args={[m.w, m.h]} />
        <meshStandardMaterial colorWrite={false} />
      </mesh>
    </group>
  )

  return (
    <>
      {hardware(MONITORS.primary, glassA)}
      {hardware(MONITORS.secondary, glassB)}
      <Floppy driveRef={floppyRef} inserted={floppyIn} />
      <Whiteboard portal={portal} eraserRef={eraserRef} />
      {/* The cast-remote phone on the couch armrest — always-on lock screen
          (live clock). Hidden while "held" (the DOM overlay is up) so it
          really feels picked up. */}
      {!phoneHeld && (
      <group position={[CAVE.couch.x - 0.85, 0.69, CAVE.couch.z]} rotation-y={-0.5}>
        <mesh ref={phoneMeshRef}>
          <boxGeometry args={[0.075, 0.014, 0.15]} />
          <meshStandardMaterial color="#101014" />
        </mesh>
        <group position={[0, 0.008, 0]} rotation-x={-Math.PI / 2}>
          <mesh>
            <planeGeometry args={[0.062, 0.135]} />
            {/* the live lock screen only exists while exploring — from the
                desk it's a 6cm glow, not worth an Html surface */}
            {mode === 'explore' ? (
              <meshStandardMaterial key="punch" colorWrite={false} />
            ) : (
              <meshStandardMaterial key="glow" color="#0c1420" emissive="#2a6a8a" emissiveIntensity={1.1} />
            )}
          </mesh>
          {mode === 'explore' && (
            <Html {...common} distanceFactor={(400 * 0.062) / 62} position={[0, 0, 0.002]}>
              <div className="phone-lock">
                <LockClock />
                <em>tap to pick up 📺</em>
              </div>
            </Html>
          )}
        </group>
      </group>
      )}
      {/* Man-cave TV screen. Off: dark glow. On: depth-punched glass with a
          live lofi stream (YouTube allows embedding) — muted, ambience only.
          The plane is also the click/aim target for the power toggle. */}
      <group position={[CAVE.couch.x, 1.55, -2.935]}>
        <mesh ref={tvRef}>
          <planeGeometry args={[2.1, 1.18]} />
          {tv ? (
            <meshStandardMaterial key="on" colorWrite={false} />
          ) : (
            <meshStandardMaterial key="off" color="#0a1420" emissive="#1e3a5a" emissiveIntensity={0.7} />
          )}
        </mesh>
        {tv && (
          /* distanceFactor keeps the 2.1m plane size while the DOM renders at
             720p — the YT API swaps the inner div for its <iframe>. */
          <Html {...common} distanceFactor={(400 * 2.1) / TV_PX.w} position={[0, 0, 0.004]}>
            <div className="cave-tv">
              <div ref={tvHostRef} />
            </div>
          </Html>
        )}
      </group>
      {/* Post-it stuck on the primary monitor's bezel corner — teaches the
          lean-in controls. Needs its own depth-punch plane (blending mode). */}
      <group
        position={[MONITORS.primary.x, 0, MONITORS.primary.z]}
        rotation-y={MONITORS.primary.rotY}
      >
        <mesh position={[0.31, 0.9, 0.012]} ref={(el) => (postitRefs.current[0] = el)}>
          <planeGeometry args={[0.085, 0.085]} />
          {/* away from the desk the DOM is unreadable anyway — a coloured
              square is free, a transformed Html surface is not */}
          {mode === 'desk' ? (
            <meshStandardMaterial key="punch" colorWrite={false} />
          ) : (
            <meshStandardMaterial key="paper" color="#f7e96b" />
          )}
        </mesh>
        {mode === 'desk' && (
        <Html
          transform
          occlude="blending"
          portal={portal}
          distanceFactor={(400 * 0.078) / 120}
          position={[0.31, 0.9, 0.014]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="postit">
            <b>lean in:</b>
            <br />
            {IS_TOUCH ? 'double-tap a screen' : 'dbl-click a screen'}
            <br />
            {IS_TOUCH ? 'scroll down/up' : 'or press 1 / 2'}
            <br />
            {IS_TOUCH ? 'double-tap → back' : '3 → sit back'}
          </div>
        </Html>
        )}
      </group>
      {/* second post-it: the browser click convention */}
      <group
        position={[MONITORS.primary.x, 0, MONITORS.primary.z]}
        rotation-y={MONITORS.primary.rotY}
      >
        <mesh position={[-0.31, 0.9, 0.012]} ref={(el) => (postitRefs.current[1] = el)}>
          <planeGeometry args={[0.085, 0.085]} />
          {mode === 'desk' ? (
            <meshStandardMaterial key="punch" colorWrite={false} />
          ) : (
            <meshStandardMaterial key="paper" color="#b8e6f7" />
          )}
        </mesh>
        {mode === 'desk' && (
        <Html
          transform
          occlude="blending"
          portal={portal}
          distanceFactor={(400 * 0.078) / 120}
          position={[-0.31, 0.9, 0.014]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="postit postit-alt">
            <b>netscape:</b>
            <br />
            links open in HERE
            <br />
            ⇧shift + click
            <br />
            → your real browser
          </div>
        </Html>
        )}
      </group>
      {/* third post-it: the phone passcode, stuck on the SECOND monitor —
          world-class security practice */}
      <group
        position={[MONITORS.secondary.x, 0, MONITORS.secondary.z]}
        rotation-y={MONITORS.secondary.rotY}
      >
        <mesh position={[0.28, 0.9, 0.012]} ref={(el) => (postitRefs.current[2] = el)}>
          <planeGeometry args={[0.085, 0.085]} />
          {mode === 'desk' ? (
            <meshStandardMaterial key="punch" colorWrite={false} />
          ) : (
            <meshStandardMaterial key="paper" color="#ffb3c8" />
          )}
        </mesh>
        {mode === 'desk' && (
        <Html
          transform
          occlude="blending"
          portal={portal}
          distanceFactor={(400 * 0.078) / 120}
          position={[0.28, 0.9, 0.014]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="postit postit-code">
            <b>DON'T FORGET</b>
            <br />
            phone code:
            <br />
            <b>1 2 3 4</b>
            <br />
            (don't tell anyone)
          </div>
        </Html>
        )}
      </group>
      <group
        position={[MONITORS.primary.x, MONITORS.primary.y, MONITORS.primary.z + 0.004]}
        rotation-y={MONITORS.primary.rotY}
      >
        <Html {...common} distanceFactor={df(MONITORS.primary)}>
          <div style={{ position: 'relative' }}>
            <ComputerOS
              mon={MONITORS.primary}
              screenRef={screenA}
              focusedWin={mode === 'desk' && focused.startsWith('win:') ? focused.slice(4) : null}
              onFocus={setFocused}
            />
            {floppyIn && <GameScreen mon={MONITORS.primary} />}
            <WinCursor refEl={curA} mon={MONITORS.primary} />
          </div>
        </Html>
      </group>
      <group
        position={[MONITORS.secondary.x, MONITORS.secondary.y, MONITORS.secondary.z + 0.004]}
        rotation-y={MONITORS.secondary.rotY}
      >
        <Html {...common} distanceFactor={df(MONITORS.secondary)}>
          <div style={{ position: 'relative' }} ref={screenB}>
            <TerminalScreen
              mon={MONITORS.secondary}
              active={mode === 'desk' && focused === 'terminal'}
              focused={focused === 'terminal'}
              onFocusClick={() => setFocused('terminal')}
            />
            {/* cursor as sibling of the screen so the unfocused brightness
                filter doesn't dim it */}
            <WinCursor refEl={curB} mon={MONITORS.secondary} />
          </div>
        </Html>
      </group>
    </>
  )
}
