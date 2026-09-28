import { TRACK_BARRIERS } from '../src/track.js'
const ARENA = { minX:-98, maxX:28, minZ:-18, maxZ:592 }
function hitsBarrier(x,z,r){ for(const b of TRACK_BARRIERS){ const dx=x-b.x,dz=z-b.z,c=Math.cos(b.ang),s=Math.sin(b.ang); const lx=dx*c+dz*s, lz=-dx*s+dz*c; if(Math.abs(lx)<b.len/2+r && Math.abs(lz)<0.3+r) return true } return false }
function bounded(x,z,r){ return x<ARENA.minX+r+0.2||x>ARENA.maxX-r-0.2||z<ARENA.minZ+r+0.2||z>ARENA.maxZ-r-0.2 }
const r=1.0
const tests=[
  ['left straight centre (-84,300)', -84,300, false],
  ['right straight centre (0,300)', 0,300, false],
  ['top sweeper apex road (-42,560)', -42,560, false],
  ['mid-track old-wall spot (-28,300)', -28,300, false],
  ['left barrier (-95,300)', -95,300, true],
  ['right barrier (11,300)', 11,300, true],
  ['way west beyond arena (-99,300)', -99,300, true],
]
for(const [label,x,z,exp] of tests){ const blocked = bounded(x,z,r)||hitsBarrier(x,z,r); console.log(`${blocked===exp?'OK ':'XX '} ${label}: blocked=${blocked} (want ${exp})`) }
