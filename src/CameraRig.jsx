import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { MONITORS } from './layout'

// Scroll drives a descending anti-clockwise spiral: the camera starts high and
// far, sweeps a gentle 60° arc down and inward, and lands seated at the desk
// looking across both monitors. The screens render themselves (Monitors.jsx).
const PIVOT_Z = MONITORS.primary.z // spiral centres on the desk/monitors

// Spiral endpoints (u = 0 at start, u = 1 seated). Metres.
const R_START = 6.5 // orbit radius, far
const R_END = 1.15 // seated ~1.1m back so both screens frame up
const Y_START = 4.0 // high establishing shot
const Y_END = 1.15 // seated eye height
const THETA_START = Math.PI / 3 // a gentle 60° arc swinging in…
const THETA_END = 0 // …ending directly in front of the desk (+z)

// Look target eases from a wide room framing to between the two screens.
const LOOK_START = [0.8, 0.9, -0.8]
const LOOK_END = [0.06, 1.13, -2.8]

// Where the camera ends up when fully seated.
const SEAT_POS = new THREE.Vector3(0, Y_END, PIVOT_Z + R_END)

const smoothstep = (x) => x * x * (3 - 2 * x)
const lerp = THREE.MathUtils.lerp

const tmpPos = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

export default function CameraRig({ hintRef, onSeated }) {
  const scroll = useScroll()
  const { camera } = useThree()
  const smoothLook = useRef(new THREE.Vector3(...LOOK_START))
  const wasSeated = useRef(false)

  // Priority -1: move the camera BEFORE drei <Html> computes its CSS matrix,
  // and refresh matrixWorldInverse ourselves (the renderer only does it at
  // render time) — otherwise the on-glass screens lag a frame and "swim".
  useFrame((_, delta) => {
    const t = THREE.MathUtils.clamp(scroll.offset, 0, 1)
    const u = smoothstep(t) // ease in/out along the spiral

    const theta = lerp(THETA_START, THETA_END, u)
    const r = lerp(R_START, R_END, u)
    const y = lerp(Y_START, Y_END, u)
    const x = Math.sin(theta) * r
    const z = PIVOT_Z + Math.cos(theta) * r

    const lookX = lerp(LOOK_START[0], LOOK_END[0], u)
    const lookY = lerp(LOOK_START[1], LOOK_END[1], u)
    const lookZ = lerp(LOOK_START[2], LOOK_END[2], u)

    // Frame-rate-independent smoothing so the spiral feels fluid, not snappy.
    const a = 1 - Math.pow(0.0018, delta)
    camera.position.lerp(tmpPos.set(x, y, z), a)
    smoothLook.current.lerp(tmpLook.set(lookX, lookY, lookZ), a)
    camera.lookAt(smoothLook.current)
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()

    // Fade the scroll hint out as soon as the spiral begins.
    if (hintRef.current) {
      hintRef.current.style.opacity = THREE.MathUtils.clamp(1 - t / 0.15, 0, 1)
    }

    // Seated = scroll at the end AND the (smoothed) camera actually settled,
    // so the "step away" button can't appear mid-glide.
    const seated = t > 0.92 && camera.position.distanceTo(SEAT_POS) < 0.25
    if (seated !== wasSeated.current) {
      wasSeated.current = seated
      onSeated?.(seated)
    }
  }, -1)

  return null
}
