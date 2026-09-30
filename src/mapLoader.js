// Map loader — reads a scene from a Blender .glb and extracts game DATA by
// naming convention, so the systems (physics, spawns, track, POIs) attach to the
// map instead of hardcoded coordinates. This is the seam that lets us build a
// nice environment in Blender and re-layer all the existing code onto it.
//
// Name your Blender objects like this (everything else just renders as art):
//   col_<name>        a collision box — its world position, Y-rotation and size
//                     become a static box collider; the mesh is hidden in-game.
//   spawn_<key>       a spawn / anchor point (spawn_car, spawn_bike, spawn_player)
//                     — gives a position + Y heading.
//   poi_<key>         a point-of-interest anchor (poi_garage, poi_computer …).
//   track_000, _001…  ordered empties tracing the racing-line centreline, OR a
//                     single mesh named "track" whose vertices are the path.
//
// parseMap() is pure (three only) so it can be unit-tested in node without a
// browser / GLTFLoader — a loaded .glb yields the same Object3D tree.

import * as THREE from 'three'

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _e = new THREE.Euler()

function worldYaw(o) {
  o.getWorldQuaternion(_q)
  _e.setFromQuaternion(_q, 'YXZ')
  return _e.y
}

// an oriented (yaw-only) box collider from a mesh: local geometry bbox scaled by
// world scale, placed at the world position with the world Y-rotation
function boxCollider(o, name) {
  o.getWorldPosition(_v)
  o.getWorldScale(_s)
  let sx = 1
  let sy = 1
  let sz = 1
  if (o.geometry) {
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox
    sx = (bb.max.x - bb.min.x) * Math.abs(_s.x)
    sy = (bb.max.y - bb.min.y) * Math.abs(_s.y)
    sz = (bb.max.z - bb.min.z) * Math.abs(_s.z)
  }
  return {
    name,
    position: [_v.x, _v.y, _v.z],
    args: [sx, sy, sz],
    rotation: [0, worldYaw(o), 0],
  }
}

export function parseMap(root) {
  const colliders = []
  const spawns = {}
  const pois = {}
  const trackPts = []
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    const n = o.name || ''
    if (n.startsWith('col_')) {
      colliders.push(boxCollider(o, n))
      o.visible = false
    } else if (n.startsWith('spawn_')) {
      o.getWorldPosition(_v)
      spawns[n.slice(6)] = { position: [_v.x, _v.y, _v.z], heading: worldYaw(o) }
    } else if (n.startsWith('poi_')) {
      o.getWorldPosition(_v)
      pois[n.slice(4)] = { position: [_v.x, _v.y, _v.z], heading: worldYaw(o) }
    } else if (/^track_\d+$/.test(n)) {
      o.getWorldPosition(_v)
      trackPts.push({ i: parseInt(n.slice(6), 10), x: _v.x, z: _v.z })
    } else if (n === 'track' && o.geometry && o.geometry.attributes?.position) {
      const pos = o.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        _v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld)
        trackPts.push({ i, x: _v.x, z: _v.z })
      }
      o.visible = false
    }
  })
  trackPts.sort((a, b) => a.i - b.i)
  const track = trackPts.map((p) => [p.x, p.z])
  return { colliders, spawns, pois, track }
}
