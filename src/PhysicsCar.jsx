import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useBox, useCylinder, useRaycastVehicle } from '@react-three/cannon'
import * as THREE from 'three'
import { CIVIC } from './layout'
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
// gearbox (mirrors the arcade car)
const GEARS = [5, 11, 18, 27, 38] // gear-top road speed (m/s)
const GEARMUL = [1.0, 0.84, 0.72, 0.6, 0.5]
const REV_TOP = 5
const FORCE = 2600 // base engine force to the wheels
const BRAKE_F = 42
const STEER_MAX = 0.55
const IDLE = 0.12
const REV_RATE = 4.8
const clamp = THREE.MathUtils.clamp
const tmp = new THREE.Vector3()

function Wheel({ wheelRef, radius }) {
  useCylinder(
    () => ({ mass: 1, type: 'Kinematic', material: 'wheel', collisionFilterGroup: 0, args: [radius, radius, 0.4, 16] }),
    wheelRef,
  )
  return (
    <group ref={wheelRef}>
      <mesh rotation={[0, 0, Math.PI / 2]} visible={false}>
        <cylinderGeometry args={[radius, radius, 0.32, 16]} />
        <meshStandardMaterial color="#15151a" />
      </mesh>
    </group>
  )
}

export default function PhysicsCar({ vehiclesRef, active, onExit }) {
  const { camera } = useThree()
  const chassisRef = useRef()
  const [, chassisApi] = useBox(
    () => ({ mass: 150, args: CHASSIS, position: [CIVIC.pos[0], 1, CIVIC.pos[2]], angularDamping: 0.55, allowSleep: false }),
    chassisRef,
  )
  const wheels = [useRef(), useRef(), useRef(), useRef()]
  const wheelInfo = {
    radius: WHEEL_R, directionLocal: [0, -1, 0], axleLocal: [-1, 0, 0],
    suspensionStiffness: 30, suspensionRestLength: 0.35, frictionSlip: 2.4,
    dampingRelaxation: 2.4, dampingCompression: 3.6, maxSuspensionForce: 100000,
    rollInfluence: 0.02, maxSuspensionTravel: 0.3,
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

  const pose = useRef({ x: CIVIC.pos[0], y: 1, z: CIVIC.pos[2], heading: 0, fwd: 0 })
  useEffect(() => {
    const q = new THREE.Quaternion(), e = new THREE.Euler()
    const up = chassisApi.position.subscribe((p) => { pose.current.x = p[0]; pose.current.y = p[1]; pose.current.z = p[2] })
    const uq = chassisApi.quaternion.subscribe((qq) => { q.set(qq[0], qq[1], qq[2], qq[3]); e.setFromQuaternion(q, 'YXZ'); pose.current.heading = e.y })
    const uv = chassisApi.velocity.subscribe((v) => {
      pose.current.fwd = v[0] * Math.sin(pose.current.heading) + v[2] * Math.cos(pose.current.heading)
    })
    return () => { up(); uq(); uv() }
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
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  const doShift = (d) => {
    if (shiftCd.current > 0) return
    const g = clamp(gear.current + d, -1, GEARS.length)
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
    if (c) { c.x = p.x; c.z = p.z; c.y = p.y; c.heading = p.heading; c.vel = Math.abs(p.fwd) }

    if (!active) {
      for (let i = 0; i < 4; i++) { vehicleApi.applyEngineForce(0, i); vehicleApi.setBrake(8, i) }
      if (c) c.wheelspin = false
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
    const gearTop = g === -1 ? REV_TOP : g >= 1 ? GEARS[g - 1] : 1
    const gearMul = g === -1 ? GEARMUL[0] : g >= 1 ? GEARMUL[g - 1] : 0
    const dir = g === -1 ? -1 : 1
    const v = p.fwd
    let wrRaw = 0
    let wheelspin = false

    // --- ENGINE RPM ---
    if (dead || stalled.current) {
      rpm.current = Math.max(0, rpm.current - 0.6 * dt)
    } else if (decoupled) {
      const target = gas > 0 ? 1.0 : IDLE
      rpm.current += (target - rpm.current) * (gas > 0 ? REV_RATE : 1.8) * dt
      if (rpm.current > 0.98 && gas > 0) rpm.current = 0.95 + Math.random() * 0.04
      rpm.current = clamp(rpm.current, IDLE, 1.02)
    } else {
      wrRaw = Math.abs(v) / gearTop
      const couple = launch.current > 0 ? 1.2 : Math.abs(v) < 1.2 ? 8 : 2.6
      rpm.current += (wrRaw - rpm.current) * couple * dt
      rpm.current += gas * 1.0 * dt
      rpm.current -= 0.35 * dt
      if (rpm.current > 1.02 && wrRaw <= 1.05) rpm.current = 1.0 + Math.random() * 0.02
      rpm.current = clamp(rpm.current, 0, 1.6)
      if (!IS_TOUCH && launch.current <= 0 && rpm.current < 0.09) {
        stalled.current = true; stallSound(); engineStop()
        if (screeching.current) { screechStop(); screeching.current = false }
      }
      if (wrRaw > 1.4) {
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
        if (launch.current > 0) f *= 1.8
        force = -dir * f // cannon: negative engine force drives +forward
        // wheelspin (for screech + smoke): low gears / launches, revs up
        wheelspin = launch.current > 0 || ((g === 1 || g === -1) && Math.abs(v) < 4 && rpm.current > 0.55)
        if (wheelspin) rpm.current = clamp(rpm.current + 1.0 * dt, IDLE, 1.05)
      }
      if (brakeInput > 0 && Math.abs(v) > 0.3) brake = BRAKE_F * brakeInput
    }
    vehicleApi.setSteeringValue(steerInput * STEER_MAX, 0)
    vehicleApi.setSteeringValue(steerInput * STEER_MAX, 1)
    vehicleApi.applyEngineForce(force, 2)
    vehicleApi.applyEngineForce(force, 3)
    for (let i = 0; i < 4; i++) vehicleApi.setBrake(brake, i)

    // screech / smoke
    const spin = !dead && !stalled.current && wheelspin
    if (c) c.wheelspin = spin
    if (spin && !screeching.current) { screechStart(); screeching.current = true }
    else if (!spin && screeching.current) { screechStop(); screeching.current = false }

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

    // chase camera
    const fx = Math.sin(p.heading)
    const fz = Math.cos(p.heading)
    camera.position.lerp(tmp.set(p.x - fx * 7, p.y + 3.2, p.z - fz * 7), 1 - Math.pow(0.0016, dt))
    camera.lookAt(p.x, p.y + 0.6, p.z)
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
