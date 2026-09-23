import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GARAGE, COLLIDERS, SEAT } from './layout'
import { footstep } from './sfx'

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
const RADIUS = 0.35 // player body radius for collisions
const WALL = 0.3 // keep-off distance from walls
const SIT_DIST = 1.4 // how close to the chair before you can sit
const CAM_DIST = 3.4 // follow distance behind the character
const CAM_HEIGHT = 2.0
const clamp = THREE.MathUtils.clamp
const tmpCam = new THREE.Vector3()

// Smoothly chase an angle, always around the short way.
function dampAngle(cur, target, lambda, dt) {
  const diff = ((target - cur + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  return cur + diff * (1 - Math.pow(lambda, dt))
}

function blocked(x, z) {
  for (const b of COLLIDERS) {
    if (x > b.minX - RADIUS && x < b.maxX + RADIUS && z > b.minZ - RADIUS && z < b.maxZ + RADIUS) {
      return true
    }
  }
  return false
}

// Walkable character, third- OR first-person (view prop). Mounted in
// "explore" mode. Spawns beside the desk on the open half of the garage.
export default function Player({ start = [-1.5, 0, -0.5], onNearSeat, onSit, view = 'third', joyRef }) {
  const group = useRef()
  const pos = useRef(new THREE.Vector3(...start))
  const keys = useKeys()
  const { camera } = useThree()
  const near = useRef(false)
  const bob = useRef(0)
  // Camera yaw: in third person it chases the walking heading; in first
  // person the mouse drives it directly (starts facing the garage).
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

  // E to sit back down at the desk (only when close to the chair).
  useEffect(() => {
    const sit = (e) => {
      if (e.code === 'KeyE' && near.current) onSit?.()
    }
    window.addEventListener('keydown', sit)
    return () => window.removeEventListener('keydown', sit)
  }, [onSit])

  useFrame((_, delta) => {
    const k = keys.current
    const first = view === 'first'

    // First person: the mouse position steers the view directly.
    // Centre of screen = spawn facing; edges sweep ±180° / pitch ±~30°.
    if (first) {
      camYaw.current = Math.PI + (0.5 - mouse.current.x) * Math.PI * 2
    }
    const pitch = first ? THREE.MathUtils.clamp((0.5 - mouse.current.y) * 1.1, -0.55, 0.55) : 0

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
      const nx = clamp(pos.current.x + dx * step, GARAGE.minX + WALL, GARAGE.maxX - WALL)
      if (!blocked(nx, pos.current.z)) pos.current.x = nx
      const nz = clamp(pos.current.z + dz * step, GARAGE.minZ + WALL, GARAGE.maxZ - WALL)
      if (!blocked(pos.current.x, nz)) pos.current.z = nz
      const heading = Math.atan2(dx, dz)
      group.current.rotation.y = heading
      // Third person: swing the camera around behind the new heading.
      if (!first) camYaw.current = dampAngle(camYaw.current, heading, 0.08, delta)
      // Footstep on each bob trough (~2 steps/sec at walk speed).
      const prevPhase = Math.floor(bob.current / Math.PI)
      bob.current += delta * 10
      if (Math.floor(bob.current / Math.PI) !== prevPhase) footstep()
    }

    group.current.visible = !first // hide the body in first person
    group.current.position.set(
      pos.current.x,
      Math.abs(Math.sin(bob.current)) * 0.04,
      pos.current.z,
    )

    // Near the chair? Surface the "sit back down" prompt.
    const isNear = Math.hypot(pos.current.x - SEAT.x, pos.current.z - SEAT.z) < SIT_DIST
    if (isNear !== near.current) {
      near.current = isNear
      onNearSeat?.(isNear)
    }

    if (first) {
      // First person: eyes at head height, walk-bob, look along yaw+pitch.
      const eyeY = 1.6 + Math.abs(Math.sin(bob.current)) * 0.035
      camera.position.set(pos.current.x, eyeY, pos.current.z)
      camera.lookAt(
        pos.current.x + Math.sin(camYaw.current) * Math.cos(pitch),
        eyeY + Math.sin(pitch),
        pos.current.z + Math.cos(camYaw.current) * Math.cos(pitch),
      )
    } else {
      // Follow camera: orbits to sit BEHIND the current heading, above the
      // character, clamped INSIDE the garage so walls never block the view.
      const a = 1 - Math.pow(0.0025, delta)
      camera.position.lerp(
        tmpCam.set(
          clamp(pos.current.x - Math.sin(camYaw.current) * CAM_DIST, GARAGE.minX + 0.4, GARAGE.maxX - 0.4),
          CAM_HEIGHT,
          clamp(pos.current.z - Math.cos(camYaw.current) * CAM_DIST, GARAGE.minZ + 0.4, GARAGE.maxZ - 0.3),
        ),
        a,
      )
      camera.lookAt(pos.current.x, 1.2, pos.current.z)
    }
    // Keep the on-glass screens glued: refresh matrices BEFORE drei <Html>
    // computes its CSS transform this frame (see CameraRig, same trick).
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  }, -1)

  return (
    <group ref={group}>
      <StandingFigure />
    </group>
  )
}
