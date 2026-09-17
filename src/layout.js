// Single source of truth for the garage layout (metres).
// Room.jsx builds meshes from these; Player.jsx collides against them;
// CameraRig.jsx aims at them. Change here, everything stays in sync.

// Interior of the garage shell (walls sit ON these lines).
export const GARAGE = { minX: -4.5, maxX: 4.5, minZ: -3, maxZ: 4.5, ceiling: 2.8 }

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

// Car bay group origins (Room.jsx places the models here).
export const CIVIC_POS = [1.5, 0, 0.9]
export const MX5_POS = [1.5, 0, 3.0]

// Axis-aligned collision boxes for solid stuff (world coords).
// Player radius is added at test time.
export const COLLIDERS = [
  // desk + monitors (desk widened to 1.8 for the dual setup)
  { minX: -1.0, maxX: 1.0, minZ: -3.0, maxZ: -2.15 },
  // Civic FN4 (4.27 x 1.77 at CIVIC_POS)
  { minX: 1.5 - 2.2, maxX: 1.5 + 2.2, minZ: 0.9 - 0.95, maxZ: 0.9 + 0.95 },
  // MX-5 tub on stands (3.6 x 1.5 at MX5_POS)
  { minX: 1.5 - 1.9, maxX: 1.5 + 1.9, minZ: 3.0 - 0.85, maxZ: 3.0 + 0.85 },
  // engine block on the floor (world ~[3.9, 3.5])
  { minX: 3.55, maxX: 4.25, minZ: 3.2, maxZ: 3.8 },
  // wheel pile (world ~[-1.0..-0.4, 1.9..2.1])
  { minX: -1.3, maxX: -0.1, minZ: 1.6, maxZ: 2.4 },
]
