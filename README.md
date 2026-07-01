# Bookshelf

A skeuomorphic, Apple-style 3D bookshelf floating in a galaxy, built with React, Three.js, and Rapier physics.

## Features

- **Procedural everything** — wood grain, book spines, titles, and galaxy particles are all generated on canvas at runtime. No image assets.
- **Skeuomorphic bookshelf** — four shelves of books with randomized dimensions, colors, tilt, and procedurally drawn spines (gradient body, cap bands, decorative lines, title).
- **Galaxy background** — 6,000-point spiral galaxy with additive blending, slow rotation, and orange-to-blue color gradient.
- **Four camera modes:**
  - **Fixed View** — static framing with gentle handheld camera shake
  - **Rotate** — slow auto-orbit around the bookshelf
  - **Customize** — free orbit / zoom via OrbitControls
  - **Play** — physics-enabled mode where you can grab books and fling them around
- **Play mode physics** — powered by Rapier:
  - Drag any book to grab it — it follows your cursor in real time
  - Release to fling — velocity from your drag is applied as linear + angular velocity
  - Books collide with each other, the shelf frame, and a floor
- **Apple-style UI** — frosted-glass segmented control with SF Pro font stack, backdrop blur, and subtle shadows.

## Tech Stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [Three.js](https://threejs.org)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) — React renderer for Three.js
- [@react-three/drei](https://github.com/pmndrs/drei) — helpers (OrbitControls, Environment, ContactShadows, Float)
- [@react-three/rapier](https://github.com/pmndrs/react-three-rapier) — Rapier physics bindings

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
```

Output is in `dist/`.
