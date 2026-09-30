import { buildTrack } from '../src/track.js'
// a custom centreline (as map.track would provide) — a rounded square
const sq = []
const R=12, cx=[0,60,60,0], cz=[0,0,60,60]
for(let c=0;c<4;c++){ for(let a=0;a<6;a++){ const ang=(c*90+a*15-45)*Math.PI/180; sq.push([cx[c]+R*Math.cos(ang), cz[c]+R*Math.sin(ang)]) } }
const t = buildTrack(sq, { width: 10 })
console.log('custom centreline pts:', sq.length)
console.log('-> seg', t.seg.length, 'barriers', t.barriers.length, 'dashes', t.dashes.length)
console.log(t.seg.length > 0 && t.barriers.length > 0 && t.dashes.length > 0 ? 'buildTrack on ANY centreline: OK ✓' : 'FAIL ✗')
