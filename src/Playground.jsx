import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, usePlane, useBox, useCylinder, useSphere } from '@react-three/cannon'
import { WORLD, LOT, ROAD, BUILDING_WALLS, CIRCLES, PARKED, BIKES } from './layout'
import { BIKE, BIKE_CHASSIS } from './cars'
import { impact } from './sfx'
import PhysicsCar from './PhysicsCar'

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
    if (!c || !api?.quaternion) return
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
    if (!p || !api?.position) return
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
    allowSleep: false,
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
    allowSleep: false,
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
    allowSleep: false,
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
    allowSleep: false,
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
    allowSleep: false,
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
    allowSleep: false,
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
    allowSleep: false,
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
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k <= row; k++) {
      out.push([ox + (k - row / 2) * 0.42, 0.27, oz + row * 0.42])
      i++
    }
  }
  return out
})()

// Static boxes for the garage's solid walls (so the physics car crashes into
// them), plus the roundabout island as a static cylinder.
function WorldColliders({ idleCars = [] }) {
  return (
    <>
      {BUILDING_WALLS.map((b, i) => (
        <Fence
          key={i}
          position={[(b.minX + b.maxX) / 2, 1.2, (b.minZ + b.maxZ) / 2]}
          args={[b.maxX - b.minX, 2.4, b.maxZ - b.minZ]}
        />
      ))}
      {CIRCLES.map((c, i) => (
        <IslandCollider key={i} position={[c.x, 0.4, c.z]} r={c.r} />
      ))}
      {/* IDLE parked cars are solid (the driven car crashes into them) — but the
          one you're driving has NO collider here, so teleporting into its spot
          doesn't eject the chassis. Keyed by slot so they remount when swapped. */}
      {idleCars.map((c) => (
        <Fence
          key={'car' + c.i}
          position={[c.home[0], 0.6, c.home[1]]}
          args={Math.abs(Math.cos(c.home[2])) > 0.5 ? [4.4, 1.2, 2] : [2, 1.2, 4.4]}
        />
      ))}
    </>
  )
}
function IslandCollider({ position, r }) {
  const [ref] = useCylinder(() => ({ type: 'Static', position, args: [r, r, 0.8, 16] }))
  return <mesh ref={ref} visible={false} />
}

// visible static box (ramp / speed bump) the car drives over — the suspension
// compresses, the body pitches, and off the ramp you get airtime
function StaticBox({ position, rotation = [0, 0, 0], args, color = '#4a4a52' }) {
  const [ref] = useBox(() => ({ type: 'Static', position, rotation, args }))
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// A wedge ramp — a tilted slab whose low edge sits on the ground at `z` and
// rises toward +z (or -z for a down-ramp when `rot` is negative).
function Ramp({ z, rot = 0.32, len = 7, w = 9, color = '#5b6570' }) {
  const h = Math.abs(Math.sin(rot)) * len / 2
  return <StaticBox position={[ROAD.x, h, z]} rotation={[rot, 0, 0]} args={[w, 0.5, len]} color={color} />
}

// Full stunt course down the long road: slalom → speed bumps → jump → barrel
// gauntlet → chicane → big kicker → tyre wall. Static geometry is cheap; props
// are kept modest for mobile.
function RoadCourse() {
  return (
    <>
      {/* 1 · SLALOM — weave the alternating cones */}
      {[46, 52, 58, 64, 70].map((z, i) => (
        <Cone key={'sl' + z} position={[ROAD.x + (i % 2 ? 6 : -6), 0.25, z]} />
      ))}
      {/* 2 · SPEED BUMPS */}
      {[84, 90, 96].map((z) => (
        <StaticBox key={'sb' + z} position={[ROAD.x, 0.12, z]} args={[10, 0.24, 0.8]} color="#c9a23a" />
      ))}
      {/* 3 · JUMP — kicker ramp for airtime */}
      <Ramp z={118} rot={0.34} len={7} w={10} />
      {/* 4 · BARREL GAUNTLET — smash straight through */}
      {[[-4, 150], [4, 153], [0, 156], [-4, 159], [4, 162]].map(([x, z], i) => (
        <Barrel key={'bg' + i} position={[ROAD.x + x, 0.5, z]} color={i % 2 ? '#c0392b' : '#2e6da4'} />
      ))}
      {/* 5 · CHICANE — offset walls force a hard S */}
      <StaticBox position={[ROAD.x - 7, 0.7, 188]} args={[18, 1.4, 0.6]} color="#9a3b3b" />
      <StaticBox position={[ROAD.x + 7, 0.7, 208]} args={[18, 1.4, 0.6]} color="#9a3b3b" />
      {/* 6 · BIG KICKER — a bigger, wider launch */}
      <Ramp z={244} rot={0.42} len={9} w={12} color="#55555e" />
      {[[-1.5, 262], [1.2, 265], [0, 268]].map(([x, z], i) => (
        <RubbleBlock key={'rb' + i} position={[ROAD.x + x, 0.4, z]} />
      ))}
      {/* 7 · TYRE WALL — plow through a stack */}
      {[[-3, 300], [0, 300], [3, 300], [-1.5, 300], [1.5, 300], [0, 300.6]].map(([x, z], i) => (
        <Tyre key={'tw' + i} position={[ROAD.x + x, i === 5 ? 0.9 : 0.4, z]} />
      ))}
    </>
  )
}
function RubbleBlock({ position }) {
  const [ref] = useBox(() => ({
    mass: 0.6, position, args: [0.5, 0.5, 0.5], angularDamping: 0.3, allowSleep: false, onCollide: thud,
  }))
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#7a7168" roughness={0.9} />
    </mesh>
  )
}

export default function Playground({ vehiclesRef, playerPosRef, paused, carActive, onExitDrive, carProfile, carSpawn, idleCars, joyRef, auto, bikePhysics, bikeActive }) {
  // low contact friction + slight restitution so a glancing wall/kerb hit SLIDES
  // the car along instead of grabbing it to a dead stop (tyre traction is the
  // raycast wheels' frictionSlip, independent of this).
  return (
    <Physics gravity={[0, -9.81, 0]} allowSleep broadphase="SAP" isPaused={paused} defaultContactMaterial={{ friction: 0.08, restitution: 0.12 }}>
      <WorldColliders idleCars={idleCars} />
      <RoadCourse />
      <Ground />
      {/* perimeter keeps the toys in — with a gap where the road exits, so
          you CAN boot a barrel all the way to the roundabout */}
      <Fence position={[0, 1, WORLD.minZ]} args={[WORLD.maxX - WORLD.minX, 2, 0.3]} />
      <Fence position={[(-28 + ROAD.x - 4.2) / 2, 1, LOT.maxZ]} args={[ROAD.x - 4.2 + 28, 2, 0.3]} />
      <Fence position={[(ROAD.x + 4.2 + 28) / 2, 1, LOT.maxZ]} args={[28 - (ROAD.x + 4.2), 2, 0.3]} />
      <Fence position={[WORLD.minX, 1, (WORLD.minZ + LOT.maxZ) / 2]} args={[0.3, 2, LOT.maxZ - WORLD.minZ]} />
      <Fence position={[WORLD.maxX, 1, (WORLD.minZ + LOT.maxZ) / 2]} args={[0.3, 2, LOT.maxZ - WORLD.minZ]} />
      <Fence position={[-20, 1, (LOT.maxZ + 561) / 2]} args={[0.3, 2, 561 - LOT.maxZ]} />
      <Fence position={[20, 1, (LOT.maxZ + 561) / 2]} args={[0.3, 2, 561 - LOT.maxZ]} />
      <Fence position={[0, 1, 561]} args={[40.6, 2, 0.3]} />
      {/* pushers — the Civic is either a kinematic pusher (arcade) or a real
          raycast vehicle (physics mode) */}
      <PhysicsCar vehiclesRef={vehiclesRef} active={carActive} onExit={onExitDrive} profile={carProfile} spawn={carSpawn} joyRef={joyRef} auto={auto} />
      {/* the bike: real raycast vehicle (toggle on) or a kinematic pusher (arcade) */}
      {bikePhysics ? (
        <PhysicsCar
          vehiclesRef={vehiclesRef}
          idx={1}
          active={bikeActive}
          onExit={onExitDrive}
          profile={BIKE}
          chassis={BIKE_CHASSIS}
          home={[BIKES[0].pos[0], BIKES[0].pos[2]]}
          showWheels={false}
          joyRef={joyRef}
          auto={auto}
        />
      ) : (
        <VehiclePusher vehiclesRef={vehiclesRef} idx={1} args={[0.7, 1.2, 2.2]} />
      )}
      <PlayerPusher playerPosRef={playerPosRef} />
      {/* lot props — kept light now that the road has a full course (perf) */}
      {[[3.8, 12.5], [5.2, 13.8], [-2.6, 13.2], [-4.2, 12.2]].map(([x, z], i) => (
        <Cone key={i} position={[x, 0.25, z]} />
      ))}
      {[[-13.2, 24.6, '#8a3b32'], [-12.5, 25.4, '#2f5a7a'], [4.6, 19.5, '#4a4a52']].map(([x, z, c], i) => (
        <Barrel key={i} position={[x, 0.45, z]} color={c} />
      ))}
      {/* small crate stack to smash */}
      {[[-0.3, 0.3, 16.5], [0.3, 0.3, 16.5], [0, 0.88, 16.5]].map(([x, y, z], i) => (
        <Crate key={i} position={[x, y, z]} />
      ))}
      {[[-3.4, 0.15, 19], [-3.4, 0.42, 19]].map(([x, y, z], i) => (
        <Tyre key={i} position={[x, y, z]} />
      ))}
      <Bin position={[-5.6, 0.6, 10.6]} color="#33343c" />
      {/* bowling corner */}
      {PINS.map((p, i) => (
        <Pin key={i} position={p} />
      ))}
      <Ball position={[13.5, 0.26, 16.5]} />
    </Physics>
  )
}
