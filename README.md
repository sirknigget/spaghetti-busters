# Spaghetti Busters

**Clean code. Dirty work.** A fast arcade shooter about refactoring with a very large cannon.

![Spaghetti Busters opening screen](docs/screenshots/menu.png)

Play as a bespectacled code quality specialist in a white suit. Blast huge, syntax-highlighted TypeScript blocks into flying letters and physics-driven fragments. Finish every chunk before it disappears through the left edge. Clear waves to take on faster, larger, tougher, and more numerous blocks from an expanded library of ridiculous code. The battlefield uses real Three.js WebGL rendering: solid code slabs tumble around all three axes, damage opens physical holes through their faces, and sculpted characters, weapons, and buildings share directional lighting and real shadows. Gameplay and collision physics remain on a 2D plane.

![Real 3D gameplay](docs/screenshots/gameplay.png)

## Play locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The server binds to all interfaces on port 3000.

## Controls

| Action | Control |
| --- | --- |
| Move and aim | Mouse / drag on a touchscreen |
| Primary fire | Left click, hold, or Space |
| Select homing backspace missiles | 1 or the Backspace slot |
| Select recycle-bin grenades | 2 or the Recycle Bin slot |
| Launch selected special | Right click / hold, or the touch FIRE button |
| Move vertically | Arrow Up/Down or W/S |
| Pause / resume | P, Escape, or the pause button |
| Sound | Speaker button |

Landscape orientation gives touch devices the biggest battlefield.

Shoot the rare highlighted `DOUBLE_SHOT` or `TRIPLE_SHOT` variable to release a floating weapon. **Shoot that weapon again** to equip it. Upgraded rounds and special ammunition are scarce; `AMMO_CACHE` grants a small refill. The basic cannon always has unlimited shots. Backspace missiles acquire and chase code; recycle-bin grenades arc toward your aim and damage all code in their blast radius. Your best score is saved in your browser.

Fast red `await setTimeout(milliseconds);` hazards target the specialist. Shoot them down or dodge vertically. A collision paralyzes movement, the primary cannon, and special weapons for the displayed duration. The battlefield keeps moving while you are frozen.

A single **Click to play** prelude unlocks browser audio; the opening screen then appears with a quiet melodic theme already playing. Starting a run smoothly blooms the same arrangement into gameplay. The soundtrack cycles through four original melodic compositions with different tempos, harmonies, and synth voices. Overlapping crossfades connect tracks; there is no persistent kick/snare beat. Music continues through menus and gameplay, and freezes while paused or muted.

## Build and verify

```sh
npm run build
npm run preview
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

`preview` serves the production build on port 3000; stop the development server first. Browser tests reuse a running development server or start one automatically. They run one browser at a time to keep software WebGL rendering responsive in CI. On headless Linux without a GPU, Mesa/EGL libraries (`libegl1`, `libegl-mesa0`, and `mesa-vulkan-drivers`) provide the real WebGL 2 context used by the tests.

The deterministic simulation tests cover damage, splitting, impulses and bounces, difficulty progression, two-stage pickups, scarce ammunition, homing and area weapons, timeout collisions, stun and recovery, loss conditions, and reset. Playwright exercises the actual rendered game, separate left/right fire, number-key selection, touch special controls, paralysis and recovery, pause/resume, help, sound controls, restart, score persistence, real mesh depth and rotation, physical damage holes, GPU-resource disposal, and graphics context recovery.

## Project

- `src/game/simulation.ts`: renderer-independent gameplay and collision simulation, with small fixed substeps.
- `src/game/scene.ts`: native pointer/keyboard input, frame loop, and simulation-to-renderer adapter.
- `src/game/world3d.ts`, `models3d.ts`, `code-mesh.ts`: Three.js scene, perspective camera, solid procedural models, perforated code geometry, shadows, and GPU resource cleanup.
- `src/game/audio.ts`: original Web Audio music and effects; opening theme, seamless menu/game transitions, and four crossfading scores.
- `src/main.ts` and `src/style.css`: responsive menus, HUD, dialogs, and accessibility.
- `public/assets`: original cartoon SVG artwork and a locally bundled opening-screen photograph.

The Three.js renderer loads when the player starts. A browser supporting WebGL 2 is required. Graphics context loss pauses play and allows resuming after restoration. All game assets and fonts are bundled locally, so gameplay has no external service dependency. Development builds expose `window.__spaghetti` for deterministic browser tests; production builds do not.

## Credits

Cartoon artwork, original chiptune music, and sound effects were created for this game. The opening backdrop is [a technology photograph from Unsplash](https://images.unsplash.com/photo-1550751827-4bd374c3f58b), used under the [Unsplash license](https://unsplash.com/license). Barlow Condensed and Space Grotesk are bundled under their SIL Open Font Licenses in `public/fonts/`.
