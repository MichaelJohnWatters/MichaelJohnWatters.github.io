# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

Michael Watters' personal-branding / portfolio website. Goal: a hire-me
showcase where the 3D experience is the hook and the content (projects, CV,
contact) closes the deal. Owner is a comfortable JS/React developer — explain
3D-specific concepts (Three.js internals, shaders, 3D math), skip basic
JS/React explanations.

## Stack

- **Vite** (build tool / dev server)
- **React 18**
- **React Three Fiber** (`@react-three/fiber`) — React renderer for Three.js
- **drei** (`@react-three/drei`) — R3F helpers (controls, materials, loaders, env)
- **three** — underlying engine

## Toolchain

- **Node 20 required.** The machine default is an old Node 16 (breaks Vite).
  Always run `nvm use 20` before npm commands in this repo.
- `npm run dev` — local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/` locally

## Deployment

- Hosted on **GitHub Pages** at **https://michaeljohnwatters.github.io** (root
  user site — the repo is `MichaelJohnWatters/MichaelJohnWatters.github.io`).
- Deploy is automatic via **GitHub Actions** (`.github/workflows/deploy.yml`)
  on every push to `main`. Pages source = GitHub Actions (not a branch).
- `vite.config.js` `base` is `'/'` because this is a root user site. (If ever
  moved to a project page, base must become `/<repo>/`.)
- The pre-2021 Three.js Journey project that used to live here is preserved on
  the `archive/threejs-journey-2021` branch.
- The old custom domain `michaeljohnwatters.co.uk` is no longer owned; its CNAME
  was removed. Could be re-attached later if reacquired.

## 3D asset strategy

Procedural / generative first (code-built geometry, shaders, particles — the
default, it's performant and unique). Supplement with:
- AI text-to-3D (`.glb`): Meshy, Tripo, Luma Genie, Rodin, Spline
- Free CC0 libraries: Poly Pizza, Quaternius, Kenney, Sketchfab (downloadable)
- HDRIs / textures: Poly Haven
Optimize any imported models with `gltf-transform` / Draco compression before
committing. Keep an eye on mobile performance budgets — 3D is heavy on phones.

## Conventions

- Components in `src/`, one 3D "feature" per file where practical.
- Keep the render loop cheap: memoize geometry/materials, avoid allocating in
  `useFrame`.
