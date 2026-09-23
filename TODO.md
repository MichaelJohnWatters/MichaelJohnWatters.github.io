# TODO — Michael Watters personal site

A 3D man-cave workshop portfolio. Live at https://michaeljohnwatters.github.io
Dive to a desk with two working monitors, read/download the real CV, browse
the web on a retro OS, then walk the garage in first person.

## ✅ Shipped (running summary)

**World** — 13x10m workshop, 4m ceiling, two roller doors; MX-5 NA raised on
a two-post lift (walk under it) with parts strewn about; Civic FN4; two
motorbikes; workbench + pegboard; shelves; couch/TV/fridge/neon cave corner;
oil stains; to-real-scale everything.

**Lighting** — day/night via 4 physical wall switches (amber glow-locator
dots), L key, 💡 button; exposure-driven brightness; LED bias strip behind
the monitors; neon + bay work lights; monitors are the night key lights.

**The OS** — full window manager (open/focus/close/min/max/move/resize any
edge), 🐧 menu, taskbar + quick-launch pins, per-app glyphs, tabs, live
clock, Windows cursor matched across monitors. All via a raycast bridge
(click/hover/drag + modifier forwarding) — plus native results pages.

**Apps** — CV viewer (in-world CV + scrollbar + DOWNLOAD PDF); netscape.exe
(Noogle search → native retro results; embedded page view w/ scrollbar;
view-mode vs 🖱 live-control; sandbox stops tab hijacking; shift-click =
visitor's real browser; frame-blocker notice pages); terminal (scripted
Claude with real CV answers, cv/status commands, tabs).

**Game feel** — spiral intro tour; lean-in (1/2/3, double-click/tap);
first-person default with pointer-lock mouse-look + centre crosshair that
flares on interactives; third-person toggle (V); collisions; E-to-sit;
footsteps/clacks/clicks/room-tone (WebAudio, no files); mute.

**Whiteboard tasks** — handwritten task list on the wall; 6 tasks tick off
live with ding + toast; persists in localStorage.

**Reach** — mobile/touch (tap, double-tap lean-in, joystick, mobile
keyboard); aspect-adaptive camera (portrait fits); favicon; og social card;
meta; redacted 2-page CV pipeline (private full version in ~/Downloads).

**Infra** — headless verification harness (scripts/*.mjs — screenshots
readable in-session); Cloudflare Worker search proxy scaffolded (worker/).

## 🔜 Immediate
- [x] **Search worker DEPLOYED** — live at
      `https://noogle-search.michaeljohnwatters.workers.dev` (account
      michaeldoescodeandstuff@gmail.com, free tier). Redeploy after edits:
      `npx wrangler deploy worker/search-worker.js --name noogle-search
      --compatibility-date 2025-01-01`. Noogle now returns real web results
      in-world (Bing w/ junk-retry; empty → client Wikipedia fallback; DDG
      unusable — 522s all Cloudflare Worker requests). `?debug=1` shows
      per-attempt diagnostics.
- [ ] Perf watch: if still laggy → shared geometries/materials, shadow map
      tuning, fewer Html surfaces on low-end
- [x] Magnite dates fixed (Feb 2022 – Dec 2024) in CV html + PDF + OS +
      terminal
- [ ] Maybe: "more results" button on Noogle (worker supports Bing's &first=
      paging) — 8 + scrollbar feels enough for now

## 🎮 Tier 2 — payoff features
- [ ] **Go outside**: aim at a roller door → it rolls up (animated) → walk
      out to a night driveway. Needs: door-open animation + sound, ground/
      sky outside (drei Stars + moonlight + a street lamp), swap the hard
      GARAGE position clamp in Player for collider-based bounds (fence =
      outer boundary), a few props (bins, lamp post, gravel). Phase 2 of
      this = drive the Civic out (the driving feature's finale).
- [ ] **MX-5 build minigame**: crosshair-interact with scattered parts →
      progress on status.sh + new whiteboard tasks → car assembles on the
      lift → lower it. (The crosshair + tasks systems are ready for this.)
- [ ] **Drive the Civic** (or finished MX-5): arcade controller, chase cam,
      roller doors open as the finale. PREREQ: camera owner/state machine
      (desk↔explore↔drive transitions; fixes back-to-desk clipping too)
- [ ] Mixamo character (walk/idle) replaces the blockout figure
- [ ] Garage set dressing pass: project posters on walls, nicer low-poly
      .glbs piece by piece, TV playing something

## 🔊 Tier 3 — ambience & polish
- [x] **Cave TV plays a live YouTube stream** — click the TV (crosshair-aim in
      FP) to power on lofi radio, muted, off by default; 7th whiteboard task
      "watch some telly"
- [ ] Bloom/vignette post-processing (verify blending-canvas interplay)
- [ ] More sound: engine, joystick footstep pacing, neon buzz
- [ ] Loading screen / intro state
- [ ] Second lighting pass once real models land

## 💤 Someday
- [ ] Mezzanine second floor (ceiling height already allows it)
- [ ] Reacquire michaeljohnwatters.co.uk → custom domain
- [ ] Privacy-friendly analytics
- [ ] Real-Claude terminal via rate-limited Worker (scripted stays fallback)
- [ ] More whiteboard tasks tied to new features
