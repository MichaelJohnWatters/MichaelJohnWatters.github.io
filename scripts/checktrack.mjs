import { TRACK_SEG, TRACK_BARRIERS, TRACK_W } from '../src/track.js'
// reconstruct centreline segments as endpoint pairs
const segs = TRACK_SEG.map(s => {
  const hx = Math.cos(s.ang) * s.len / 2, hz = Math.sin(s.ang) * s.len / 2
  return [[s.mx - hx, s.mz - hz], [s.mx + hx, s.mz + hz]]
})
function distToSeg(px, pz, a, b) {
  const dx = b[0]-a[0], dz = b[1]-a[1]
  const L2 = dx*dx + dz*dz || 1
  let t = ((px-a[0])*dx + (pz-a[1])*dz) / L2
  t = Math.max(0, Math.min(1, t))
  const cx = a[0]+t*dx, cz = a[1]+t*dz
  return Math.hypot(px-cx, pz-cz)
}
const half = TRACK_W/2
let minD = Infinity, intrude = 0
for (const b of TRACK_BARRIERS) {
  let d = Infinity
  for (const s of segs) d = Math.min(d, distToSeg(b.x, b.z, s[0], s[1]))
  minD = Math.min(minD, d)
  // barrier inner face = center dist minus half its 0.5 depth
  if (d - 0.25 < half - 0.05) intrude++
}
console.log('barriers:', TRACK_BARRIERS.length, ' road half-width:', half)
console.log('min barrier-centre dist to centreline:', minD.toFixed(2), '(should be > ', half, ')')
console.log('barriers intruding into the road:', intrude)
