# Bookshelf

A procedural 3D bookshelf scene built with React, Vite, Three.js, and Rapier physics. The app renders a wood-grain bookshelf suspended in space, with generated book spines, switchable galaxy backdrops, camera modes, and an interactive physics play mode.

## Features

- Procedural bookshelf with generated wood grain, randomized books, textured spines, shelf shadows, and a floating display mode.
- Two galaxy backdrops:
  - Realistic: soft sprite stars, bright core glow, spiral arms, halo stars, and nebula color variation.
  - Pixelated: a simpler additive spiral galaxy made from point particles.
- Four camera modes:
  - Fixed View: composed static framing with subtle handheld motion.
  - Rotate: automatic orbit around the bookshelf.
  - Customize: OrbitControls-powered camera orbit and zoom.
  - Play: physics mode where books become draggable rigid bodies.
- Play mode interactions:
  - Drag a book to grab it.
  - Release to fling it with drag-derived velocity.
  - Use Reset to rebuild the physics scene.
  - Books collide with shelves, side panels, the back panel, top and bottom boards, and a hidden floor.
- Apple-style glass controls with segmented view selectors.

## Tech Stack

- [React](https://react.dev)
- [Vite](https://vite.dev)
- [Three.js](https://threejs.org)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
- [@react-three/drei](https://github.com/pmndrs/drei)
- [@react-three/rapier](https://github.com/pmndrs/react-three-rapier)
- [Bun](https://bun.sh)

## Getting Started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Open `http://localhost:5173`.

## Scripts

```bash
bun run dev      # Start Vite in development mode
bun run build    # Create a production build in dist/
bun run preview  # Preview the production build locally
bun run lint     # Run oxlint
```

## Project Structure

```text
src/
  App.jsx                 # Application state and full-window canvas shell
  components/
    Controls.jsx          # Camera, galaxy, and play-mode controls
  scene/
    Bookshelf.jsx         # Procedural books, wood, and physics interactions
    CameraRig.jsx         # Fixed, rotating, and custom camera behavior
    Galaxy.jsx            # Galaxy particles, sprites, and nebula textures
    Scene.jsx             # Lighting, environment, and scene composition
  main.jsx                # React entrypoint and global page styles
public/
  favicon.svg
```

## Notes

- The visual assets are generated at runtime with canvas textures and Three.js geometry.
- Physics is only enabled in Play mode; the default viewing modes keep the bookshelf in a lightweight floating scene.
- The app is designed for a full-window canvas experience.
