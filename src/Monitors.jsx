import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Html, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { MONITORS } from './layout'
import ComputerOS from './ComputerOS'
import { respond, CLEAR } from './claudeTerm'
import { clickDown, clickUp } from './sfx'

// Both monitors render their UI onto the glass permanently via drei
// <Html transform occlude="blending">. One shared retro cursor travels between
// the displays; clicks are bridged from a camera raycast to real DOM clicks;
// keyboard input routes to whichever surface has FOCUS.

// drei transform mode: world width = px * distanceFactor / 400.
const df = (m) => (400 * m.w) / m.pxW

// Hit-test [data-click] elements in FRAMEBUFFER (layout) coordinates.
// offsetLeft/Top are layout values — unaffected by the CSS 3D transform — so
// this is exact regardless of screen angle. Last match wins (= topmost).
function hitTest(root, x, y) {
  if (!root) return null
  let best = null
  for (const el of root.querySelectorAll('[data-click]')) {
    let ox = 0
    let oy = 0
    let n = el
    while (n && n !== root) {
      ox += n.offsetLeft
      oy += n.offsetTop
      n = n.offsetParent
    }
    if (x >= ox && x <= ox + el.offsetWidth && y >= oy && y <= oy + el.offsetHeight) best = el
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

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        const q = inputRef.current.trim()
        inputRef.current = ''
        setInput('')
        if (!q) return
        const r = respond(q)
        setHistory((h) =>
          r === CLEAR
            ? []
            : [...h, { who: 'user', text: q }, ...r.map((t) => ({ who: 'claude', text: t }))].slice(-40),
        )
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
      setTab('claude') // typing always lands in the claude tab
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <div
      className={`os-screen term${focused ? '' : ' term-unfocused'}`}
      style={{ width: mon.pxW, height: mon.pxH }}
      data-click
      onClick={onFocusClick}
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
            {input}
            <span className="term-caret">▊</span>
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

export default function Monitors({ mode = 'desk' }) {
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
  const [focused, setFocused] = useState('terminal')

  // Cursor + click bridge via OUR OWN raycast (R3F mesh events silently die in
  // the ScrollControls + blending-occlusion setup): window pointermove → ray →
  // UV on the glass → framebuffer px. Clicks hit-test [data-click] elements in
  // layout coords and fire el.click(), so the OS uses normal React handlers.
  const posRef = useRef({ screen: null, x: 0, y: 0 })
  const hoverRef = useRef(null)

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
      const x = uv.x * mon.pxW
      const y = (1 - uv.y) * mon.pxH
      posRef.current = { screen: which, x, y }
      if (cur) {
        cur.style.transform = `translate(${x}px, ${y}px)`
        cur.style.opacity = '1'
      }
      if (other) other.style.opacity = '0'
      setHover(hitTest(root, x, y))
      document.documentElement.classList.add('on-glass')
    }

    const move = (e) => {
      if (!glassA.current || !glassB.current) return
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
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

    const down = () => {
      const p = posRef.current
      if (!p.screen) return
      clickDown()
      const root = p.screen === 'A' ? screenA.current : screenB.current
      hitTest(root, p.x, p.y)?.click()
    }
    const up = () => {
      if (posRef.current.screen) clickUp()
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.classList.remove('on-glass')
    }
  }, [camera])

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
      <group
        position={[MONITORS.primary.x, MONITORS.primary.y, MONITORS.primary.z + 0.004]}
        rotation-y={MONITORS.primary.rotY}
      >
        <Html {...common} distanceFactor={df(MONITORS.primary)}>
          <ComputerOS
            mon={MONITORS.primary}
            cursorRef={curA}
            screenRef={screenA}
            focusedWin={focused.startsWith('win:') ? focused.slice(4) : null}
            onFocus={setFocused}
          />
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
          </div>
        </Html>
      </group>
    </>
  )
}
