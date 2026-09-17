import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Html, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { MONITORS } from './layout'
import ComputerOS from './ComputerOS'
import { respond, CLEAR } from './claudeTerm'
import { clickDown, clickUp } from './sfx'

// Both monitors render their UI onto the glass permanently — from any angle,
// in any mode — via drei <Html transform occlude> (true 3D perspective).
// One shared mouse cursor travels between the two displays like a real
// dual-monitor rig: whichever screen the real pointer is over owns the cursor.

// drei transform mode: world width = px * distanceFactor / 400.
const df = (m) => (400 * m.w) / m.pxW

// A REAL (scripted) terminal: type when seated, Enter to send, `clear` wipes.
// Responses come from the local pattern-matcher in claudeTerm.js.
function TerminalScreen({ mon, active }) {
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
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <div className="os-screen term" style={{ width: mon.pxW, height: mon.pxH }}>
      {/* terminal tabs — claude is the active one */}
      <div className="term-tabs">
        <span className="term-tab">status.sh</span>
        <span className="term-tab active">✻ claude</span>
        <span className="term-tab-fill" />
      </div>
      <div className="term-body claude">
        <div className="term-line">
          <span className="claude-logo">✻</span> <b>Claude Code</b> <span className="term-dim">· michael@garage</span>
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
    </div>
  )
}

export default function Monitors({ mode = 'desk' }) {
  const screenB = useRef()
  const curA = useRef()
  const curB = useRef()
  const scrollState = useScroll()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const glassA = useRef()
  const glassB = useRef()

  // Cursor routing via OUR OWN raycast (R3F mesh events silently die in the
  // ScrollControls + blending-occlusion setup): window pointermove → ray from
  // the camera → UV hit on the glass → framebuffer px. Perspective-correct at
  // any angle. While over a screen the NATIVE cursor hides via cursor:none.
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const route = (cur, other, mon, uv) => {
      if (!cur) return
      cur.style.transform = `translate(${uv.x * mon.pxW}px, ${(1 - uv.y) * mon.pxH}px)`
      cur.style.opacity = '1'
      if (other) other.style.opacity = '0'
      // Root class + !important CSS: the native cursor is hidden no matter
      // which DOM element sits under the pointer.
      document.documentElement.classList.add('on-glass')
    }
    const move = (e) => {
      if (!glassA.current || !glassB.current) return
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects([glassA.current, glassB.current], false)[0]
      if (hit && hit.uv) {
        if (hit.object === glassA.current) route(curA.current, curB.current, MONITORS.primary, hit.uv)
        else route(curB.current, curA.current, MONITORS.secondary, hit.uv)
      } else {
        if (curA.current) curA.current.style.opacity = '0'
        if (curB.current) curB.current.style.opacity = '0'
        document.documentElement.classList.remove('on-glass')
      }
    }
    // Mouse-click sounds while the pointer is on a screen.
    const down = () => {
      if (document.documentElement.classList.contains('on-glass')) clickDown()
    }
    const up = () => {
      if (document.documentElement.classList.contains('on-glass')) clickUp()
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
  }, [camera, scrollState])

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
          <ComputerOS mon={MONITORS.primary} cursorRef={curA} />
        </Html>
      </group>
      <group
        position={[MONITORS.secondary.x, MONITORS.secondary.y, MONITORS.secondary.z + 0.004]}
        rotation-y={MONITORS.secondary.rotY}
      >
        <Html {...common} distanceFactor={df(MONITORS.secondary)}>
          <div style={{ position: 'relative' }} ref={screenB}>
            <TerminalScreen mon={MONITORS.secondary} active={mode === 'desk'} />
            <svg className="os-cursor" ref={curB} width="18" height="24" viewBox="0 0 18 24">
              <path
                d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z"
                fill="#f5f5f5"
                stroke="#111"
                strokeWidth="1.2"
              />
            </svg>
          </div>
        </Html>
      </group>
    </>
  )
}
