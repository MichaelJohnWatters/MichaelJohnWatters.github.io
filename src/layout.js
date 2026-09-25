// Single source of truth for the garage layout (metres).
// Room.jsx builds meshes from these; Player.jsx collides against them;
// CameraRig.jsx aims at them. Change here, everything stays in sync.

// Interior of the garage shell (walls sit ON these lines).
// Big double-bay workshop: 13 x 10m, 4m ceiling (lift headroom; a future
// mezzanine floor could sit at ~2.6m). Desk corner unchanged at the back.
export const GARAGE = { minX: -6.5, maxX: 6.5, minZ: -3, maxZ: 7, ceiling: 5.4 }

// Two roller doors in the front wall (z = maxZ), one per bay.
export const DOORS = [
  { x: -2.2, w: 2.7, h: 2.4 }, // lift bay door
  { x: 2.8, w: 2.7, h: 2.4 }, // parking bay door
]

// The world outside the garage: the fenced lot, then a ~500m road north
// out of it to a roundabout (drive down, loop it, come back).
export const WORLD = { minX: -28, maxX: 28, minZ: -18, maxZ: 566 }
export const LOT = { maxZ: 34 } // the walled yard around the garage
export const ROAD = { x: 0.3, w: 8, z0: 34, z1: 534 }
export const RBT = { x: 0.3, z: 545, outerR: 16, islandR: 7 }
// round obstacles (the roundabout island) — checked as circles
export const CIRCLES = [{ x: RBT.x, z: RBT.z, r: RBT.islandR + 0.4 }]

// (legacy close-yard bound — the lamp/bins cluster still anchors here)
export const YARD = { maxZ: 11.3 }

// Two-post car lift (the MX-5 project car lives up here).
export const LIFT = { x: -2.2, z: 2.0, postDX: 1.35, postH: 2.6, deckY: 1.45 }

// Wall light switches (all toggle the same workshop lights). Each has a
// glow-in-the-dark locator dot. rotY orients the plate off its wall.
export const SWITCHES = [
  { pos: [0.3, 1.25, 6.92], rotY: Math.PI }, // pillar between the doors
  { pos: [1.7, 1.25, -2.94], rotY: 0 }, // back wall, beside the desk
  { pos: [-6.44, 1.25, -0.4], rotY: Math.PI / 2 }, // left wall, by the workbench
  { pos: [6.44, 1.25, -1.4], rotY: -Math.PI / 2 }, // right wall, cave corner
]

// Dual-monitor setup on the desk. Each: world position/rotation of the glass
// centre, physical size (m), and framebuffer resolution (px). The DOM UI is
// authored at pxW x pxH and mapped onto the glass via drei <Html transform>
// (world width = pxW * distanceFactor / 400 → distanceFactor = 400*w/pxW).
export const MONITORS = {
  // 32" primary, dead ahead
  primary: { x: -0.33, y: 1.14, z: -2.83, rotY: 0.1, w: 0.71, h: 0.4, pxW: 640, pxH: 360 },
  // 27" secondary, angled in toward the seat
  secondary: { x: 0.5, y: 1.12, z: -2.78, rotY: -0.35, w: 0.62, h: 0.37, pxW: 640, pxH: 382 },
}

// Where the chair sits — walking here lets you sit back down.
export const SEAT = { x: 0, z: -1.85 }

// Placement anchors (Room.jsx builds from these).
export const CIVIC = { pos: [2.8, 0, 2.2], rotY: Math.PI / 2 } // nose to its door

// Cars parked in a row out in the lot (decorative; different classes).
export const PARKED = [
  { type: 'suv', color: '#48604a', x: 15, z: 12, rotY: 0 },
  { type: 'hatch', color: '#b8892f', x: 15, z: 14.6, rotY: 0 },
  { type: 'roadster', color: '#7a2f6a', x: 15, z: 17.2, rotY: 0 },
  { type: 'muscle', color: '#2f5f6a', x: 15, z: 19.8, rotY: 0 },
]
export const BIKES = [
  { pos: [5.6, 0, 4.6], rotY: -0.5 },
  { pos: [5.7, 0, 3.4], rotY: -0.35 },
]
export const CAVE = {
  couch: { x: 4.9, z: -1.2 }, // back-right corner, pushed back from the TV
  fridge: { x: 6.1, z: 6.2 }, // front-right corner, out of the lounge
  neon: { x: 6.49, y: 2.2, z: 1.5 }, // on the right wall
}
// Where the player's eyes go when sitting on the couch (facing the TV).
export const SOFA_SEAT = { x: 4.9, z: -1.1, standZ: -2.45 }

// Axis-aligned collision boxes for solid stuff (world coords).
// Player radius is added at test time.
export const COLLIDERS = [
  // desk + monitors
  { minX: -1.0, maxX: 1.0, minZ: -3.0, maxZ: -2.15 },
  // (the Civic is NOT here — it moves; Player/Drive collide with its live
  // position as a circle)
  // lift posts (the raised MX-5 tub is overhead — walk under it)
  { minX: -3.75, maxX: -3.15, minZ: 1.7, maxZ: 2.3 },
  { minX: -1.25, maxX: -0.65, minZ: 1.7, maxZ: 2.3 },
  // MX-5 parts on the floor around the lift
  { minX: -1.2, maxX: -0.5, minZ: 3.4, maxZ: 4.0 }, // engine block
  { minX: -3.9, maxX: -3.0, minZ: 3.6, maxZ: 4.4 }, // wheel pile
  // doors leaning on the left wall
  { minX: -6.5, maxX: -6.1, minZ: 0.8, maxZ: 3.4 },
  // workbench along the left wall (back half)
  { minX: -6.5, maxX: -5.8, minZ: -2.6, maxZ: -0.2 },
  // shelving, right wall
  { minX: 6.0, maxX: 6.5, minZ: 0.4, maxZ: 2.6 },
  // (motorbikes are NOT here — they ride; live circle collisions instead)
  // man-cave corner: couch (fridge now in the front-right corner)
  { minX: 3.9, maxX: 5.9, minZ: -1.8, maxZ: -0.7 },
  { minX: 5.75, maxX: 6.5, minZ: 5.8, maxZ: 6.6 },
  // outside: lamp post + shipping container (bins are physics props now)
  { minX: 5.25, maxX: 5.55, minZ: 10.15, maxZ: 10.45 },
  { minX: -20.5, maxX: -14.5, minZ: 24.0, maxZ: 26.6 },
  // (parked cars are now drivable — their colliders are added dynamically per
  //  IDLE car so the one you're driving has a clear spot; see Playground/Player)
  // lot north wall, split with a gap where the road exits
  { minX: -28, maxX: -3.9, minZ: 33.85, maxZ: 34.15 },
  { minX: 4.5, maxX: 28, minZ: 33.85, maxZ: 34.15 },
  // hedges flanking the road corridor all the way to the roundabout
  { minX: -20.3, maxX: -19.7, minZ: 34, maxZ: 561 },
  { minX: 19.7, maxX: 20.3, minZ: 34, maxZ: 561 },
  // end cap behind the roundabout
  { minX: -20.3, maxX: 20.3, minZ: 560.8, maxZ: 561.2 },
]

// The garage BUILDING as solid geometry for the open world: side + back
// walls (the front wall with its door openings is handled specially).
export const BUILDING_WALLS = [
  { minX: GARAGE.minX - 0.15, maxX: GARAGE.minX + 0.05, minZ: GARAGE.minZ - 0.15, maxZ: GARAGE.maxZ }, // left
  { minX: GARAGE.maxX - 0.05, maxX: GARAGE.maxX + 0.15, minZ: GARAGE.minZ - 0.15, maxZ: GARAGE.maxZ }, // right
  { minX: GARAGE.minX, maxX: GARAGE.maxX, minZ: GARAGE.minZ - 0.15, maxZ: GARAGE.minZ + 0.05 }, // back
]
