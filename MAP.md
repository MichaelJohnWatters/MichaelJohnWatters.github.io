# Building a map (Blender or Spline) and re-layering the code onto it

Goal: design a nice environment in a 3D tool, export one `.glb`, and have the
existing systems (physics colliders, car/bike/player spawns, the racing line +
lap timer, garage/computer anchors) attach to it automatically — no hardcoded
coordinates.

The seam is **naming conventions** + `src/mapLoader.js`'s `parseMap()`, which
reads a loaded `.glb` scene and returns game data. `src/GameMap.jsx` is the R3F
glue (`useGameMap(url)` / `<GameMap url>`).

## Authoring tools

Either works — both export `.glb`, which is all the loader needs:

- **Spline** (spline.design) — browser-based, visual, easiest for a web dev.
  Design the scene, then **File → Export → glTF/GLB** (NOT `.splinecode` / the
  Spline runtime — that's a separate canvas the car/physics/OS can't layer onto).
- **Blender** — more powerful; export **glTF 2.0 (.glb)**.

Whichever you use: keep it under the mobile budget — run the export through
`gltf-transform` + Draco before committing (see CLAUDE.md). Grab CC0 props from
Kenney/Quaternius and HDRIs from Poly Haven; AI text-to-3D (Meshy/Tripo) for
hero pieces.

## Naming conventions (name your objects these — everything else is just art)

| Name pattern        | Becomes                                                        |
|---------------------|---------------------------------------------------------------|
| `col_<name>`        | a static **box collider** (world position, Y-rotation, size); the mesh is hidden in-game. Use simple boxes for walls/kerbs/buildings. |
| `spawn_<key>`       | a **spawn/anchor** with position + Y heading, e.g. `spawn_car`, `spawn_bike`, `spawn_player`. |
| `poi_<key>`         | a **point-of-interest** anchor, e.g. `poi_garage`, `poi_computer`. |
| `track_000`, `_001` … | ordered **empties** tracing the racing-line centreline. |
| `track`             | alternatively, a single mesh/line whose vertices (in order) are the centreline. |

Notes:
- Colliders are yaw-only oriented boxes (fine for walls/kerbs). For organic
  collision we can later add trimesh support or move to Rapier.
- The track centreline feeds `track.js` (road, barriers, lap gates, sectors,
  ghost) — see "next steps".

## How to wire it up (once you have a `.glb`)

1. Drop the export at `public/maps/world.glb`.
2. In the scene: `<GameMap url="/maps/world.glb" />` renders the art.
3. `const { map } = useGameMap('/maps/world.glb')` gives `{ colliders, spawns,
   pois, track }`.
4. Feed `map.colliders` to Playground's `<Fence>` list, `map.spawns` to the
   car/bike/player start points, and `map.track` to `track.js`.

## Next steps (the rest of the pipeline)

- **Collision-from-mesh**: auto-generate colliders from `col_*` meshes (done as
  boxes; trimesh/convex next) so you never hand-code barriers.
- **Spline-based track**: generalise `track.js` to consume `map.track` (any
  shape) instead of the fixed stadium — lap timer / sectors / ghost re-layer for
  free.
- **Migrate the current world**: express the existing garage + circuit as a map
  (or rebuild it in Spline/Blender) so everything runs through this one path.

## Testing

`node scripts/maploader-test.mjs` validates `parseMap` against a hand-built
scene (a loaded `.glb` produces the same Object3D tree).
