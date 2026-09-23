# TODO — Michael Watters personal site

The concept: spiral down into a night garage, sit at a desk with two working
monitors (retro OS + Claude terminal), read/download the real CV, then step
away and explore in first person. Live at https://michaeljohnwatters.github.io

## ✅ Shipped (highlights)
- Scroll spiral dive → seated; typing figure fades as you "become" him
- To-scale garage: Civic FN4, MX-5 NA in pieces, roller door, night lighting
  (monitors are the key lights)
- Dual monitors as true 3D screens (drei Html + blending occlusion): per-pixel
  3D occlusion, always-on from any angle
- Full in-world OS: icons, windows (move / resize any edge / min / max /
  close / focus), 🐧 menu, taskbar, tabs, live clock — all via raycast bridge
  (click, hover, drag), Windows-style cursor matched across monitors
- Interactive scripted "Claude" terminal (real CV answers, easter eggs, `cv`
  downloads the PDF)
- CV viewer window: real CV in-world, right-side scrollbar w/ draggable thumb,
  prominent DOWNLOAD PDF; public copy redacted ([redacted] mobile), clean
  2-page PDF render pipeline (scripts/render-cv-pdf.mjs)
- Lean-in: 1/2 or double-click a screen; 3/esc/scroll back; post-it teaches it
- Explore: first-person default (V toggles third), collisions, E-to-sit
- Real content everywhere (about/experience/projects/skills/contact)
- Headless verification harness in scripts/ (screenshots Claude can read)

---

# ROADMAP

## 🏁 Tier 0 — Quick wins (≈ one short session, do first)
- [ ] Favicon (currently 404s every load) + `<meta>` description
- [ ] Social card: og:title/og:image using the night-garage hero shot —
      link previews on LinkedIn/Twitter/Slack sell the click
- [ ] MX-5 wheel pile: lay wheels flat + stack properly (currently upright,
      sunk & interpenetrating)
- [ ] Hide the ScrollControls scrollbar on Windows classic-scrollbar browsers
- [ ] Chair shadow doesn't fade with the chair (disable castShadow during fade)

## 📱 Tier 1 — Reach: mobile & performance (the biggest audience gap)
- [ ] Touch controls: tap = click (bridge mostly works), double-tap lean-in,
      virtual joystick or tap-to-walk for explore mode
- [ ] Terminal input on mobile (hidden <input> to summon the keyboard)
- [ ] Rework keyboard-only hints (post-it/buttons) for touch
- [ ] Perf pass: shared geometries/materials (~40 dupes), fewer point lights,
      clamp devicePixelRatio, disable shadows on weak GPUs
- [ ] Loading screen / intro state (first paint is currently abrupt)

## 🎮 Tier 2 — The payoff features (memorability)
- [ ] **MX-5 build minigame**: walk to scattered parts → E to collect →
      progress bar on the status.sh tab (12% → 100%) → car assembles.
      Narrative already seeded in the terminal.
- [ ] **Drive the Civic** (and/or the finished MX-5): arcade controller,
      chase cam, wall collisions; roller door opens as the finale
- [ ] Mixamo character (rigged walk/idle) replaces the blockout figure
- [ ] Garage set dressing: shelves, toolbox, posters (projects as wall
      posters?), swap primitives for nicer low-poly .glb piece by piece

## 🔊 Tier 3 — Ambience & polish
- [ ] Sound design: room tone hum, keyboard clacks while typing, footsteps,
      minigame/driving SFX (WebAudio, same synth approach as clicks)
- [ ] Post-processing: bloom on the monitor glow, subtle vignette (check
      interplay with the transparent-canvas blending trick)
- [ ] Lighting/mood second pass once real models land

## 🧰 Tier 4 — Craft debt (keeps future features cheap)
- [ ] Camera owner/state machine: desk↔explore↔(drive) transitions are
      emergent pairwise lerps today; back-to-desk can clip through the Civic.
      PREREQUISITE for drive mode.
- [ ] Centralise scroll-timeline thresholds (0.15/0.55/0.8/0.92) in one config
- [ ] Dedupe Person/StandingFigure into one figure module
- [ ] Swap hand-rolled input/math for drei KeyboardControls, MathUtils.damp
- [ ] OS windows: wheel-forwarding so scrolling over screens can both scroll
      content AND exit the dive cleanly

## 💤 Someday
- [ ] Reacquire michaeljohnwatters.co.uk → custom domain
- [ ] Privacy-friendly analytics (know when recruiters visit)
- [ ] Real-Claude terminal via rate-limited Cloudflare Worker (scripted stays
      the fallback)
- [ ] Fix Magnite dates in the CV source (Dec 2025 overlaps Napier Jan 2025)
