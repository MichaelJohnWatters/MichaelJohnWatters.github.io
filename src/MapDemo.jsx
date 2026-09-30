// Dev-only end-to-end proof of the map pipeline: load a real .glb, run it through
// parseMap, and render everything it extracted — the environment art, the box
// colliders (red wireframe), a full circuit built from map.track via buildTrack
// (dark road + orange barriers), spawns (green) and POIs (blue). Open with
// http://localhost:5173/#mapdemo
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { useGameMap } from './GameMap'
import { buildTrack } from './track'

function MapContents() {
  const { scene, map } = useGameMap('/maps/test.glb')
  const track = buildTrack(map.track, { width: 10, off: 9 })
  if (import.meta.env.DEV) window.__mapdemo = map // for the headless check
  return (
    <>
      <primitive object={scene} />
      {/* box colliders extracted from col_* meshes */}
      {map.colliders.map((c, i) => (
        <mesh key={'c' + i} position={c.position} rotation={c.rotation}>
          <boxGeometry args={c.args} />
          <meshBasicMaterial color="#ff4444" wireframe />
        </mesh>
      ))}
      {/* road + barriers built from map.track (the track_* centreline) */}
      {track.seg.map((s, i) => (
        <group key={'r' + i} position={[s.mx, 0.05, s.mz]} rotation={[0, -s.ang, 0]}>
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[s.len + 0.6, 10]} />
            <meshStandardMaterial color="#3a3a42" />
          </mesh>
        </group>
      ))}
      {track.barriers.map((b, i) => (
        <mesh key={'b' + i} position={[b.x, 0.6, b.z]} rotation={[0, -b.ang, 0]}>
          <boxGeometry args={[b.len, 1.2, 0.3]} />
          <meshStandardMaterial color="#ff5a3c" emissive="#ff5a3c" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* spawns (green spheres) + POIs (blue cubes) */}
      {Object.entries(map.spawns).map(([k, s]) => (
        <mesh key={'s' + k} position={[s.position[0], 1.5, s.position[2]]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#2bff5c" />
        </mesh>
      ))}
      {Object.entries(map.pois).map(([k, p]) => (
        <mesh key={'p' + k} position={[p.position[0], 1.5, p.position[2]]}>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshBasicMaterial color="#5ad8ff" />
        </mesh>
      ))}
    </>
  )
}

export default function MapDemo() {
  return (
    <>
      <Canvas camera={{ position: [70, 70, 70], fov: 45 }} style={{ position: 'fixed', inset: 0, background: '#12121a' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[30, 60, 20]} intensity={1.3} />
        <Suspense fallback={null}>
          <MapContents />
        </Suspense>
        <OrbitControls />
      </Canvas>
      <div style={{ position: 'fixed', top: 12, left: 12, color: '#cfe3ff', font: '13px system-ui', background: 'rgba(0,0,0,.5)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>
        <b>map pipeline demo</b> — /maps/test.glb → parseMap<br />
        <span style={{ color: '#ff4444' }}>▢ colliders (col_*)</span> · <span style={{ color: '#ff5a3c' }}>▬ barriers from map.track</span><br />
        <span style={{ color: '#2bff5c' }}>● spawns</span> · <span style={{ color: '#5ad8ff' }}>■ POIs</span> · drag to orbit
      </div>
    </>
  )
}
