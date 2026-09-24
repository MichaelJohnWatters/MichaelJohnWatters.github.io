import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { GARAGE, DOORS, LIFT, CIVIC, BIKES, CAVE, SWITCHES, YARD, WORLD, LOT, ROAD, RBT, PARKED } from './layout'
import Monitors from './Monitors'
import { SHAPES } from './cars'

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
// Parametric car body — its proportions read as its class of vehicle
// (roadster low, hatch normal, muscle long, SUV tall). Built along +x (nose).
function CompleteCar({ position = [0, 0, 0], rotY = 0, color = '#2f6fb0', wheels = true, type = 'hatch' }) {
  const S = SHAPES[type] || SHAPES.hatch
  const hx = S.len / 2 - 0.85 // wheel offset (x, along length)
  const hz = S.wid / 2 - 0.14
  return (
    <group position={position} rotation-y={rotY}>
      {/* hull */}
      <mesh position={[0, S.bodyY + S.ride, 0]} castShadow>
        <boxGeometry args={[S.len, S.bodyH, S.wid]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* greenhouse / cabin */}
      <mesh position={[S.cabinX, S.cabinY + S.ride, 0]} castShadow>
        <boxGeometry args={[S.cabinLen, S.cabinH, S.wid * 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* windscreen */}
      <mesh position={[S.cabinX + S.cabinLen / 2 - 0.04, S.cabinY + S.ride - 0.02, 0]} rotation-z={0.5}>
        <boxGeometry args={[0.05, S.cabinH * 0.85, S.wid * 0.84]} />
        <meshStandardMaterial color="#1a2733" />
      </mesh>
      {/* physics mode supplies its own spinning/steering wheels */}
      {wheels &&
        [[hx, hz], [hx, -hz], [-hx, hz], [-hx, -hz]].map(([x, z], i) => (
          <Wheel key={i} position={[x, S.wheelR + S.ride, z]} radius={S.wheelR} />
        ))}
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

// Every street/road lamp GLOWS (emissive heads, free), but casting real
// light from all of them at once would melt the GPU — three.js shades every
// light on every pixel. So a small POOL of point-lights hops to the lamps
// nearest the camera each frame: whichever lamps you're near illuminate the
// ground, at a fixed cost no matter how many lamps exist.
const LAMP_POS = [
  // lot corners
  [5.4, 3.0, 10.3], [-19, 3.0, 27.5], [19, 3.0, -12], [-19, 3.0, -12], [19, 3.0, 27.5],
  // road lamps (alternating sides) down the straight
  [6.4, 3.0, 74], [-5.8, 3.0, 154], [6.4, 3.0, 234], [-5.8, 3.0, 314], [6.4, 3.0, 394], [-5.8, 3.0, 474],
]
function LampLights({ active }) {
  const refs = useRef([])
  useFrame(({ camera }) => {
    if (!active) return
    const cx = camera.position.x
    const cz = camera.position.z
    const order = LAMP_POS.map((p, i) => [i, (p[0] - cx) ** 2 + (p[2] - cz) ** 2]).sort(
      (a, b) => a[1] - b[1],
    )
    for (let j = 0; j < refs.current.length; j++) {
      const l = refs.current[j]
      if (!l) continue
      const p = LAMP_POS[order[j]?.[0]]
      if (p) {
        l.position.set(p[0], p[1], p[2])
        l.visible = true
      } else l.visible = false
    }
  })
  if (!active) return null
  return (
    <>
      {Array.from({ length: 5 }).map((_, j) => (
        <pointLight
          key={j}
          ref={(el) => (refs.current[j] = el)}
          intensity={1.5}
          distance={14}
          decay={2}
          color="#ffd9a0"
        />
      ))}
    </>
  )
}

// Tyre smoke off the REAR wheels while the wheels are spinning (c.wheelspin).
// Puffs spawn low behind the car and bloom/rise, driven each frame.
function TyreSmoke({ vehiclesRef }) {
  const grp = useRef()
  const puffs = useRef([])
  const t = useRef(0)
  const N = 8
  useFrame((_, dt) => {
    const c = vehiclesRef.current?.[0]
    const on = !!c?.wheelspin
    if (grp.current) grp.current.visible = on
    if (!on || !grp.current) return
    t.current += dt
    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    // sit at the rear axle
    grp.current.position.set(c.x - fx * 1.3, 0, c.z - fz * 1.3)
    puffs.current.forEach((m, i) => {
      if (!m) return
      const ph = (t.current * 1.1 + i / N) % 1
      const side = i % 2 ? 0.7 : -0.7 // both rear corners
      m.position.set(-fz * side - fx * ph * 1.5, 0.25 + ph * 1.4, fx * side - fz * ph * 1.5)
      m.scale.setScalar(0.25 + ph * 1.0)
      m.material.opacity = 0.5 * (1 - ph)
    })
  })
  return (
    <group ref={grp} visible={false}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => (puffs.current[i] = el)}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#c9c9cf" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// Blown engine: smoke billowing + fire licking from the front of the car.
// Driven each frame by vehiclesRef[0].blown (no React churn).
function Wreck({ vehiclesRef }) {
  const grp = useRef()
  const puffs = useRef([])
  const fire = useRef()
  const t = useRef(0)
  const N = 7
  useFrame((_, dt) => {
    const c = vehiclesRef.current?.[0]
    const on = !!c?.blown
    if (grp.current) grp.current.visible = on
    if (!on || !grp.current) return
    t.current += dt
    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    grp.current.position.set(c.x + fx * 1.9, 0, c.z + fz * 1.9)
    puffs.current.forEach((m, i) => {
      if (!m) return
      const ph = (t.current * 0.5 + i / N) % 1
      m.position.set(fx * ph * 1.2, 0.7 + ph * 3.2, fz * ph * 1.2)
      m.scale.setScalar(0.3 + ph * 1.3)
      m.material.opacity = 0.55 * (1 - ph)
    })
    if (fire.current) {
      fire.current.scale.y = 0.75 + Math.sin(t.current * 34) * 0.25
      fire.current.scale.x = fire.current.scale.z = 0.9 + Math.sin(t.current * 27) * 0.12
    }
  })
  return (
    <group ref={grp} visible={false}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => (puffs.current[i] = el)}>
          <sphereGeometry args={[0.36, 8, 8]} />
          <meshStandardMaterial color="#35353a" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={fire} position={[0, 0.55, 0]}>
        <coneGeometry args={[0.32, 1.0, 8]} />
        <meshBasicMaterial color="#ff7a2a" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.16, 0.6, 8]} />
        <meshBasicMaterial color="#ffd23a" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.9, 0]} intensity={2.4} distance={7} decay={2} color="#ff6a2a" />
    </group>
  )
}

// Soft radial glow texture for the neon's fake bloom (built once).
let _neonGlow = null
function neonGlowTex() {
  if (_neonGlow) return _neonGlow
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  rg.addColorStop(0, 'rgba(255,45,149,0.55)')
  rg.addColorStop(0.5, 'rgba(255,45,149,0.16)')
  rg.addColorStop(1, 'rgba(255,45,149,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 128, 128)
  _neonGlow = new THREE.CanvasTexture(c)
  return _neonGlow
}

// Wall art, drawn once to canvas textures — garage culture, not a résumé.
// Lit by the scene like real paper (dims with the lights).
function makeArtTexture(kind) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = kind === 'rules' ? 300 : 340
  const g = c.getContext('2d')
  if (kind === 'blueprint') {
    // MX-5 NA side profile, white line-art on blueprint blue
    g.fillStyle = '#123156'
    g.fillRect(0, 0, 256, 340)
    g.strokeStyle = 'rgba(255,255,255,0.25)'
    g.lineWidth = 1
    for (let i = 16; i < 256; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 340); g.stroke() }
    for (let i = 16; i < 340; i += 24) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke() }
    g.strokeStyle = '#eef4ff'
    g.lineWidth = 2.5
    // body
    g.beginPath()
    g.moveTo(22, 200)
    g.lineTo(30, 178) // nose
    g.lineTo(78, 170) // bonnet w/ pop-up bump
    g.lineTo(84, 162)
    g.lineTo(92, 162)
    g.lineTo(98, 170)
    g.lineTo(118, 168)
    g.lineTo(138, 140) // windscreen
    g.lineTo(168, 140) // roofline (top down!)... soft top up
    g.lineTo(196, 168)
    g.lineTo(228, 174)
    g.lineTo(234, 196)
    g.lineTo(228, 204)
    g.lineTo(22, 204)
    g.closePath()
    g.stroke()
    // wheels
    for (const wx of [72, 192]) {
      g.beginPath(); g.arc(wx, 204, 22, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.arc(wx, 204, 9, 0, Math.PI * 2); g.stroke()
    }
    g.font = '16px ui-monospace, monospace'
    g.fillStyle = '#eef4ff'
    g.fillText('EUNOS ROADSTER — NA', 40, 262)
    g.font = '11px ui-monospace, monospace'
    g.fillText('scale 1:24 · project car', 66, 282)
  } else if (kind === 'race') {
    // retro racing print: bold stripes + number roundel
    g.fillStyle = '#e8e0cf'
    g.fillRect(0, 0, 256, 340)
    const stripes = ['#b23b3b', '#e8b34b', '#2f6fb0']
    stripes.forEach((col, i) => {
      g.fillStyle = col
      g.save()
      g.translate(0, 60 + i * 34)
      g.rotate(-0.12)
      g.fillRect(-20, 0, 320, 22)
      g.restore()
    })
    g.fillStyle = '#e8e0cf'
    g.beginPath()
    g.arc(128, 190, 52, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#1a1a1e'
    g.lineWidth = 5
    g.beginPath()
    g.arc(128, 190, 52, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#1a1a1e'
    g.font = '900 58px system-ui, sans-serif'
    g.textAlign = 'center'
    g.fillText('27', 128, 210)
    g.font = '800 22px system-ui, sans-serif'
    g.fillText('MIDNIGHT', 128, 285)
    g.fillText('GARAGE', 128, 310)
    g.textAlign = 'left'
  } else {
    // house rules sign
    g.fillStyle = '#20201f'
    g.fillRect(0, 0, 256, 300)
    g.strokeStyle = '#8a8a7a'
    g.lineWidth = 4
    g.strokeRect(9, 9, 238, 282)
    g.fillStyle = '#e8e0cf'
    g.font = '800 26px system-ui, sans-serif'
    g.fillText('GARAGE RULES', 30, 52)
    g.font = '15px ui-monospace, monospace'
    const rules = [
      '1. lights off when you leave',
      '2. tools go back on the board',
      '3. the sofa is for race day',
      '4. close the doors after',
      "5. don't tell anyone the",
      '   phone code',
    ]
    rules.forEach((r, i) => g.fillText(r, 26, 96 + i * 30))
  }
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 4
  return t
}

function WallArt({ kind, pos, rotY = 0, w = 0.78, h = 1.04 }) {
  const tex = useMemo(() => makeArtTexture(kind), [kind])
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} />
      </mesh>
    </group>
  )
}

// Headlights. Lamp meshes glow faintly parked, fully when driven — and the
// driven vehicle gets a real spotlight beam (only ever ONE active, cheap).
// Local axes: the Civic's nose is +x, the bikes' is +z.
// F (or the HUD button) fires 'vehicle-flash': two quick high-beam pulses.
function useFlash(lightRef, on, base) {
  useEffect(() => {
    if (!on) return
    const flash = () => {
      const s = lightRef.current
      if (!s) return
      let i = 0
      const iv = setInterval(() => {
        s.intensity = i % 2 === 0 ? base * 2.6 : base
        i++
        if (i > 3) {
          clearInterval(iv)
          s.intensity = base
        }
      }, 130)
    }
    window.addEventListener('vehicle-flash', flash)
    return () => window.removeEventListener('vehicle-flash', flash)
  }, [on, base, lightRef])
}

function CarLights({ on }) {
  const l = useRef()
  const t = useRef()
  useEffect(() => {
    if (l.current && t.current) l.current.target = t.current
  }, [on])
  useFlash(l, on, 95)
  return (
    <group>
      {[0.55, -0.55].map((z, i) => (
        <mesh key={i} position={[2.14, 0.55, z]}>
          <boxGeometry args={[0.06, 0.14, 0.3]} />
          <meshStandardMaterial
            color="#fffbe8"
            emissive="#fff3c4"
            emissiveIntensity={on ? 2.4 : 0.25}
            toneMapped={false}
          />
        </mesh>
      ))}
      {on && (
        <>
          <spotLight
            ref={l}
            position={[2.2, 0.7, 0]}
            angle={0.66}
            penumbra={0.55}
            intensity={95}
            distance={32}
            decay={1.2}
            color="#ffeecb"
          />
          <object3D ref={t} position={[13, 0.1, 0]} />
        </>
      )}
    </group>
  )
}

function BikeLight({ on }) {
  const l = useRef()
  const t = useRef()
  useEffect(() => {
    if (l.current && t.current) l.current.target = t.current
  }, [on])
  useFlash(l, on, 80)
  return (
    <group>
      <mesh position={[0, 0.88, 0.72]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 0.07, 12]} />
        <meshStandardMaterial
          color="#fffbe8"
          emissive="#fff3c4"
          emissiveIntensity={on ? 2.4 : 0.25}
          toneMapped={false}
        />
      </mesh>
      {on && (
        <>
          <spotLight
            ref={l}
            position={[0, 0.9, 0.8]}
            angle={0.55}
            penumbra={0.55}
            intensity={80}
            distance={30}
            decay={1.2}
            color="#ffeecb"
          />
          <object3D ref={t} position={[0, 0.05, 12]} />
        </>
      )}
    </group>
  )
}

// A drivable vehicle: its live pose lives in App's vehicles ref so the
// Drive controller and this mesh read the same truth each frame. `nose`
// corrects for the mesh's forward axis (car nose = +x → -π/2; bike = +z
// → 0). Bikes also lean into corners (pose.lean, set by Drive).
function VehicleRig({ vehiclesRef, idx, nose = 0, lean = false, drop = 0, physCar = false, children }) {
  const g = useRef()
  const q = useMemo(() => new THREE.Quaternion(), [])
  const nq = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), nose), [nose])
  useFrame(() => {
    const c = vehiclesRef?.current?.[idx]
    if (!c || !g.current) return
    g.current.position.set(c.x, (c.y || 0) + drop, c.z) // c.y lifts on jumps; drop aligns body to the physics wheels
    if (physCar && c.quat) {
      // follow the FULL chassis orientation → visible body roll / dive / squat / airtime
      q.set(c.quat[0], c.quat[1], c.quat[2], c.quat[3])
      g.current.quaternion.copy(q).multiply(nq)
    } else {
      g.current.rotation.set(0, c.heading + nose, lean ? c.lean || 0 : 0)
    }
  })
  return <group ref={g}>{children}</group>
}

// A roller door that ROLLS UP: the slat panel hangs from the drum and its
// y-scale shrinks toward the top — reads exactly like slats winding on.
function RollerDoor({ d, open, refDrum, refPanel }) {
  const panel = useRef()
  useFrame((_, dt) => {
    if (!panel.current) return
    const target = open ? 0.07 : 1
    const s = panel.current.scale.y
    panel.current.scale.y = s + (target - s) * (1 - Math.pow(0.01, dt))
  })
  return (
    <group position={[d.x, d.h, GARAGE.maxZ - 0.06]}>
      {/* drum the door winds onto */}
      <mesh ref={refDrum} position={[0, 0.06, -0.06]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.13, 0.13, d.w, 10]} />
        <meshStandardMaterial color="#4a4e54" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* slat panel, origin at the TOP so it shrinks upward */}
      <group ref={panel}>
        <mesh ref={refPanel} position={[0, -d.h / 2, 0]}>
          <boxGeometry args={[d.w, d.h, 0.08]} />
          <meshStandardMaterial color="#84898f" metalness={0.5} roughness={0.5} />
        </mesh>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((f, j) => (
          <mesh key={j} position={[0, -d.h / 2 + f * (d.h / 2.4), -0.05]}>
            <boxGeometry args={[d.w - 0.1, 0.04, 0.02]} />
            <meshStandardMaterial color="#5b5f65" />
          </mesh>
        ))}
      </group>
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
      <mesh position={[CAVE.couch.x, 1.55, -2.97]}>
        <boxGeometry args={[2.2, 1.3, 0.06]} />
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
        {/* fake bloom: additive radial glow behind the tubes */}
        <mesh rotation-y={-Math.PI / 2} position={[-0.1, -0.1, 0]}>
          <planeGeometry args={[3.6, 1.9]} />
          <meshBasicMaterial
            map={neonGlowTex()}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
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

export default function Room({ mode = 'desk', onZoom, lights = true, daytime = false, onToggleLights, fp = false, tv = null, tvMuted = false, onTvToggle, onPhone, phoneHeld = false, doors = [false, false], onDoorToggle, vehiclesRef, headlights = -1, physicsMode = false, carColor = '#2f6fb0', carType = 'hatch' }) {
  const switchesRef = useRef([])
  const doorRefs = useRef([]) // drum meshes double as the click/aim targets
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
      {/* front wall segments around the two doors — inner faces always;
          OUTER faces only in explore mode (they'd block the intro spiral's
          view in, and you can only be outside while exploring) */}
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
        const face = (s, i, out) => {
          const key = `${i}-${out ? 'o' : 'i'}`
          const z = out ? maxZ + 0.015 : maxZ
          const col = out ? '#43434b' : '#5b5b63'
          return Array.isArray(s) ? (
            <mesh key={key} position={[(s[0] + s[1]) / 2, ceiling / 2, z]} rotation-y={out ? 0 : Math.PI}>
              <planeGeometry args={[s[1] - s[0], ceiling]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ) : (
            <mesh
              key={key}
              position={[s.header.x, (ceiling + s.header.h) / 2, z]}
              rotation-y={out ? 0 : Math.PI}
            >
              <planeGeometry args={[s.header.w, ceiling - s.header.h]} />
              <meshStandardMaterial color={col} />
            </mesh>
          )
        }
        return [
          ...segs.map((s, i) => face(s, i, false)),
          ...(mode === 'explore' ? segs.map((s, i) => face(s, i, true)) : []),
        ]
      })()}
      {/* exterior skin for the other walls + roof top (explore only) */}
      {mode === 'explore' && (
        <group>
          <mesh position={[CX, ceiling / 2, minZ - 0.015]} rotation-y={Math.PI}>
            <planeGeometry args={[W, ceiling]} />
            <meshStandardMaterial color="#43434b" />
          </mesh>
          <mesh position={[minX - 0.015, ceiling / 2, CZ]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[D, ceiling]} />
            <meshStandardMaterial color="#3f3f47" />
          </mesh>
          <mesh position={[maxX + 0.015, ceiling / 2, CZ]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[D, ceiling]} />
            <meshStandardMaterial color="#3f3f47" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[CX, ceiling + 0.015, CZ]}>
            <planeGeometry args={[W, D]} />
            <meshStandardMaterial color="#38383f" />
          </mesh>
        </group>
      )}
      {/* --- Roof + skylights (single-sided: invisible from the intro
          spiral outside, solid overhead from within) --- */}
      <mesh rotation-x={Math.PI / 2} position={[CX, ceiling, CZ]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#46464e" />
      </mesh>
      {[[-3.2, -0.6], [-3.2, 3.6], [3.2, -0.6], [3.2, 3.6]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* frame */}
          <mesh rotation-x={Math.PI / 2} position={[0, ceiling - 0.015, 0]}>
            <planeGeometry args={[2.7, 1.9]} />
            <meshStandardMaterial color="#26262c" />
          </mesh>
          {/* sky glass — moonlight-blue at night, blazing daylight by day */}
          <mesh rotation-x={Math.PI / 2} position={[0, ceiling - 0.03, 0]}>
            <planeGeometry args={[2.4, 1.6]} />
            <meshStandardMaterial
              color={daytime ? '#cfe4f4' : '#0e1a2e'}
              emissive={daytime ? '#e8f4ff' : '#4a6a9e'}
              emissiveIntensity={daytime ? 2.0 : lights ? 0.45 : 1.25}
            />
          </mesh>
        </group>
      ))}

      {/* the two roller doors (with slats) — click to roll them up */}
      {DOORS.map((d, i) => (
        <RollerDoor
          key={i}
          d={d}
          open={!!doors[i]}
          refDrum={(el) => (doorRefs.current[i * 2] = el)}
          refPanel={(el) => (doorRefs.current[i * 2 + 1] = el)}
        />
      ))}

      {/* --- The open world outside: a big night lot with roads --- */}
      <group>
        {/* ground: gravel lot everywhere the garage isn't */}
        <mesh rotation-x={-Math.PI / 2} position={[(WORLD.minX + WORLD.maxX) / 2, -0.02, (WORLD.minZ + WORLD.maxZ) / 2]}>
          <planeGeometry args={[WORLD.maxX - WORLD.minX, WORLD.maxZ - WORLD.minZ]} />
          <meshStandardMaterial color={daytime ? '#77776e' : '#2b2b30'} />
        </mesh>
        {/* roads: driveway from the doors + a loop around the lot. Strips
            of darker asphalt with dashed centrelines — pure dressing. */}
        {[
          // [cx, cz, w, d]  (widths along x, depths along z)
          [0.3, 9.5, 13, 5], // apron/driveway across both doors
          [0.3, 20.5, 6, 27], // main straight north
          [0, 27.5, 44, 6], // north straight
          [0, -12, 44, 6], // south straight (behind the garage)
          [-19, 7.75, 6, 45.5], // west straight
          [19, 7.75, 6, 45.5], // east straight
        ].map(([cx2, cz2, w2, d2], i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx2, -0.005, cz2]}>
            <planeGeometry args={[w2, d2]} />
            <meshStandardMaterial color={daytime ? '#5c5c62' : '#35353b'} />
          </mesh>
        ))}
        {/* dashed centrelines */}
        {(() => {
          const dashes = []
          for (let z = 13; z < 33; z += 2.4) dashes.push([0.3, z, 0.14, 1.1]) // north straight
          for (let x = -20; x < 21; x += 2.4) {
            dashes.push([x, 27.5, 1.1, 0.14]) // north loop
            dashes.push([x, -12, 1.1, 0.14]) // south loop
          }
          for (let z = -9; z < 25; z += 2.4) {
            dashes.push([-19, z, 0.14, 1.1]) // west loop
            dashes.push([19, z, 0.14, 1.1]) // east loop
          }
          return dashes.map(([dx2, dz2, dw2, dd2], i) => (
            <mesh key={i} rotation-x={-Math.PI / 2} position={[dx2, 0.001, dz2]}>
              <planeGeometry args={[dw2, dd2]} />
              <meshStandardMaterial color="#8f8f7a" />
            </mesh>
          ))
        })()}
        {/* lot perimeter wall — the north side has a GAP where the road
            leaves for the roundabout */}
        {[
          [0, WORLD.minZ, 56.5, 0.25], // south
          [(-28 + (ROAD.x - 4.2)) / 2, LOT.maxZ, ROAD.x - 4.2 + 28, 0.25], // north-left
          [(ROAD.x + 4.2 + 28) / 2, LOT.maxZ, 28 - (ROAD.x + 4.2), 0.25], // north-right
          [0, 561, 40.6, 0.25], // far cap behind the roundabout
        ].map(([px2, pz2, pw2, pd2], i) => (
          <mesh key={'h' + i} position={[px2, 0.7, pz2]}>
            <boxGeometry args={[pw2, 1.4, pd2]} />
            <meshStandardMaterial color={daytime ? '#8a8a90' : '#3c3c44'} />
          </mesh>
        ))}
        {[WORLD.minX, WORLD.maxX].map((x, i) => (
          <mesh key={'v' + i} position={[x, 0.7, (WORLD.minZ + LOT.maxZ) / 2]}>
            <boxGeometry args={[0.25, 1.4, LOT.maxZ - WORLD.minZ]} />
            <meshStandardMaterial color={daytime ? '#8a8a90' : '#3c3c44'} />
          </mesh>
        ))}
        {/* hedges flanking the road corridor */}
        {[-20, 20].map((x, i) => (
          <mesh key={'hedge' + i} position={[x, 0.45, (LOT.maxZ + 561) / 2]}>
            <boxGeometry args={[0.6, 0.9, 561 - LOT.maxZ]} />
            <meshStandardMaterial color={daytime ? '#3e4f34' : '#242c1f'} />
          </mesh>
        ))}

        {/* --- The road north: ~500m straight to a roundabout --- */}
        <mesh rotation-x={-Math.PI / 2} position={[ROAD.x, -0.005, (ROAD.z0 + ROAD.z1) / 2]}>
          <planeGeometry args={[ROAD.w, ROAD.z1 - ROAD.z0]} />
          <meshStandardMaterial color={daytime ? '#5c5c62' : '#35353b'} />
        </mesh>
        {(() => {
          const dashes = []
          for (let z = 40; z < ROAD.z1 - 4; z += 12) dashes.push(z)
          return dashes.map((z, i) => (
            <mesh key={'rd' + i} rotation-x={-Math.PI / 2} position={[ROAD.x, 0.001, z]}>
              <planeGeometry args={[0.16, 1.6]} />
              <meshStandardMaterial color="#8f8f7a" />
            </mesh>
          ))
        })()}
        {/* roundabout: asphalt disc, grass island with a kerb, centre lamp */}
        <group position={[RBT.x, 0, RBT.z]}>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.004}>
            <circleGeometry args={[RBT.outerR, 40]} />
            <meshStandardMaterial color={daytime ? '#5c5c62' : '#35353b'} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
            <ringGeometry args={[RBT.islandR, RBT.islandR + 0.5, 32]} />
            <meshStandardMaterial color={daytime ? '#9a9aa0' : '#55555c'} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
            <circleGeometry args={[RBT.islandR, 32]} />
            <meshStandardMaterial color={daytime ? '#4a5c3a' : '#26301f'} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 4.4, 8]} />
            <meshStandardMaterial color="#2e2e34" />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <boxGeometry args={[0.5, 0.14, 0.5]} />
            <meshStandardMaterial
              color="#26262a"
              emissive="#ffd9a0"
              emissiveIntensity={daytime ? 0.1 : 1.6}
            />
          </mesh>
          {mode !== 'desk' && !daytime && (
            <pointLight position={[0, 4.1, 0]} intensity={2} color="#ffd9a0" distance={16} decay={2} />
          )}
        </group>
        {/* road lamps — emissive heads only (the headlights do the work) */}
        {[74, 154, 234, 314, 394, 474].map((z, i) => (
          <group key={'rl' + i} position={[i % 2 ? -5.8 : 6.4, 0, z]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
              <meshStandardMaterial color="#2e2e34" />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[0.34, 0.12, 0.22]} />
              <meshStandardMaterial
                color="#26262a"
                emissive="#ffd9a0"
                emissiveIntensity={daytime ? 0.1 : 1.4}
              />
            </mesh>
          </group>
        ))}
        {/* street lamps around the lot — lights only outside desk mode */}
        {[
          [5.4, 10.3],
          [-19, 27.5],
          [19, -12],
          [-19, -12],
          [19, 27.5],
        ].map(([lx2, lz2], i) => (
          <group key={i} position={[lx2, 0, lz2]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
              <meshStandardMaterial color="#2e2e34" />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[0.34, 0.12, 0.22]} />
              <meshStandardMaterial
                color="#26262a"
                emissive="#ffd9a0"
                emissiveIntensity={daytime ? 0.1 : 1.6}
              />
            </mesh>
          </group>
        ))}
        {/* pooled lights that hop to whichever lamps you're nearest */}
        <LampLights active={mode !== 'desk' && !daytime} />
        {/* (wheelie bins + cones are DYNAMIC now — see Playground.jsx) */}
        {/* shipping container across the lot */}
        <group position={[-17.5, 0, 25.3]} rotation-y={0.15}>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[6, 2.6, 2.5]} />
            <meshStandardMaterial color="#5a3b32" metalness={0.2} roughness={0.7} />
          </mesh>
        </group>
        {/* night sky — points shader, ignores fog, basically free */}
        {!daytime && <Stars radius={70} depth={30} count={2200} factor={3.6} fade speed={0.4} />}
      </group>

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
          {/* drop rods — the fixtures hang from the raised roof */}
          {[-0.9, 0.9].map((dx, j) => (
            <mesh key={j} position={[f.p[0] + dx, (f.p[1] + 0.04 + ceiling) / 2, f.p[2]]}>
              <cylinderGeometry args={[0.018, 0.018, ceiling - f.p[1] - 0.04, 6]} />
              <meshStandardMaterial color="#2a2a2e" />
            </mesh>
          ))}
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
      {/* wall art — garage culture (blueprint, race print, house rules) */}
      <WallArt kind="blueprint" pos={[-4.35, 1.75, -2.985]} />
      <WallArt kind="race" pos={[0.3, 1.75, 6.985]} rotY={Math.PI} />
      <WallArt kind="rules" pos={[-6.485, 1.75, 0.35]} rotY={Math.PI / 2} w={0.66} h={0.78} />
      {/* the phone prop itself lives in Monitors (it has a live lock screen) */}
      <Monitors mode={mode} onZoom={onZoom} switchesRef={switchesRef} onToggleLights={onToggleLights} fp={fp} tv={tv} tvMuted={tvMuted} onTvToggle={onTvToggle} onPhone={onPhone} phoneHeld={phoneHeld} doorRefs={doorRefs} doors={doors} onDoorToggle={onDoorToggle} />
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
      <VehicleRig vehiclesRef={vehiclesRef} idx={0} nose={-Math.PI / 2} drop={physicsMode ? -0.5 : 0} physCar={physicsMode}>
        <CompleteCar wheels={!physicsMode} color={carColor} type={carType} />
        <CarLights on={headlights === 0} />
      </VehicleRig>
      <Wreck vehiclesRef={vehiclesRef} />
      <TyreSmoke vehiclesRef={vehiclesRef} />
      {/* cars parked out in the lot — a row of different classes */}
      {PARKED.map((p, i) => (
        <CompleteCar key={i} position={[p.x, 0, p.z]} rotY={p.rotY} color={p.color} type={p.type} />
      ))}
      <LiftedMx5 />
      <Mx5Parts />

      {/* --- Man-cave dressing --- */}
      <Workbench />
      <Shelves />
      {BIKES.map((b, i) => (
        <VehicleRig key={i} vehiclesRef={vehiclesRef} idx={i + 1} nose={0} lean>
          <Motorbike color={i === 0 ? '#b03030' : '#2a2a30'} />
          <BikeLight on={headlights === i + 1} />
        </VehicleRig>
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
