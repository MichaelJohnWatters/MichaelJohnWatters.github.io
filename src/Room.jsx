import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { CIVIC_POS, MX5_POS } from './layout'
import Monitors from './Monitors'

// Low-poly GARAGE blockout — ALL DIMENSIONS IN METRES (1 unit = 1m).
//   Garage shell: 9 x 7.5m, 2.8m ceiling (typical double garage)
//   Desk: 1.5 x 0.75m, 0.74m high · Monitor: 27" (0.62 x 0.37m screen)
//   Complete car = Honda Civic FN4: 4.27 x 1.77 x 1.45, wheelbase 2.64
//   Project car = Mazda MX-5 NA: 3.97 x 1.68 x 1.23, ~0.58m wheels
// Monitor screen centre: [0, 1.1, -2.815], facing +z (keep CameraRig in sync).

// Fades its children with the scroll dive (0.55->0.8) so chair + seated figure
// vanish as "you" take the seat. In explore mode the scroll offset is frozen,
// so `exploreTarget` overrides: chair reappears (1), the guy stays gone (0).
// Materials are collected once; per-frame work is a single lerp + early-out.
function FadeAway({ from = 0.55, to = 0.8, mode, exploreTarget = 1, children }) {
  const ref = useRef()
  const scroll = useScroll()
  const mats = useRef([])
  const last = useRef(-1)

  useEffect(() => {
    const list = []
    ref.current.traverse((c) => c.material && list.push(c.material))
    mats.current = list
  }, [])

  useFrame((_, delta) => {
    const target =
      mode === 'explore'
        ? exploreTarget
        : THREE.MathUtils.clamp(1 - (scroll.offset - from) / (to - from), 0, 1)
    // Ease toward the target so mode switches don't pop — and SNAP once close,
    // or the exponential approach never actually reaches 0/1.
    let o =
      last.current < 0
        ? target
        : THREE.MathUtils.lerp(last.current, target, 1 - Math.pow(0.001, delta))
    if (Math.abs(o - target) < 0.005) o = target
    if (o === last.current) return
    last.current = o
    for (const m of mats.current) {
      m.transparent = o < 1
      m.opacity = o
    }
    ref.current.visible = o > 0.001
  })
  return <group ref={ref}>{children}</group>
}

function Wheel({ position, radius = 0.3, width = 0.2 }) {
  return (
    <mesh position={position} rotation-x={Math.PI / 2} castShadow>
      <cylinderGeometry args={[radius, radius, width, 20]} />
      <meshStandardMaterial color="#1b1b1f" />
    </mesh>
  )
}

// Honda Civic FN4 proportions: 4.27 x 1.77 x 1.45, wheelbase 2.64.
// Length along x, nose towards the roller door (+z is its width axis).
function CompleteCar({ position = [0, 0, 0], color = '#2f6fb0' }) {
  return (
    <group position={position}>
      {/* lower body: 0.15 clearance, up to ~0.78 */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[4.27, 0.62, 1.77]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* greenhouse / cabin, swept back */}
      <mesh position={[-0.35, 1.08, 0]} castShadow>
        <boxGeometry args={[2.1, 0.68, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* windscreen hint */}
      <mesh position={[0.85, 1.05, 0]} rotation-z={0.55}>
        <boxGeometry args={[0.05, 0.62, 1.55]} />
        <meshStandardMaterial color="#1a2733" />
      </mesh>
      {/* wheels: wheelbase 2.64 (x ±1.32), track ~1.5 (z ±0.75) */}
      <Wheel position={[1.32, 0.3, 0.75]} />
      <Wheel position={[1.32, 0.3, -0.75]} />
      <Wheel position={[-1.32, 0.3, 0.75]} />
      <Wheel position={[-1.32, 0.3, -0.75]} />
    </group>
  )
}

// MX-5 NA in pieces: tub on stands, engine out, panels + wheels scattered.
// NA wheels: 185/60R14 -> ~0.29 radius, 0.185 wide.
function Mx5InPieces({ position = [0, 0, 0], color = '#c0392b' }) {
  const wheel = { radius: 0.29, width: 0.185 }
  return (
    <group position={position}>
      {/* bare chassis tub (3.6 x 1.5 without panels), on jack stands */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[3.6, 0.35, 1.5]} />
        <meshStandardMaterial color="#4a4a52" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* jack stands (0.45 high) */}
      {[[1.1, 0.6], [1.1, -0.6], [-1.1, 0.6], [-1.1, -0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.225, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.14, 0.45, 6]} />
          <meshStandardMaterial color="#d68a1e" />
        </mesh>
      ))}
      {/* 1.6 B6 engine block on the floor by the nose */}
      <mesh position={[2.4, 0.28, 0.5]} castShadow>
        <boxGeometry args={[0.6, 0.55, 0.5]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* doors (~1.1 x 0.8) leaning against the wall */}
      <mesh position={[0.4, 0.5, 1.35]} rotation-z={0.08} rotation-x={0.28}>
        <boxGeometry args={[1.1, 0.8, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.9, 0.5, 1.35]} rotation-z={-0.05} rotation-x={0.28}>
        <boxGeometry args={[1.1, 0.8, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* bonnet (~1.3 x 1.2) flat on the floor */}
      <mesh position={[-2.4, 0.03, 0.2]} rotation-x={-Math.PI / 2}>
        <boxGeometry args={[1.3, 1.2, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* four wheels FLAT on the floor, stacked in two piles (cylinder axis
          vertical = laid flat; y = half-width, then + one width) */}
      {[
        [-2.5, 0.0925, -0.9],
        [-2.5, 0.2775, -0.9],
        [-1.9, 0.0925, -1.1],
        [-1.9, 0.2775, -1.1],
      ].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <cylinderGeometry args={[wheel.radius, wheel.radius, wheel.width, 20]} />
          <meshStandardMaterial color="#1b1b1f" />
        </mesh>
      ))}
    </group>
  )
}

// A ~1.75m guy sitting at the desk (seat 0.45), tapping at the keyboard.
function Person() {
  const handL = useRef()
  const handR = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (handL.current) handL.current.position.y = 0.77 + Math.sin(t * 12) * 0.015
    if (handR.current) handR.current.position.y = 0.77 + Math.sin(t * 12 + 1.6) * 0.015
  })
  const skin = '#d9a066'
  const shirt = '#3f5b8c'
  const pants = '#2a2a30'
  return (
    <group>
      {/* hips on the seat */}
      <mesh position={[0, 0.55, -1.8]}>
        <boxGeometry args={[0.36, 0.18, 0.3]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      {/* torso leaning slightly to the desk */}
      <mesh position={[0, 0.88, -1.85]} rotation-x={-0.15}>
        <boxGeometry args={[0.4, 0.52, 0.24]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {/* head (~1.25 seated) */}
      <mesh position={[0, 1.26, -1.88]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* upper arms angling down to the keyboard */}
      <mesh position={[0.22, 0.88, -2.1]} rotation-x={-0.5}>
        <boxGeometry args={[0.08, 0.08, 0.45]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[-0.22, 0.88, -2.1]} rotation-x={-0.5}>
        <boxGeometry args={[0.08, 0.08, 0.45]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {/* hands on the keyboard (bob while typing) */}
      <mesh ref={handR} position={[0.15, 0.77, -2.33]}>
        <boxGeometry args={[0.1, 0.05, 0.12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh ref={handL} position={[-0.15, 0.77, -2.33]}>
        <boxGeometry args={[0.1, 0.05, 0.12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* thighs forward to the desk, shins down */}
      <mesh position={[0.1, 0.5, -2.0]}>
        <boxGeometry args={[0.14, 0.13, 0.45]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[-0.1, 0.5, -2.0]}>
        <boxGeometry args={[0.14, 0.13, 0.45]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[0.1, 0.24, -2.15]}>
        <boxGeometry args={[0.12, 0.45, 0.12]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[-0.1, 0.24, -2.15]}>
        <boxGeometry args={[0.12, 0.45, 0.12]} />
        <meshStandardMaterial color={pants} />
      </mesh>
    </group>
  )
}

export default function Room({ mode = 'desk', onZoom }) {
  return (
    <group>
      {/* --- Garage shell: 9 x 7.5m, 2.8m ceiling. Floor z -3..4.5, x -4.5..4.5 --- */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0.75]} receiveShadow>
        <planeGeometry args={[9, 7.5]} />
        <meshStandardMaterial color="#5a5a60" />
      </mesh>
      {/* back wall */}
      <mesh position={[0, 1.4, -3]}>
        <planeGeometry args={[9, 2.8]} />
        <meshStandardMaterial color="#6a6a72" />
      </mesh>
      {/* left wall */}
      <mesh position={[-4.5, 1.4, 0.75]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[7.5, 2.8]} />
        <meshStandardMaterial color="#5f5f68" />
      </mesh>
      {/* right wall */}
      <mesh position={[4.5, 1.4, 0.75]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[7.5, 2.8]} />
        <meshStandardMaterial color="#5f5f68" />
      </mesh>
      {/* front wall, with the roller door over the car bays */}
      <mesh position={[0, 1.4, 4.5]} rotation-y={Math.PI}>
        <planeGeometry args={[9, 2.8]} />
        <meshStandardMaterial color="#5f5f68" />
      </mesh>
      {/* roller door: 4.8 x 2.2, centred over the bays */}
      <mesh position={[1.4, 1.1, 4.44]}>
        <boxGeometry args={[4.8, 2.2, 0.08]} />
        <meshStandardMaterial color="#8a8f96" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* door slat grooves */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((yOff, i) => (
        <mesh key={i} position={[1.4, 1.1 + yOff, 4.39]}>
          <boxGeometry args={[4.7, 0.04, 0.02]} />
          <meshStandardMaterial color="#5b5f65" />
        </mesh>
      ))}

      {/* Ceiling strip lights — SWITCHED OFF for the night-garage look.
          One long fixture runs lengthwise between the car bays (kept out of
          the camera's spiral flight path); a short one hangs over the desk. */}
      <mesh position={[1.4, 2.76, 1.65]}>
        <boxGeometry args={[0.3, 0.08, 2.4]} />
        <meshStandardMaterial emissive="#3a3a34" emissiveIntensity={0.15} color="#2a2a28" />
      </mesh>
      <mesh position={[0, 2.76, -2.2]}>
        <boxGeometry args={[2.4, 0.08, 0.3]} />
        <meshStandardMaterial emissive="#3a3a34" emissiveIntensity={0.15} color="#2a2a28" />
      </mesh>

      {/* --- Office corner: 1.8 x 0.75m desk (dual-monitor), against the back wall --- */}
      <mesh position={[0, 0.72, -2.6]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.04, 0.75]} />
        <meshStandardMaterial color="#7a5b43" />
      </mesh>
      {[[-0.85, -2.3], [0.85, -2.3], [-0.85, -2.9], [0.85, -2.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#5f4633" />
        </mesh>
      ))}
      {/* Dual monitors: hardware + always-on screens live in Monitors.jsx */}
      <Monitors mode={mode} onZoom={onZoom} />
      {/* keyboard */}
      <mesh position={[0, 0.75, -2.35]} castShadow>
        <boxGeometry args={[0.45, 0.03, 0.15]} />
        <meshStandardMaterial color="#20202a" />
      </mesh>
      {/* mug + plant — keep clutter OUT of the seated sightline to the
          screens: the screen UI is DOM composited over the canvas, so 3D
          objects can never draw in front of it. */}
      <mesh position={[0.45, 0.79, -2.5]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.1, 12]} />
        <meshStandardMaterial color="#c04a3a" />
      </mesh>
      <mesh position={[-0.82, 0.78, -2.55]} castShadow>
        <cylinderGeometry args={[0.06, 0.045, 0.12, 8]} />
        <meshStandardMaterial color="#8a6a4a" />
      </mesh>
      <mesh position={[-0.82, 0.92, -2.55]}>
        <icosahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color="#4a8a5a" flatShading />
      </mesh>

      {/* --- Two car bays (to the right, noses to the roller door) --- */}
      <CompleteCar position={CIVIC_POS} />
      <Mx5InPieces position={MX5_POS} />

      {/* Chair — fades with the dive, but REAPPEARS in explore mode (you got
          up). No castShadow: shadow maps ignore opacity, so a fading chair
          would leave a crisp shadow that pops off at the end. */}
      <FadeAway mode={mode} exploreTarget={1}>
        <mesh position={[0, 0.45, -1.85]}>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
          <meshStandardMaterial color="#404052" />
        </mesh>
        <mesh position={[0, 0.78, -1.62]}>
          <boxGeometry args={[0.5, 0.6, 0.06]} />
          <meshStandardMaterial color="#404052" />
        </mesh>
      </FadeAway>
      {/* The typing figure — gone once you take the seat AND while exploring (he's you) */}
      <FadeAway mode={mode} exploreTarget={0}>
        <Person />
      </FadeAway>
    </group>
  )
}
