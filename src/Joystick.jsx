import { useRef, useState } from 'react'

// Virtual thumb-stick for touch devices (explore mode). Writes a normalized
// vector into vecRef.current ({x: -1..1 right, y: -1..1 down}) — the Player
// reads it every frame alongside WASD.
const RADIUS = 44

export default function Joystick({ vecRef }) {
  const baseRef = useRef()
  const [knob, setKnob] = useState([0, 0])
  const pid = useRef(null)

  const update = (e) => {
    const r = baseRef.current.getBoundingClientRect()
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob([dx, dy])
    vecRef.current = { x: dx / RADIUS, y: dy / RADIUS }
  }
  const reset = () => {
    pid.current = null
    setKnob([0, 0])
    vecRef.current = { x: 0, y: 0 }
  }

  return (
    <div
      className="joystick"
      ref={baseRef}
      onPointerDown={(e) => {
        pid.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        if (pid.current === e.pointerId) update(e)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div
        className="joy-knob"
        style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }}
      />
    </div>
  )
}
