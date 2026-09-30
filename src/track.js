// A closed-loop circuit generated from ONE centreline. The road surface, the
// trackside barriers, and the physics colliders are all derived from these same
// segments, so the visuals and the collision can never disagree (no more
// invisible walls). Shape: a stadium/oval — two long straights joined by two
// 180° sweepers — with the start/finish on the right straight where a short
// access road runs down to the garage.
//
// Layout (top-down, +x right, +z north/up):
//        _______            <- top sweeper (bulges north)
//       /       \
//   L  |         |  R        L = left straight (x=-84), R = right straight (x=0)
//   e  |         |  i
//   f  |         |  g
//   t   \_______/   ht       <- bottom sweeper; R's bottom = start/finish
//            |
//         access road -> garage

const R = 42
const Xr = 0 // right straight (the start/finish straight, in line with the garage)
const Xl = -84 // left straight (the back straight)
const Zb = 100 // straights run from here (bottom)…
const Zt = 520 // …to here (top)
const CxTop = (Xr + Xl) / 2 // -42
const CxBot = (Xr + Xl) / 2

export const TRACK_W = 13
export const TRACK_START = [Xr, Zb] // where the garage access road meets the loop

function linePts(x0, z0, x1, z1, n) {
  const p = []
  for (let i = 1; i <= n; i++) {
    const t = i / n
    p.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t])
  }
  return p
}
function arcPts(cx, cz, r, a0, a1, n) {
  const p = []
  for (let i = 1; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n)
    p.push([cx + r * Math.cos(a), cz + r * Math.sin(a)])
  }
  return p
}

// Build a full circuit (road segments, mitered barriers, dashes) from ANY closed
// centreline — [[x,z], …]. The current stadium is just the default input, but a
// centreline from map.track (a Spline/Blender curve) produces a circuit the same
// way, so the whole track system re-layers onto any map shape.
//   opts.width   road width (default TRACK_W)
//   opts.off     barrier offset from the centreline (default width/2 + 4.5 run-off)
//   opts.inMouth (x,z)=>bool — skip barriers here (e.g. the access-road mouth)
export function buildTrack(centre, opts = {}) {
  const width = opts.width ?? TRACK_W
  const off = opts.off ?? width / 2 + 4.5
  const inMouth = opts.inMouth ?? (() => false)
  centre = centre.slice()
  // drop the closing vertex if it coincides with the start (clean closed polygon)
  if (centre.length > 1 && Math.hypot(centre[0][0] - centre[centre.length - 1][0], centre[0][1] - centre[centre.length - 1][1]) < 0.5) {
    centre.pop()
  }
  const N = centre.length

  // per-segment unit normals, then per-vertex normals (average of the two
  // adjacent segments) so an offset line miters cleanly at each corner
  const segN = []
  for (let i = 0; i < N; i++) {
    const p = centre[i]
    const q = centre[(i + 1) % N]
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    const L = Math.hypot(dx, dz) || 1
    segN.push([-dz / L, dx / L])
  }
  const vertN = []
  for (let i = 0; i < N; i++) {
    const a = segN[(i - 1 + N) % N]
    const b = segN[i]
    let nx = a[0] + b[0]
    let nz = a[1] + b[1]
    const L = Math.hypot(nx, nz) || 1
    vertN.push([nx / L, nz / L])
  }

  // road segments (with a little length overlap to hide the seams)
  const seg = []
  for (let i = 0; i < N; i++) {
    const p = centre[i]
    const q = centre[(i + 1) % N]
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    const len = Math.hypot(dx, dz)
    if (len < 0.3) continue
    seg.push({ mx: (p[0] + q[0]) / 2, mz: (p[1] + q[1]) / 2, len, ang: Math.atan2(dz, dx) })
  }

  // barriers: an OFFSET POLYLINE per side (vertices offset along the mitered
  // vertex normal, segments strung between consecutive offset vertices). Because
  // consecutive barriers share an exact offset vertex, they can't overlap or poke
  // into the track at a join. A gap is left where inMouth() is true.
  const barriers = []
  for (const sign of [1, -1]) {
    const lineP = centre.map((p, i) => [p[0] + vertN[i][0] * off * sign, p[1] + vertN[i][1] * off * sign])
    for (let i = 0; i < N; i++) {
      const p = lineP[i]
      const q = lineP[(i + 1) % N]
      const dx = q[0] - p[0]
      const dz = q[1] - p[1]
      const len = Math.hypot(dx, dz)
      if (len < 0.2) continue
      const mx = (p[0] + q[0]) / 2
      const mz = (p[1] + q[1]) / 2
      if (inMouth(mx, mz)) continue
      barriers.push({ x: mx, z: mz, ang: Math.atan2(dz, dx), len })
    }
  }

  // sparse centre-line dashes (every few segments) for road markings
  const dashes = seg.filter((_, i) => i % 2 === 0).map((s) => ({ x: s.mx, z: s.mz, ang: s.ang }))

  return { seg, barriers, dashes }
}

// centreline points, counter-clockwise from the start/finish (Xr, Zb)
const centre = [
  [Xr, Zb],
  ...linePts(Xr, Zb, Xr, Zt, 14), // right straight, up
  ...arcPts(CxTop, Zt, R, 0, Math.PI, 18), // top sweeper -> (Xl, Zt)
  ...linePts(Xl, Zt, Xl, Zb, 14), // left straight, down
  ...arcPts(CxBot, Zb, R, Math.PI, 2 * Math.PI, 18), // bottom sweeper -> back to (Xr, Zb)
]

// the default circuit = the stadium centreline (byte-for-byte the current track)
const _stadium = buildTrack(centre, { inMouth: (x, z) => x > -8 && x < 8 && z > 55 && z < 105 })
export const TRACK_SEG = _stadium.seg
export const TRACK_BARRIERS = _stadium.barriers
export const TRACK_DASHES = _stadium.dashes

// the access road from the garage's north gate up to the start/finish
export const ACCESS = { x: 0, z0: 34, z1: 100, w: 8 }

// start/finish line across the main straight — a lap counts when the car
// crosses it heading north (the racing direction, up the right straight)
export const FINISH = { z: 116, halfW: TRACK_W / 2 + 4 }
