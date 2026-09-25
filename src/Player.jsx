import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GARAGE, COLLIDERS, SEAT, LIFT, SOFA_SEAT, DOORS, WORLD, BUILDING_WALLS, CIRCLES } from './layout'
import { footstep } from './sfx'
import { complete } from './tasks'
import { IS_TOUCH } from './touch'

// Minimal keyboard hook (no context — robust across the R3F boundary).
function useKeys() {
  const keys = useRef({ forward: false, back: false, left: false, right: false })
  useEffect(() => {
    const map = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
    }
    const down = (e) => {
      if (window.__phoneOpen) return // typing on the cast phone ≠ walking
      const a = map[e.code]
      if (a) keys.current[a] = true
    }
    const up = (e) => {
      const a = map[e.code]
      if (a) keys.current[a] = false
    }
    // Release everything when focus leaves, or held keys stick forever.
    const clear = () => {
      for (const k of Object.keys(keys.current)) keys.current[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [])
  return keys
}

// A ~1.75m standing low-poly figure. A "nose" marks the facing dir (+z).
function StandingFigure() {
  const skin = '#d9a066'
  const shirt = '#3f5b8c'
  const pants = '#2a2a30'
  return (
    <group>
      {/* legs to ~0.85 */}
      <mesh position={[0.1, 0.42, 0]} castShadow>
        <boxGeometry args={[0.15, 0.85, 0.15]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[-0.1, 0.42, 0]} castShadow>
        <boxGeometry args={[0.15, 0.85, 0.15]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      {/* torso 0.85 -> 1.45 */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.22]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0.27, 1.12, 0]} castShadow>
        <boxGeometry args={[0.09, 0.55, 0.09]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[-0.27, 1.12, 0]} castShadow>
        <boxGeometry args={[0.09, 0.55, 0.09]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {/* head — top at ~1.75 */}
      <mesh position={[0, 1.61, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.61, 0.11]}>
        <boxGeometry args={[0.05, 0.05, 0.04]} />
        <meshStandardMaterial color={skin} />
      </mesh>
    </group>
  )
}

const SPEED = 2.5 // brisk walk, m/s
const RADIUS = 0.22 // player body radius — slim enough for tight gaps
const WALL = 0.2 // keep-off distance from walls
const SIT_DIST = 1.4 // how close to the chair before you can sit
const clamp = THREE.MathUtils.clamp

function blocked(x, z, doors, vehicles, idleCars) {
  // idle (parked) cars are solid on foot too — box sized by their orientation
  if (idleCars) {
    for (const c of idleCars) {
      const alongX = Math.abs(Math.cos(c.home[2])) > 0.5
      const hx = (alongX ? 2.2 : 1.0) + RADIUS
      const hz = (alongX ? 1.0 : 2.2) + RADIUS
      if (Math.abs(x - c.home[0]) < hx && Math.abs(z - c.home[1]) < hz) return true
    }
  }
  for (const b of COLLIDERS) {
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) {
      return true
    }
  }
  // the garage's solid side/back walls (world is open beyond them now)
  for (const b of BUILDING_WALLS) {
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) {
      return true
    }
  }
  // round obstacles (roundabout island)
  for (const c of CIRCLES) {
    if (Math.hypot(x - c.x, z - c.z) < c.r + RADIUS) return true
  }
  // the vehicles, wherever they currently are (they drive!)
  if (vehicles) {
    for (const v of vehicles) {
      if (Math.hypot(x - v.x, z - v.z) < v.r + RADIUS) return true
    }
  }
  // Front wall: solid except an OPEN door's clear width. Only applies
  // across the building's span — the world continues past its corners.
  if (z > GARAGE.maxZ - 0.1 - RADIUS && z < GARAGE.maxZ + 0.1 + RADIUS && x > GARAGE.minX && x < GARAGE.maxX) {
    for (let i = 0; i < DOORS.length; i++) {
      const d = DOORS[i]
      if (doors?.[i] && x > d.x - d.w / 2 + RADIUS && x < d.x + d.w / 2 - RADIUS) return false
    }
    return true
  }
  return false
}

// First-person walker. Mounted in "explore" mode. Spawns beside the desk on
// the open half of the garage. Desktop: pointer-lock mouse-look. Touch:
// drag anywhere (off the joystick) to look.
export default function Player({ start = [0.9, 0, 0.4], onNearSeat, onSit, joyRef, sofa = false, onSofaToggle, onNearSofa, doors = [false, false], vehiclesRef, onNearVehicle, onDrive, idleCars = [], onNearCar, onEnterCar, posOutRef, torch = false }) {
  const group = useRef()
  const pos = useRef(new THREE.Vector3(...start))
  const keys = useKeys()
  const { camera } = useThree()
  const near = useRef(false)
  const nearSofaRef = useRef(false)
  const sofaRef = useRef(sofa)
  sofaRef.current = sofa
  const prevSofa = useRef(false)
  const doorsRef = useRef(doors)
  doorsRef.current = doors
  const nearVehicleRef = useRef(-1) // index of the vehicle in reach, or -1
  const nearCarRef = useRef(-1) // slot of the idle parked car in reach, or -1
  const idleCarsRef = useRef(idleCars)
  idleCarsRef.current = idleCars
  const torchLight = useRef()
  const torchTarget = useRef()
  useEffect(() => {
    if (torchLight.current && torchTarget.current) torchLight.current.target = torchTarget.current
  }, [torch])
  const bob = useRef(0)
  // Camera yaw — the mouse/touch-drag drives it (starts facing the garage).
  const camYaw = useRef(Math.PI)
  const mouse = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const mm = (e) => {
      // Joystick drags steer the FEET, not the eyes.
      if (e.target.closest?.('.joystick')) return
      mouse.current.x = e.clientX / window.innerWidth
      mouse.current.y = e.clientY / window.innerHeight
    }
    window.addEventListener('pointermove', mm)
    return () => window.removeEventListener('pointermove', mm)
  }, [])

  // Desktop: POINTER LOCK for infinite turning. Click captures the mouse;
  // Esc releases; deltas drive yaw/pitch. Touch: drag-to-look below.
  const lockPitch = useRef(0)
  useEffect(() => {
    if (IS_TOUCH) {
      let last = null
      const pd = (e) => {
        if (e.target.closest?.('.joystick') || window.__phoneOpen) return
        last = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }
      const pm = (e) => {
        if (!last || e.pointerId !== last.id || window.__phoneOpen) return
        camYaw.current -= (e.clientX - last.x) * 0.006
        lockPitch.current = clamp(lockPitch.current - (e.clientY - last.y) * 0.006, -0.9, 0.9)
        last = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }
      const pu = (e) => {
        if (last && e.pointerId === last.id) last = null
      }
      window.addEventListener('pointerdown', pd)
      window.addEventListener('pointermove', pm)
      window.addEventListener('pointerup', pu)
      window.addEventListener('pointercancel', pu)
      return () => {
        window.removeEventListener('pointerdown', pd)
        window.removeEventListener('pointermove', pm)
        window.removeEventListener('pointerup', pu)
        window.removeEventListener('pointercancel', pu)
      }
    }
    const canvas = document.querySelector('canvas')
    const mm = (e) => {
      // movementX/Y deliver deltas with OR without pointer lock — unlocked
      // they just stop at the screen edge (the edge-turn in useFrame takes
      // over there), so turning is infinite either way.
      if (window.__phoneOpen) return // mouse belongs to the phone
      if (e.target.closest?.('.joystick')) return
      camYaw.current -= (e.movementX || 0) * 0.0032
      lockPitch.current = clamp(lockPitch.current - (e.movementY || 0) * 0.0032, -0.9, 0.9)
    }
    const relock = () => {
      if (window.__phoneOpen) return
      // re-query the canvas (a captured ref can go stale) — this is the
      // "click to capture the mouse" path, so it must not silently miss.
      if (!document.pointerLockElement) document.querySelector('canvas')?.requestPointerLock?.()?.catch?.(() => {})
    }
    lockPitch.current = 0
    canvas?.requestPointerLock?.()?.catch?.(() => {}) // works when entering FP via a click/key gesture
    window.addEventListener('pointermove', mm)
    window.addEventListener('pointerdown', relock)
    return () => {
      window.removeEventListener('pointermove', mm)
      window.removeEventListener('pointerdown', relock)
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [])

  // E sits: at the desk chair when near it, on the sofa when near that
  // (or stands back up from the sofa).
  useEffect(() => {
    const sit = (e) => {
      if (e.code !== 'KeyE' || window.__phoneOpen) return
      if (near.current) onSit?.()
      else if (sofaRef.current || nearSofaRef.current) onSofaToggle?.()
      else if (nearCarRef.current >= 0) onEnterCar?.(nearCarRef.current)
      else if (nearVehicleRef.current >= 0) onDrive?.(nearVehicleRef.current)
    }
    window.addEventListener('keydown', sit)
    return () => window.removeEventListener('keydown', sit)
  }, [onSit, onSofaToggle, onDrive, onEnterCar])

  useFrame((_, delta) => {
    // Sitting on the sofa: parked camera facing the TV, no walking. On
    // standing, step out in front of the couch facing the room.
    if (sofaRef.current) {
      prevSofa.current = true
      group.current.visible = false
      camera.position.set(SOFA_SEAT.x, 1.08, SOFA_SEAT.z)
      camera.lookAt(SOFA_SEAT.x, 1.5, -2.96)
      camera.updateMatrixWorld()
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
      return
    }
    if (prevSofa.current) {
      prevSofa.current = false
      pos.current.set(SOFA_SEAT.x, 0, SOFA_SEAT.standZ)
      camYaw.current = 0 // stood up facing the room, back to the TV
    }
    const k = keys.current

    // Look: mouse deltas drive yaw/pitch (locked or not). When the lock is
    // off the cursor pins at the screen edge and deltas die — edge-turn
    // keeps rotating while it's parked there.
    const locked = typeof document !== 'undefined' && !!document.pointerLockElement
    if (!locked && !IS_TOUCH && !window.__phoneOpen) {
      if (mouse.current.x <= 0.01) camYaw.current += 2.4 * delta
      else if (mouse.current.x >= 0.99) camYaw.current -= 2.4 * delta
    }
    const pitch = lockPitch.current

    // Camera-relative input: W walks away from the camera (or forward in FP),
    // A/D strafe — stays intuitive as the view turns. The virtual joystick
    // (touch) adds its analog vector on top.
    const joy = joyRef?.current || { x: 0, y: 0 }
    const fwdAmt = (k.forward ? 1 : 0) - (k.back ? 1 : 0) - joy.y
    const rightAmt = (k.right ? 1 : 0) - (k.left ? 1 : 0) + joy.x
    const fx = Math.sin(camYaw.current)
    const fz = Math.cos(camYaw.current)
    const dx = fwdAmt * fx + rightAmt * -fz
    const dz = fwdAmt * fz + rightAmt * fx
    const moving = dx !== 0 || dz !== 0

    if (moving) {
      const len = Math.hypot(dx, dz)
      const step = (SPEED * delta) / len
      // Axis-separated moves: blocked on one axis still slides on the other.
      // The far z bound is the YARD fence — the front wall itself blocks
      // unless an open door is in the way (see blocked()).
      const vs = vehiclesRef?.current
      const ic = idleCarsRef.current
      const nx = clamp(pos.current.x + dx * step, WORLD.minX + WALL, WORLD.maxX - WALL)
      if (!blocked(nx, pos.current.z, doorsRef.current, vs, ic)) pos.current.x = nx
      const nz = clamp(pos.current.z + dz * step, WORLD.minZ + WALL, WORLD.maxZ - WALL)
      if (!blocked(pos.current.x, nz, doorsRef.current, vs, ic)) pos.current.z = nz
      group.current.rotation.y = Math.atan2(dx, dz)
      // Footstep on each bob trough (~2 steps/sec at walk speed).
      const prevPhase = Math.floor(bob.current / Math.PI)
      bob.current += delta * 10
      if (Math.floor(bob.current / Math.PI) !== prevPhase) footstep()
    }

    group.current.visible = false // first person: the body is the camera
    // feed the physics playground's kinematic pusher
    if (posOutRef) {
      posOutRef.current.x = pos.current.x
      posOutRef.current.z = pos.current.z
    }
    group.current.position.set(
      pos.current.x,
      Math.abs(Math.sin(bob.current)) * 0.04,
      pos.current.z,
    )

    // Under the raised MX-5? Whiteboard task.
    if (Math.abs(pos.current.x - LIFT.x) < 1.1 && Math.abs(pos.current.z - LIFT.z) < 1.2) complete('underlift')

    // Near the chair? Surface the "sit back down" prompt.
    const isNear = Math.hypot(pos.current.x - SEAT.x, pos.current.z - SEAT.z) < SIT_DIST
    if (isNear !== near.current) {
      near.current = isNear
      onNearSeat?.(isNear)
    }
    // Near the sofa? Surface the "sit on the sofa" prompt.
    const isNearSofa = Math.hypot(pos.current.x - SOFA_SEAT.x, pos.current.z - (SOFA_SEAT.z - 0.7)) < 1.5
    if (isNearSofa !== nearSofaRef.current) {
      nearSofaRef.current = isNearSofa
      onNearSofa?.(isNearSofa)
    }
    // Near a vehicle (wherever it's parked)? Surface the drive/ride prompt.
    let nearIdx = -1
    const vsNow = vehiclesRef?.current
    if (vsNow) {
      let bestD = Infinity
      for (let i = 0; i < vsNow.length; i++) {
        const v = vsNow[i]
        const d = Math.hypot(pos.current.x - v.x, pos.current.z - v.z)
        const reach = v.kind === 'car' ? 2.7 : 1.6
        if (d < reach && d < bestD) {
          bestD = d
          nearIdx = i
        }
      }
    }
    if (nearIdx !== nearVehicleRef.current) {
      nearVehicleRef.current = nearIdx
      onNearVehicle?.(nearIdx)
    }
    // nearest idle (parked) car you can get into
    let nearCarSlot = -1
    let bestCarD = Infinity
    for (const c of idleCarsRef.current) {
      const d = Math.hypot(pos.current.x - c.home[0], pos.current.z - c.home[1])
      if (d < 3.4 && d < bestCarD) { bestCarD = d; nearCarSlot = c.i }
    }
    if (nearCarSlot !== nearCarRef.current) {
      nearCarRef.current = nearCarSlot
      onNearCar?.(nearCarSlot)
    }

    // Eyes at head height, walk-bob, look along yaw+pitch.
    const eyeY = 1.6 + Math.abs(Math.sin(bob.current)) * 0.035
    camera.position.set(pos.current.x, eyeY, pos.current.z)
    camera.lookAt(
      pos.current.x + Math.sin(camYaw.current) * Math.cos(pitch),
      eyeY + Math.sin(pitch),
      pos.current.z + Math.cos(camYaw.current) * Math.cos(pitch),
    )
    // hand torch: rides just under the eyes, aims where you look
    if (torchLight.current && torchTarget.current) {
      torchLight.current.position.set(pos.current.x, eyeY - 0.25, pos.current.z)
      torchTarget.current.position.set(
        pos.current.x + Math.sin(camYaw.current) * Math.cos(pitch) * 12,
        eyeY - 0.25 + Math.sin(pitch) * 12,
        pos.current.z + Math.cos(camYaw.current) * Math.cos(pitch) * 12,
      )
    }
    // Keep the on-glass screens glued: refresh matrices BEFORE drei <Html>
    // computes its CSS transform this frame (see CameraRig, same trick).
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  }, -1)

  return (
    <>
      <group ref={group}>
        {/* slightly slimmed to match the tighter collision radius */}
        <group scale={[0.88, 1, 0.88]}>
          <StandingFigure />
        </group>
      </group>
      {torch && (
        <>
          <spotLight
            ref={torchLight}
            angle={0.4}
            penumbra={0.55}
            intensity={50}
            distance={26}
            decay={1.3}
            color="#fff2d8"
          />
          <object3D ref={torchTarget} />
        </>
      )}
    </>
  )
}
