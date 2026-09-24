import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useBox, useCylinder, useRaycastVehicle } from '@react-three/cannon'
import * as THREE from 'three'
import { CIVIC } from './layout'
import { GEARMUL } from './cars'
import { IS_TOUCH } from './touch'
import {
  engineStart, engineSpeed, engineStop, horn, screechStart, screechStop,
  shiftClack, explode, starter, stallSound,
} from './sfx'

// REAL raycast-vehicle Civic with the full manual gearbox ported on top:
// the engine/gearbox brain produces an ENGINE FORCE fed to the wheels, and
// cannon's tyre friction does the traction — overpower the grip and the
// wheels actually slip. Suspension, roll and airtime come for free.
const CHASSIS = [1.8, 0.7, 4.2]
const WHEEL_R = 0.34
const REV_TOP = 5 // reverse-gear top speed (m/s)
const ENGINE_BRAKE = 14 // off-throttle drag in gear (revs + speed ease down together)
const STEER_MAX = 0.55
const DEFAULT = { mass: 1200, force: 9000, brake: 130, grip: 2.6, gears: [8, 16, 26, 37, 50] }
const IDLE = 0.12
const REV_RATE = 4.8
const clamp = THREE.MathUtils.clamp
const tmp = new THREE.Vector3()

function Wheel({ wheelRef, radius }) {
  useCylinder(
    () => ({ mass: 1, type: 'Kinematic', material: 'wheel', collisionFilterGroup: 0, args: [radius, radius, 0.4, 16] }),
    wheelRef,
  )
  // VISIBLE — the raycast vehicle steers (front) and spins these for real
  return (
    <group ref={wheelRef}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, 0.32, 18]} />
        <meshStandardMaterial color="#15151a" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.45, radius * 0.45, 0.34, 8]} />
        <meshStandardMaterial color="#6a6a72" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function PhysicsCar({ vehiclesRef, active, onExit, profile = DEFAULT }) {
  const { camera } = useThree()
  const prof = useRef(profile)
  prof.current = profile
  const mass = profile.mass || DEFAULT.mass
  const chassisRef = useRef()
  const [, chassisApi] = useBox(
    () => ({ mass, args: CHASSIS, position: [CIVIC.pos[0], 1, CIVIC.pos[2]], angularDamping: 0.6, allowSleep: false }),
    chassisRef,
  )
  // live mass edits from the tuning panel (F=ma changes accel immediately)
  useEffect(() => {
    if (chassisApi.mass) chassisApi.mass.set(profile.mass)
  }, [profile.mass, chassisApi])

  const wheels = [useRef(), useRef(), useRef(), useRef()]
  // SUSPENSION grounded in the car's real mass: a heavier car gets stiffer
  // springs (holds ride height) and damping toward critical, so it rolls in
  // corners / dives on the brakes / squats on power like a real one.
  const wheelInfo = {
    radius: WHEEL_R, directionLocal: [0, -1, 0], axleLocal: [-1, 0, 0],
    // cannon's stable range: stiff-ish spring, well-damped. Stiffness scales
    // with mass so a heavier car holds ride height; damping scales WITH it too
    // (anchored at the 1200 kg Civic) so the damping ratio stays constant — the
    // heavy car isn't left relatively under-damped and wobbly at speed.
    suspensionStiffness: mass / 40,
    dampingRelaxation: 2.3 * (mass / 1200),
    dampingCompression: 4.4 * (mass / 1200),
    maxSuspensionForce: 1e5,
    suspensionRestLength: 0.38, maxSuspensionTravel: 0.34,
    // cannon's own tyre friction handles grip (drives well/stable). A gentle
    // wheelspin kick adds some tail-out without the unstable custom model.
    frictionSlip: 2.4,
    rollInfluence: 0.04,
    useCustomSlidingRotationalSpeed: true, customSlidingRotationalSpeed: -30,
  }
  const wx = CHASSIS[0] / 2 - 0.05
  const wf = CHASSIS[2] / 2 - 0.7
  const wheelInfos = [
    { ...wheelInfo, chassisConnectionPointLocal: [-wx, -0.2, wf], isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [wx, -0.2, wf], isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [-wx, -0.2, -wf], isFrontWheel: false },
    { ...wheelInfo, chassisConnectionPointLocal: [wx, -0.2, -wf], isFrontWheel: false },
  ]
  const [vehicleRef, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody: chassisRef, wheels, wheelInfos, indexForwardAxis: 2, indexRightAxis: 0, indexUpAxis: 1,
  }))

  const pose = useRef({ x: CIVIC.pos[0], y: 1, z: CIVIC.pos[2], heading: 0, fwd: 0, vx: 0, vy: 0, vz: 0, yaw: 0, angv: [0, 0, 0], quat: [0, 0, 0, 1] })
  useEffect(() => {
    const q = new THREE.Quaternion(), fwd = new THREE.Vector3()
    const up = chassisApi.position.subscribe((p) => { pose.current.x = p[0]; pose.current.y = p[1]; pose.current.z = p[2] })
    const uq = chassisApi.quaternion.subscribe((qq) => {
      pose.current.quat = qq
      // heading from the projected forward vector — a YXZ euler .y flips by ±π at
      // the pitch/roll ~90° singularity (airborne / on its roof), which snapped
      // the camera and drift sign; the forward vector stays continuous.
      q.set(qq[0], qq[1], qq[2], qq[3])
      fwd.set(0, 0, 1).applyQuaternion(q)
      pose.current.heading = Math.atan2(fwd.x, fwd.z)
    })
    const uv = chassisApi.velocity.subscribe((v) => {
      pose.current.vx = v[0]; pose.current.vy = v[1]; pose.current.vz = v[2]
      pose.current.fwd = v[0] * Math.sin(pose.current.heading) + v[2] * Math.cos(pose.current.heading)
    })
    const ua = chassisApi.angularVelocity.subscribe((a) => { pose.current.angv = a; pose.current.yaw = a[1] })
    return () => { up(); uq(); uv(); ua() }
  }, [chassisApi])

  // gearbox state
  const keys = useRef({ f: false, b: false, l: false, r: false, clutch: false })
  const gear = useRef(0)
  const rpm = useRef(0)
  const stalled = useRef(true)
  const launch = useRef(0)
  const shiftCd = useRef(0)
  const ignCd = useRef(0)
  const limT = useRef(0)
  const prevClutch = useRef(false)
  const screeching = useRef(false)
  const steerAngle = useRef(0)
  const camLook = useRef(new THREE.Vector3())
  const camReady = useRef(false)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  const doShift = (d) => {
    if (shiftCd.current > 0) return
    const g = clamp(gear.current + d, -1, 5)
    if (g !== gear.current) { gear.current = g; shiftCd.current = 0.3; shiftClack() }
  }

  useEffect(() => {
    if (!active) return
    // desktop: engine OFF in neutral (press I). touch: auto-running in 1st.
    if (IS_TOUCH) { engineStart('car'); gear.current = 1; stalled.current = false; rpm.current = IDLE }
    else { gear.current = 0; stalled.current = true; rpm.current = 0 }
    if (vehiclesRef.current[0]) { vehiclesRef.current[0].blown = false; vehiclesRef.current[0].wheelspin = false }
    const ignite = () => {
      const c = vehiclesRef.current[0]
      if (!c || c.blown || !stalled.current || ignCd.current > 0) return
      ignCd.current = 1.2
      starter()
      if (gear.current > 0 && !keys.current.clutch) { stallSound(); return } // start in gear w/o clutch = won't catch
      stalled.current = false; rpm.current = IDLE; engineStart('car')
    }
    const map = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r' }
    const down = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = true
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.clutch = true
      if (e.code === 'ArrowUp') doShift(1)
      if (e.code === 'ArrowDown') doShift(-1)
      if (e.code === 'KeyI') ignite()
      if (e.code === 'KeyE') onExitRef.current?.()
      if (e.code === 'KeyH') horn('car')
      if (e.code === 'KeyF') window.dispatchEvent(new Event('vehicle-flash'))
    }
    const up = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = false
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.clutch = false
    }
    const clear = () => (keys.current = { f: false, b: false, l: false, r: false, clutch: false })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    if (document.pointerLockElement) document.exitPointerLock()
    return () => {
      engineStop()
      if (screeching.current) { screechStop(); screeching.current = false }
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useFrame((_, dt) => {
    const p = pose.current
    const c = vehiclesRef.current[0]
    if (c) { c.x = p.x; c.z = p.z; c.y = p.y; c.heading = p.heading; c.quat = p.quat; c.vel = Math.abs(p.fwd) }

    if (!active) {
      for (let i = 0; i < 4; i++) { vehicleApi.applyEngineForce(0, i); vehicleApi.setBrake(8, i) }
      if (c) c.wheelspin = false
      camReady.current = false // re-snap the chase cam next time we get in
      return
    }

    shiftCd.current = Math.max(0, shiftCd.current - dt)
    launch.current = Math.max(0, launch.current - dt)
    ignCd.current = Math.max(0, ignCd.current - dt)
    limT.current += dt
    const k = keys.current
    const gas = k.f ? 1 : 0
    const brakeInput = k.b ? 1 : 0
    const steerInput = (k.r ? 1 : 0) - (k.l ? 1 : 0)
    const clutchIn = k.clutch
    let g = gear.current
    const neutral = g === 0
    const decoupled = clutchIn || neutral
    const dead = !!c?.blown
    const GEARS = prof.current.gears
    const gearTop = g === -1 ? REV_TOP : g >= 1 ? GEARS[g - 1] : 1
    const gearMul = g === -1 ? GEARMUL[0] : g >= 1 ? GEARMUL[g - 1] : 0
    const FORCE = prof.current.force
    const BRAKE_F = prof.current.brake
    const dir = g === -1 ? -1 : 1
    const v = p.fwd
    let wrRaw = 0
    // are the tyres slipping? big power at low road speed in a low gear, or a
    // clutch-drop launch. Slip → wheels spin free (revs run up, less grip);
    // grip → the ground friction pulls the revs back down to road speed.
    const grip = prof.current.grip || 2.6
    const slipSpeed = 3 * (2.6 / grip) // low grip → tyres slip up to a higher speed
    const slipping =
      !decoupled &&
      !stalled.current &&
      !dead &&
      gas > 0 &&
      (launch.current > 0 || ((g === 1 || g === -1) && Math.abs(v) < slipSpeed))
    let wheelspin = false

    // --- ENGINE RPM ---
    if (dead || stalled.current) {
      rpm.current = Math.max(0, rpm.current - 0.6 * dt)
    } else if (decoupled) {
      // clutch in / neutral: throttle free-revs it, snaps back down on release
      const target = gas > 0 ? 1.0 : IDLE
      rpm.current += (target - rpm.current) * (gas > 0 ? REV_RATE : 3.5) * dt
      if (rpm.current > 0.98 && gas > 0) rpm.current = 0.95 + Math.random() * 0.04
      rpm.current = clamp(rpm.current, IDLE, 1.02)
    } else {
      wrRaw = Math.abs(v) / gearTop
      if (slipping) {
        // tyres slipping: engine spins free of the road (revs run up)
        rpm.current += (wrRaw - rpm.current) * 1.0 * dt
        rpm.current += gas * 1.6 * dt
        rpm.current -= 0.4 * dt
      } else {
        // GRIP: the engine is locked to the wheels — revs ARE the road speed.
        // They rise only as fast as the car accelerates and fall as it slows
        // (no throttle-revving on top).
        rpm.current += (wrRaw - rpm.current) * 6 * dt
      }
      if (rpm.current > 1.02 && wrRaw <= 1.05) rpm.current = 1.0 + Math.random() * 0.02
      rpm.current = clamp(rpm.current, 0, 1.6)
      if (!IS_TOUCH && launch.current <= 0 && rpm.current < 0.09) {
        stalled.current = true; stallSound(); engineStop()
        if (screeching.current) { screechStop(); screeching.current = false }
      }
      // money-shift: only grenade the box if you're driving THROUGH the over-rev
      // (gas on). An off-throttle mis-downshift just flares the revs / engine-brakes.
      if (wrRaw > 1.4 && gas > 0) {
        c.blown = true; explode(); engineStop()
        if (screeching.current) { screechStop(); screeching.current = false }
      }
    }
    // clutch drop launch
    if (!dead && prevClutch.current && !clutchIn && !neutral && rpm.current > 0.7 && Math.abs(v) < 4) {
      launch.current = 0.7
      if (g === 0) gear.current = g = 1
    }
    prevClutch.current = clutchIn

    // --- ENGINE FORCE to the wheels + brakes ---
    let force = 0
    let brake = 0
    if (dead || stalled.current || neutral) {
      if (brakeInput) brake = BRAKE_F * brakeInput
    } else {
      if (gas > 0 && !clutchIn && Math.abs(v) < gearTop * 1.02) {
        const torque = clamp(1.15 - 0.85 * Math.abs(rpm.current - 0.55), 0.4, 1)
        let f = FORCE * gas * torque * gearMul
        if (launch.current > 0) f *= 1.3
        // slipping = a bit less bite, but keep enough to keep the rears lit
        if (slipping) f *= clamp(grip / 3.0, 0.5, 0.85)
        force = -dir * f // cannon: negative engine force drives +forward
        wheelspin = slipping && rpm.current > 0.7 // screech + smoke
      } else if (!clutchIn && gas === 0) {
        // OFF throttle & in gear: above idle speed the engine BRAKES; below it
        // the engine IDLE keeps the car creeping (no stall once you're rolling).
        // (On throttle at/above the gear's top we fall through both branches and
        // coast on the limiter — no more braking while you're flooring it.)
        const idleSpeed = 2.2
        if (Math.abs(v) > idleSpeed) brake = ENGINE_BRAKE
        else if (Math.abs(v) > 0.4) force = -dir * FORCE * 0.05 * gearMul // idle creep
      }
      if (brakeInput > 0 && Math.abs(v) > 0.3) brake = BRAKE_F * brakeInput
    }
    // STEERING: full lock at low speed, progressively tighter as you speed up
    // (no twitchy darting), and smoothed so inputs ramp in like a real wheel
    const speedFactor = 1 / (1 + Math.abs(v) * 0.05)
    const targetSteer = -steerInput * STEER_MAX * speedFactor
    steerAngle.current += (targetSteer - steerAngle.current) * Math.min(1, dt * 7)
    vehicleApi.setSteeringValue(steerAngle.current, 0)
    vehicleApi.setSteeringValue(steerAngle.current, 1)
    vehicleApi.applyEngineForce(force, 2)
    vehicleApi.applyEngineForce(force, 3)
    for (let i = 0; i < 4; i++) vehicleApi.setBrake(brake, i)

    // screech / smoke
    const spin = !dead && !stalled.current && wheelspin
    if (c) c.wheelspin = spin
    if (spin && !screeching.current) { screechStart(); screeching.current = true }
    else if (!spin && screeching.current) { screechStop(); screeching.current = false }

    const P2 = pose.current
    const balance = prof.current.balance ?? 0.55
    // DRIFT: tail-happiness from the car's grip balance. Grippy cars (high
    // balance, e.g. Civic 0.55) barely slide; neutral/tail-happy cars (MX-5
    // 0.5, V8 0.42) break the rear loose on power. At balance ≥ 0.62 → 0 = full
    // grip, no artificial slide (top of the slider is meaningful, not dead).
    const driftiness = clamp((0.62 - balance) * 5, 0, 1.4)
    const onPower = gas > 0 && !clutchIn && !stalled.current && !dead
    const grounded = P2.y < 1.6 // airborne off a ramp lifts the chassis well past rest
    // live slip angle = how far the car's travelling sideways vs where it points
    let slipA = Math.atan2(P2.vx, P2.vz) - P2.heading
    while (slipA > Math.PI) slipA -= 2 * Math.PI
    while (slipA < -Math.PI) slipA += 2 * Math.PI
    const slipDeg = Math.abs(slipA) * 180 / Math.PI
    const targetSlip = 22 + driftiness * 22 // Civic ~26° · MX-5 ~35° · V8 ~53°
    // Commit to a slide: enough speed to be stable, steering loaded, on the
    // throttle, wheels on the ground. Front tyres keep grip so lock catches it.
    const drifting = onPower && grounded && P2.fwd > 5 && Math.abs(steerAngle.current) > 0.05
    if (drifting && driftiness > 0 && chassisApi.applyLocalImpulse) {
      // Kick the rear axle out to SUSTAIN the slide, tapering to zero as it
      // reaches the target angle (so it settles instead of spinning). Direction
      // follows the ESTABLISHED slide (slipA), not the steering — so catching it
      // with opposite lock no longer flips the kick into the slide, and the kick
      // eases right off while you're counter-steering to recover.
      const slipFade = clamp(1 - slipDeg / targetSlip, 0, 1)
      const initiating = slipDeg < 5
      const slideSign = initiating ? -Math.sign(steerAngle.current) : Math.sign(slipA)
      const counterSteer = !initiating && Math.sign(steerAngle.current) === Math.sign(slipA)
      // gate on throttle, not wheelspin (which only exists in 1st/reverse), so
      // the on-power drift keeps authority in the gears where you sustain it.
      const commit = clamp(Math.abs(steerAngle.current) / STEER_MAX, 0, 1) * (counterSteer ? 0.15 : 1)
      const mag = slideSign * driftiness * commit * slipFade * mass * 20 * dt
      chassisApi.applyLocalImpulse([mag, 0, 0], [0, -0.1, -1.75])
    }
    // STABILITY: a spin is yaw beyond the intended slide. While the slide is
    // under control (slip within the drift envelope) allow a big yaw rate;
    // otherwise clamp hard — so a real power-on spin still gets caught. We bleed
    // the yaw ANGULAR VELOCITY directly (frame-rate independent); the old
    // applyTorque was double-dt-scaled and effectively inert.
    const controlled = drifting && slipDeg < targetSlip * 1.25
    const MAX_YAW = controlled ? 2.8 : 1.5
    if (Math.abs(P2.yaw) > MAX_YAW && chassisApi.angularVelocity) {
      const keep = clamp(1 - dt * 25, 0, 1) // remove the overrun fast but smoothly
      const bled = Math.sign(P2.yaw) * MAX_YAW + (P2.yaw - Math.sign(P2.yaw) * MAX_YAW) * keep
      chassisApi.angularVelocity.set(P2.angv[0], bled, P2.angv[2])
    }
    if (import.meta.env.DEV) {
      window.__car = P2 // self-test hooks (dev only — stripped from production)
      window.__place = (x, z, vz) => {
        chassisApi.position.set(x, 1.2, z); chassisApi.quaternion.set(0, 0, 0, 1)
        chassisApi.velocity.set(0, 0, vz); chassisApi.angularVelocity.set(0, 0, 0)
        gear.current = 3; stalled.current = false; rpm.current = 0.6
      }
    }

    // engine sound with rev-limiter fuel cut
    const atLimit = !dead && !stalled.current && rpm.current >= 0.985 && wrRaw <= 1.05
    const cut = atLimit && Math.sin(limT.current * 95) > 0
    if (cut) rpm.current = 0.9
    engineSpeed(rpm.current, cut)

    // HUD
    const gnum = document.getElementById('gear-num')
    if (gnum) {
      gnum.textContent = dead ? '✕' : gear.current === -1 ? 'R' : gear.current === 0 ? 'N' : gear.current
      const fill = document.getElementById('rpm-fill')
      if (fill) { fill.style.width = `${Math.round(clamp(rpm.current, 0, 1) * 100)}%`; fill.style.background = dead ? '#555' : rpm.current > 0.9 ? '#ff4e45' : '#5ad0e6' }
      const spd = document.getElementById('spd-num')
      if (spd) spd.textContent = Math.round(Math.abs(v) * 3.6)
      document.documentElement.classList.toggle('clutch-in', clutchIn)
      const warn = document.getElementById('rev-warn')
      if (warn) {
        const msg = dead ? '✕ GEARBOX BLOWN' : stalled.current ? '⚠ ENGINE OFF — press I to start (in N or clutch in)'
          : wrRaw > 1.05 ? '⚠ OVER-REV!' : spin ? '🔥 WHEELSPIN' : rpm.current > 0.92 ? 'REDLINE' : ''
        warn.textContent = msg
        warn.className = 'rev-warn' + (dead || stalled.current ? ' blown' : msg === '⚠ OVER-REV!' ? ' danger' : spin ? ' spin' : msg ? ' redline' : '')
      }
    }

    // chase camera. The look target is smoothed too — snapping it to the raw
    // 60 Hz physics pose would judder the whole view on a 120 Hz display.
    const fx = Math.sin(p.heading)
    const fz = Math.cos(p.heading)
    if (!camReady.current) {
      camReady.current = true
      camera.position.set(p.x - fx * 7, p.y + 3.2, p.z - fz * 7)
      camLook.current.set(p.x, p.y + 0.6, p.z)
    }
    camera.position.lerp(tmp.set(p.x - fx * 7, p.y + 3.2, p.z - fz * 7), 1 - Math.pow(0.0016, dt))
    camLook.current.lerp(tmp.set(p.x, p.y + 0.6, p.z), 1 - Math.exp(-dt * 26))
    camera.lookAt(camLook.current)
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  })

  return (
    <group ref={vehicleRef}>
      <mesh ref={chassisRef} visible={false}>
        <boxGeometry args={CHASSIS} />
      </mesh>
      {wheels.map((r, i) => (
        <Wheel key={i} wheelRef={r} radius={WHEEL_R} />
      ))}
    </group>
  )
}
