import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLLIDERS, BUILDING_WALLS, WORLD, GARAGE, DOORS, CIRCLES } from './layout'
import { IS_TOUCH } from './touch'
import { engineStart, engineSpeed, engineStop, horn, screechStart, screechStop, shiftClack } from './sfx'

// Arcade drive controller with a simulated manual gearbox + clutch.
//   W/S throttle-brake · A/D steer · ⇧ clutch (hold) · ↑/↓ shift · E out
// Auto-shifts as you accelerate, but holding the clutch lets you free-rev to
// the limiter and DROP it for a wheelspin launch. Poses live in App's
// vehicles ref so they persist where you park.
const PARAMS = {
  car: {
    // taller gears + gentler accel so the revs BUILD in gear (not snap to
    // the limiter). Top ~130 km/h in 5th.
    gears: [8, 15, 22, 29, 36], // top speed (m/s) per gear 1..5
    gearMul: [1.0, 0.75, 0.58, 0.46, 0.38], // low gears pull harder
    accel: 6, brake: 14, rev: 5, steer: 1.8, r: 0.95,
    camD: 6.5, camH: 2.9, eyeY: 1.02, eyeOff: 1.2,
  },
  bike: {
    gears: [10, 19, 28, 37, 46], // ~165 km/h flat out
    gearMul: [1.1, 0.82, 0.64, 0.52, 0.44],
    accel: 8, brake: 16, rev: 4, steer: 2.6, r: 0.45,
    camD: 5, camH: 2.1, eyeY: 1.34, eyeOff: -0.05,
  },
}
const DRAG = 1.6
const REV_RATE = 2.4 // how fast the engine free-revs with the clutch in

const clamp = THREE.MathUtils.clamp
const tmpCam = new THREE.Vector3()

function hitsBox(x, z, b, r) {
  return x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
}

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
  for (const c of CIRCLES) if (Math.hypot(x - c.x, z - c.z) < r + c.r) return true
  for (const o of others) if (Math.hypot(x - o.x, z - o.z) < r + o.r) return true
  return false
}

export default function Drive({ vehiclesRef, index = 0, doors, onExit, joyRef }) {
  const { camera } = useThree()
  const keys = useRef({ f: false, b: false, l: false, r: false, clutch: false })
  const speed = useRef(0)
  const doorsRef = useRef(doors)
  doorsRef.current = doors
  const P = PARAMS[vehiclesRef.current[index]?.kind] || PARAMS.car
  const isBike = vehiclesRef.current[index]?.kind === 'bike'
  const [cockpit, setCockpit] = useState(false)

  // gearbox state (refs — mutated in the frame loop and key handlers)
  const gear = useRef(1)
  const rpm = useRef(0.15)
  const shiftCd = useRef(0)
  const prevClutch = useRef(false)
  const launch = useRef(0) // clutch-drop wheelspin timer (s)
  const screeching = useRef(false)
  const topSpeed = P.gears[P.gears.length - 1]

  const doShift = (dir) => {
    if (shiftCd.current > 0) return
    const g = clamp(gear.current + dir, 1, P.gears.length)
    if (g !== gear.current) {
      gear.current = g
      shiftCd.current = 0.3
      shiftClack()
    }
  }

  // V/C toggles chase↔cockpit; H honks; ↑/↓ shift; ⇧ clutch.
  useEffect(() => {
    const toggle = () => setCockpit((v) => !v)
    const honk = () => horn(isBike ? 'bike' : 'car')
    const onKey = (e) => {
      if (e.code === 'KeyV' || e.code === 'KeyC') toggle()
      if (e.code === 'KeyH') honk()
      if (e.code === 'ArrowUp') doShift(1)
      if (e.code === 'ArrowDown') doShift(-1)
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
    engineStart(isBike ? 'bike' : 'car')
    const map = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r' }
    const down = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = true
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.clutch = true
      if (e.code === 'KeyE') onExit?.()
      if (e.code === 'KeyF') window.dispatchEvent(new Event('vehicle-flash'))
    }
    const up = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = false
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.clutch = false
    }
    const clear = () => {
      keys.current = { f: false, b: false, l: false, r: false, clutch: false }
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
    const throttle = clamp((k.f ? 1 : 0) - (k.b ? 1 : 0) - joy.y, -1, 1)
    const steerIn = clamp((k.r ? 1 : 0) - (k.l ? 1 : 0) + joy.x, -1, 1)
    const clutchIn = k.clutch
    shiftCd.current = Math.max(0, shiftCd.current - dt)
    launch.current = Math.max(0, launch.current - dt)

    let v = speed.current
    let g = gear.current

    // --- ENGINE RPM ---
    if (clutchIn) {
      // clutch pressed: engine free-revs, decoupled from the wheels
      const target = throttle > 0 ? 1.0 : 0.14
      rpm.current += (target - rpm.current) * (throttle > 0 ? REV_RATE : 2) * dt
      rpm.current = clamp(rpm.current, 0.12, 1)
      if (rpm.current > 0.98) rpm.current = 0.94 + Math.random() * 0.05 // limiter flutter
    } else {
      // engaged: rpm tracks road speed within the current gear
      const top = P.gears[g - 1]
      const bot = g > 1 ? P.gears[g - 2] : 0
      const sp = Math.max(0, v)
      rpm.current = clamp(0.15 + 0.85 * ((sp - bot) / Math.max(0.5, top - bot)), 0.12, 1.06)
      if (rpm.current > 1) rpm.current = 0.97 + Math.random() * 0.03 // bouncing off the limiter
    }

    // clutch DROP: released at high revs while nearly stopped → launch
    if (prevClutch.current && !clutchIn && rpm.current > 0.7 && Math.abs(v) < 4) {
      launch.current = 0.7
      gear.current = g = 1
    }
    prevClutch.current = clutchIn

    // --- DRIVE FORCE ---
    if (v <= 0.05 && throttle < 0) {
      // reverse (no gearbox)
      v += P.accel * 0.6 * throttle * dt
      v = Math.max(v, -P.rev)
    } else if (!clutchIn && throttle > 0) {
      // forward torque: peak mid-band, taper near the limiter, punchier low gears
      const torque = clamp(1.15 - 0.85 * Math.abs(rpm.current - 0.55), 0.4, 1)
      let a = P.accel * throttle * torque * P.gearMul[g - 1]
      if (launch.current > 0) a *= 2.6 // clutch-drop wheelspin boost
      v += a * dt
    } else if (throttle < 0) {
      v += -P.brake * -throttle * dt // braking
      if (v < 0) v = 0
    }
    // drag toward rest
    v -= Math.sign(v) * Math.min(Math.abs(v), DRAG * dt)
    v = clamp(v, -P.rev, topSpeed)

    // --- AUTO-SHIFT: touch only (no shift keys). Desktop is fully manual:
    // wind it out, upshift yourself, downshift for corners. ---
    if (IS_TOUCH && !clutchIn && shiftCd.current <= 0 && v > 0.3) {
      if (rpm.current > 0.94 && g < P.gears.length) doShift(1)
      else if (rpm.current < 0.33 && g > 1) doShift(-1)
    }

    // --- WHEELSPIN (launch, or flooring 1st from low speed) ---
    const spin =
      launch.current > 0 ||
      (gear.current === 1 && !clutchIn && throttle > 0 && v < 3.5 && rpm.current > 0.82)
    if (spin && !screeching.current) {
      screechStart()
      screeching.current = true
    } else if (!spin && screeching.current) {
      screechStop()
      screeching.current = false
    }

    // steering — authority ramps with speed, flips in reverse
    const auth = clamp(Math.abs(v) / 3, 0, 1)
    const steer = steerIn * auth * Math.sign(v || 1)
    c.heading -= steer * P.steer * dt
    c.lean = THREE.MathUtils.lerp(
      c.lean || 0,
      steer * Math.sqrt(clamp(Math.abs(v) / topSpeed, 0, 1)) * 0.75,
      1 - Math.pow(0.001, dt),
    )

    // integrate + collide (axis-separated slide)
    const nx = c.x + Math.sin(c.heading) * v * dt
    const nz = c.z + Math.cos(c.heading) * v * dt
    if (!vehicleBlocked(nx, c.z, P.r, doorsRef.current, others)) c.x = nx
    else v *= -0.2
    if (!vehicleBlocked(c.x, nz, P.r, doorsRef.current, others)) c.z = nz
    else v *= -0.2
    speed.current = v
    engineSpeed(rpm.current)

    // HUD (DOM write, no React churn) — gear, rev bar, clutch, km/h
    const hud = document.getElementById('gear-num')
    if (hud) {
      hud.textContent = v < -0.1 ? 'R' : gear.current
      const fill = document.getElementById('rpm-fill')
      if (fill) {
        fill.style.width = `${Math.round(clamp(rpm.current, 0, 1) * 100)}%`
        fill.style.background = rpm.current > 0.9 ? '#ff4e45' : '#5ad0e6'
      }
      const spd = document.getElementById('spd-num')
      if (spd) spd.textContent = Math.round(Math.abs(v) * 3.6)
      document.documentElement.classList.toggle('clutch-in', clutchIn)
    }

    const fx = Math.sin(c.heading)
    const fz = Math.cos(c.heading)
    if (cockpit) {
      camera.position.set(c.x + fx * P.eyeOff, P.eyeY, c.z + fz * P.eyeOff)
      camera.lookAt(c.x + fx * 14, P.eyeY - 0.2, c.z + fz * 14)
      if (isBike) camera.rotateZ((c.lean || 0) * 0.8)
    } else {
      const a = 1 - Math.pow(0.001, dt)
      camera.position.lerp(tmpCam.set(c.x - fx * P.camD, P.camH, c.z - fz * P.camD), a)
      camera.lookAt(c.x, 1.0, c.z)
    }
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  }, -1)

  return null
}
