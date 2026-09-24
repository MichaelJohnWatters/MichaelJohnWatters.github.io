import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLLIDERS, BUILDING_WALLS, WORLD, GARAGE, DOORS } from './layout'
import { engineStart, engineSpeed, engineStop } from './sfx'

// Arcade drive controller for the Civic. Kinematic: W/S throttle-brake,
// A/D steer (authority scales with speed), gentle drag, circle-vs-AABB
// collisions with a soft bounce. Chase camera. The car pose lives in
// carRef (App owns it) so it persists when you get out.
const TOP = 11 // m/s (~40 km/h — lot speed)
const TOP_REV = 4
const ACCEL = 7
const BRAKE = 14
const DRAG = 2.2
const STEER = 1.9 // rad/s at full authority
const CAR_R = 0.95 // collision circle radius

const clamp = THREE.MathUtils.clamp
const tmpCam = new THREE.Vector3()

function hitsBox(x, z, b, r) {
  return x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
}

// The car collides with: interior clutter, the building's side/back walls,
// the front wall EXCEPT open doorways, and the world perimeter.
function carBlocked(x, z, doors) {
  for (const b of COLLIDERS) if (hitsBox(x, z, b, CAR_R)) return true
  for (const b of BUILDING_WALLS) if (hitsBox(x, z, b, CAR_R)) return true
  if (z > GARAGE.maxZ - 0.1 - CAR_R && z < GARAGE.maxZ + 0.1 + CAR_R) {
    let inDoor = false
    for (let i = 0; i < DOORS.length; i++) {
      const d = DOORS[i]
      if (doors?.[i] && x > d.x - d.w / 2 + CAR_R && x < d.x + d.w / 2 - CAR_R) inDoor = true
    }
    if (!inDoor && x > GARAGE.minX && x < GARAGE.maxX) return true
  }
  if (x < WORLD.minX + CAR_R + 0.2 || x > WORLD.maxX - CAR_R - 0.2) return true
  if (z < WORLD.minZ + CAR_R + 0.2 || z > WORLD.maxZ - CAR_R - 0.2) return true
  return false
}

export default function Drive({ carRef, doors, onExit, joyRef }) {
  const { camera } = useThree()
  const keys = useRef({ f: false, b: false, l: false, r: false })
  const speed = useRef(0)
  const doorsRef = useRef(doors)
  doorsRef.current = doors

  useEffect(() => {
    engineStart()
    const map = {
      KeyW: 'f', ArrowUp: 'f',
      KeyS: 'b', ArrowDown: 'b',
      KeyA: 'l', ArrowLeft: 'l',
      KeyD: 'r', ArrowRight: 'r',
    }
    const down = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = true
      if (e.code === 'KeyE') onExit?.()
    }
    const up = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = false
    }
    const clear = () => {
      keys.current = { f: false, b: false, l: false, r: false }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    if (document.pointerLockElement) document.exitPointerLock()
    return () => {
      engineStop()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [onExit])

  useFrame((_, dt) => {
    const c = carRef.current
    const k = keys.current
    const joy = joyRef?.current || { x: 0, y: 0 }
    const throttle = (k.f ? 1 : 0) - (k.b ? 1 : 0) - joy.y
    const steerIn = (k.r ? 1 : 0) - (k.l ? 1 : 0) + joy.x

    let v = speed.current
    if (throttle > 0) v += ACCEL * throttle * dt
    else if (throttle < 0) v += (v > 0 ? -BRAKE : ACCEL * throttle) * dt
    // drag toward rest
    v -= Math.sign(v) * Math.min(Math.abs(v), DRAG * dt)
    v = clamp(v, -TOP_REV, TOP)

    // steer authority ramps with speed (no tank-turning at standstill);
    // steering flips with reverse, like a real car
    const auth = clamp(Math.abs(v) / 3, 0, 1)
    c.heading -= steerIn * STEER * auth * Math.sign(v) * dt

    const nx = c.x + Math.sin(c.heading) * v * dt
    const nz = c.z + Math.cos(c.heading) * v * dt
    // axis-separated so scraping a wall slides along it
    if (!carBlocked(nx, c.z, doorsRef.current)) c.x = nx
    else v *= -0.2
    if (!carBlocked(c.x, nz, doorsRef.current)) c.z = nz
    else v *= -0.2
    speed.current = v
    engineSpeed(Math.abs(v) / TOP)

    // chase camera
    const a = 1 - Math.pow(0.001, dt)
    camera.position.lerp(
      tmpCam.set(
        c.x - Math.sin(c.heading) * 6,
        2.8,
        c.z - Math.cos(c.heading) * 6,
      ),
      a,
    )
    camera.lookAt(c.x, 1.0, c.z)
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  }, -1)

  return null
}
