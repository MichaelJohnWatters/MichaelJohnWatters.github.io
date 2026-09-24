import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useBox, useCylinder, useRaycastVehicle } from '@react-three/cannon'
import * as THREE from 'three'
import { CIVIC } from './layout'
import { engineStart, engineSpeed, engineStop, horn } from './sfx'

// REAL raycast-vehicle Civic: a dynamic chassis on four raycast wheels that
// apply drive torque, suspension and tyre friction — the wheels genuinely
// push the car (it can get airborne, roll, lose grip). Lives permanently in
// the Physics world; `active` (driving it) enables controls + chase cam and
// publishes the live pose into vehiclesRef[0] so the visual body, headlights
// and wreck follow.
const CHASSIS = [1.8, 0.7, 4.2] // w, h, l
const WHEEL_R = 0.34
const ENGINE_F = 1800 // drive force
const BRAKE_F = 40
const clamp = THREE.MathUtils.clamp
const tmp = new THREE.Vector3()

function Wheel({ wheelRef, radius }) {
  useCylinder(
    () => ({
      mass: 1,
      type: 'Kinematic',
      material: 'wheel',
      collisionFilterGroup: 0,
      args: [radius, radius, 0.4, 16],
    }),
    wheelRef,
  )
  // invisible — the CompleteCar visual (in Room) provides the shown wheels;
  // these are the physics wheels doing the actual work
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
    () => ({
      mass: 150,
      args: CHASSIS,
      position: [CIVIC.pos[0], 1, CIVIC.pos[2]],
      angularDamping: 0.55,
      allowSleep: false,
    }),
    chassisRef,
  )

  const wheels = [useRef(), useRef(), useRef(), useRef()]
  const wheelInfo = {
    radius: WHEEL_R,
    directionLocal: [0, -1, 0],
    axleLocal: [-1, 0, 0],
    suspensionStiffness: 30,
    suspensionRestLength: 0.35,
    frictionSlip: 2.4,
    dampingRelaxation: 2.4,
    dampingCompression: 3.6,
    maxSuspensionForce: 100000,
    rollInfluence: 0.02,
    maxSuspensionTravel: 0.3,
    useCustomSlidingRotationalSpeed: true,
    customSlidingRotationalSpeed: -30,
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
    chassisBody: chassisRef,
    wheels,
    wheelInfos,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }))

  const pose = useRef({ x: CIVIC.pos[0], y: 1, z: CIVIC.pos[2], heading: 0, fwd: 0 })
  useEffect(() => {
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    let vx = 0
    let vz = 0
    const unsubP = chassisApi.position.subscribe((p) => {
      pose.current.x = p[0]
      pose.current.y = p[1]
      pose.current.z = p[2]
    })
    const unsubQ = chassisApi.quaternion.subscribe((qq) => {
      q.set(qq[0], qq[1], qq[2], qq[3])
      e.setFromQuaternion(q, 'YXZ')
      pose.current.heading = e.y
    })
    const unsubV = chassisApi.velocity.subscribe((v) => {
      vx = v[0]
      vz = v[2]
      // signed forward speed (m/s) along the heading
      pose.current.fwd = vx * Math.sin(pose.current.heading) + vz * Math.cos(pose.current.heading)
    })
    return () => {
      unsubP()
      unsubQ()
      unsubV()
    }
  }, [chassisApi])

  // keys (only matter while active)
  const keys = useRef({ f: false, b: false, l: false, r: false })
  useEffect(() => {
    if (!active) return
    engineStart('car')
    const map = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' }
    const down = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = true
      if (e.code === 'KeyE') onExit?.()
      if (e.code === 'KeyH') horn('car')
      if (e.code === 'KeyF') window.dispatchEvent(new Event('vehicle-flash'))
    }
    const up = (e) => {
      if (map[e.code]) keys.current[map[e.code]] = false
    }
    const clear = () => (keys.current = { f: false, b: false, l: false, r: false })
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
  }, [active, onExit])

  useFrame((_, dt) => {
    const p = pose.current
    const c = vehiclesRef.current[0]
    if (c) {
      c.x = p.x
      c.z = p.z
      c.y = p.y
      c.heading = p.heading
      c.vel = Math.abs(p.fwd)
    }

    if (active) {
      const k = keys.current
      const steer = ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * 0.5
      vehicleApi.setSteeringValue(steer, 0)
      vehicleApi.setSteeringValue(steer, 1)
      let force = 0
      let brake = 0
      if (k.f) force = -ENGINE_F // drive forward
      else if (k.b) {
        if (p.fwd > 0.6) brake = BRAKE_F // moving forward → brake
        else force = ENGINE_F * 0.55 // stopped → reverse
      }
      vehicleApi.applyEngineForce(force, 2)
      vehicleApi.applyEngineForce(force, 3)
      for (let i = 0; i < 4; i++) vehicleApi.setBrake(brake, i)
      // engine note follows speed (rough, until the gearbox is ported over)
      const rev = clamp(Math.abs(p.fwd) / 34, 0, 1)
      engineSpeed(rev)
      const gnum = document.getElementById('gear-num')
      if (gnum) {
        gnum.textContent = p.fwd < -0.5 ? 'R' : 'D'
        const spd = document.getElementById('spd-num')
        if (spd) spd.textContent = Math.round(Math.abs(p.fwd) * 3.6)
        const fill = document.getElementById('rpm-fill')
        if (fill) {
          fill.style.width = `${Math.round(rev * 100)}%`
          fill.style.background = '#5ad0e6'
        }
        const warn = document.getElementById('rev-warn')
        if (warn) {
          warn.textContent = ''
          warn.className = 'rev-warn'
        }
      }

      const fx = Math.sin(p.heading)
      const fz = Math.cos(p.heading)
      camera.position.lerp(tmp.set(p.x - fx * 7, p.y + 3.2, p.z - fz * 7), 1 - Math.pow(0.0016, dt))
      camera.lookAt(p.x, p.y + 0.6, p.z)
      camera.updateMatrixWorld()
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    } else {
      for (let i = 0; i < 4; i++) {
        vehicleApi.applyEngineForce(0, i)
        vehicleApi.setBrake(8, i) // parked
      }
    }
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
