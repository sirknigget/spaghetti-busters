# Spaghetti Busters

**Clean code. Dirty work.** A fast arcade shooter about refactoring with a very large cannon.

![Spaghetti Busters opening screen](docs/screenshots/menu.png)

Play as a bespectacled code quality specialist in a white suit. Blast huge, syntax-highlighted TypeScript blocks into flying letters and physics-driven fragments. Finish every chunk before it disappears through the left edge. Clear waves to take on faster, denser technical debt.

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
| Fire | Click, hold, or Space |
| Move vertically | Arrow Up/Down or W/S |
| Pause / resume | P, Escape, or the pause button |
| Sound | Speaker button |

Landscape orientation gives touch devices the biggest battlefield.

Shoot the highlighted `DOUBLE_SHOT` or `TRIPLE_SHOT` variable to release a floating weapon. **Shoot that weapon again** to equip it with limited ammunition. `AMMO_CACHE` reloads ammunition. The basic cannon always has unlimited shots. Your best score is saved in your browser.

## Build and verify

```sh
npm run build
npm run preview
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

`preview` serves the production build on port 3000; stop the development server first. Browser tests reuse a running development server or start one automatically.

The deterministic simulation tests cover damage, splitting, impulses and bounces, two-stage pickups, ammunition, loss conditions, reset, and consecutive wave clearance. Playwright exercises the actual rendered game, mouse and keyboard shooting, touch input, pause/resume, help, sound controls, restart, and score persistence.

## Project

- `src/game/simulation.ts`: renderer-independent gameplay and collision simulation, with small fixed substeps.
- `src/game/scene.ts`: Phaser scene, illustrated world, cached code-block surfaces, particles, and input.
- `src/game/audio.ts`: original Web Audio music and effects; audio starts with the Start gesture.
- `src/main.ts` and `src/style.css`: responsive menus, HUD, dialogs, and accessibility.
- `public/assets`: original cartoon SVG artwork and a locally bundled opening-screen photograph.

Phaser loads when the player starts. All game assets and fonts are bundled locally, so gameplay has no external service dependency. Development builds expose `window.__spaghetti` for deterministic browser tests; production builds do not.

## Credits

Cartoon artwork, original chiptune music, and sound effects were created for this game. The opening backdrop is [a technology photograph from Unsplash](https://images.unsplash.com/photo-1550751827-4bd374c3f58b), used under the [Unsplash license](https://unsplash.com/license). Barlow Condensed and Space Grotesk are bundled under their SIL Open Font Licenses in `public/fonts/`.
