// Car profiles for the realistic (physics) mode. Everything that shapes the
// feel lives here so it can be picked per-car and tweaked live in the garage
// tuning panel. Units: mass kg, force N (peak wheel force), gears = each
// gear's top road speed in m/s.
export const GEARMUL = [1.0, 0.82, 0.68, 0.56, 0.46] // low gears pull harder (shared)

export const CARS = [
  {
    name: 'Civic FN4',
    color: '#2f6fb0',
    mass: 1200, // balanced hot hatch
    force: 9000,
    brake: 130,
    grip: 2.6, // tyre frictionSlip — higher = more grip, harder to spin
    gears: [8, 16, 26, 37, 50], // 29 / 58 / 94 / 133 / 180 km/h
  },
  {
    name: 'MX-5 Roadster',
    color: '#c0392b',
    mass: 950, // light + nimble, modest power, sticky tyres
    force: 6800,
    brake: 120,
    grip: 2.9,
    gears: [7, 14, 22, 31, 42], // ~151 km/h
  },
  {
    name: 'V8 Muscle',
    color: '#2a2a30',
    mass: 1650, // heavy, huge torque, tail-happy (spins easily)
    force: 15000,
    brake: 150,
    grip: 2.15,
    gears: [11, 21, 33, 47, 62], // ~223 km/h
  },
]

// tunable ranges for the live sliders [min, max, step]
export const TUNE = {
  mass: [700, 2200, 25],
  force: [5000, 20000, 250],
  brake: [80, 220, 5],
  grip: [1.6, 3.6, 0.05],
}
