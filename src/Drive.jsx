import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COLLIDERS, BUILDING_WALLS, WORLD, GARAGE, DOORS, CIRCLES } from './layout'
import { IS_TOUCH } from './touch'
import { engineStart, engineSpeed, engineStop, horn, screechStart, screechStop, shiftClack, explode, starter, stallSound } from './sfx'

// Arcade drive controller with a simulated manual gearbox + clutch.
//   W/S throttle-brake · A/D steer · ⇧ clutch (hold) · ↑/↓ shift · E out
// Auto-shifts as you accelerate, but holding the clutch lets you free-rev to
// the limiter and DROP it for a wheelspin launch. Poses live in App's
// vehicles ref so they persist where you park.
const PARAMS = {
  car: {
    // widely-spread progressive gears; 1st long enough that low speed = low revs
    gears: [8, 16, 26, 37, 50], // top speed (m/s) per gear 1..5: 29/58/94/133/180 km/h
    gearMul: [1.0, 0.82, 0.68, 0.56, 0.46], // upper gears still pull properly
    accel: 9.5, brake: 15, rev: 5, steer: 1.8, r: 0.95, grip: 7, // grip = traction limit (m/s²)
    camD: 6.5, camH: 2.9, eyeY: 1.02, eyeOff: 1.2,
  },
  bike: {
    gears: [7, 16, 28, 42, 58], // ~209 km/h flat out
    gearMul: [1.12, 0.88, 0.74, 0.62, 0.52],
    accel: 12, brake: 17, rev: 4, steer: 2.6, r: 0.45, grip: 8,
    camD: 5, camH: 2.1, eyeY: 1.34, eyeOff: -0.05,
  },
}
const DRAG = 1.3
const REV_RATE = 4.8 // free-rev snappily when declutched (engine disconnected)
const IDLE_RPM = 0.12

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

export default function Drive({ vehiclesRef, index = 0, doors, onExit, joyRef, auto = false }) {
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
  const stalled = useRef(false) // engine stalled (revs dropped too low in gear)
  const limT = useRef(0) // rev-limiter stutter clock
  const ignCd = useRef(0) // ignition cooldown (stops lurch-spamming the car)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const topSpeed = P.gears[P.gears.length - 1]

  const doShift = (dir) => {
    if (shiftCd.current > 0) return
    // -1 = Reverse, 0 = Neutral, 1..5 = drive gears
    const g = clamp(gear.current + dir, -1, P.gears.length)
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
    if (vehiclesRef.current[index]) {
      vehiclesRef.current[index].blown = false
      vehiclesRef.current[index].wheelspin = false
    }
    if (auto) {
      // automatic: engine already running, in 1st, auto-clutch — just drive
      engineStart(isBike ? 'bike' : 'car')
      gear.current = 1
      stalled.current = false
      rpm.current = IDLE_RPM
    } else {
      // desktop: engine OFF in neutral — press G to start (turn the key)
      gear.current = 0
      stalled.current = true
      rpm.current = 0
    }
    // ignition: G starts the engine. Turn the key IN GEAR without the clutch
    // and it lurches then stalls — just like the real thing.
    const ignite = () => {
      const c = vehiclesRef.current[index]
      if (!c || c.blown || !stalled.current || ignCd.current > 0) return
      ignCd.current = 1.2 // no spamming the starter
      starter()
      if (gear.current > 0 && !keys.current.clutch) {
        // key turned IN GEAR, clutch out: the starter heaves the car forward
        // against the drivetrain, then the engine can't catch → it lurches
        // and stays dead. (Start in neutral, or hold the clutch.)
        speed.current += 2.2
        stallSound()
        return
      }
      stalled.current = false
      rpm.current = IDLE_RPM
      engineStart(isBike ? 'bike' : 'car')
    }
    const map = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r' }
    const down = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = true
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.clutch = true
      if (e.code === 'KeyI') ignite()
      if (e.code === 'KeyE') onExitRef.current?.()
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
    // run ONCE per mount — onExit is read via a ref so re-renders don't reset
    // the engine/gearbox mid-drive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, dt) => {
    const c = vehiclesRef.current[index]
    if (!c) return
    c.cockpit = cockpit // Room's Rider hides its head/torso in first-person
    const others = vehiclesRef.current.filter((_, i) => i !== index)
    const k = keys.current
    const joy = joyRef?.current || { x: 0, y: 0 }
    // gas = go (in the current gear's direction); brakeIn = slow/stop
    const gas = clamp((k.f ? 1 : 0) + Math.max(0, -joy.y), 0, 1)
    const brakeIn = clamp((k.b ? 1 : 0) + Math.max(0, joy.y), 0, 1)
    const throttle = gas // the engine revs on gas, whatever gear you're in
    const steerIn = clamp((k.r ? 1 : 0) - (k.l ? 1 : 0) + joy.x, -1, 1)
    const clutchIn = auto ? false : k.clutch // automatic = no clutch
    // automatic: if the engine is off/in neutral (e.g. auto toggled on mid-ride),
    // fire it up and drop into 1st so it just goes.
    if (auto && !c.blown && (stalled.current || gear.current === 0)) {
      if (stalled.current) { stalled.current = false; rpm.current = IDLE_RPM; engineStart(isBike ? 'bike' : 'car') }
      if (gear.current === 0) gear.current = 1
    }
    shiftCd.current = Math.max(0, shiftCd.current - dt)
    launch.current = Math.max(0, launch.current - dt)
    ignCd.current = Math.max(0, ignCd.current - dt)

    let v = speed.current
    let g = gear.current
    const neutral = g === 0
    const decoupled = clutchIn || neutral // engine not driving the wheels
    const dead = !!c.blown
    const IDLE = IDLE_RPM
    let wrRaw = 0 // wheel-demanded rpm (for the over-rev warning)
    let wheelspin = false

    // this gear's redline road speed (Reverse mirrors 1st, backwards)
    const gearTop = g === -1 ? P.rev : g >= 1 ? P.gears[g - 1] : 1
    const gearMul = g === -1 ? P.gearMul[0] : g >= 1 ? P.gearMul[g - 1] : 0
    const dir = g === -1 ? -1 : 1 // which way this gear drives
    // rpm the WHEELS spin the engine to at this speed in this gear (fraction
    // of the gear's redline speed). ~0 at a standstill, so an engaged clutch
    // drags the engine toward a stall.
    const wheelRpm = (sp) => (g === 0 ? 0 : Math.abs(sp) / gearTop)

    // --- ENGINE RPM (its own inertial state — NOT just a function of speed;
    // that's why a wall bogs it, and dropping the revs in gear STALLS it) ---
    if (dead || stalled.current) {
      rpm.current = Math.max(0, rpm.current - 0.6 * dt)
    } else if (decoupled) {
      // clutch in / neutral: free-revs on throttle, falls on engine friction
      const target = throttle > 0 ? 1.0 : IDLE
      rpm.current += (target - rpm.current) * (throttle > 0 ? REV_RATE : 1.8) * dt
      if (rpm.current > 0.98 && throttle > 0) rpm.current = 0.95 + Math.random() * 0.04 // limiter
      rpm.current = clamp(rpm.current, IDLE, 1.02)
    } else {
      // engaged: the clutch couples engine↔wheels. The driveline load is
      // HUGE at a standstill (locked wheels) — so pulling away in gear on
      // throttle alone drags the revs down and stalls, exactly like a real
      // manual. You have to slip the clutch (rev + drop) to launch.
      wrRaw = wheelRpm(v)
      // slipping clutch (a launch) barely couples, so the revs stay up; a
      // standstill in gear couples HARD (big load → stalls); rolling is mild
      const couple = launch.current > 0 ? 1.2 : Math.abs(v) < 1.2 ? 8 : 2.6
      rpm.current += (wrRaw - rpm.current) * couple * dt
      rpm.current += throttle * 1.0 * dt
      rpm.current -= 0.35 * dt
      if (rpm.current > 1.02 && wrRaw <= 1.05) rpm.current = 1.0 + Math.random() * 0.02
      rpm.current = clamp(rpm.current, 0, 1.6)
      // STALL: revs dragged under the stall line while in gear (not mid-launch,
      // not while deliberately reversing). Automatic has an auto-clutch — no stall.
      if (!auto && launch.current <= 0 && throttle >= 0 && rpm.current < 0.09) {
        stalled.current = true
        stallSound()
        engineStop()
        if (screeching.current) {
          screechStop()
          screeching.current = false
        }
      }
      // MONEY SHIFT: the wheels force the engine >140% of redline (a reckless
      // downshift at speed) → the gearbox grenades
      if (wrRaw > 1.4) {
        c.blown = true
        explode()
        engineStop()
        if (screeching.current) {
          screechStop()
          screeching.current = false
        }
      }
    }

    // clutch DROP: released at high revs while nearly stopped → launch
    if (!dead && prevClutch.current && !clutchIn && !neutral && rpm.current > 0.7 && Math.abs(v) < 4) {
      launch.current = 0.7
      if (g === 0) gear.current = g = 1 // from neutral, launch in 1st
    }
    prevClutch.current = clutchIn

    const brakeNow = () => {
      const b = P.brake * brakeIn * dt
      if (v > 0) v = Math.max(0, v - b)
      else if (v < 0) v = Math.min(0, v + b)
    }

    // --- DRIVE FORCE ---
    if (dead) {
      // blown: no power, coasts down over a few seconds (doesn't stop dead)
      v -= Math.sign(v) * Math.min(Math.abs(v), 4 * dt)
    } else if (stalled.current || neutral) {
      // no drive to the wheels — you can still brake
      if (brakeIn > 0) brakeNow()
    } else {
      // in a gear (Reverse or 1..5): gas drives in the gear's direction, but
      // the REV LIMITER caps you at the gear's top speed — hold a gear and you
      // just bounce off the limiter (upshift to go faster). You only over-rev
      // by DOWNSHIFTING at speed (that's the money shift).
      if (gas > 0 && !clutchIn && Math.abs(v) < gearTop * 1.02) {
        const torque = clamp(1.15 - 0.85 * Math.abs(rpm.current - 0.55), 0.4, 1)
        let demand = P.accel * gas * torque * gearMul
        if (launch.current > 0) demand *= 2.6 // clutch-drop boost
        // TRACTION: tyres put down only so much grip — beyond it they spin
        wheelspin = demand > P.grip + 0.15
        if (wheelspin) rpm.current = clamp(rpm.current + 1.3 * dt, IDLE, 1.05)
        v += dir * Math.min(demand, P.grip) * dt
      }
      if (brakeIn > 0) {
        if (Math.abs(v) > 0.1) brakeNow()
        else if (g >= 1) {
          // pull back at a stop → reverse. On the BIKE it's a slow leg-paddle
          // (you can't ride a motorbike backwards — you walk it back).
          const revMax = isBike ? 1.4 : P.rev
          v = Math.max(-revMax, v - P.accel * (isBike ? 0.25 : 0.5) * brakeIn * dt)
        }
      }
    }
    c.paddle = isBike && v < -0.05 // Room's Rider drops a leg to push it back
    // drag toward rest
    v -= Math.sign(v) * Math.min(Math.abs(v), DRAG * dt)
    v = clamp(v, -P.rev, topSpeed)

    // --- AUTO-SHIFT (automatic mode: mobile always, desktop toggle). Manual =
    // wind it out, upshift yourself, downshift for corners. ---
    if (!dead && auto && !clutchIn && shiftCd.current <= 0 && v > 0.3) {
      if ((g === 0 || rpm.current > 0.94) && g < P.gears.length) doShift(1)
      else if (rpm.current < 0.33 && g > 1) doShift(-1)
    }

    // --- WHEELSPIN screech (traction exceeded, or a clutch-drop launch) ---
    const spin = !dead && !stalled.current && (wheelspin || launch.current > 0)
    c.wheelspin = spin // Room reads this to smoke the tyres
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
    // HARD REV-LIMITER: bang off the limiter and the ECU cuts fuel in bursts
    // — the engine (and its note) stutters. Only when the ENGINE is pushing
    // the limit (not a wheel-forced over-rev, which grenades instead).
    limT.current += dt
    const atLimit = !dead && !stalled.current && rpm.current >= 0.985 && wrRaw <= 1.05
    const cut = atLimit && Math.sin(limT.current * 95) > 0
    if (cut) rpm.current = 0.9 // fuel cut drops it before it catches again
    engineSpeed(rpm.current, cut)

    // HUD (DOM write, no React churn) — gear, rev bar, clutch, km/h
    const hud = document.getElementById('gear-num')
    if (hud) {
      hud.textContent = dead
        ? '✕'
        : gear.current === -1
          ? 'R'
          : gear.current === 0
            ? 'N'
            : gear.current
      const fill = document.getElementById('rpm-fill')
      if (fill) {
        fill.style.width = `${Math.round(clamp(rpm.current, 0, 1) * 100)}%`
        fill.style.background = dead ? '#555' : rpm.current > 0.9 ? '#ff4e45' : '#5ad0e6'
      }
      const spd = document.getElementById('spd-num')
      if (spd) spd.textContent = Math.round(Math.abs(v) * 3.6)
      document.documentElement.classList.toggle('clutch-in', clutchIn)
      // over-rev / blown warning
      const warn = document.getElementById('rev-warn')
      if (warn) {
        const msg = dead
          ? '✕ GEARBOX BLOWN'
          : stalled.current
            ? '⚠ ENGINE OFF — press I to start (in N or clutch in)'
            : wrRaw > 1.05
              ? '⚠ OVER-REV!'
              : spin
                ? '🔥 WHEELSPIN — no grip'
                : rpm.current > 0.92
                  ? 'REDLINE'
                  : ''
        warn.textContent = msg
        warn.className =
          'rev-warn' +
          (dead || stalled.current
            ? ' blown'
            : msg === '⚠ OVER-REV!'
              ? ' danger'
              : spin
                ? ' spin'
                : msg
                  ? ' redline'
                  : '')
      }
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
