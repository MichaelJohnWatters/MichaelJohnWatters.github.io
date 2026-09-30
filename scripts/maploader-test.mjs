// Unit-test parseMap on a hand-built Object3D tree (a loaded .glb yields the same
// tree, so this validates the Blender/Spline -> game-data pipeline without a browser).
import * as THREE from 'three'
import { parseMap } from '../src/mapLoader.js'

const root = new THREE.Group()

// a rotated collision box (10 x 2 x 0.5, yaw 45°)
const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 0.5))
wall.name = 'col_wall1'
wall.position.set(5, 1, 20)
wall.rotation.y = Math.PI / 4
root.add(wall)

// spawns + poi
const car = new THREE.Object3D()
car.name = 'spawn_car'
car.position.set(0, 0, 3)
car.rotation.y = Math.PI / 2
root.add(car)
const poi = new THREE.Object3D()
poi.name = 'poi_garage'
poi.position.set(-2, 0, 1)
root.add(poi)

// track empties added OUT of order to test sorting (i -> z: 0->10 … 3->150)
for (const [i, z] of [[2, 100], [0, 10], [3, 150], [1, 50]]) {
  const t = new THREE.Object3D()
  t.name = 'track_' + String(i).padStart(3, '0')
  t.position.set(0, 0, z)
  root.add(t)
}

const map = parseMap(root)
const near = (a, b) => Math.abs(a - b) < 0.001
let ok = true
const check = (cond, msg) => {
  if (!cond) {
    ok = false
    console.log('FAIL:', msg)
  }
}

check(map.colliders.length === 1, 'collider count')
check(near(map.colliders[0].args[0], 10) && near(map.colliders[0].args[2], 0.5), 'collider size')
check(near(map.colliders[0].rotation[1], Math.PI / 4), 'collider yaw')
check(wall.visible === false, 'collider mesh hidden')
check(map.spawns.car && near(map.spawns.car.heading, Math.PI / 2), 'spawn heading')
check(map.spawns.car.position[2] === 3, 'spawn position')
check(map.pois.garage && map.pois.garage.position[0] === -2, 'poi garage')
check(map.track.length === 4, 'track point count')
check(map.track[0][1] === 10 && map.track[3][1] === 150, 'track sorted by index')

console.log('colliders:', JSON.stringify(map.colliders))
console.log('spawns:', JSON.stringify(map.spawns))
console.log('pois:', JSON.stringify(map.pois))
console.log('track:', JSON.stringify(map.track))
console.log(ok ? '\nALL PASS ✓' : '\nHAD FAILURES ✗')
