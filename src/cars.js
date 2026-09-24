// Car profiles for the realistic (physics) mode. Everything that shapes the
// feel lives here so it can be picked per-car and tweaked live in the garage
// tuning panel. Units: mass kg, force N (peak wheel force), gears = each
// gear's top road speed in m/s.
export const GEARMUL = [1.0, 0.82, 0.68, 0.56, 0.46] // low gears pull harder (shared)

export const CARS = [
  {
    name: 'Civic FN4',
    type: 'hatch',
    color: '#2f6fb0',
    mass: 1200, // balanced hot hatch
    force: 9000,
    brake: 130,
    grip: 2.6, // tyre frictionSlip — higher = more grip, harder to spin
    gears: [8, 16, 26, 37, 50], // 29 / 58 / 94 / 133 / 180 km/h
  },
  {
    name: 'MX-5 Roadster',
    type: 'roadster',
    color: '#c0392b',
    mass: 950, // light + nimble, modest power, sticky tyres
    force: 6800,
    brake: 120,
    grip: 2.9,
    gears: [7, 14, 22, 31, 42], // ~151 km/h
  },
  {
    name: 'V8 Muscle',
    type: 'muscle',
    color: '#2a2a30',
    mass: 1650, // heavy, huge torque, tail-happy (spins easily)
    force: 15000,
    brake: 150,
    grip: 2.15,
    gears: [11, 21, 33, 47, 62], // ~223 km/h
  },
]

// Body proportions per class of vehicle (metres). Shared by the driven car
// and the parked cars so each type reads at a glance.
//   len, wid  = footprint · bodyH/bodyY = main hull · cabin* = greenhouse
//   ride = extra ground clearance · wheelR = tyre radius
export const SHAPES = {
  roadster: { len: 3.9, wid: 1.7, bodyH: 0.5, bodyY: 0.42, cabinLen: 1.1, cabinH: 0.4, cabinY: 0.74, cabinX: 0.2, ride: 0, wheelR: 0.3 },
  hatch: { len: 4.2, wid: 1.77, bodyH: 0.62, bodyY: 0.48, cabinLen: 2.0, cabinH: 0.66, cabinY: 1.06, cabinX: -0.3, ride: 0.02, wheelR: 0.31 },
  muscle: { len: 4.9, wid: 1.94, bodyH: 0.64, bodyY: 0.48, cabinLen: 1.7, cabinH: 0.58, cabinY: 1.04, cabinX: -0.55, ride: 0, wheelR: 0.34 },
  suv: { len: 4.6, wid: 1.9, bodyH: 0.85, bodyY: 0.66, cabinLen: 2.5, cabinH: 0.95, cabinY: 1.38, cabinX: -0.05, ride: 0.12, wheelR: 0.37 },
}

// tunable ranges for the live sliders [min, max, step]
export const TUNE = {
  mass: [700, 2200, 25],
  force: [5000, 20000, 250],
  brake: [80, 220, 5],
  grip: [1.6, 3.6, 0.05],
}
