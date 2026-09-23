import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { GARAGE, DOORS, LIFT, CIVIC, BIKES, CAVE, SWITCHES } from './layout'
import Monitors from './Monitors'

// Low-poly MAN-CAVE WORKSHOP blockout — ALL DIMENSIONS IN METRES.
//   Shell: 13 x 10m, 4m ceiling · two roller doors, one per bay
//   Lift bay: MX-5 NA tub raised on a two-post lift, parts below
//   Parking bay: Civic FN4 nose-in toward its door
//   Dressing: workbench, shelving, two motorbikes, couch + TV + fridge + neon
// Desk corner (monitors/seat) unchanged — camera tuning depends on it.

// Fades its children with the scroll dive (0.55->0.8) so chair + seated figure
// vanish as "you" take the seat. In explore mode the scroll offset is frozen,
// so `exploreTarget` overrides: chair reappears (1), the guy stays gone (0).
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

function Wheel({ position, radius = 0.3, width = 0.2, rotZ = false }) {
  return (
    <mesh
      position={position}
      rotation={rotZ ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, width, 20]} />
      <meshStandardMaterial color="#1b1b1f" />
    </mesh>
  )
}

// Honda Civic FN4: 4.27 x 1.77 x 1.45, wheelbase 2.64. Built along x,
// rotated by the caller so its nose points at the roller door (+z).
function CompleteCar({ position = [0, 0, 0], rotY = 0, color = '#2f6fb0' }) {
  return (
    <group position={position} rotation-y={rotY}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[4.27, 0.62, 1.77]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.35, 1.08, 0]} castShadow>
        <boxGeometry args={[2.1, 0.68, 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.85, 1.05, 0]} rotation-z={0.55}>
        <boxGeometry args={[0.05, 0.62, 1.55]} />
        <meshStandardMaterial color="#1a2733" />
      </mesh>
      <Wheel position={[1.32, 0.3, 0.75]} />
      <Wheel position={[1.32, 0.3, -0.75]} />
      <Wheel position={[-1.32, 0.3, 0.75]} />
      <Wheel position={[-1.32, 0.3, -0.75]} />
    </group>
  )
}

// Two-post lift with the bare MX-5 NA tub raised on it (car along z).
function LiftedMx5({ color = '#c0392b' }) {
  const postX = 1.25
  return (
    <group position={[LIFT.x, 0, LIFT.z]}>
      {/* posts + feet */}
      {[postX, -postX].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, LIFT.postH / 2, 0]} castShadow>
            <boxGeometry args={[0.35, LIFT.postH, 0.35]} />
            <meshStandardMaterial color="#3f6ea5" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.1, 0.9]} />
            <meshStandardMaterial color="#2e4f77" />
          </mesh>
        </group>
      ))}
      {/* lift arms under the tub */}
      <mesh position={[0, LIFT.deckY - 0.22, 0.55]} castShadow>
        <boxGeometry args={[2.6, 0.1, 0.22]} />
        <meshStandardMaterial color="#2e4f77" />
      </mesh>
      <mesh position={[0, LIFT.deckY - 0.22, -0.55]} castShadow>
        <boxGeometry args={[2.6, 0.1, 0.22]} />
        <meshStandardMaterial color="#2e4f77" />
      </mesh>
      {/* the bare tub, up in the air (walk underneath!) */}
      <mesh position={[0, LIFT.deckY, 0]} castShadow>
        <boxGeometry args={[1.5, 0.35, 3.6]} />
        <meshStandardMaterial color="#4a4a52" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* splash of body colour: rear clip still attached */}
      <mesh position={[0, LIFT.deckY + 0.22, -1.45]} castShadow>
        <boxGeometry args={[1.45, 0.3, 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

// MX-5 parts scattered around the lift bay floor.
function Mx5Parts({ color = '#c0392b' }) {
  const wheel = { radius: 0.29, width: 0.185 }
  return (
    <group>
      {/* engine block */}
      <mesh position={[-0.85, 0.28, 3.7]} castShadow>
        <boxGeometry args={[0.6, 0.55, 0.5]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* flat wheel piles */}
      {[
        [-3.45, 0.0925, 3.9],
        [-3.45, 0.2775, 3.9],
        [-3.0, 0.0925, 4.15],
        [-3.0, 0.2775, 4.15],
      ].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <cylinderGeometry args={[wheel.radius, wheel.radius, wheel.width, 20]} />
          <meshStandardMaterial color="#1b1b1f" />
        </mesh>
      ))}
      {/* bonnet flat on the floor in front of the lift */}
      <mesh position={[-2.2, 0.03, 4.7]} rotation-x={-Math.PI / 2}>
        <boxGeometry args={[1.3, 1.2, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* doors leaning against the left wall */}
      <mesh position={[-6.32, 0.55, 1.4]} rotation={[0, Math.PI / 2, -0.22]}>
        <boxGeometry args={[1.1, 1.0, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-6.32, 0.55, 2.6]} rotation={[0, Math.PI / 2, -0.18]}>
        <boxGeometry args={[1.1, 1.0, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

// Low-poly motorbike (length ~2.1 along z).
function Motorbike({ position, rotY = 0, color = '#b03030' }) {
  return (
    <group position={position} rotation-y={rotY}>
      <Wheel position={[0, 0.3, 0.72]} radius={0.3} width={0.09} rotZ />
      <Wheel position={[0, 0.3, -0.72]} radius={0.3} width={0.09} rotZ />
      {/* frame spine */}
      <mesh position={[0, 0.58, 0]} rotation-x={0.12} castShadow>
        <boxGeometry args={[0.12, 0.14, 1.3]} />
        <meshStandardMaterial color="#26262c" />
      </mesh>
      {/* tank + seat */}
      <mesh position={[0, 0.74, 0.18]} castShadow>
        <boxGeometry args={[0.32, 0.2, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.72, -0.38]} castShadow>
        <boxGeometry args={[0.28, 0.09, 0.55]} />
        <meshStandardMaterial color="#1a1a1f" />
      </mesh>
      {/* forks + handlebars */}
      <mesh position={[0, 0.62, 0.62]} rotation-x={-0.45} castShadow>
        <boxGeometry args={[0.08, 0.75, 0.08]} />
        <meshStandardMaterial color="#55555f" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, 0.5]} castShadow>
        <boxGeometry args={[0.56, 0.05, 0.05]} />
        <meshStandardMaterial color="#26262c" />
      </mesh>
      {/* exhaust */}
      <mesh position={[0.16, 0.35, -0.35]} rotation-x={Math.PI / 2 - 0.15} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#8a8f96" metalness={0.6} />
      </mesh>
    </group>
  )
}

// Man-cave corner: couch + rug + wall TV + mini fridge + neon.
function CaveCorner() {
  return (
    <group>
      {/* couch (faces the TV on the back wall) */}
      <group position={[CAVE.couch.x, 0, CAVE.couch.z]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[1.9, 0.45, 0.85]} />
          <meshStandardMaterial color="#3a3f4d" />
        </mesh>
        <mesh position={[0, 0.62, 0.35]} castShadow>
          <boxGeometry args={[1.9, 0.55, 0.22]} />
          <meshStandardMaterial color="#3a3f4d" />
        </mesh>
        {[[-0.85], [0.85]].map(([x], i) => (
          <mesh key={i} position={[x, 0.5, 0]} castShadow>
            <boxGeometry args={[0.2, 0.35, 0.85]} />
            <meshStandardMaterial color="#333845" />
          </mesh>
        ))}
      </group>
      {/* rug */}
      <mesh position={[CAVE.couch.x, 0.006, CAVE.couch.z - 1.2]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.1, 24]} />
        <meshStandardMaterial color="#4a2f2f" />
      </mesh>
      {/* wall TV bezel — the screen itself lives in Monitors (clickable,
          plays a live stream when powered on) */}
      <mesh position={[CAVE.couch.x, 1.9, -2.96]}>
        <boxGeometry args={[1.8, 1.05, 0.06]} />
        <meshStandardMaterial color="#0c0c10" />
      </mesh>
      {/* mini fridge */}
      <group position={[CAVE.fridge.x, 0, CAVE.fridge.z]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[0.6, 1.5, 0.6]} />
          <meshStandardMaterial color="#c8ccd2" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[-0.26, 0.9, 0.31]}>
          <boxGeometry args={[0.04, 0.5, 0.03]} />
          <meshStandardMaterial color="#7a7f86" />
        </mesh>
      </group>
      {/* neon sign on the right wall — the man-cave glow */}
      <group position={[CAVE.neon.x, CAVE.neon.y, CAVE.neon.z]}>
        <mesh rotation-y={-Math.PI / 2}>
          <boxGeometry args={[1.9, 0.09, 0.06]} />
          <meshStandardMaterial color="#ff2d95" emissive="#ff2d95" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.25, 0.25]} rotation-y={-Math.PI / 2}>
          <boxGeometry args={[1.1, 0.07, 0.05]} />
          <meshStandardMaterial color="#ff2d95" emissive="#ff2d95" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <pointLight position={[-0.5, 0, 0]} intensity={1.6} color="#ff2d95" distance={6} decay={2} />
      </group>
    </group>
  )
}

// Workbench along the left wall + pegboard.
function Workbench() {
  return (
    <group position={[-6.1, 0, -1.4]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.65, 0.07, 2.4]} />
        <meshStandardMaterial color="#6a5138" />
      </mesh>
      {[[-1.05], [1.05]].map(([z], i) => (
        <mesh key={i} position={[0, 0.45, z]} castShadow>
          <boxGeometry args={[0.55, 0.9, 0.08]} />
          <meshStandardMaterial color="#4a4a50" />
        </mesh>
      ))}
      {/* pegboard */}
      <mesh position={[-0.38, 1.7, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[2.4, 1.0]} />
        <meshStandardMaterial color="#5a5444" />
      </mesh>
      {/* vice */}
      <mesh position={[0.1, 1.02, 0.8]} castShadow>
        <boxGeometry args={[0.25, 0.18, 0.18]} />
        <meshStandardMaterial color="#374a63" metalness={0.5} />
      </mesh>
    </group>
  )
}

// Shelving unit on the right wall with clutter boxes.
function Shelves() {
  return (
    <group position={[6.25, 0, 1.5]}>
      {[0.5, 1.1, 1.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.45, 0.05, 2.2]} />
          <meshStandardMaterial color="#7a6a4a" />
        </mesh>
      ))}
      {[[-1.05], [1.05]].map(([z], i) => (
        <mesh key={i} position={[0, 0.95, z]}>
          <boxGeometry args={[0.45, 1.9, 0.06]} />
          <meshStandardMaterial color="#5a5040" />
        </mesh>
      ))}
      {/* clutter */}
      {[
        [0, 0.62, -0.6, '#8a4a3a'],
        [0, 0.64, 0.3, '#4a6a8a'],
        [0, 1.22, 0.7, '#6a8a4a'],
        [0, 1.22, -0.3, '#8a8a5a'],
        [0, 1.82, 0.1, '#5a5a6a'],
      ].map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.35, 0.22, 0.4]} />
          <meshStandardMaterial color={c} />
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
      <mesh position={[0, 0.55, -1.8]}>
        <boxGeometry args={[0.36, 0.18, 0.3]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[0, 0.88, -1.85]} rotation-x={-0.15}>
        <boxGeometry args={[0.4, 0.52, 0.24]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0, 1.26, -1.88]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.22, 0.88, -2.1]} rotation-x={-0.5}>
        <boxGeometry args={[0.08, 0.08, 0.45]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[-0.22, 0.88, -2.1]} rotation-x={-0.5}>
        <boxGeometry args={[0.08, 0.08, 0.45]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh ref={handR} position={[0.15, 0.77, -2.33]}>
        <boxGeometry args={[0.1, 0.05, 0.12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh ref={handL} position={[-0.15, 0.77, -2.33]}>
        <boxGeometry args={[0.1, 0.05, 0.12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
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

const { minX, maxX, minZ, maxZ, ceiling } = GARAGE
const W = maxX - minX
const D = maxZ - minZ
const CX = (minX + maxX) / 2
const CZ = (minZ + maxZ) / 2

export default function Room({ mode = 'desk', onZoom, lights = true, onToggleLights, fp = false, tv = null, tvMuted = false, onTvToggle, onPhone }) {
  const switchesRef = useRef([])
  const phoneRef = useRef() // the cast-remote phone on the couch armrest
  return (
    <group>
      {/* --- Shell --- */}
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0, CZ]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#54545a" />
      </mesh>
      {/* back wall */}
      <mesh position={[CX, ceiling / 2, minZ]}>
        <planeGeometry args={[W, ceiling]} />
        <meshStandardMaterial color="#63636b" />
      </mesh>
      {/* left / right walls */}
      <mesh position={[minX, ceiling / 2, CZ]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[D, ceiling]} />
        <meshStandardMaterial color="#5b5b63" />
      </mesh>
      <mesh position={[maxX, ceiling / 2, CZ]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[D, ceiling]} />
        <meshStandardMaterial color="#5b5b63" />
      </mesh>
      {/* front wall segments around the two doors */}
      {(() => {
        const segs = []
        let cursor = minX
        for (const d of DOORS) {
          const left = d.x - d.w / 2
          if (left > cursor) segs.push([cursor, left])
          // header above each door
          segs.push({ header: d })
          cursor = d.x + d.w / 2
        }
        if (cursor < maxX) segs.push([cursor, maxX])
        return segs.map((s, i) =>
          Array.isArray(s) ? (
            <mesh key={i} position={[(s[0] + s[1]) / 2, ceiling / 2, maxZ]} rotation-y={Math.PI}>
              <planeGeometry args={[s[1] - s[0], ceiling]} />
              <meshStandardMaterial color="#5b5b63" />
            </mesh>
          ) : (
            <mesh
              key={i}
              position={[s.header.x, (ceiling + s.header.h) / 2, maxZ]}
              rotation-y={Math.PI}
            >
              <planeGeometry args={[s.header.w, ceiling - s.header.h]} />
              <meshStandardMaterial color="#5b5b63" />
            </mesh>
          ),
        )
      })()}
      {/* the two roller doors (with slats) */}
      {DOORS.map((d, i) => (
        <group key={i} position={[d.x, 0, maxZ - 0.06]}>
          <mesh position={[0, d.h / 2, 0]}>
            <boxGeometry args={[d.w, d.h, 0.08]} />
            <meshStandardMaterial color="#84898f" metalness={0.5} roughness={0.5} />
          </mesh>
          {[-0.8, -0.4, 0, 0.4, 0.8].map((f, j) => (
            <mesh key={j} position={[0, d.h / 2 + f * (d.h / 2.4), -0.05]}>
              <boxGeometry args={[d.w - 0.1, 0.04, 0.02]} />
              <meshStandardMaterial color="#5b5f65" />
            </mesh>
          ))}
        </group>
      ))}

      {/* --- Ceiling fixtures: two LIT over the bays, husks elsewhere --- */}
      {[
        // lamp: true = real pointLight (expensive!); others glow visually only
        { p: [LIFT.x, 3.9, LIFT.z], lit: true, warm: true, lamp: true },
        { p: [CIVIC.pos[0], 3.9, 2.2], lit: true, warm: false, lamp: true },
        { p: [0, 3.9, -2.2], lit: false }, // off over the desk — monitors own it
        { p: [0.3, 3.9, 5.2], lit: true, warm: false },
        { p: [-4.8, 3.9, -0.8], lit: true, warm: true },
      ].map((f, i) => (
        <group key={i}>
          {/* dark housing — no glare when seen from above */}
          <mesh position={f.p}>
            <boxGeometry args={[2.2, 0.08, 0.32]} />
            <meshStandardMaterial color="#26262a" emissive="#3a3a34" emissiveIntensity={0.12} />
          </mesh>
          {f.lit && lights && (
            <>
              {/* downward-facing glow panel */}
              <mesh position={[f.p[0], f.p[1] - 0.05, f.p[2]]} rotation-x={Math.PI / 2}>
                <planeGeometry args={[2.0, 0.24]} />
                <meshStandardMaterial
                  color={f.warm ? '#fff3d8' : '#e8efff'}
                  emissive={f.warm ? '#fff3d8' : '#e8efff'}
                  emissiveIntensity={1.4}
                  toneMapped={false}
                />
              </mesh>
              {f.lamp && (
                <pointLight
                  position={[f.p[0], f.p[1] - 0.4, f.p[2]]}
                  intensity={f.warm ? 15 : 12}
                  distance={13}
                  decay={2}
                  color={f.warm ? '#ffe9c4' : '#dfe8ff'}
                />
              )}
            </>
          )}
        </group>
      ))}

      {/* oil stains */}
      {[
        [LIFT.x, LIFT.z + 0.6, 0.5],
        [CIVIC.pos[0] - 0.3, 1.4, 0.35],
        [-4.4, 4.8, 0.3],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.004, z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[r, 20]} />
          <meshStandardMaterial color="#1a1a1e" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Wall light switches — clickable in any mode; the amber locator dot
          glows brighter in the dark so you can always find one. */}
      {SWITCHES.map((s, i) => (
        <group key={i} position={s.pos} rotation-y={s.rotY}>
          <mesh ref={(el) => (switchesRef.current[i] = el)}>
            <boxGeometry args={[0.16, 0.24, 0.06]} />
            <meshStandardMaterial color="#d8d4c8" />
          </mesh>
          {/* toggle nub flips with the state */}
          <mesh position={[0, lights ? 0.045 : -0.045, 0.05]} rotation-x={lights ? -0.4 : 0.4}>
            <boxGeometry args={[0.05, 0.1, 0.05]} />
            <meshStandardMaterial color="#b8b4a8" />
          </mesh>
          {/* glow-in-the-dark locator dot */}
          <mesh position={[0, -0.08, 0.036]}>
            <circleGeometry args={[0.018, 12]} />
            <meshStandardMaterial
              color="#ffb84a"
              emissive="#ffb84a"
              emissiveIntensity={lights ? 0.5 : 3}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* LED bias strip above the monitors — washes the back wall (always on) */}
      <mesh position={[0, 2.35, -2.97]}>
        <boxGeometry args={[2.6, 0.06, 0.05]} />
        <meshStandardMaterial
          color="#55aaff"
          emissive="#55aaff"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 2.2, -2.6]} intensity={2.8} color="#55aaff" distance={5} decay={2} />

      {/* --- Office corner (unchanged coordinates) --- */}
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
      {/* the phone (cast remote) lying on the couch armrest */}
      <group position={[CAVE.couch.x - 0.85, 0.69, CAVE.couch.z]} rotation-y={-0.5}>
        <mesh ref={phoneRef}>
          <boxGeometry args={[0.075, 0.014, 0.15]} />
          <meshStandardMaterial color="#101014" />
        </mesh>
        <mesh position={[0, 0.008, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.062, 0.135]} />
          <meshStandardMaterial color="#0c1420" emissive="#2a6a8a" emissiveIntensity={1.1} />
        </mesh>
      </group>
      <Monitors mode={mode} onZoom={onZoom} switchesRef={switchesRef} onToggleLights={onToggleLights} fp={fp} tv={tv} tvMuted={tvMuted} onTvToggle={onTvToggle} onPhone={onPhone} phoneRef={phoneRef} />
      <mesh position={[0, 0.75, -2.35]} castShadow>
        <boxGeometry args={[0.45, 0.03, 0.15]} />
        <meshStandardMaterial color="#20202a" />
      </mesh>
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

      {/* --- The bays --- */}
      <CompleteCar position={CIVIC.pos} rotY={CIVIC.rotY} />
      <LiftedMx5 />
      <Mx5Parts />

      {/* --- Man-cave dressing --- */}
      <Workbench />
      <Shelves />
      {BIKES.map((b, i) => (
        <Motorbike key={i} position={b.pos} rotY={b.rotY} color={i === 0 ? '#b03030' : '#2a2a30'} />
      ))}
      <CaveCorner />

      {/* Chair + typing figure — fade handling as before */}
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
      <FadeAway mode={mode} exploreTarget={0}>
        <Person />
      </FadeAway>
    </group>
  )
}
