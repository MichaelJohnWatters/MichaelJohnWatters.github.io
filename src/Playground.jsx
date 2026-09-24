import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, usePlane, useBox, useCylinder, useSphere } from '@react-three/cannon'
import { Text3D } from '@react-three/drei'
import fontUrl from 'three/examples/fonts/helvetiker_bold.typeface.json?url'
import { WORLD } from './layout'
import { impact } from './sfx'

// The Bruno-Simon-style physics playground (cannon-es in a web worker).
// The hand-rolled vehicle sim stays in charge of driving — vehicles and
// the walker are KINEMATIC pushers here, and the fun stuff (your name,
// cones, bins, bowling pins) are dynamic bodies that scatter properly.

const thud = (e) => {
  const v = e.contact?.impactVelocity || 0
  if (v > 1.2) impact(v)
}

function Ground() {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }))
  return <mesh ref={ref} visible={false} />
}

// invisible static walls so props stay in the lot
function Fence({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args }))
  return <mesh ref={ref} visible={false} />
}

// A kinematic box that shadows a vehicle's live pose each frame.
function VehiclePusher({ vehiclesRef, idx, args }) {
  const [ref, api] = useBox(() => ({ type: 'Kinematic', args, position: [0, 0.6, 0] }))
  useFrame(() => {
    const c = vehiclesRef.current[idx]
    if (!c) return
    api.position.set(c.x, 0.6, c.z)
    const h = c.heading / 2
    api.quaternion.set(0, Math.sin(h), 0, Math.cos(h))
  })
  return <mesh ref={ref} visible={false} />
}

// The walker shoves things too.
function PlayerPusher({ playerPosRef }) {
  const [ref, api] = useSphere(() => ({ type: 'Kinematic', args: [0.35], position: [0, 0.5, 0] }))
  useFrame(() => {
    const p = playerPosRef?.current
    if (p) api.position.set(p.x, 0.5, p.z)
  })
  return <mesh ref={ref} visible={false} />
}

function Letter({ ch, position, color }) {
  const [ref] = useBox(() => ({
    mass: 2,
    position,
    args: [1.05, 1.3, 0.45],
    angularDamping: 0.4,
    linearDamping: 0.15,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <group ref={ref}>
      <Text3D font={fontUrl} size={1.05} height={0.35} position={[-0.45, -0.62, -0.18]}>
        {ch}
        <meshStandardMaterial color={color} />
      </Text3D>
    </group>
  )
}

function Cone({ position }) {
  const [ref] = useCylinder(() => ({
    mass: 0.3,
    position,
    args: [0.03, 0.17, 0.45, 8],
    angularDamping: 0.3,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.17, 0.45, 10]} />
      <meshStandardMaterial color="#d9622b" />
    </mesh>
  )
}

function Bin({ position, color }) {
  const [ref] = useBox(() => ({
    mass: 1.2,
    position,
    args: [0.55, 1.1, 0.55],
    angularDamping: 0.3,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.55, 1.1, 0.55]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Pin({ position }) {
  const [ref] = useCylinder(() => ({
    mass: 0.35,
    position,
    args: [0.08, 0.12, 0.52, 8],
    angularDamping: 0.2,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.08, 0.12, 0.52, 10]} />
      <meshStandardMaterial color="#efe9dd" />
    </mesh>
  )
}

function Ball({ position }) {
  const [ref] = useSphere(() => ({
    mass: 1.6,
    position,
    args: [0.24],
    angularDamping: 0.1,
    linearDamping: 0.05,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.24, 18, 18]} />
      <meshStandardMaterial color="#8a2f3e" metalness={0.2} roughness={0.35} />
    </mesh>
  )
}

const NAME = 'MICHAEL'
const LETTER_COLORS = ['#e8b34b', '#5ad0e6', '#ff5a8a', '#8fd06a', '#e8b34b', '#5ad0e6', '#ff5a8a']

// 10-pin triangle, apex toward the driveway
const PINS = (() => {
  const out = []
  const ox = 13.5
  const oz = 20
  let i = 0
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k <= row; k++) {
      out.push([ox + (k - row / 2) * 0.42, 0.27, oz + row * 0.42])
      i++
    }
  }
  return out
})()

export default function Playground({ vehiclesRef, playerPosRef, paused }) {
  const letters = useMemo(
    () => NAME.split('').map((ch, i) => ({ ch, x: -4.6 + i * 1.55 })),
    [],
  )
  return (
    <Physics gravity={[0, -9.81, 0]} allowSleep broadphase="SAP" isPaused={paused}>
      <Ground />
      {/* perimeter keeps the toys in the lot */}
      <Fence position={[0, 1, WORLD.minZ]} args={[WORLD.maxX - WORLD.minX, 2, 0.3]} />
      <Fence position={[0, 1, WORLD.maxZ]} args={[WORLD.maxX - WORLD.minX, 2, 0.3]} />
      <Fence position={[WORLD.minX, 1, 8]} args={[0.3, 2, WORLD.maxZ - WORLD.minZ]} />
      <Fence position={[WORLD.maxX, 1, 8]} args={[0.3, 2, WORLD.maxZ - WORLD.minZ]} />
      {/* pushers */}
      <VehiclePusher vehiclesRef={vehiclesRef} idx={0} args={[1.8, 1.2, 4.3]} />
      <VehiclePusher vehiclesRef={vehiclesRef} idx={1} args={[0.7, 1.2, 2.2]} />
      <VehiclePusher vehiclesRef={vehiclesRef} idx={2} args={[0.7, 1.2, 2.2]} />
      <PlayerPusher playerPosRef={playerPosRef} />
      {/* MICHAEL — drive through your own name, peak Bruno */}
      {letters.map((l, i) => (
        <Letter key={i} ch={l.ch} position={[l.x, 0.7, 16.5]} color={LETTER_COLORS[i]} />
      ))}
      {/* cones by the driveway */}
      {[[3.8, 12.5], [5.2, 13.8], [-2.6, 13.2], [-4.2, 12.2]].map(([x, z], i) => (
        <Cone key={i} position={[x, 0.25, z]} />
      ))}
      {/* the bins (they were begging for it) */}
      <Bin position={[-5.6, 0.6, 10.6]} color="#33343c" />
      <Bin position={[-4.9, 0.6, 10.7]} color="#2c4a35" />
      {/* bowling corner */}
      {PINS.map((p, i) => (
        <Pin key={i} position={p} />
      ))}
      <Ball position={[13.5, 0.26, 16.5]} />
    </Physics>
  )
}
