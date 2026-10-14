# Spaghetti Busters

**Clean code. Dirty work.** A fast arcade shooter about refactoring with a very large cannon.

![Spaghetti Busters opening screen](docs/screenshots/menu.png)

Play as a bespectacled code quality specialist in a white suit. Blast huge, syntax-highlighted TypeScript blocks into flying letters and physics-driven fragments. Finish every chunk before it disappears through the left edge. Clear waves to take on faster, larger, tougher, and more numerous blocks from an expanded library of ridiculous code. Beveled plates, directional light, projected shadows, and explosive light give the 2D battlefield depth.

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

The soundtrack cycles through four original melodic compositions with different tempos, harmonies, and synth voices. Overlapping crossfades connect tracks; there is no persistent kick/snare beat. Music advances during play and freezes while paused or muted.

## Build and verify

```sh
npm run build
npm run preview
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

`preview` serves the production build on port 3000; stop the development server first. Browser tests reuse a running development server or start one automatically.

The deterministic simulation tests cover damage, splitting, impulses and bounces, difficulty progression, two-stage pickups, scarce ammunition, homing and area weapons, timeout collisions, stun and recovery, loss conditions, and reset. Playwright exercises the actual rendered game, separate left/right fire, number-key selection, touch special controls, paralysis and recovery, pause/resume, help, sound controls, restart, and score persistence.

## Project

- `src/game/simulation.ts`: renderer-independent gameplay and collision simulation, with small fixed substeps.
- `src/game/scene.ts`: Phaser scene, illustrated world, cached code-block surfaces, particles, and input.
- `src/game/audio.ts`: original Web Audio music and effects; audio starts with the Start gesture.
- `src/main.ts` and `src/style.css`: responsive menus, HUD, dialogs, and accessibility.
- `public/assets`: original cartoon SVG artwork and a locally bundled opening-screen photograph.

Phaser loads when the player starts. All game assets and fonts are bundled locally, so gameplay has no external service dependency. Development builds expose `window.__spaghetti` for deterministic browser tests; production builds do not.

## Credits

Cartoon artwork, original chiptune music, and sound effects were created for this game. The opening backdrop is [a technology photograph from Unsplash](https://images.unsplash.com/photo-1550751827-4bd374c3f58b), used under the [Unsplash license](https://unsplash.com/license). Barlow Condensed and Space Grotesk are bundled under their SIL Open Font Licenses in `public/fonts/`.
