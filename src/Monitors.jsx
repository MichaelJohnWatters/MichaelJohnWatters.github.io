import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { MONITORS } from './layout'
import ComputerOS from './ComputerOS'
import { respond, CLEAR } from './claudeTerm'
import { downloadCV } from './content'
import { clickDown, clickUp, keyClack } from './sfx'
import { IS_TOUCH } from './touch'

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

export default function Monitors({ mode = 'desk', onZoom, switchesRef, onToggleLights, fp = false }) {
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
  const onToggleLightsRef = useRef(onToggleLights)
  onToggleLightsRef.current = onToggleLights
  // First person: aim from the SCREEN CENTRE (crosshair), not the mouse.
  const fpRef = useRef(fp)
  fpRef.current = fp

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

      // Wall light switches are clickable in ANY mode (centre-aimed in FP).
      const sws = (switchesArrRef.current?.current || []).filter(Boolean)
      if (sws.length) {
        const cx = fpRef.current ? window.innerWidth / 2 : e.clientX
        const cy = fpRef.current ? window.innerHeight / 2 : e.clientY
        ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        if (raycaster.intersectObjects(sws, false).length) {
          onToggleLightsRef.current?.()
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

  // FP: refresh the centre-aim every frame (the view moves while walking,
  // no pointermove needed) and flare the crosshair over interactives.
  useFrame(() => {
    if (!fpRef.current) return
    moveFnRef.current?.({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })
    const sws = (switchesArrRef.current?.current || []).filter(Boolean)
    let hit = false
    if (sws.length) {
      const r = aimRay.current
      r.rc.setFromCamera(r.v.set(0, 0), camera)
      hit = r.rc.intersectObjects(sws, false).length > 0
    }
    document.documentElement.classList.toggle('aim-hit', hit)
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
      {/* Post-it stuck on the primary monitor's bezel corner — teaches the
          lean-in controls. Needs its own depth-punch plane (blending mode). */}
      <group
        position={[MONITORS.primary.x, 0, MONITORS.primary.z]}
        rotation-y={MONITORS.primary.rotY}
      >
        <mesh position={[0.31, 0.9, 0.012]}>
          <planeGeometry args={[0.085, 0.085]} />
          <meshStandardMaterial colorWrite={false} />
        </mesh>
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
              focusedWin={focused.startsWith('win:') ? focused.slice(4) : null}
              onFocus={setFocused}
            />
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
