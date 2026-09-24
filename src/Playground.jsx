import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, usePlane, useBox, useCylinder, useSphere } from '@react-three/cannon'
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
// CRUCIAL: kinematic bodies interact through their VELOCITY — a body that
// only teleports (position.set) has v=0, never wakes sleeping props, and
// drives straight through them. So we set real velocity from the frame
// delta AND the position (to correct drift).
function VehiclePusher({ vehiclesRef, idx, args }) {
  const [ref, api] = useBox(() => ({ type: 'Kinematic', args, position: [0, 0.6, 0] }))
  const prev = useRef(null)
  useFrame((_, dt) => {
    const c = vehiclesRef.current[idx]
    if (!c) return
    if (prev.current && dt > 0) {
      api.velocity.set((c.x - prev.current.x) / dt, 0, (c.z - prev.current.z) / dt)
    }
    api.position.set(c.x, 0.6, c.z)
    const h = c.heading / 2
    api.quaternion.set(0, Math.sin(h), 0, Math.cos(h))
    prev.current = { x: c.x, z: c.z }
  })
  return <mesh ref={ref} visible={false} />
}

// The walker shoves things too.
function PlayerPusher({ playerPosRef }) {
  const [ref, api] = useSphere(() => ({ type: 'Kinematic', args: [0.35], position: [0, 0.5, 0] }))
  const prev = useRef(null)
  useFrame((_, dt) => {
    const p = playerPosRef?.current
    if (!p) return
    if (prev.current && dt > 0) {
      api.velocity.set((p.x - prev.current.x) / dt, 0, (p.z - prev.current.z) / dt)
    }
    api.position.set(p.x, 0.5, p.z)
    prev.current = { x: p.x, z: p.z }
  })
  return <mesh ref={ref} visible={false} />
}

function Barrel({ position, color }) {
  const [ref] = useCylinder(() => ({
    mass: 3,
    position,
    args: [0.3, 0.3, 0.85, 10],
    angularDamping: 0.25,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.3, 0.3, 0.85, 14]} />
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.6} />
    </mesh>
  )
}

function Crate({ position }) {
  const [ref] = useBox(() => ({
    mass: 0.8,
    position,
    args: [0.55, 0.55, 0.55],
    angularDamping: 0.3,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.55, 0.55, 0.55]} />
      <meshStandardMaterial color="#8a6b42" roughness={0.85} />
    </mesh>
  )
}

function Tyre({ position }) {
  const [ref] = useCylinder(() => ({
    mass: 1.1,
    position,
    args: [0.34, 0.34, 0.25, 12],
    angularDamping: 0.2,
    allowSleep: true,
    onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.34, 0.34, 0.25, 16]} />
      <meshStandardMaterial color="#1b1b1f" roughness={0.9} />
    </mesh>
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
      {/* cones: a few by the driveway + a slalom down the main straight */}
      {[
        [3.8, 12.5], [5.2, 13.8], [-2.6, 13.2], [-4.2, 12.2],
        [-1.2, 15], [1.8, 17.5], [-1.2, 20], [1.8, 22.5], [-1.2, 25],
      ].map(([x, z], i) => (
        <Cone key={i} position={[x, 0.25, z]} />
      ))}
      {/* oil drums by the container + a couple strays */}
      {[
        [-13.2, 24.6, '#8a3b32'], [-12.5, 25.4, '#2f5a7a'], [-12.9, 23.6, '#4a4a52'],
        [4.6, 19.5, '#8a3b32'], [-6.5, 17, '#2f5a7a'],
      ].map(([x, z, c], i) => (
        <Barrel key={i} position={[x, 0.45, z]} color={c} />
      ))}
      {/* crate stack where the driveway meets the straight — smash it */}
      {[
        [-0.3, 0.3, 16.5], [0.3, 0.3, 16.5], [-0.3, 0.3, 17.1], [0.3, 0.3, 17.1],
        [0, 0.88, 16.8], [-0.55, 0.3, 16.8],
      ].map(([x, y, z], i) => (
        <Crate key={i} position={[x, y, z]} />
      ))}
      {/* tyre stack + a loose one */}
      {[[-3.4, 0.15, 19], [-3.4, 0.42, 19], [-3.4, 0.69, 19], [-2.5, 0.15, 20.2]].map(
        ([x, y, z], i) => (
          <Tyre key={i} position={[x, y, z]} />
        ),
      )}
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
