# TODO — Michael Watters personal site

The concept: you spiral down into a **garage**, land seated at a desk, and dive
into a retro-Linux computer holding all the real content. "Step away from the
desk" later drops you into a **character** who can walk the garage (desk + a car)
and explore.

Two modes:
- **Lean-back (the dive):** scroll → spiral in → seated at desk → retro OS with content.
- **Lean-forward (the escape):** "step away" → third-person character walks the garage.

---

## ✅ Done
- [x] Vite + React + React Three Fiber + drei scaffold
- [x] Auto-deploy: push to `main` → GitHub Actions → Pages (live at michaeljohnwatters.github.io)
- [x] Low-poly blockout room (desk, monitor, keyboard, chair, clutter) from primitives
- [x] Scroll-driven **spiral** camera intro (anti-clockwise, down + in)
- [x] Camera lands **seated at the desk** (not flying through the screen)
- [x] Retro-Linux (CDE/Motif) desktop overlay sized to the monitor
- [x] Fake movable mouse cursor on the desktop
- [x] Spiral dialed to a gentle ~60° arc (from front-right)
- [x] OS overlay mapped ONTO the monitor screen mesh (projects each frame)
- [x] Chair fades out as you take the seat
- [x] Low-poly guy sitting + typing at the desk, fades as you "become" him

## 🔜 Next up (Phase 1 polish — the dive)
- [x] **Turn the room into a GARAGE** — concrete floor, walls, roller door, strip lights
- [x] Two car bays: a complete (drivable-later) car + an MX-5 in pieces
- [ ] Tune spiral: number of turns, speed, start position
- [ ] Tune seated distance / monitor framing
- [x] Lock the retro-OS era/look (CDE desktop + claude/status terminal, night theme)
- [x] Desktop icons open windows: open/focus/close, cascade, taskbar, 🐧 menu,
      live clock, terminal tab switching — all via the raycast click bridge
- [x] Window FOCUS system: click to select, typing routes to focused surface
      (terminal); focused window gets the blue title bar
- [x] First/third person toggle in explore mode (V key or button; mouse-look in FP)
- [ ] Make the OS windows show **real content** (see below)

## 🎯 Content (fill the computer with real info)
- [ ] About — who you are, what you build, what you want
- [ ] Experience — career timeline (roles, companies, dates)
- [ ] Projects — pull from GitHub repos, pick the best, add stack + links
- [ ] Skills — languages / frameworks / tools
- [ ] Contact — email, GitHub, LinkedIn, CV download
- [ ] (Optional) grab a CV / LinkedIn to mirror

## 🚶 Phase 2 — character / walk-around mode
- [x] "Step away from desk" button works → drops into walk mode
- [x] Third-person low-poly character + follow camera + WASD/arrows + bounds
- [x] "Back to desk" returns to seated/scroll mode
- [x] Collisions: desk, both cars, engine block, wheel pile (AABB, slide along)
- [x] Walk up to the chair → "press E to sit back down" (proximity return)
- [x] Shared layout module (src/layout.js) — garage/screen/seat/collider consts
- [x] Roam camera swings behind walking direction; camera-relative WASD
- [x] Screens are TRUE 3D objects (drei Html transform occlude) — always
      rendering on the glass, any angle, both modes
- [x] DUAL MONITORS: 32" primary (desktop) + angled 27" (terminal), fake
      cursor hops between displays like a real extended desktop
- [ ] Nicer character (Mixamo rig + walk/idle animations) instead of blockout
- [ ] Mouse-look / rotate camera around the character
- [ ] Interactive garage objects (shelves, posters → about/hobbies/links)
- [ ] Enter + DRIVE the complete car
- [ ] **MX-5 build minigame** — collect/assemble the scattered parts; when
      complete the car becomes whole and drivable ("build it before you use it")

## 🔍 Code-review findings still open (2026-09-16 review)
- [ ] Back-to-desk camera can clip through the Civic (no single camera owner —
      needs a camera state machine before adding the drive mode)
- [ ] Touch/mobile: explore mode has no touch controls; retro OS fixed px sizes
      overflow small windows (needs scale-with-panel units)
- [ ] ScrollControls scrollbar visible on Windows classic-scrollbar browsers
- [ ] OS desktop buttons unclickable (pointer-events) — enable when making
      icons open windows; forward wheel events so scroll-out still works
- [ ] Chair shadow doesn't fade with the chair (shadow pass ignores opacity)
- [ ] MX-5 wheel pile: wheels are upright + sunk/interpenetrating — lay flat
      (rotation-z, not rotation-x) and stack on the floor
- [ ] Perf pass: share geometries/materials (~40 dup materials), fewer point
      lights, guard the screen-projection until OS visible, cursor rect via ref
- [ ] Swap hand-rolled bits for stock: drei KeyboardControls, THREE.MathUtils
      smoothstep/damp, consider drei <Html transform> for the screen overlay
- [ ] Dedupe Person/StandingFigure into one shared figure module
- [ ] Centralise scroll timeline thresholds (0.15/0.55/0.8/0.92) in one config

## ✨ Later polish
- [ ] Swap primitive blockout for nicer low-poly `.glb` models
- [ ] Lighting/mood pass (garage strip lights, monitor glow, HDRI)
- [ ] Post-processing (bloom, subtle DoF/vignette)
- [ ] Mobile performance pass + touch controls
- [ ] Sound? (ambient garage hum, keyboard clacks, engine)
- [ ] Loading screen / intro state
- [ ] Reacquire michaeljohnwatters.co.uk domain (optional) and re-attach

## ❓ Open questions
- Retro-OS era/style?
- What car? (personality — a specific model, or generic low-poly?)
- Spiral: more or fewer turns?
