import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLLIDERS, BUILDING_WALLS, WORLD, GARAGE, DOORS, CIRCLES } from './layout'
import { engineStart, engineSpeed, engineStop, horn } from './sfx'

// Arcade drive controller for any vehicle. Kinematic: W/S throttle-brake,
// A/D steer (authority scales with speed), gentle drag, circle-vs-AABB
// collisions with a soft bounce. Chase camera. Poses live in App's
// vehicles ref so they persist where you park.
const PARAMS = {
  // car "cockpit" is a bonnet cam — just ahead of the windshield box
  car: { top: 11, rev: 4, accel: 7, brake: 14, steer: 1.9, r: 0.95, camD: 6, camH: 2.8, pitch: 1, eyeY: 1.02, eyeOff: 1.2 },
  bike: { top: 15, rev: 3, accel: 10, brake: 16, steer: 2.7, r: 0.45, camD: 4.5, camH: 2.1, pitch: 1.9, eyeY: 1.34, eyeOff: -0.05 },
}
const DRAG = 2.2

const clamp = THREE.MathUtils.clamp
const tmpCam = new THREE.Vector3()

function hitsBox(x, z, b, r) {
  return x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
}

// Vehicles collide with: interior clutter, the building's side/back walls,
// the front wall EXCEPT open doorways, the world perimeter, and each other.
function vehicleBlocked(x, z, r, doors, others) {
  for (const b of COLLIDERS) if (hitsBox(x, z, b, r)) return true
  for (const b of BUILDING_WALLS) if (hitsBox(x, z, b, r)) return true
  if (z > GARAGE.maxZ - 0.1 - r && z < GARAGE.maxZ + 0.1 + r) {
    let inDoor = false
    for (let i = 0; i < DOORS.length; i++) {
      const d = DOORS[i]
      if (doors?.[i] && x > d.x - d.w / 2 + r && x < d.x + d.w / 2 - r) inDoor = true
    }
    if (!inDoor && x > GARAGE.minX && x < GARAGE.maxX) return true
  }
  if (x < WORLD.minX + r + 0.2 || x > WORLD.maxX - r - 0.2) return true
  if (z < WORLD.minZ + r + 0.2 || z > WORLD.maxZ - r - 0.2) return true
  for (const c of CIRCLES) {
    if (Math.hypot(x - c.x, z - c.z) < r + c.r) return true
  }
  for (const o of others) {
    if (Math.hypot(x - o.x, z - o.z) < r + o.r) return true
  }
  return false
}

export default function Drive({ vehiclesRef, index = 0, doors, onExit, joyRef }) {
  const { camera } = useThree()
  const keys = useRef({ f: false, b: false, l: false, r: false })
  const speed = useRef(0)
  const doorsRef = useRef(doors)
  doorsRef.current = doors
  const P = PARAMS[vehiclesRef.current[index]?.kind] || PARAMS.car
  const isBike = vehiclesRef.current[index]?.kind === 'bike'
  const [cockpit, setCockpit] = useState(false)

  // V/C (or the HUD button's event) toggles chase ↔ cockpit; H honks.
  useEffect(() => {
    const toggle = () => setCockpit((v) => !v)
    const honk = () => horn(isBike ? 'bike' : 'car')
    const onKey = (e) => {
      if (e.code === 'KeyV' || e.code === 'KeyC') toggle()
      if (e.code === 'KeyH') honk()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('drive-cam', toggle)
    window.addEventListener('vehicle-horn', honk)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('drive-cam', toggle)
      window.removeEventListener('vehicle-horn', honk)
    }
  }, [isBike])

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
      if (e.code === 'KeyF') window.dispatchEvent(new Event('vehicle-flash'))
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
    const c = vehiclesRef.current[index]
    if (!c) return
    const others = vehiclesRef.current.filter((_, i) => i !== index)
    const k = keys.current
    const joy = joyRef?.current || { x: 0, y: 0 }
    const throttle = (k.f ? 1 : 0) - (k.b ? 1 : 0) - joy.y
    const steerIn = (k.r ? 1 : 0) - (k.l ? 1 : 0) + joy.x

    let v = speed.current
    if (throttle > 0) v += P.accel * throttle * dt
    else if (throttle < 0) v += (v > 0 ? -P.brake : P.accel * throttle) * dt
    // drag toward rest
    v -= Math.sign(v) * Math.min(Math.abs(v), DRAG * dt)
    v = clamp(v, -P.rev, P.top)

    // steer authority ramps with speed (no tank-turning at standstill);
    // steering flips with reverse, like a real vehicle
    const auth = clamp(Math.abs(v) / 3, 0, 1)
    const steer = steerIn * auth * Math.sign(v)
    c.heading -= steer * P.steer * dt
    // bikes lean into the corner with speed — properly committed (~43° max,
    // sqrt curve so it reads at town speeds too)
    c.lean = THREE.MathUtils.lerp(
      c.lean || 0,
      steer * Math.sqrt(clamp(Math.abs(v) / P.top, 0, 1)) * 0.75,
      1 - Math.pow(0.001, dt),
    )

    const nx = c.x + Math.sin(c.heading) * v * dt
    const nz = c.z + Math.cos(c.heading) * v * dt
    // axis-separated so scraping a wall slides along it
    if (!vehicleBlocked(nx, c.z, P.r, doorsRef.current, others)) c.x = nx
    else v *= -0.2
    if (!vehicleBlocked(c.x, nz, P.r, doorsRef.current, others)) c.z = nz
    else v *= -0.2
    speed.current = v
    engineSpeed((Math.abs(v) / P.top) * P.pitch)

    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    if (cockpit) {
      // first person: eyes in the seat, locked to the vehicle
      camera.position.set(c.x + fx * P.eyeOff, P.eyeY, c.z + fz * P.eyeOff)
      camera.lookAt(c.x + fx * 14, P.eyeY - 0.2, c.z + fz * 14)
      // riders lean WITH the bike
      if (isBike) camera.rotateZ((c.lean || 0) * 0.8)
    } else {
      // chase camera
      const a = 1 - Math.pow(0.001, dt)
      camera.position.lerp(tmpCam.set(c.x - fx * P.camD, P.camH, c.z - fz * P.camD), a)
      camera.lookAt(c.x, 1.0, c.z)
    }
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  }, -1)

  return null
}
