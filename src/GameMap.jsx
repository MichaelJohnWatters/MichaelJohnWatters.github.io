// React glue for the map loader: load a Blender/Spline .glb, parse it into game
// data, render the environment, and hand the data to the systems.
//
//   const { scene, map } = useGameMap('/maps/world.glb')
//   // map.colliders  -> feed to Playground (static box colliders)
//   // map.spawns     -> car/bike/player start points
//   // map.track      -> centreline for track.js (road/barriers/lap gates)
//   // map.pois       -> garage/computer anchors
//
// parseMap mutates the loaded scene (hides col_/track meshes), so we memoise on
// the scene object and only parse once.
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { parseMap } from './mapLoader'

export function useGameMap(url) {
  const { scene } = useGLTF(url)
  const map = useMemo(() => parseMap(scene), [scene])
  return { scene, map }
}

export default function GameMap({ url }) {
  const { scene } = useGameMap(url)
  return <primitive object={scene} />
}
