import { TRACK_BARRIERS } from '../src/track.js'
const r = 1.2 // approx bike collision radius
function hit(x,z,lenExpand){ for(const b of TRACK_BARRIERS){ const dx=x-b.x,dz=z-b.z,c=Math.cos(b.ang),s=Math.sin(b.ang); const lx=dx*c+dz*s, lz=-dx*s+dz*c; if(Math.abs(lx)<b.len/2+lenExpand && Math.abs(lz)<0.3+r) return true } return false }
// points on the top sweeper INNER racing line (center -42,520, radius 36 = on the road, near inner edge 35.5)
const cx=-42, cz=520, R=36
let oldBlocked=0, newBlocked=0
const details=[]
for(let deg=20; deg<=160; deg+=5){ const a=deg*Math.PI/180; const x=cx+R*Math.cos(a), z=cz+R*Math.sin(a)
  const o=hit(x,z,r), n=hit(x,z,0.1)
  if(o)oldBlocked++; if(n)newBlocked++
  if(o!==n) details.push(`deg${deg}: old=${o} new=${n}`)
}
console.log('racing-line points on top sweeper (should ALL be clear):')
console.log('  OLD (+r) blocked:', oldBlocked, ' NEW (+0.1) blocked:', newBlocked)
console.log('  fixed at:', details.slice(0,6).join(' | '))
