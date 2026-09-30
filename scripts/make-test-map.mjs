import * as THREE from 'three'
import { writeFileSync } from 'fs'
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onload && this.onload({ target: this })
      this.onloadend && this.onloadend({ target: this })
    }, (e) => { this.onerror && this.onerror(e) })
  }
}
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

const scene = new THREE.Group()
const mat = new THREE.MeshStandardMaterial({ color: '#556677' })
const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 0.2, 120), new THREE.MeshStandardMaterial({ color: '#333344' }))
ground.name = 'ground'; ground.position.set(0, -0.1, 0); scene.add(ground)
for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 2; const t = new THREE.Object3D(); t.name = 'track_' + String(a).padStart(3, '0'); t.position.set(Math.cos(ang) * 40, 0, Math.sin(ang) * 28); scene.add(t) }
for (const [i, x, z, ry] of [[0, 0, 34, 0], [1, 0, -34, 0], [2, 46, 0, Math.PI / 2]]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 0.6), mat); w.name = 'col_wall' + i; w.position.set(x, 1, z); w.rotation.y = ry; scene.add(w)
}
for (const [name, x, z, ry] of [['spawn_car', 40, 2, Math.PI / 2], ['spawn_player', 44, 4, 0], ['poi_garage', 46, 6, 0]]) {
  const o = new THREE.Object3D(); o.name = name; o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o)
}
try {
  const result = await new Promise((res, rej) => new GLTFExporter().parse(scene, res, rej, { binary: true }))
  writeFileSync('public/maps/test.glb', Buffer.from(result))
  console.log('wrote public/maps/test.glb', result.byteLength, 'bytes')
} catch (e) { console.error('EXPORT FAILED:', e.message); process.exit(1) }
