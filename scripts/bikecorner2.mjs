import { TRACK_BARRIERS } from '../src/track.js'
const r = 1.2
function hit(x,z,le){ for(const b of TRACK_BARRIERS){ const dx=x-b.x,dz=z-b.z,c=Math.cos(b.ang),s=Math.sin(b.ang); const lx=dx*c+dz*s, lz=-dx*s+dz*c; if(Math.abs(lx)<b.len/2+le && Math.abs(lz)<0.3+r) return true } return false }
const cx=-42, cz=520
console.log('inner road edge ~radius 35.5; inner barrier ~radius 31')
for(const R of [37,36,35,34.5,34,33.5,33]){
  let o=0,n=0
  for(let deg=20; deg<=160; deg+=2){ const a=deg*Math.PI/180; const x=cx+R*Math.cos(a), z=cz+R*Math.sin(a); if(hit(x,z,r))o++; if(hit(x,z,0.1))n++ }
  console.log(`radius ${R}: OLD(+r) blocked ${o}/71  NEW(+0.1) blocked ${n}/71`)
}
